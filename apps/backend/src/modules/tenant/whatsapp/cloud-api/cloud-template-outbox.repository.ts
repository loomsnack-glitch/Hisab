import type { WhatsAppMessageTemplateKind } from "@repo/types";
import { pg } from "@/config/db";
import { type CloudTemplateSendSnapshot } from "./cloud-template-admission";

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
  intent: WhatsAppMessageTemplateKind;
  snapshot: CloudTemplateSendSnapshot;
  messageId: string;
  idempotencyKey: string;
};

export const createCloudTemplateOutbox = async (params: CloudTemplateOutboxRequest): Promise<CloudTemplateOutboxRecord> => pg.begin(async tx => {
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
      'outbound', 'template', NULL, 'queued', ${params.idempotencyKey}
    )
    ON CONFLICT (whatsapp_account_id, idempotency_key) DO NOTHING
    RETURNING id, status
  `;
  if (!message) throw new Error("Failed to create Cloud template message");
  const [outbox] = await tx`
    INSERT INTO whatsapp_outbox (
      organization_id, store_id, whatsapp_account_id, message_id, kind,
      status, cloud_template_binding_id, cloud_template_snapshot
    ) VALUES (
      ${params.organizationId}, ${params.storeId}, ${params.accountId}, ${message.id}, 'template', 'pending',
      ${params.snapshot.bindingId}, ${JSON.stringify(params.snapshot)}::jsonb
    )
    RETURNING id, status
  `;
  if (!outbox) throw new Error("Failed to create Cloud template outbox");
  await tx`
    UPDATE whatsapp_conversations
    SET last_message_at = NOW(), updated_at = NOW()
    WHERE id = ${conversation.id}
  `;
  return {
    messageId: String(message.id),
    outboxId: String(outbox.id),
    messageStatus: String(message.status),
    outboxStatus: String(outbox.status),
  };
});
