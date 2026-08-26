import { GoogleContactsSyncStatusSchema, type GoogleContactsSyncStatus } from "@repo/types";
import { pg } from "@/config/db";
import {
  normalizeGoogleContactsCredentialBinding,
  type GoogleContactsCredentialBinding,
} from "./google-contacts.credentials";

type ConnectionRow = Record<string, unknown>;
const nonceHashPattern = /^[0-9a-f]{64}$/;

const asCount = (value: unknown): number => {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count >= 0 ? Math.trunc(count) : 0;
};

export type GoogleContactsOAuthAttemptIntent = "connect" | "reconnect" | "replace";

export type GoogleContactsConnectionAttempt = {
  started: boolean;
  status: GoogleContactsSyncStatus;
};

export type GoogleContactsConnectionLifecycle = {
  connectionId: string;
  status: string;
  googleAccountSubject: string | null;
  credential: GoogleContactsCredentialBinding | null;
  oauthAttemptIntent: GoogleContactsOAuthAttemptIntent | null;
};

export type GoogleContactsDisconnectResult = {
  disconnected: boolean;
  credential: GoogleContactsCredentialBinding | null;
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
export const mapGoogleContactsSyncStatus = (row: ConnectionRow | null | undefined): GoogleContactsSyncStatus => {
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
    initialSyncStatus: row.initial_sync_status ?? "not_started",
    lastSuccessfulSyncAt: row.last_successful_sync_at ?? null,
    pendingCount: asCount(row.pending_count),
    retryingCount: asCount(row.retrying_count),
    errorCount: asCount(row.error_count),
    conflictCount: asCount(row.conflict_count),
  });
};

export const getGoogleContactsConnectionStatus = async (organizationId: string): Promise<GoogleContactsSyncStatus> => {
  const [row] = await pg`
    SELECT
      connection.status,
      connection.google_account_email,
      connection.connected_at,
      connection.initial_sync_status,
      connection.last_successful_sync_at,
      COUNT(*) FILTER (WHERE outbox.status IN ('pending', 'processing')) AS pending_count,
      COUNT(*) FILTER (
        WHERE outbox.status IN ('pending', 'processing')
          AND outbox.last_error_code IN ('google_unavailable', 'google_credential_unavailable')
      ) AS retrying_count,
      COUNT(*) FILTER (WHERE outbox.status = 'failed') AS error_count,
      COUNT(*) FILTER (WHERE outbox.status = 'conflict') AS conflict_count
    FROM google_contacts_connections connection
    LEFT JOIN google_contacts_sync_outbox outbox
      ON outbox.connection_id = connection.id
    WHERE connection.organization_id = ${organizationId}
    GROUP BY
      connection.id,
      connection.status,
      connection.google_account_email,
      connection.connected_at,
      connection.initial_sync_status,
      connection.last_successful_sync_at
  `;
  return mapGoogleContactsSyncStatus(row as ConnectionRow | undefined);
};

export const getGoogleContactsCredentialBinding = async (
  organizationId: string,
): Promise<GoogleContactsCredentialBinding | null> => {
  const lifecycle = await getGoogleContactsConnectionLifecycle(organizationId);
  return lifecycle?.credential ?? null;
};

export const getGoogleContactsConnectionLifecycle = async (
  organizationId: string,
): Promise<GoogleContactsConnectionLifecycle | null> => {
  const [row] = await pg`
    SELECT
      id,
      status,
      google_account_subject,
      credential_reference,
      credential_key_version,
      oauth_attempt_intent
    FROM google_contacts_connections
    WHERE organization_id = ${organizationId}
  `;
  if (!row) return null;
  const intent = row.oauth_attempt_intent;
  return {
    connectionId: String(row.id),
    status: String(row.status),
    googleAccountSubject: row.google_account_subject == null ? null : String(row.google_account_subject),
    credential:
      row.credential_reference && row.credential_key_version
        ? normalizeGoogleContactsCredentialBinding({
            reference: String(row.credential_reference),
            keyVersion: String(row.credential_key_version),
          })
        : null,
    oauthAttemptIntent: intent === "connect" || intent === "reconnect" || intent === "replace" ? intent : null,
  };
};

export const isGoogleContactsConnectionUsable = async (
  connectionId: string,
  credential: GoogleContactsCredentialBinding,
): Promise<boolean> => {
  const binding = normalizeGoogleContactsCredentialBinding(credential);
  const [row] = await pg`
    SELECT 1
    FROM google_contacts_connections
    WHERE id = ${connectionId}
      AND status = 'connected'
      AND credential_reference = ${binding.reference}
      AND credential_key_version = ${binding.keyVersion}
  `;
  return Boolean(row);
};

