import { STATUS_CODES, type ServiceResponse } from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import { requireOrganizationFeatureEntitlement } from "@/modules/tenant/commercial-licensing/feature-entitlement-guard";
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
  listCloudOutboxOperations,
  retryCloudOutboxNow,
  deadLetterCloudOutboxNow,
  listCloudOperatorActionSummary,
  listCloudOperatorActions,
  type CloudOutboxActionAttempt,
  type CloudOutboxActionResult,
} from "./cloud-outbox.repository";
import type { CloudOutboxReconciliationSummary } from "./cloud-outbox-summary";
import { getCloudWebhookHealth, type CloudWebhookHealthSummary } from "./cloud-webhook.repository";

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
  webhook: CloudWebhookHealthSummary;
  operatorActions: Awaited<ReturnType<typeof listCloudOperatorActionSummary>>;
  operatorAudit: Awaited<ReturnType<typeof listCloudOperatorActions>>;
  alerts: Array<{ key: string; severity: "warning" | "error"; message: string }>;
};

const notFound = (): ServiceResponse<null> => ({
  status: "error",
  message: "Organization not found",
  data: null,
  code: STATUS_CODES.NOT_FOUND,
});

const access = async (userId: string, organizationId: string): Promise<ServiceResponse<null> | null> => {
  if (!await organizationRepository.getOrganizationByIdForUser(organizationId, userId)) {
    return notFound();
  }
  return requireOrganizationFeatureEntitlement(organizationId, "whatsapp");
};

export const getCloudSafety = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<CloudSafetyData | null>> => {
  const accessError = await access(userId, organizationId);
  if (accessError) return accessError;
  const [policy, usage, reconciliation, outbox, webhook, operatorActions, operatorAudit] = await Promise.all([
    getCloudQuotaPolicy(organizationId),
    getCloudQuotaLedgerSummary(organizationId),
    getCloudQuotaReconciliation(organizationId),
    getCloudOutboxReconciliationSummary(organizationId),
    getCloudWebhookHealth(organizationId),
    listCloudOperatorActionSummary(organizationId),
    listCloudOperatorActions(organizationId),
  ]);
  const alerts: CloudSafetyData["alerts"] = [];
  if (outbox.deadLetterCount > 0) alerts.push({ key: "cloud_outbox_dead_letters", severity: "error", message: `${outbox.deadLetterCount} Cloud outbox item(s) are dead-lettered` });
  if (webhook.deadLetterCount > 0) alerts.push({ key: "cloud_webhook_dead_letters", severity: "error", message: `${webhook.deadLetterCount} Cloud webhook event(s) are dead-lettered` });
  if (reconciliation.missingReservedEvents + reconciliation.missingSettlementEvents + reconciliation.missingReleaseEvents > 0) {
    alerts.push({ key: "cloud_quota_reconciliation", severity: "warning", message: "Cloud quota reconciliation has missing ledger events" });
  }
  return {
    status: "success",
    message: "WhatsApp Cloud safety status fetched successfully",
    data: {
      policy,
      usage,
      reconciliation,
      outbox,
      webhook,
      operatorActions,
      operatorAudit,
      alerts,
    },
    code: STATUS_CODES.SUCCESS,
  };
};

export const reconcileCloudOutboxNow = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<{ reconciledCount: number } | null>> => {
  const accessError = await access(userId, organizationId);
  if (accessError) return accessError;
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

export const getCloudOutboxOperations = async (
  userId: string,
  organizationId: string,
  limit = 50,
): Promise<ServiceResponse<{ operations: Awaited<ReturnType<typeof listCloudOutboxOperations>> } | null>> => {
  const accessError = await access(userId, organizationId);
  if (accessError) return accessError;
  return {
    status: "success",
    message: "Cloud outbox operations fetched successfully",
    data: { operations: await listCloudOutboxOperations(organizationId, limit) },
    code: STATUS_CODES.SUCCESS,
  };
};

const actionResponse = (
  result: CloudOutboxActionAttempt,
  action: "retry" | "dead-letter",
): ServiceResponse<CloudOutboxActionResult | null> => {
  if (result.applied) {
    return {
      status: "success",
      message: action === "retry" ? "Cloud submission queued for retry" : "Cloud submission dead-lettered",
      data: result.result,
      code: STATUS_CODES.SUCCESS,
    };
  }
  if (result.reason === "not_found") return notFound();
  return {
    status: "error",
    message: `Cloud submission cannot be ${action}${result.currentStatus ? ` from ${result.currentStatus}` : ""}`,
    data: null,
    code: STATUS_CODES.CONFLICT,
  };
};

export const retryCloudOutbox = async (userId: string, organizationId: string, outboxId: string) => {
  const accessError = await access(userId, organizationId);
  if (accessError) return accessError;
  try {
    return actionResponse(await retryCloudOutboxNow(organizationId, userId, outboxId), "retry");
  } catch (error) {
    console.error("[whatsapp] Cloud outbox retry failed", error instanceof Error ? error.message : String(error));
    return { status: "error" as const, message: "Cloud outbox retry failed", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
  }
};

export const deadLetterCloudOutbox = async (userId: string, organizationId: string, outboxId: string) => {
  const accessError = await access(userId, organizationId);
  if (accessError) return accessError;
  try {
    return actionResponse(await deadLetterCloudOutboxNow(organizationId, userId, outboxId), "dead-letter");
  } catch (error) {
    console.error("[whatsapp] Cloud outbox dead-letter failed", error instanceof Error ? error.message : String(error));
    return { status: "error" as const, message: "Cloud outbox dead-letter failed", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
  }
};

export const saveCloudQuotaPolicy = async (
  userId: string,
  organizationId: string,
  policy: CloudQuotaPolicy,
): Promise<ServiceResponse<CloudQuotaPolicy | null>> => {
  const accessError = await access(userId, organizationId);
  if (accessError) return accessError;
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
  const accessError = await access(userId, organizationId);
  if (accessError) return accessError;
  try {
    const cancelledCount = await cancelCloudCampaign(organizationId, campaignKey, userId);
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
