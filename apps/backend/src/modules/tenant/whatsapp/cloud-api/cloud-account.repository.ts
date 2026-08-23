import {
  WhatsAppCloudAccountSnapshotSchema,
  type WhatsAppCloudAccountSnapshot,
} from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import {
  normalizeCloudCredentialBinding,
  type CloudCredentialBinding,
} from "./cloud-credentials";

type CloudAccountSnapshotRow = Record<string, unknown>;

export type ProvisionCloudAccountInput = {
  organizationId: string;
  createdBy: string;
  wabaId: string;
  displayName: string | null;
  credential: CloudCredentialBinding;
  phoneNumberId: string;
  phoneNumber: string;
  verifiedName: string | null;
  qualityRating: string | null;
  messagingLimit: number | null;
};

export type CloudCredentialBindingRecord = CloudCredentialBinding & {
  businessAccountId: string;
};

export type CloudAccountHealthStatus =
  | "connected"
  | "needs_action"
  | "disconnected"
  | "suspended"
  | "failed";

export type LegacyWhatsAppAccountStatus = "connected" | "disconnected" | "failed";

export const legacyAccountStatusForCloudHealth = (
  status: CloudAccountHealthStatus,
): LegacyWhatsAppAccountStatus => {
  switch (status) {
    case "connected":
      return "connected";
    case "disconnected":
      return "disconnected";
    case "needs_action":
    case "suspended":
    case "failed":
      return "failed";
  }
};

export type CloudAccountScope = {
  businessAccountId: string | null;
  status: WhatsAppCloudAccountSnapshot["status"];
};

const providerId = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!/^\d{1,64}$/.test(normalized)) {
    throw new Error(`Invalid WhatsApp Cloud ${label}`);
  }
  return normalized;
};

/**
 * Meta has already validated this sender before returning its display number.
 * Keep only the E.164 shape required by our database; strict libphonenumber
 * validation rejects synthetic Meta API test numbers such as +1 555-144-2579.
 */
export const normalizeCloudPhoneNumber = (value: string): string => {
  const normalized = value.trim().replace(/[\s().-]/g, "");
  if (!/^\+[1-9][0-9]{7,14}$/.test(normalized)) {
    throw new Error("Invalid WhatsApp Cloud phone number");
  }
  return normalized;
};

const nullableText = (value: string | null, maxLength: number): string | null => {
  if (value === null) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength || /[\r\n]/.test(normalized)) {
    throw new Error("WhatsApp Cloud account metadata is invalid");
  }
  return normalized;
};

const nullableLimit = (value: number | null): number | null => {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 0) throw new Error("WhatsApp Cloud messaging limit is invalid");
  return value;
};

/**
 * Map only safe Cloud account metadata. Credential references and key versions
 * are intentionally not selected or returned by this repository boundary.
 */
export const mapCloudAccountSnapshot = (
  row: CloudAccountSnapshotRow,
): WhatsAppCloudAccountSnapshot => {
  const mapped = snakeToCamel(row) as Record<string, unknown>;
  return WhatsAppCloudAccountSnapshotSchema.parse({
    id: mapped.id,
    organizationId: mapped.organizationId,
    whatsappBusinessAccountId: mapped.whatsappBusinessAccountId ?? null,
    wabaId: mapped.wabaId ?? null,
    phoneNumberId: mapped.phoneNumberId ?? null,
    verifiedName: mapped.verifiedName ?? null,
    status: mapped.status ?? null,
    qualityRating: mapped.qualityRating ?? null,
    messagingLimit: mapped.messagingLimit ?? null,
    lastLimitSyncedAt: mapped.lastLimitSyncedAt ?? null,
    lastWebhookAt: mapped.lastWebhookAt ?? null,
    lastGraphApiAt: mapped.lastGraphApiAt ?? null,
    lastErrorCode: mapped.lastErrorCode ?? null,
  });
};

const cloudAccountSnapshotColumns = (accountAlias: string): string => `
    ${accountAlias}.id,
    ${accountAlias}.organization_id,
    ${accountAlias}.whatsapp_business_account_id,
    business.waba_id,
    ${accountAlias}.cloud_phone_number_id AS phone_number_id,
    ${accountAlias}.cloud_verified_name AS verified_name,
    ${accountAlias}.cloud_status AS status,
    ${accountAlias}.cloud_quality_rating AS quality_rating,
    ${accountAlias}.cloud_messaging_limit AS messaging_limit,
    ${accountAlias}.cloud_limit_synced_at AS last_limit_synced_at,
    ${accountAlias}.cloud_last_webhook_at AS last_webhook_at,
    ${accountAlias}.cloud_last_graph_api_at AS last_graph_api_at,
    ${accountAlias}.cloud_last_error_code AS last_error_code
`;

