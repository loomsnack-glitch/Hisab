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
    },
    code: STATUS_CODES.SUCCESS,
  };
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
