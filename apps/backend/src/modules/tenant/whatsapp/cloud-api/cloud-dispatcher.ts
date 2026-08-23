import {
  dispatchCloudOutboundMessage,
  type CloudDispatchOutcome,
  type CloudMessageSender,
  type CloudOutboundMessage,
} from "./cloud-outbound";
import {
  markCloudOutboxReconciling,
  type CloudOutboxJob,
  claimNextCloudOutbox,
  completeCloudOutbox,
} from "./cloud-outbox.repository";
import type { WhatsAppCloudCredentialVault } from "./cloud-credentials";

type CloudMediaUploader = CloudMessageSender & {
  uploadMedia: (
    phoneNumberId: string,
    media: { body: Uint8Array; mimeType: string; fileName: string },
  ) => Promise<{ id: string }>;
};

export type CloudAttachmentLoader = (
  bucket: string,
  key: string,
  maxBytes: number,
) => Promise<Uint8Array>;

export type CloudOutboxDispatcherDependencies = {
  vault: WhatsAppCloudCredentialVault;
  createClient: (accessToken: string) => CloudMediaUploader;
  loadAttachment: CloudAttachmentLoader;
  complete: typeof completeCloudOutbox;
  reconcile: typeof markCloudOutboxReconciling;
};

export type CloudOutboxDispatchResult =
  | { status: "accepted"; providerMessageId: string }
  | { status: "retryable"; code: string; message: string }
  | { status: "permanent"; code: string; message: string }
  | { status: "reconciling"; code: "submission_uncertain" };

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

const errorOutcome = (
  status: "retryable" | "permanent",
  code: string,
  message: string,
): CloudOutboxDispatchResult => ({ status, code, message });

const messageFor = async (
  job: CloudOutboxJob,
  client: CloudMediaUploader,
  loadAttachment: CloudAttachmentLoader,
  bucket: string,
): Promise<CloudOutboundMessage> => {
  if (job.messageType === "template") {
    if (!job.templateSnapshot) throw new Error("Cloud template snapshot is missing");
    return {
      type: "template",
      name: job.templateSnapshot.name,
      languageCode: job.templateSnapshot.languageCode,
      components: job.templateSnapshot.components,
      callbackData: job.idempotencyKey,
    };
  }
  if (job.messageType === "text") {
    if (!job.body) throw new Error("Cloud text message has no body");
    return { type: "text", body: job.body };
  }
  if (!job.attachmentStorageKey || !job.attachmentFileName || !job.attachmentMimeType) {
    throw new Error("Cloud media message has no private attachment");
  }
  if (!bucket) throw new Error("Private media storage is not configured");
  const body = await loadAttachment(
    bucket,
    job.attachmentStorageKey,
    MAX_MEDIA_BYTES,
  );
  const media = await client.uploadMedia(job.phoneNumberId, {
    body,
    mimeType: job.attachmentMimeType,
    fileName: job.attachmentFileName,
  });
  return job.messageType === "image"
    ? { type: "image", mediaId: media.id, caption: job.caption ?? undefined }
    : {
        type: "document",
        mediaId: media.id,
        caption: job.caption ?? undefined,
        fileName: job.attachmentFileName,
      };
};

const dispatch = async (
  job: CloudOutboxJob,
  dependencies: CloudOutboxDispatcherDependencies,
): Promise<CloudOutboxDispatchResult> => {
  let client: CloudMediaUploader;
  try {
    const accessToken = await dependencies.vault.resolve({
      reference: job.credentialReference,
      keyVersion: job.credentialKeyVersion,
    });
    client = dependencies.createClient(accessToken);
  } catch {
    return errorOutcome(
      "retryable",
      "cloud_credential_unavailable",
      "Cloud credential is unavailable",
    );
  }

  let message: CloudOutboundMessage;
  try {
    message = await messageFor(
      job,
      client,
      dependencies.loadAttachment,
      process.env.MINIO_BUCKET_NAME?.trim() ?? "",
    );
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Cloud media unavailable";
    return errorOutcome(
      messageText.includes("has no private attachment") ||
        messageText.includes("has no body") ||
        messageText.includes("template snapshot is missing")
        ? "permanent"
        : "retryable",
      "cloud_media_unavailable",
      messageText,
    );
  }

  const outcome: CloudDispatchOutcome = await dispatchCloudOutboundMessage(
    client,
    job.phoneNumberId,
    job.phoneNumber,
    message,
  );
  if (outcome.status === "accepted") {
    return { status: "accepted", providerMessageId: outcome.providerMessageId };
  }
  return outcome.status === "reconciling"
    ? { status: "reconciling", code: outcome.code }
    : { status: outcome.status, code: outcome.code, message: outcome.message };
};

export const dispatchCloudOutboxJob = async (
  job: CloudOutboxJob,
  dependencies: CloudOutboxDispatcherDependencies,
): Promise<CloudOutboxDispatchResult> => {
  const result = await dispatch(job, dependencies);
  if (result.status === "accepted") {
    await dependencies.complete(
      job.outboxId,
      job.leaseOwner,
      result.providerMessageId,
      null,
      null,
      false,
    );
  } else if (result.status === "reconciling") {
    await dependencies.reconcile(
      job,
      result.code,
      "Cloud API submission result is unknown and needs reconciliation",
    );
  } else {
    await dependencies.complete(
      job.outboxId,
      job.leaseOwner,
      null,
      result.code,
      result.message,
      result.status === "retryable",
    );
  }
  return result;
};

export type CloudRuntimeDependencies = CloudOutboxDispatcherDependencies & {
  claimOutbox: typeof claimNextCloudOutbox;
  claimWebhookEvents: () => Promise<import("./cloud-webhook.repository").CloudWebhookEventClaim[]>;
  processWebhookEvent: (
    claim: import("./cloud-webhook.repository").CloudWebhookEventClaim,
  ) => Promise<unknown>;
};

export const runCloudRuntimeCycle = async (
  dependencies: CloudRuntimeDependencies,
): Promise<{ webhookEvents: number; outboxJobs: number }> => {
  const claims = await dependencies.claimWebhookEvents();
  for (const claim of claims) await dependencies.processWebhookEvent(claim);

  const job = await dependencies.claimOutbox(120);
  if (job) await dispatchCloudOutboxJob(job, dependencies);
  return { webhookEvents: claims.length, outboxJobs: job ? 1 : 0 };
};