export const getCloudAccountSnapshot = async (
  organizationId: string,
  accountId: string,
): Promise<WhatsAppCloudAccountSnapshot | null> => {
  const [row] = await pg.unsafe(
    `
      SELECT ${cloudAccountSnapshotColumns("account")}
      FROM whatsapp_accounts account
      LEFT JOIN whatsapp_business_accounts business
        ON business.id = account.whatsapp_business_account_id
       AND business.organization_id = account.organization_id
      WHERE account.organization_id = $1
        AND account.id = $2
        AND account.provider = 'cloud_api'
    `,
    [organizationId, accountId],
  );
  return row ? mapCloudAccountSnapshot(row as CloudAccountSnapshotRow) : null;
};

/** Internal send-time scope; the business-account UUID is not public metadata. */
export const getCloudAccountScope = async (
  organizationId: string,
  accountId: string,
): Promise<CloudAccountScope | null> => {
  const [row] = await pg`
    SELECT account.whatsapp_business_account_id AS business_account_id,
           account.cloud_status AS status
    FROM whatsapp_accounts account
    LEFT JOIN whatsapp_business_accounts business
      ON business.id = account.whatsapp_business_account_id
     AND business.organization_id = account.organization_id
    WHERE account.organization_id = ${organizationId}
      AND account.id = ${accountId}
      AND account.provider = 'cloud_api'
  `;
  if (!row) return null;
  return {
    businessAccountId: row.business_account_id ? String(row.business_account_id) : null,
    status: (row.status as CloudAccountScope["status"]) ?? null,
  };
};

export const listCloudAccountSnapshots = async (
  organizationId: string,
): Promise<WhatsAppCloudAccountSnapshot[]> => {
  const rows = (await pg.unsafe(
    `
      SELECT ${cloudAccountSnapshotColumns("account")}
      FROM whatsapp_accounts account
      LEFT JOIN whatsapp_business_accounts business
        ON business.id = account.whatsapp_business_account_id
       AND business.organization_id = account.organization_id
      WHERE account.organization_id = $1
        AND account.provider = 'cloud_api'
      ORDER BY account.created_at DESC, account.id DESC
    `,
    [organizationId],
  )) as CloudAccountSnapshotRow[];
  return rows.map((row: CloudAccountSnapshotRow) => mapCloudAccountSnapshot(row));
};

/**
 * Persist an already provider-validated WABA and sender identity atomically.
 * This method deliberately accepts a credential binding, never an access token.
 */
