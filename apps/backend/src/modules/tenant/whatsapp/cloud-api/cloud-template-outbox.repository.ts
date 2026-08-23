import type { WhatsAppMessageTemplateKind } from "@repo/types";
import { pg } from "@/config/db";
import { type CloudTemplateSendSnapshot } from "./cloud-template-admission";
import { reserveCloudQuota } from "./cloud-quota.repository";

export type CloudTemplateOutboxRecord = {
  messageId: string;
  outboxId: string;
  messageStatus: string;
  outboxStatus: string;
};

export type CloudTemplateOutboxRequest = {
  organizationId: string;
  storeId: string;
  accountId: string;
  customerId: string;
  customerPhone: string;
  customerName: string;
  saleId?: string | null;
  campaignId?: string | null;
  intent: WhatsAppMessageTemplateKind;
  snapshot: CloudTemplateSendSnapshot;
  messageId: string;
  idempotencyKey: string;
  campaignKey?: string | null;
};

const idempotencyKeyFor = (value: string): string => {
  const normalized = value.trim();
  if (!normalized || normalized.length > 255 || /[\r\n]/.test(normalized)) {
    throw new Error("Cloud template idempotency key is invalid");
  }
  return normalized;
};

const recordFrom = (row: Record<string, unknown>): CloudTemplateOutboxRecord => ({
  messageId: String(row.message_id),
  outboxId: String(row.outbox_id),
  messageStatus: String(row.message_status),
  outboxStatus: String(row.outbox_status),
});

