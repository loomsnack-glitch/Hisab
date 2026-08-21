import {
  claimPendingCloudWebhookEvents,
  type CloudWebhookEventClaim,
} from "./cloud-webhook.repository";
import { processCloudWebhookEvent } from "./cloud-webhook.processor";

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