export const persistProvisionedCloudAccount = async (
  input: ProvisionCloudAccountInput,
): Promise<WhatsAppCloudAccountSnapshot> => {
  const wabaId = providerId(input.wabaId, "WABA ID");
  const phoneNumberId = providerId(input.phoneNumberId, "Phone Number ID");
  const phoneNumber = normalizeCloudPhoneNumber(input.phoneNumber);
  const credential = normalizeCloudCredentialBinding(input.credential);
  const displayName = nullableText(input.displayName, 255);
  const verifiedName = nullableText(input.verifiedName, 255);
  const qualityRating = nullableText(input.qualityRating, 32);
  const messagingLimit = nullableLimit(input.messagingLimit);

  return pg.begin(async (tx) => {
    const [business] = await tx`
      INSERT INTO whatsapp_business_accounts (
        organization_id,
        waba_id,
        display_name,
        credential_reference,
        credential_key_version,
        status,
        created_by,
        updated_by
      )
      VALUES (
        ${input.organizationId},
        ${wabaId},
        ${displayName},
        ${credential.reference},
        ${credential.keyVersion},
        'connected',
        ${input.createdBy},
        ${input.createdBy}
      )
      ON CONFLICT (waba_id) WHERE waba_id IS NOT NULL DO UPDATE SET
        display_name = EXCLUDED.display_name,
        credential_reference = EXCLUDED.credential_reference,
        credential_key_version = EXCLUDED.credential_key_version,
        status = 'connected',
        last_error_code = NULL,
        last_error_message = NULL,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      WHERE whatsapp_business_accounts.organization_id = EXCLUDED.organization_id
      RETURNING id, organization_id
    `;
    if (!business || String(business.organization_id) !== input.organizationId) {
      throw new Error("WhatsApp Cloud WABA is owned by another organization");
    }

    await tx`
      INSERT INTO whatsapp_accounts (
        organization_id,
        store_id,
        provider,
        phone_number,
        phone_number_normalized,
        status,
        whatsapp_business_account_id,
        cloud_phone_number_id,
        cloud_verified_name,
        cloud_quality_rating,
        cloud_messaging_limit,
        cloud_limit_synced_at,
        cloud_status,
        created_by,
        updated_by
      )
      VALUES (
        ${input.organizationId},
        NULL,
        'cloud_api',
        ${phoneNumber},
        ${phoneNumber},
        'connected',
        ${business.id},
        ${phoneNumberId},
        ${verifiedName},
        ${qualityRating},
        ${messagingLimit},
        NOW(),
        'connected',
        ${input.createdBy},
        ${input.createdBy}
      )
      ON CONFLICT (cloud_phone_number_id) WHERE cloud_phone_number_id IS NOT NULL
      DO UPDATE SET
        whatsapp_business_account_id = EXCLUDED.whatsapp_business_account_id,
        phone_number = EXCLUDED.phone_number,
        phone_number_normalized = EXCLUDED.phone_number_normalized,
        status = 'connected',
        cloud_verified_name = EXCLUDED.cloud_verified_name,
        cloud_quality_rating = EXCLUDED.cloud_quality_rating,
        cloud_messaging_limit = EXCLUDED.cloud_messaging_limit,
        cloud_limit_synced_at = EXCLUDED.cloud_limit_synced_at,
        cloud_status = 'connected',
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      WHERE whatsapp_accounts.organization_id = EXCLUDED.organization_id
    `;

    const [snapshot] = await tx.unsafe(
      `
        SELECT ${cloudAccountSnapshotColumns("account")}
        FROM whatsapp_accounts account
        LEFT JOIN whatsapp_business_accounts business
          ON business.id = account.whatsapp_business_account_id
         AND business.organization_id = account.organization_id
        WHERE account.organization_id = $1
          AND account.cloud_phone_number_id = $2
          AND account.provider = 'cloud_api'
      `,
      [input.organizationId, phoneNumberId],
    );
    if (!snapshot) throw new Error("Provisioned WhatsApp Cloud account was not found");
    return mapCloudAccountSnapshot(snapshot as CloudAccountSnapshotRow);
  });
};

export const getCloudCredentialBinding = async (
  organizationId: string,
  accountId: string,
): Promise<CloudCredentialBindingRecord | null> => {
  const [row] = await pg`
    SELECT business.id AS business_account_id,
           business.credential_reference,
           business.credential_key_version
    FROM whatsapp_accounts account
    INNER JOIN whatsapp_business_accounts business
      ON business.id = account.whatsapp_business_account_id
     AND business.organization_id = account.organization_id
    WHERE account.organization_id = ${organizationId}
      AND account.id = ${accountId}
      AND account.provider = 'cloud_api'
  `;
  if (!row?.credential_reference || !row.credential_key_version) return null;
  const credential = normalizeCloudCredentialBinding({
    reference: String(row.credential_reference),
    keyVersion: String(row.credential_key_version),
  });
  return { businessAccountId: String(row.business_account_id), ...credential };
};

export const rotateCloudCredentialBinding = async (input: {
  organizationId: string;
  businessAccountId: string;
  credential: CloudCredentialBinding;
  updatedBy: string;
}): Promise<boolean> => {
  const credential = normalizeCloudCredentialBinding(input.credential);
  const rows = await pg`
    UPDATE whatsapp_business_accounts
    SET credential_reference = ${credential.reference},
        credential_key_version = ${credential.keyVersion},
        updated_by = ${input.updatedBy},
        updated_at = NOW()
    WHERE id = ${input.businessAccountId}
      AND organization_id = ${input.organizationId}
      AND status NOT IN ('revoked', 'failed')
  `;
  return rows.count === 1;
};

