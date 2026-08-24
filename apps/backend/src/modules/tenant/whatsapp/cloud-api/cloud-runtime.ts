import {
  claimPendingCloudWebhookEvents,
  type CloudWebhookEventClaim,
} from "./cloud-webhook.repository";
import { processCloudWebhookEvent } from "./cloud-webhook.processor";
import {
  claimNextCloudOutbox,
  completeCloudOutbox,
  expireStaleCloudOutboxReconciliations,
  markCloudOutboxReconciling,
} from "./cloud-outbox.repository";
import { dispatchCloudOutboxJob } from "./cloud-dispatcher";
import { createConfiguredCloudClient } from "./cloud-provider";
import { databaseCloudCredentialVault } from "./database-cloud-credentials";
import { getObjectBuffer } from "@/services/storage";

const cloudOutboxEnabled = (): boolean =>
  process.env.WHATSAPP_CLOUD_OUTBOX_ENABLED?.trim().toLowerCase() === "true";

let cloudOutboxDispatchInFlight = false;

const dispatchNextCloudOutbox = async (): Promise<boolean> => {
  if (!cloudOutboxEnabled() || cloudOutboxDispatchInFlight) return false;
  cloudOutboxDispatchInFlight = true;
  try {
    const job = await claimNextCloudOutbox(120);
    if (!job) return false;
    await dispatchCloudOutboxJob(job, {
      vault: databaseCloudCredentialVault,
      createClient: accessToken => createConfiguredCloudClient(accessToken),
      loadAttachment: async (bucket, key, maxBytes) => getObjectBuffer(bucket, key, maxBytes),
      complete: completeCloudOutbox,
      reconcile: markCloudOutboxReconciling,
    });
    return true;
  } finally {
    cloudOutboxDispatchInFlight = false;
  }
};

export const replayPendingCloudWebhookEvents = async (
  limit = 50,
): Promise<number> => {
  const claims = await claimPendingCloudWebhookEvents(limit);
  for (const claim of claims) {
    await processCloudWebhookEvent(claim);
  }
  return claims.length;
};

export const processCloudWebhookClaims = async (
  claims: CloudWebhookEventClaim[],
): Promise<void> => {
  for (const claim of claims) await processCloudWebhookEvent(claim);
};

export const dispatchCloudOutbox = dispatchNextCloudOutbox;

export const reconcileStaleCloudOutbox = async (): Promise<number> => {
  if (!cloudOutboxEnabled()) return 0;
  return expireStaleCloudOutboxReconciliations();
};
