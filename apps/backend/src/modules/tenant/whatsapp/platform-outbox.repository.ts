import { randomUUID } from "node:crypto";
import type { CloudTemplateComponent } from "./cloud-api/cloud-outbound";
import type { PlatformTemplateKind } from "./platform-template-health";
import { pg } from "@/config/db";

export const GANATRI_PLATFORM_SENDER_KEY = "ganatri_utility" as const;

export type PlatformSenderSnapshot = Readonly<{
  senderKey: typeof GANATRI_PLATFORM_SENDER_KEY;
  templateKind: PlatformTemplateKind;
  phoneNumberId: string;
  wabaId: string;
  graphVersion: string;
  templateName: string;
  templateLanguage: string;
  policyVersion: number;
  components: CloudTemplateComponent[];
}>;

export type PlatformTemplateOutboxRequest = Readonly<{
  organizationId: string;
  storeId: string;
  customerId: string;
  customerPhone: string;
  saleId?: string | null;
  messageId?: string;
  idempotencyKey: string;
  snapshot: PlatformSenderSnapshot;
}>;

export type PlatformTemplateOutboxRecord = Readonly<{
  messageId: string;
  outboxId: string;
  messageStatus: string;
  outboxStatus: string;
  deduplicated?: boolean;
}>;

const idempotencyKeyFor = (value: string): string => {
  const normalized = value.trim();
  if (!normalized || normalized.length > 255 || /[\r\n]/.test(normalized)) {
    throw new Error("Platform template idempotency key is invalid");
  }
  return normalized;
};

const snapshotForInsert = (snapshot: PlatformSenderSnapshot): PlatformSenderSnapshot => {
  if (snapshot.senderKey !== GANATRI_PLATFORM_SENDER_KEY) {
    throw new Error("Platform sender key is invalid");
  }
  if (snapshot.templateKind !== "bill" && snapshot.templateKind !== "due_reminder") {
    throw new Error("Platform template kind is invalid");
  }
  if (!/^\d{6,32}$/.test(snapshot.phoneNumberId) || !/^\d{6,32}$/.test(snapshot.wabaId)) {
    throw new Error("Platform sender identity is invalid");
  }
  if (!/^v\d+\.\d+$/.test(snapshot.graphVersion)) {
    throw new Error("Platform Graph version is invalid");
  }
  if (!/^[a-z0-9_]{1,512}$/.test(snapshot.templateName)) {
    throw new Error("Platform template name is invalid");
  }
  if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(snapshot.templateLanguage)) {
    throw new Error("Platform template language is invalid");
  }
  if (!Number.isInteger(snapshot.policyVersion) || snapshot.policyVersion < 1) {
    throw new Error("Platform policy version is invalid");
  }
  if (!Array.isArray(snapshot.components) || snapshot.components.length > 20) {
    throw new Error("Platform template components are invalid");
  }
  return snapshot;
};

const recordFrom = (row: Record<string, unknown>, deduplicated = false): PlatformTemplateOutboxRecord => ({
  messageId: String(row.message_id),
  outboxId: String(row.outbox_id),
  messageStatus: String(row.message_status),
  outboxStatus: String(row.outbox_status),
  ...(deduplicated ? { deduplicated: true } : {}),
});