export const beginGoogleContactsConnectionAttempt = async (input: {
  organizationId: string;
  createdBy: string;
  oauthAttemptNonceHash: string;
  intent: GoogleContactsOAuthAttemptIntent;
}): Promise<GoogleContactsConnectionAttempt> => {
  const oauthAttemptNonceHash = requireOAuthAttemptNonceHash(input.oauthAttemptNonceHash);
  const [row] = await pg`
    INSERT INTO google_contacts_connections (
      organization_id,
      status,
      created_by,
      oauth_attempt_nonce_hash,
      oauth_attempt_intent
    ) VALUES (
      ${input.organizationId},
      'connecting',
      ${input.createdBy},
      ${oauthAttemptNonceHash},
      ${input.intent}
    )
    ON CONFLICT (organization_id) DO UPDATE
    SET
      status = 'connecting',
      oauth_attempt_nonce_hash = EXCLUDED.oauth_attempt_nonce_hash,
      oauth_attempt_intent = EXCLUDED.oauth_attempt_intent,
      updated_at = NOW()
    WHERE google_contacts_connections.status <> 'connected'
      OR EXCLUDED.oauth_attempt_intent = 'replace'
    RETURNING status, google_account_email, connected_at, initial_sync_status, last_successful_sync_at
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
  resetDestination?: boolean;
}): Promise<GoogleContactsSyncStatus | null> => {
  const binding = normalizeGoogleContactsCredentialBinding(input.credential);
  const oauthAttemptNonceHash = requireOAuthAttemptNonceHash(input.oauthAttemptNonceHash);
  const resetDestination = input.resetDestination === true;
  return pg.begin(async (tx) => {
    if (resetDestination) {
      const [connection] = await tx`
        SELECT id
        FROM google_contacts_connections
        WHERE organization_id = ${input.organizationId}
          AND status = 'connecting'
          AND oauth_attempt_nonce_hash = ${oauthAttemptNonceHash}
        FOR UPDATE
      `;
      if (!connection) return null;
      await tx`
        DELETE FROM google_contacts_sync_outbox
        WHERE connection_id = ${connection.id}
      `;
      await tx`
        DELETE FROM google_contacts_customer_links
        WHERE connection_id = ${connection.id}
      `;
    }

    const [row] = await tx`
      UPDATE google_contacts_connections
      SET
        status = 'connected',
        google_account_email = ${input.googleAccountEmail},
        google_account_subject = ${input.googleAccountSubject},
        credential_reference = ${binding.reference},
        credential_key_version = ${binding.keyVersion},
        oauth_attempt_nonce_hash = NULL,
        oauth_attempt_intent = NULL,
        connected_at = CASE
          WHEN ${resetDestination} THEN NOW()
          ELSE COALESCE(connected_at, NOW())
        END,
        initial_sync_status = CASE
          WHEN ${resetDestination} THEN 'not_started'
          ELSE initial_sync_status
        END,
        last_successful_sync_at = CASE
          WHEN ${resetDestination} THEN NULL
          ELSE last_successful_sync_at
        END,
        updated_at = NOW()
      WHERE organization_id = ${input.organizationId}
        AND status = 'connecting'
        AND oauth_attempt_nonce_hash = ${oauthAttemptNonceHash}
      RETURNING
        status,
        google_account_email,
        connected_at,
        initial_sync_status,
        last_successful_sync_at
    `;
    return row ? mapGoogleContactsSyncStatus(row as ConnectionRow) : null;
  });
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
      status = 'connected',
      oauth_attempt_nonce_hash = NULL,
      oauth_attempt_intent = NULL,
      updated_at = NOW()
    WHERE organization_id = ${input.organizationId}
      AND status = 'connecting'
      AND credential_reference IS NOT NULL
      AND oauth_attempt_intent = 'replace'
      AND oauth_attempt_nonce_hash = ${oauthAttemptNonceHash}
  `;
  await pg`
    UPDATE google_contacts_connections
    SET
      status = 'reconnect_required',
      oauth_attempt_nonce_hash = NULL,
      oauth_attempt_intent = NULL,
      updated_at = NOW()
    WHERE organization_id = ${input.organizationId}
      AND status = 'connecting'
      AND credential_reference IS NOT NULL
      AND oauth_attempt_nonce_hash = ${oauthAttemptNonceHash}
  `;
  return getGoogleContactsConnectionStatus(input.organizationId);
};

export const disconnectGoogleContactsConnection = async (
  organizationId: string,
): Promise<GoogleContactsDisconnectResult> => {
  return pg.begin(async (tx) => {
    const [row] = await tx`
      SELECT id, credential_reference, credential_key_version
      FROM google_contacts_connections
      WHERE organization_id = ${organizationId}
      FOR UPDATE
    `;
    if (!row) {
      return { disconnected: false, credential: null };
    }
    await tx`
      DELETE FROM google_contacts_connections
      WHERE id = ${row.id}
    `;
    return {
      disconnected: true,
      credential:
        row.credential_reference && row.credential_key_version
          ? normalizeGoogleContactsCredentialBinding({
              reference: String(row.credential_reference),
              keyVersion: String(row.credential_key_version),
            })
          : null,
    };
  });
};
