import {
  claimPendingCloudWebhookEvents,
  type CloudWebhookEventClaim,
} from "./cloud-webhook.repository";
import { processCloudWebhookEvent } from "./cloud-webhook.processor";
import {
  claimNextCloudOutbox,
  completeCloudOutbox,
  markCloudOutboxReconciling,
} from "./cloud-outbox.repository";
import { dispatchCloudOutboxJob } from "./cloud-dispatcher";
import { createConfiguredCloudClient } from "./cloud-provider";
import { CloudCredentialError, type WhatsAppCloudCredentialVault } from "./cloud-credentials";
import { getObjectBuffer } from "@/services/storage";

const unavailableVault: WhatsAppCloudCredentialVault = {
  async store() {
    throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud credential storage is not configured");
  },
  async resolve() {
    throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud credential storage is not configured");
  },
  async rotate() {
    throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud credential storage is not configured");
  },
  async revoke() {},
};

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
      vault: unavailableVault,
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