export const createPlatformTemplateOutboxInDatabase = async (
  params: PlatformTemplateOutboxRequest,
  tx: Bun.TransactionSQL,
): Promise<PlatformTemplateOutboxRecord> => {
  const idempotencyKey = idempotencyKeyFor(params.idempotencyKey);
  const snapshot = snapshotForInsert(params.snapshot);
  const messageId = params.messageId ?? randomUUID();

  const [existing] = await tx`
    SELECT message.id AS message_id,
           outbox.id AS outbox_id,
           message.status AS message_status,
           outbox.status AS outbox_status,
           message.organization_id,
           message.store_id
    FROM whatsapp_messages message
    INNER JOIN whatsapp_outbox outbox ON outbox.message_id = message.id
    WHERE message.organization_id = ${params.organizationId}
      AND message.platform_sender_key = ${GANATRI_PLATFORM_SENDER_KEY}
      AND message.idempotency_key = ${idempotencyKey}
    FOR UPDATE OF message, outbox
  `;
  if (existing) {
    if (String(existing.store_id) !== params.storeId) {
      throw new Error("Platform template idempotency key is already used for another Store");
    }
    return recordFrom(existing as Record<string, unknown>, true);
  }

  const [policy] = await tx`
    SELECT mode, revision
    FROM whatsapp_store_policies
    WHERE organization_id = ${params.organizationId}
      AND store_id = ${params.storeId}
      AND effective_to IS NULL
    FOR UPDATE
  `;
  if (!policy || policy.mode !== "ganatri_utility" || Number(policy.revision) !== snapshot.policyVersion) {
    throw new Error("Ganatri Utility Store policy changed; retry the send");
  }

  const [customer] = await tx`
    SELECT id
    FROM customers
    WHERE id = ${params.customerId}
      AND organization_id = ${params.organizationId}
      AND is_active = TRUE
      AND phone = ${params.customerPhone}
      AND whatsapp_suppressed = FALSE
      AND utility_opted_in = TRUE
  `;
  if (!customer) throw new Error("Customer WhatsApp utility consent is no longer valid");

  const [message] = await tx`
    INSERT INTO whatsapp_messages (
      id, organization_id, store_id, whatsapp_account_id, conversation_id,
      recipient_phone_number, platform_sender_key, direction, message_type,
      body, status, idempotency_key
    ) VALUES (
      ${messageId}, ${params.organizationId}, ${params.storeId}, NULL, NULL,
      ${params.customerPhone}, ${GANATRI_PLATFORM_SENDER_KEY}, 'outbound', 'template',
      NULL, 'queued', ${idempotencyKey}
    )
    ON CONFLICT (organization_id, platform_sender_key, idempotency_key)
      WHERE platform_sender_key IS NOT NULL
    DO NOTHING
    RETURNING id, status
  `;
  if (!message) {
    const [raced] = await tx`
      SELECT message.id AS message_id,
             outbox.id AS outbox_id,
             message.status AS message_status,
             outbox.status AS outbox_status,
             message.store_id
      FROM whatsapp_messages message
      INNER JOIN whatsapp_outbox outbox ON outbox.message_id = message.id
      WHERE message.organization_id = ${params.organizationId}
        AND message.platform_sender_key = ${GANATRI_PLATFORM_SENDER_KEY}
        AND message.idempotency_key = ${idempotencyKey}
      FOR UPDATE OF message, outbox
    `;
    if (!raced) throw new Error("Failed to create platform template message");
    if (String(raced.store_id) !== params.storeId) {
      throw new Error("Platform template idempotency key is already used for another Store");
    }
    return recordFrom(raced as Record<string, unknown>, true);
  }

  const [outbox] = await tx`
    INSERT INTO whatsapp_outbox (
      organization_id, store_id, whatsapp_account_id, message_id, customer_id,
      sale_id, kind, status, sender_kind, platform_sender_key,
      platform_sender_snapshot
    ) VALUES (
      ${params.organizationId}, ${params.storeId}, NULL, ${message.id}, ${params.customerId},
      ${params.saleId ?? null}, 'template', 'pending', 'ganatri_platform',
      ${GANATRI_PLATFORM_SENDER_KEY}, ${snapshot}::jsonb
    )
    RETURNING id, status
  `;
  if (!outbox) throw new Error("Failed to create platform template outbox");

  return recordFrom({
    message_id: message.id,
    outbox_id: outbox.id,
    message_status: message.status,
    outbox_status: outbox.status,
  });
};

export const createPlatformTemplateOutbox = async (
  params: PlatformTemplateOutboxRequest,
): Promise<PlatformTemplateOutboxRecord> =>
  pg.begin(async tx => createPlatformTemplateOutboxInDatabase(params, tx));
