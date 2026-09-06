import type { WhatsAppMessageEventJSON } from "@repo/types";
import {
  type CloudDeferredEvent,
  type CloudNormalizedEvent,
  type CloudNormalizedTemplateStatusEvent,
  normalizeCloudWebhookReceipt,
} from "./cloud-webhook.normalizer";
import type {
  CloudMessageStatusUpdateResult,
  CloudWebhookEventClaim,
} from "./cloud-webhook.repository";
import type { WhatsAppCloudWebhookReceipt } from "./cloud-api.webhook";

export type CloudWebhookProcessorResult =
  | { status: "completed"; processed: number; ignored: number }
  | { status: "retryable"; code: string }
  | { status: "dead_letter"; code: string }
  | { status: "ignored"; code: string }
  | { status: "lease_lost"; code: "lease_lost" };

export type CloudWebhookProcessorDependencies = {
  normalize: typeof normalizeCloudWebhookReceipt;
  ingestMessage: (
    accountId: string,
    data: WhatsAppMessageEventJSON,
  ) => Promise<{ stored: boolean }>;
  updateStatus: (
    accountId: string,
    providerMessageId: string,
    callbackData: string | null,
    status: "sent" | "delivered" | "read" | "failed",
    occurredAt: string,
    failureCode: string | null,
    failureMessage: string | null,
  ) => Promise<CloudMessageStatusUpdateResult>;
  resolveAccount: (wabaId: string, phoneNumberId: string) => Promise<string | null>;
  updateTemplateStatus: (event: CloudNormalizedTemplateStatusEvent) => Promise<boolean | void>;
  complete: (
    event: Pick<CloudWebhookEventClaim, "id" | "leaseOwner">,
    ignoredDetail?: string,
  ) => Promise<boolean>;
  ignore: (
    event: Pick<CloudWebhookEventClaim, "id" | "leaseOwner">,
    code: string,
    message: string,
  ) => Promise<boolean>;
  fail: (
    event: Pick<CloudWebhookEventClaim, "id" | "leaseOwner">,
    code: string,
    message: string,
    maxAttempts?: number,
  ) => Promise<boolean>;
};

export class CloudWebhookRetryableError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CloudWebhookRetryableError";
    this.code = code;
  }
}

const dependencies: CloudWebhookProcessorDependencies = {
  normalize: normalizeCloudWebhookReceipt,
  ingestMessage: async (accountId, data) => {
    const { ingestNormalizedMessageEvent } = await import("../conversation");
    return ingestNormalizedMessageEvent(accountId, data);
  },
  updateStatus: async (...args) => {
    const { updateCloudMessageStatus } = await import("../whatsapp.repository");
    return updateCloudMessageStatus(...args);
  },
  resolveAccount: async (wabaId, phoneNumberId) => {
    const { findCloudAccountId } = await import("./cloud-webhook.repository");
    return findCloudAccountId(wabaId, phoneNumberId);
  },
  updateTemplateStatus: async event => {
    const { applyCloudTemplateProviderStatus } = await import("./cloud-template-submission.repository");
    await applyCloudTemplateProviderStatus({
      wabaId: event.wabaId,
      providerTemplateId: event.providerTemplateId,
      templateName: event.templateName,
      languageCode: event.languageCode,
      status: event.status,
      category: event.category,
      reason: event.reason,
      occurredAt: event.occurredAt,
    });
  },
  complete: async (...args) => {
    const { completeCloudWebhookEvent } = await import("./cloud-webhook.repository");
    return completeCloudWebhookEvent(...args);
  },
  ignore: async (...args) => {
    const { ignoreCloudWebhookEvent } = await import("./cloud-webhook.repository");
    return ignoreCloudWebhookEvent(...args);
  },
  fail: async (...args) => {
    const { failCloudWebhookEvent } = await import("./cloud-webhook.repository");
    return failCloudWebhookEvent(...args);
  },
};

const deferredDetail = (event: CloudDeferredEvent): string =>
  `${event.reason}: ${event.detail}`.slice(0, 1_000);

