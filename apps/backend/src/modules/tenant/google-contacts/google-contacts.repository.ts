import {
  GoogleContactsSyncStatusSchema,
  type GoogleContactsSyncStatus,
} from "@repo/types";
import { pg } from "@/config/db";
import {
  normalizeGoogleContactsCredentialBinding,
  type GoogleContactsCredentialBinding,
} from "./google-contacts.credentials";

type ConnectionRow = Record<string, unknown>;
const nonceHashPattern = /^[0-9a-f]{64}$/;

export type GoogleContactsConnectionAttempt = {
  started: boolean;
  status: GoogleContactsSyncStatus;
};

const requireOAuthAttemptNonceHash = (value: string): string => {
  const normalized = value.trim();
  if (!nonceHashPattern.test(normalized)) {
    throw new Error("Google Contacts OAuth attempt nonce is invalid");
  }
  return normalized;
};

/**
 * Map only safe connection metadata. Credential references, key versions,
 * Google subject, and encrypted payloads are intentionally not selected or
 * returned by this repository boundary.
 */
export const mapGoogleContactsSyncStatus = (
  row: ConnectionRow | null | undefined,
): GoogleContactsSyncStatus => {
  if (!row) {
    return GoogleContactsSyncStatusSchema.parse({
      connectionStatus: "disconnected",
      googleAccountEmail: null,
      connectedAt: null,
    });
  }

  return GoogleContactsSyncStatusSchema.parse({
    connectionStatus: row.status,
    googleAccountEmail: row.google_account_email ?? null,
    connectedAt: row.connected_at ?? null,
  });
};

export const getGoogleContactsConnectionStatus = async (
  organizationId: string,
): Promise<GoogleContactsSyncStatus> => {
  const [row] = await pg`
    SELECT status, google_account_email, connected_at
    FROM google_contacts_connections
    WHERE organization_id = ${organizationId}
  `;
  return mapGoogleContactsSyncStatus(row as ConnectionRow | undefined);
};

export const getGoogleContactsCredentialBinding = async (
  organizationId: string,
): Promise<GoogleContactsCredentialBinding | null> => {
  const [row] = await pg`
    SELECT credential_reference, credential_key_version
    FROM google_contacts_connections
    WHERE organization_id = ${organizationId}
      AND credential_reference IS NOT NULL
      AND credential_key_version IS NOT NULL
  `;
  if (!row) return null;
  return normalizeGoogleContactsCredentialBinding({
    reference: String(row.credential_reference),
    keyVersion: String(row.credential_key_version),
  });
};

export const beginGoogleContactsConnectionAttempt = async (input: {
  organizationId: string;
  createdBy: string;
  oauthAttemptNonceHash: string;
}): Promise<GoogleContactsConnectionAttempt> => {
  const oauthAttemptNonceHash = requireOAuthAttemptNonceHash(input.oauthAttemptNonceHash);
  const [row] = await pg`
    INSERT INTO google_contacts_connections (
      organization_id,
      status,
      created_by,
      oauth_attempt_nonce_hash
    ) VALUES (
      ${input.organizationId},
      'connecting',
      ${input.createdBy},
      ${oauthAttemptNonceHash}
    )
    ON CONFLICT (organization_id) DO UPDATE
    SET
      status = 'connecting',
      oauth_attempt_nonce_hash = EXCLUDED.oauth_attempt_nonce_hash,
      updated_at = NOW()
    WHERE google_contacts_connections.status <> 'connected'
    RETURNING status, google_account_email, connected_at
  `;
  if (!row) {
    return {
      started: false,
      status: await getGoogleContactsConnectionStatus(input.organizationId),
    };
  }
  return {
    started: true,
    status: mapGoogleContactsSyncStatus(row as ConnectionRow),
  };
};

export const completeGoogleContactsConnection = async (input: {
  organizationId: string;
  googleAccountEmail: string;
  googleAccountSubject: string;
  credential: GoogleContactsCredentialBinding;
  oauthAttemptNonceHash: string;
}): Promise<GoogleContactsSyncStatus | null> => {
  const binding = normalizeGoogleContactsCredentialBinding(input.credential);
  const oauthAttemptNonceHash = requireOAuthAttemptNonceHash(input.oauthAttemptNonceHash);
  const [row] = await pg`
    UPDATE google_contacts_connections
    SET
      status = 'connected',
      google_account_email = ${input.googleAccountEmail},
      google_account_subject = ${input.googleAccountSubject},
      credential_reference = ${binding.reference},
      credential_key_version = ${binding.keyVersion},
      oauth_attempt_nonce_hash = NULL,
      connected_at = COALESCE(connected_at, NOW()),
      updated_at = NOW()
    WHERE organization_id = ${input.organizationId}
      AND status = 'connecting'
      AND oauth_attempt_nonce_hash = ${oauthAttemptNonceHash}
    RETURNING status, google_account_email, connected_at
  `;
  return row ? mapGoogleContactsSyncStatus(row as ConnectionRow) : null;
};

export const revertConnectingGoogleContactsConnection = async (input: {
  organizationId: string;
  oauthAttemptNonceHash: string;
}): Promise<GoogleContactsSyncStatus> => {
  const oauthAttemptNonceHash = requireOAuthAttemptNonceHash(input.oauthAttemptNonceHash);
  await pg`
    DELETE FROM google_contacts_connections
    WHERE organization_id = ${input.organizationId}
      AND status = 'connecting'
      AND credential_reference IS NULL
      AND oauth_attempt_nonce_hash = ${oauthAttemptNonceHash}
  `;
  await pg`
    UPDATE google_contacts_connections
    SET
      status = 'reconnect_required',
      oauth_attempt_nonce_hash = NULL,
      updated_at = NOW()
    WHERE organization_id = ${input.organizationId}
      AND status = 'connecting'
      AND credential_reference IS NOT NULL
      AND oauth_attempt_nonce_hash = ${oauthAttemptNonceHash}
  `;
  return getGoogleContactsConnectionStatus(input.organizationId);
};
