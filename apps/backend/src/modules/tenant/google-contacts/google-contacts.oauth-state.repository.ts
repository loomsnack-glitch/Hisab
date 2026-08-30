import { createHash } from "node:crypto";
import { pg } from "@/config/db";
import type { GoogleContactsOAuthReplayStore } from "./google-contacts.oauth-state";

export type CreateGoogleContactsOAuthStateRecordInput = {
  organizationId: string;
  userId: string;
  nonce: string;
  expiresAt: string;
};

export const hashGoogleContactsOAuthNonce = (nonce: string): string =>
  createHash("sha256").update(nonce).digest("hex");

export const createGoogleContactsOAuthStateRecord = async (
  input: CreateGoogleContactsOAuthStateRecordInput,
): Promise<void> => {
  await pg`
        INSERT INTO google_contacts_oauth_states
            (organization_id, user_id, nonce_hash, expires_at)
        VALUES
            (${input.organizationId}, ${input.userId}, ${hashGoogleContactsOAuthNonce(input.nonce)}, ${input.expiresAt})
    `;
};

export const consumeGoogleContactsOAuthStateRecord = async (
  nonce: string,
  expiresAt: number,
): Promise<boolean> => {
  const nonceHash = hashGoogleContactsOAuthNonce(nonce);
  const [row] = await pg`
        UPDATE google_contacts_oauth_states
        SET consumed_at = NOW()
        WHERE nonce_hash = ${nonceHash}
          AND consumed_at IS NULL
          AND expires_at = ${new Date(expiresAt)}
          AND expires_at > NOW()
        RETURNING id
    `;
  return Boolean(row);
};

export const googleContactsOAuthReplayStore: GoogleContactsOAuthReplayStore = {
  consume: consumeGoogleContactsOAuthStateRecord,
};