const receiptFor = (
  claim: CloudWebhookEventClaim,
): WhatsAppCloudWebhookReceipt => ({
  eventKey: claim.eventKey,
  payload: claim.payload,
  wabaId: claim.wabaId,
  phoneNumberId: claim.phoneNumberId,
});

const messagePayload = (
  event: Extract<CloudNormalizedEvent, { kind: "message" }>,
): WhatsAppMessageEventJSON => ({
  providerMessageId: event.providerMessageId,
  externalChatId: event.externalChatId,
  contactPhoneNumber: event.contactPhoneNumber,
  displayName: event.displayName,
  messageType: event.messageType,
  body: event.body,
  caption: event.caption,
  attachmentFileName: event.attachmentFileName,
  attachmentMimeType: event.attachmentMimeType,
  documentBase64: null,
  occurredAt: event.occurredAt,
  direction: "inbound",
  source: event.source,
});

export const processCloudWebhookEvent = async (
  claim: CloudWebhookEventClaim,
  injected: Partial<CloudWebhookProcessorDependencies> = {},
): Promise<CloudWebhookProcessorResult> => {
  const deps = { ...dependencies, ...injected };
  let normalized: CloudNormalizedEvent[];
  try {
    normalized = deps.normalize(receiptFor(claim));
  } catch (error) {
    const code = "malformed_receipt";
    if (!(await deps.ignore(
      claim,
      code,
      error instanceof Error ? error.message : "Cloud receipt is malformed",
    ))) {
      return { status: "lease_lost", code: "lease_lost" };
    }
    return { status: "ignored", code };
  }

  const deferred = normalized.filter(
    (event): event is CloudDeferredEvent => event.kind === "deferred",
  );
  const actionable = normalized.filter(
    (event): event is Exclude<CloudNormalizedEvent, CloudDeferredEvent> =>
      event.kind !== "deferred",
  );
  if (!actionable.length) {
    const detail =
      deferred.map(deferredDetail).join("; ") || "No actionable Cloud events";
    if (!(await deps.ignore(claim, "deferred_event", detail))) {
      return { status: "lease_lost", code: "lease_lost" };
    }
    return { status: "ignored", code: "deferred_event" };
  }
  try {
    let processed = 0;
    for (const event of actionable) {
      if (event.kind === "template_status") {
        const updated = await deps.updateTemplateStatus(event);
        if (updated === false) {
          throw new CloudWebhookRetryableError(
            "cloud_template_not_found",
            "Cloud template status arrived before the template was synchronized",
          );
        }
        processed += 1;
        continue;
      }
      const accountId = await deps.resolveAccount(
        event.wabaId,
        event.phoneNumberId,
      );
      if (!accountId) {
        throw new CloudWebhookRetryableError(
          "cloud_account_not_found",
          "Cloud account is not provisioned for this webhook route",
        );
      }
      if (event.kind === "message") {
        await deps.ingestMessage(accountId, messagePayload(event));
        processed += 1;
        continue;
      }
      const updated = await deps.updateStatus(
        accountId,
        event.providerMessageId,
        event.callbackData,
        event.status,
        event.occurredAt,
        event.failureCode,
        event.failureMessage,
      );
      if (updated === "missing") {
        throw new CloudWebhookRetryableError(
          "cloud_message_not_found",
          "Cloud status arrived before its outbound message was stored",
        );
      }
      processed += 1;
    }
    const deferredSummary = deferred.length
      ? deferred.map(deferredDetail).join("; ")
      : undefined;
    if (!(await deps.complete(claim, deferredSummary))) {
      return { status: "lease_lost", code: "lease_lost" };
    }
    return { status: "completed", processed, ignored: deferred.length };
  } catch (error) {
    const code =
      error instanceof CloudWebhookRetryableError
        ? error.code
        : "cloud_processing_failed";
    if (!(await deps.fail(
      claim,
      code,
      error instanceof Error
        ? error.message
        : "Cloud webhook processing failed",
    ))) {
      return { status: "lease_lost", code: "lease_lost" };
    }
    return {
      status: claim.attemptCount >= 8 ? "dead_letter" : "retryable",
      code,
    };
  }
};