export const refreshCloudAccountMetadata = async (input: {
  organizationId: string;
  accountId: string;
  wabaId: string;
  displayName: string | null;
  phoneNumberId: string;
  phoneNumber: string;
  verifiedName: string | null;
  qualityRating: string | null;
  messagingLimit: number | null;
  updatedBy: string;
}): Promise<WhatsAppCloudAccountSnapshot | null> => {
  const wabaId = providerId(input.wabaId, "WABA ID");
  const phoneNumberId = providerId(input.phoneNumberId, "Phone Number ID");
  const phoneNumber = normalizeCloudPhoneNumber(input.phoneNumber);

  return pg.begin(async tx => {
    const [business] = await tx`
      UPDATE whatsapp_business_accounts business
      SET waba_id = ${wabaId},
          display_name = ${nullableText(input.displayName, 255)},
          status = 'connected',
          last_error_code = NULL,
          last_error_message = NULL,
          last_graph_api_at = NOW(),
          updated_by = ${input.updatedBy},
          updated_at = NOW()
      WHERE business.id = (
        SELECT account.whatsapp_business_account_id
        FROM whatsapp_accounts account
        WHERE account.id = ${input.accountId}
          AND account.organization_id = ${input.organizationId}
          AND account.provider = 'cloud_api'
      )
        AND business.organization_id = ${input.organizationId}
      RETURNING business.id
    `;
    if (!business) return null;

    const [account] = await tx`
      UPDATE whatsapp_accounts
      SET phone_number = ${phoneNumber},
          phone_number_normalized = ${phoneNumber},
          cloud_phone_number_id = ${phoneNumberId},
          cloud_verified_name = ${nullableText(input.verifiedName, 255)},
          cloud_quality_rating = ${nullableText(input.qualityRating, 32)},
          cloud_messaging_limit = ${nullableLimit(input.messagingLimit)},
          cloud_limit_synced_at = NOW(),
          cloud_status = 'connected',
          status = 'connected',
          cloud_last_graph_api_at = NOW(),
          cloud_last_error_code = NULL,
          cloud_last_error_message = NULL,
          updated_by = ${input.updatedBy},
          updated_at = NOW()
      WHERE id = ${input.accountId}
        AND organization_id = ${input.organizationId}
        AND provider = 'cloud_api'
        AND whatsapp_business_account_id = ${business.id}
      RETURNING id
    `;
    if (!account) return null;

    const [snapshot] = await tx.unsafe(
      `
        SELECT ${cloudAccountSnapshotColumns("account")}
        FROM whatsapp_accounts account
        LEFT JOIN whatsapp_business_accounts business
          ON business.id = account.whatsapp_business_account_id
         AND business.organization_id = account.organization_id
        WHERE account.organization_id = $1
          AND account.id = $2
          AND account.provider = 'cloud_api'
      `,
      [input.organizationId, input.accountId],
    );
    return snapshot ? mapCloudAccountSnapshot(snapshot as CloudAccountSnapshotRow) : null;
  });
};

export const recordCloudAccountHealth = async (input: {
  organizationId: string;
  accountId: string;
  status?: CloudAccountHealthStatus;
  errorCode: string;
  errorMessage: string;
}): Promise<boolean> => {
  const legacyStatus = input.status ? legacyAccountStatusForCloudHealth(input.status) : null;
  return pg.begin(async tx => {
    const [account] = await tx`
    UPDATE whatsapp_accounts
    SET cloud_status = COALESCE(${input.status ?? null}::whatsapp_cloud_account_status_enum, cloud_status),
        status = COALESCE(${legacyStatus}::whatsapp_account_status_enum, status),
        cloud_last_error_code = LEFT(${input.errorCode}, 100),
        cloud_last_error_message = LEFT(${input.errorMessage}, 1_000),
        updated_at = NOW()
    WHERE id = ${input.accountId}
      AND organization_id = ${input.organizationId}
      AND provider = 'cloud_api'
    RETURNING whatsapp_business_account_id
  `;
    if (!account) return false;
    await tx`
    UPDATE whatsapp_business_accounts
    SET status = COALESCE(${input.status ?? null}::whatsapp_cloud_account_status_enum, status),
        last_error_code = LEFT(${input.errorCode}, 100),
        last_error_message = LEFT(${input.errorMessage}, 1_000),
        updated_at = NOW()
    WHERE id = ${account.whatsapp_business_account_id}
      AND organization_id = ${input.organizationId}
    `;
    return true;
  });
};

export const revokeCloudAccount = async (input: {
  organizationId: string;
  accountId: string;
  updatedBy: string;
}): Promise<boolean> => {
  return pg.begin(async tx => {
    const [account] = await tx`
      SELECT whatsapp_business_account_id
      FROM whatsapp_accounts
      WHERE id = ${input.accountId}
        AND organization_id = ${input.organizationId}
        AND provider = 'cloud_api'
      FOR UPDATE
    `;
    if (!account) return false;

    await tx`
      UPDATE whatsapp_business_accounts
      SET status = 'revoked',
          updated_by = ${input.updatedBy},
          updated_at = NOW()
      WHERE id = ${account.whatsapp_business_account_id}
        AND organization_id = ${input.organizationId}
    `;
    await tx`
      UPDATE whatsapp_accounts
      SET cloud_status = 'revoked',
          status = 'revoked',
          updated_by = ${input.updatedBy},
          updated_at = NOW()
      WHERE id = ${input.accountId}
        AND organization_id = ${input.organizationId}
        AND provider = 'cloud_api'
    `;
    return true;
  });
};
