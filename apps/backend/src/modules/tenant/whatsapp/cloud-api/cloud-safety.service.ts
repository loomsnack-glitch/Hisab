import { STATUS_CODES, type ServiceResponse } from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import {
  cancelCloudCampaign,
  getCloudQuotaLedgerSummary,
  getCloudQuotaPolicy,
  getCloudQuotaReconciliation,
  updateCloudQuotaPolicy,
  type CloudQuotaPolicy,
} from "./cloud-quota.repository";
import {
  expireStaleCloudOutboxReconciliations,
  getCloudOutboxReconciliationSummary,
} from "./cloud-outbox.repository";
import type { CloudOutboxReconciliationSummary } from "./cloud-outbox-summary";

type CloudSafetyData = {
  policy: CloudQuotaPolicy;
  usage: { units: number; costMinor: number };
  reconciliation: {
    reservationCount: number;
    ledgerEventCount: number;
    missingReservedEvents: number;
    missingSettlementEvents: number;
    missingReleaseEvents: number;
  };
  outbox: CloudOutboxReconciliationSummary;
};

const notFound = (): ServiceResponse<null> => ({
  status: "error",
  message: "Organization not found",
  data: null,
  code: STATUS_CODES.NOT_FOUND,
});

const access = async (userId: string, organizationId: string): Promise<boolean> =>
  Boolean(await organizationRepository.getOrganizationByIdForUser(organizationId, userId));

export const getCloudSafety = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<CloudSafetyData | null>> => {
  if (!await access(userId, organizationId)) return notFound();
  return {
    status: "success",
    message: "WhatsApp Cloud safety status fetched successfully",
    data: {
      policy: await getCloudQuotaPolicy(organizationId),
      usage: await getCloudQuotaLedgerSummary(organizationId),
      reconciliation: await getCloudQuotaReconciliation(organizationId),
      outbox: await getCloudOutboxReconciliationSummary(organizationId),
    },
    code: STATUS_CODES.SUCCESS,
  };
};

export const reconcileCloudOutboxNow = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<{ reconciledCount: number } | null>> => {
  if (!await access(userId, organizationId)) return notFound();
  try {
    const reconciledCount = await expireStaleCloudOutboxReconciliations(100, organizationId);
    return {
      status: "success",
      message: reconciledCount > 0 ? "Cloud outbox reconciliation completed" : "No stale Cloud submissions found",
      data: { reconciledCount },
      code: STATUS_CODES.SUCCESS,
    };
  } catch (error) {
    console.error(
      "[whatsapp] Cloud outbox reconciliation failed",
      error instanceof Error ? error.message : String(error),
    );
    return {
      status: "error",
      message: "Cloud outbox reconciliation failed",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }
};

export const saveCloudQuotaPolicy = async (
  userId: string,
  organizationId: string,
  policy: CloudQuotaPolicy,
): Promise<ServiceResponse<CloudQuotaPolicy | null>> => {
  if (!await access(userId, organizationId)) return notFound();
  try {
    return {
      status: "success",
      message: "WhatsApp Cloud quota policy saved successfully",
      data: await updateCloudQuotaPolicy(organizationId, policy),
      code: STATUS_CODES.SUCCESS,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Cloud quota policy could not be saved",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }
};

export const stopCloudCampaign = async (
  userId: string,
  organizationId: string,
  campaignKey: string,
): Promise<ServiceResponse<{ cancelledCount: number } | null>> => {
  if (!await access(userId, organizationId)) return notFound();
  try {
    const cancelledCount = await cancelCloudCampaign(organizationId, campaignKey);
    return {
      status: "success",
      message: "Cloud campaign stopped",
      data: { cancelledCount },
      code: STATUS_CODES.SUCCESS,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Cloud campaign could not be stopped",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }
};
