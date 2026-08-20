import { createHash } from "node:crypto";
import { pg } from "@/config/db";
import type { CloudOnboardingReplayStore } from "./cloud-onboarding";

export type CreateCloudOnboardingStateRecordInput = {
  organizationId: string;
  userId: string;
  nonce: string;
  expiresAt: string;
};

export const hashCloudOnboardingNonce = (nonce: string): string =>
  createHash("sha256").update(nonce).digest("hex");

export const createCloudOnboardingStateRecord = async (
  input: CreateCloudOnboardingStateRecordInput,
): Promise<void> => {
  await pg`
        INSERT INTO whatsapp_cloud_onboarding_states
            (organization_id, user_id, nonce_hash, expires_at)
        VALUES
            (${input.organizationId}, ${input.userId}, ${hashCloudOnboardingNonce(input.nonce)}, ${input.expiresAt})
    `;
};

export const consumeCloudOnboardingState = async (
  nonce: string,
  expiresAt: number,
): Promise<boolean> => {
  const nonceHash = hashCloudOnboardingNonce(nonce);
  const [row] = await pg`
        UPDATE whatsapp_cloud_onboarding_states
        SET consumed_at = NOW()
        WHERE nonce_hash = ${nonceHash}
          AND consumed_at IS NULL
          AND expires_at = ${new Date(expiresAt)}
          AND expires_at > NOW()
        RETURNING id
    `;
  return Boolean(row);
};

export const cloudOnboardingReplayStore: CloudOnboardingReplayStore = {
  consume: consumeCloudOnboardingState,
};
