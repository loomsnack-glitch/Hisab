import {
  WhatsAppCloudAccountSnapshotSchema,
  type WhatsAppCloudAccountSnapshot,
} from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";

type CloudAccountSnapshotRow = Record<string, unknown>;

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