export const createCloudTemplateOutbox = async (params: CloudTemplateOutboxRequest): Promise<CloudTemplateOutboxRecord> => pg.begin(async tx => {
  const idempotencyKey = idempotencyKeyFor(params.idempotencyKey);
  const [existing] = await tx`
    SELECT message.id AS message_id, message.organization_id, message.store_id,
           conversation.customer_id,
           outbox.id AS outbox_id, message.status AS message_status,
           outbox.status AS outbox_status
    FROM whatsapp_messages message
    INNER JOIN whatsapp_conversations conversation ON conversation.id = message.conversation_id
    INNER JOIN whatsapp_outbox outbox ON outbox.message_id = message.id
    WHERE message.whatsapp_account_id = ${params.accountId}
      AND message.idempotency_key = ${idempotencyKey}
    FOR UPDATE OF message, outbox
  `;
  if (existing) {
    if (String(existing.organization_id) !== params.organizationId || String(existing.store_id) !== params.storeId || String(existing.customer_id) !== params.customerId) {
      throw new Error("Cloud template idempotency key is already used for another send");
    }
    return recordFrom(existing as Record<string, unknown>);
  }

  const [scope] = await tx`
    SELECT account.id, account.provider, account.cloud_status,
           binding.is_active, binding.whatsapp_business_account_id,
           asset.status AS template_status, asset.version AS template_version,
           asset.category AS template_category
    FROM whatsapp_accounts account
    INNER JOIN whatsapp_account_stores assignment
      ON assignment.whatsapp_account_id = account.id
     AND assignment.organization_id = account.organization_id
     AND assignment.store_id = ${params.storeId}
    INNER JOIN whatsapp_cloud_template_bindings binding
      ON binding.organization_id = account.organization_id
     AND binding.store_id = assignment.store_id
     AND binding.id = ${params.snapshot.bindingId}
     AND binding.whatsapp_business_account_id = account.whatsapp_business_account_id
    INNER JOIN whatsapp_cloud_templates asset
      ON asset.id = binding.cloud_template_id
     AND asset.organization_id = binding.organization_id
    WHERE account.id = ${params.accountId}
      AND account.organization_id = ${params.organizationId}
      AND account.provider = 'cloud_api'
      AND account.cloud_status = 'connected'
      AND binding.is_active = TRUE
      AND asset.status = 'approved'
    FOR UPDATE OF account, binding, asset
  `;
  if (!scope) throw new Error("Cloud template send is no longer available");
  if (String(scope.template_version) !== String(params.snapshot.version) || String(scope.template_category) !== params.snapshot.category) {
    throw new Error("Cloud template changed after admission; retry with the current approved template");
  }
  const [customer] = await tx`
    SELECT id
    FROM customers
    WHERE id = ${params.customerId}
      AND organization_id = ${params.organizationId}
      AND is_active = TRUE
      AND phone = ${params.customerPhone}
      AND whatsapp_suppressed = FALSE
      AND (
        (${params.intent === "promotion"} AND marketing_opted_in = TRUE AND marketing_opted_out = FALSE)
        OR (${params.intent !== "promotion"} AND utility_opted_in = TRUE)
      )
  `;
  if (!customer) throw new Error("Customer WhatsApp consent is no longer valid");
  const [queued] = await tx`
    SELECT COUNT(*) AS count
    FROM whatsapp_outbox
    WHERE whatsapp_account_id = ${params.accountId}
      AND status IN ('pending', 'processing', 'retryable')
  `;
  const configuredLimit = Number(process.env.WHATSAPP_MAX_PENDING_OUTBOX_PER_ACCOUNT ?? 1_000);
  const pendingLimit = Number.isInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 1_000;
  if (Number(queued?.count ?? 0) >= pendingLimit) {
    throw new Error("WhatsApp account queue is full; retry shortly");
  }
  const quota = await reserveCloudQuota(tx, {
    organizationId: params.organizationId,
    accountId: params.accountId,
    storeId: params.storeId,
    customerId: params.customerId,
    idempotencyKey,
    campaignKey: params.campaignKey,
  });
  if (quota.status === "released") {
    throw new Error("Cloud template idempotency key was already released; use a new key");
  }
  const externalChatId = `${params.customerPhone.replace(/^\+/, "")}@s.whatsapp.net`;
  const [conversation] = await tx`
    INSERT INTO whatsapp_conversations (
      organization_id, store_id, whatsapp_account_id, customer_id,
      external_chat_id, contact_phone_number, display_name
    ) VALUES (
      ${params.organizationId}, ${params.storeId}, ${params.accountId}, ${params.customerId},
      ${externalChatId}, ${params.customerPhone}, ${params.customerName}
    )
    ON CONFLICT (whatsapp_account_id, store_id, external_chat_id)
    DO UPDATE SET customer_id = EXCLUDED.customer_id,
      contact_phone_number = EXCLUDED.contact_phone_number,
      display_name = EXCLUDED.display_name,
      updated_at = NOW()
    RETURNING id
  `;
  if (!conversation) throw new Error("Failed to create Cloud template conversation");
  const [message] = await tx`
    INSERT INTO whatsapp_messages (
      id, organization_id, store_id, whatsapp_account_id, conversation_id,
      direction, message_type, body, status, idempotency_key
    ) VALUES (
      ${params.messageId}, ${params.organizationId}, ${params.storeId}, ${params.accountId}, ${conversation.id},
      'outbound', 'template', NULL, 'queued', ${idempotencyKey}
    )
    ON CONFLICT (whatsapp_account_id, idempotency_key) DO NOTHING
    RETURNING id, status
  `;
  if (!message) {
    const [raced] = await tx`
      SELECT message.id AS message_id, message.organization_id, message.store_id,
             conversation.customer_id,
             outbox.id AS outbox_id, message.status AS message_status,
             outbox.status AS outbox_status
      FROM whatsapp_messages message
      INNER JOIN whatsapp_conversations conversation ON conversation.id = message.conversation_id
      INNER JOIN whatsapp_outbox outbox ON outbox.message_id = message.id
      WHERE message.whatsapp_account_id = ${params.accountId}
        AND message.idempotency_key = ${idempotencyKey}
      FOR UPDATE OF message, outbox
    `;
    if (!raced) throw new Error("Failed to create Cloud template message");
    if (String(raced.organization_id) !== params.organizationId || String(raced.store_id) !== params.storeId || String(raced.customer_id) !== params.customerId) {
      throw new Error("Cloud template idempotency key is already used for another send");
    }
    if (params.campaignId) {
      await tx`
        INSERT INTO whatsapp_campaign_recipients (
          organization_id, store_id, campaign_id, customer_id, phone_number, message_id, outbox_id, status
        ) VALUES (
          ${params.organizationId}, ${params.storeId}, ${params.campaignId}, ${params.customerId}, ${params.customerPhone}, ${raced.message_id}, ${raced.outbox_id}, 'pending'
        )
        ON CONFLICT (campaign_id, customer_id)
        DO UPDATE SET message_id = EXCLUDED.message_id, outbox_id = EXCLUDED.outbox_id, status = 'pending', updated_at = NOW()
      `;
    }
    return recordFrom(raced as Record<string, unknown>);
  }
  const [outbox] = await tx`
    INSERT INTO whatsapp_outbox (
      organization_id, store_id, whatsapp_account_id, message_id, sale_id, kind,
      status, cloud_template_binding_id, cloud_template_snapshot, cloud_quota_reservation_id
    ) VALUES (
      ${params.organizationId}, ${params.storeId}, ${params.accountId}, ${message.id}, ${params.saleId ?? null}, 'template', 'pending',
      ${params.snapshot.bindingId}, ${params.snapshot}::jsonb, ${quota.id}
    )
    RETURNING id, status
  `;
  if (!outbox) throw new Error("Failed to create Cloud template outbox");
  if (params.campaignId) {
    await tx`
      INSERT INTO whatsapp_campaign_recipients (
        organization_id, store_id, campaign_id, customer_id, phone_number, message_id, outbox_id, status
      ) VALUES (
        ${params.organizationId}, ${params.storeId}, ${params.campaignId}, ${params.customerId}, ${params.customerPhone}, ${message.id}, ${outbox.id}, 'pending'
      )
      ON CONFLICT (campaign_id, customer_id)
      DO UPDATE SET message_id = EXCLUDED.message_id, outbox_id = EXCLUDED.outbox_id, status = 'pending', updated_at = NOW()
    `;
  }
  await tx`
    UPDATE whatsapp_conversations
    SET last_message_at = NOW(), updated_at = NOW()
    WHERE id = ${conversation.id}
  `;
  return recordFrom({
    message_id: message.id,
    outbox_id: outbox.id,
    message_status: message.status,
    outbox_status: outbox.status,
  });
});
