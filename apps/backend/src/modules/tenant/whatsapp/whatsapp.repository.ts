import { randomUUID } from "node:crypto";
import type {
    CustomerDTO,
    WhatsAppConversationDTO,
    WhatsAppMessageDTO,
    WhatsAppAccountDTO,
    WhatsAppAccountStatus,
    WhatsAppWorkerAccountDTO,
    WhatsAppWorkerStatusUpdateJSON,
    WhatsAppWorkerMessageEventJSON,
} from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";

type AccountRow = Record<string, unknown>;

export type InvoiceOutboxRecord = {
    messageId: string;
    outboxId: string;
    messageStatus: WhatsAppMessageStatus;
    outboxStatus: WhatsAppOutboxStatus;
};

type InvoiceOutboxParams = {
    organizationId: string;
    storeId: string;
    whatsappAccountId: string;
    saleId: string;
    customerId: string;
    customerPhone: string;
    customerName: string;
    body: string;
    messageId: string;
    idempotencyKey: string;
};

export type InvoiceOutboxJobRecord = {
    accountId: string;
    outboxId: string;
    messageId: string;
    phoneNumber: string;
    messageType: "text" | "document";
    body: string | null;
    caption: string | null;
    attachmentStorageKey: string | null;
    attachmentFileName: string | null;
    attachmentMimeType: string | null;
    attemptCount: number;
    leaseOwner: string;
};

export type MessageEventParams = {
    organizationId: string;
    storeId: string;
    whatsappAccountId: string;
    customerId: string | null;
    externalChatId: string;
    contactPhoneNumber: string;
    displayName: string;
    providerMessageId: string;
    direction: "inbound" | "outbound";
    source: "realtime" | "history";
    messageType: "text" | "document";
    body: string | null;
    caption: string | null;
    attachmentStorageKey: string | null;
    attachmentFileName: string | null;
    attachmentMimeType: string | null;
    occurredAt: string;
};

const mapConversation = (row: Record<string, unknown>): WhatsAppConversationDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        id: String(mapped.id),
        organizationId: String(mapped.organizationId),
        storeId: String(mapped.storeId),
        whatsappAccountId: String(mapped.whatsappAccountId),
        customerId: (mapped.customerId as string | null | undefined) ?? null,
        contactPhoneNumber: String(mapped.contactPhoneNumber),
        displayName: String(mapped.displayName),
        lastMessageAt: (mapped.lastMessageAt as string | null | undefined) ?? null,
        unreadCount: Number(mapped.unreadCount ?? 0),
        isArchived: Boolean(mapped.isArchived),
        createdAt: String(mapped.createdAt),
        updatedAt: String(mapped.updatedAt),
    };
};

const mapMessage = (row: Record<string, unknown>): WhatsAppMessageDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        id: String(mapped.id),
        organizationId: String(mapped.organizationId),
        storeId: String(mapped.storeId),
        whatsappAccountId: String(mapped.whatsappAccountId),
        conversationId: String(mapped.conversationId),
        direction: mapped.direction as WhatsAppMessageDTO["direction"],
        messageType: mapped.messageType as WhatsAppMessageDTO["messageType"],
        body: (mapped.body as string | null | undefined) ?? null,
        caption: (mapped.caption as string | null | undefined) ?? null,
        attachmentFileName: (mapped.attachmentFileName as string | null | undefined) ?? null,
        attachmentMimeType: (mapped.attachmentMimeType as string | null | undefined) ?? null,
        status: mapped.status as WhatsAppMessageDTO["status"],
        providerMessageId: (mapped.providerMessageId as string | null | undefined) ?? null,
        failureCode: (mapped.failureCode as string | null | undefined) ?? null,
        createdAt: String(mapped.createdAt),
        sentAt: (mapped.sentAt as string | null | undefined) ?? null,
        deliveredAt: (mapped.deliveredAt as string | null | undefined) ?? null,
        readAt: (mapped.readAt as string | null | undefined) ?? null,
    };
};

type WhatsAppMessageStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed";
type WhatsAppOutboxStatus = "pending" | "processing" | "sent" | "retryable" | "dead_letter" | "cancelled";

export type WorkerPartition = {
    count: number;
    index: number;
};

export type WhatsAppHistoryAnchor = {
    externalChatId: string;
    providerMessageId: string;
    fromMe: boolean;
    messageTimestamp: number;
};

export type ProviderEventClaim = {
    id: string;
    accountId: string;
    providerEventId: string;
    payload: WhatsAppWorkerMessageEventJSON;
};

export type WhatsAppOperationsMetrics = {
    pendingCount: number;
    processingCount: number;
    retryableCount: number;
    deadLetterCount: number;
    oldestPendingAgeSeconds: number;
    connectedAccountCount: number;
    accountCount: number;
    providerEventPendingCount: number;
    providerEventProcessingCount: number;
    providerEventRetryableCount: number;
    providerEventDeadLetterCount: number;
    oldestProviderEventAgeSeconds: number;
};

export class WhatsAppOutboxLimitError extends Error {
    public constructor() {
        super("WhatsApp account outbox limit reached");
        this.name = "WhatsAppOutboxLimitError";
    }
}

const pendingOutboxLimit = (): number => {
    const value = Number(process.env.WHATSAPP_MAX_PENDING_OUTBOX_PER_ACCOUNT ?? 1_000);
    return Number.isInteger(value) && value > 0 ? value : 1_000;
};

const mapAccount = (row: AccountRow): WhatsAppAccountDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        id: String(mapped.id),
        organizationId: String(mapped.organizationId),
        storeId: String(mapped.storeId),
        provider: mapped.provider as WhatsAppAccountDTO["provider"],
        phoneNumber: String(mapped.phoneNumber),
        status: mapped.status as WhatsAppAccountStatus,
        lastConnectedAt: (mapped.lastConnectedAt as string | null | undefined) ?? null,
        lastSeenAt: (mapped.lastSeenAt as string | null | undefined) ?? null,
        lastErrorCode: (mapped.lastErrorCode as string | null | undefined) ?? null,
        createdAt: String(mapped.createdAt),
        updatedAt: String(mapped.updatedAt),
    };
};

export const getAccount = async (organizationId: string, storeId: string): Promise<WhatsAppAccountDTO | null> => {
    const [row] = await pg`
        SELECT *
        FROM whatsapp_accounts
       WHERE organization_id = ${organizationId}
         AND store_id = ${storeId}
        ORDER BY created_at DESC
        LIMIT 1
    `;
    return row ? mapAccount(row) : null;
};

export const getAccountById = async (accountId: string): Promise<WhatsAppAccountDTO | null> => {
    const [row] = await pg`
        SELECT *
        FROM whatsapp_accounts
       WHERE id = ${accountId}
    `;
    return row ? mapAccount(row) : null;
};

export const getInvoiceOutbox = async (
    organizationId: string,
    storeId: string,
    whatsappAccountId: string,
    saleId: string,
): Promise<InvoiceOutboxRecord | null> => {
    const [row] = await pg`
        SELECT
            o.id AS outbox_id,
            o.status AS outbox_status,
            m.id AS message_id,
            m.status AS message_status
        FROM whatsapp_outbox o
        INNER JOIN whatsapp_messages m ON m.id = o.message_id
        WHERE o.organization_id = ${organizationId}
          AND o.store_id = ${storeId}
          AND o.whatsapp_account_id = ${whatsappAccountId}
          AND o.sale_id = ${saleId}
          AND o.kind = 'invoice'
        LIMIT 1
    `;
    if (!row) return null;
    return {
        messageId: String(row.message_id),
        outboxId: String(row.outbox_id),
        messageStatus: row.message_status as InvoiceOutboxRecord["messageStatus"],
        outboxStatus: row.outbox_status as InvoiceOutboxRecord["outboxStatus"],
    };
};

export const createInvoiceOutbox = async (params: InvoiceOutboxParams): Promise<InvoiceOutboxRecord> => {
    return pg.begin(async tx => {
        const [account] = await tx`
            SELECT id
            FROM whatsapp_accounts
            WHERE id = ${params.whatsappAccountId}
            FOR UPDATE
        `;
        if (!account) throw new Error("WhatsApp account not found");
        const [existingOutbox] = await tx`
            SELECT o.id
            FROM whatsapp_outbox o
            INNER JOIN whatsapp_messages m ON m.id = o.message_id
            WHERE o.whatsapp_account_id = ${params.whatsappAccountId}
              AND m.idempotency_key = ${params.idempotencyKey}
            LIMIT 1
        `;
        if (!existingOutbox) {
            const [queued] = await tx`
                SELECT COUNT(*) AS count
                FROM whatsapp_outbox
                WHERE whatsapp_account_id = ${params.whatsappAccountId}
                  AND status IN ('pending', 'processing', 'retryable')
            `;
            if (Number(queued?.count ?? 0) >= pendingOutboxLimit()) {
                throw new WhatsAppOutboxLimitError();
            }
        }
        const externalChatId = `${params.customerPhone.slice(1)}@s.whatsapp.net`;
        const [conversation] = await tx`
            INSERT INTO whatsapp_conversations (
                organization_id,
                store_id,
                whatsapp_account_id,
                customer_id,
                external_chat_id,
                contact_phone_number,
                display_name
            )
            VALUES (
                ${params.organizationId},
                ${params.storeId},
                ${params.whatsappAccountId},
                ${params.customerId},
                ${externalChatId},
                ${params.customerPhone},
                ${params.customerName}
            )
            ON CONFLICT (whatsapp_account_id, external_chat_id)
            DO UPDATE SET
                customer_id = EXCLUDED.customer_id,
                contact_phone_number = EXCLUDED.contact_phone_number,
                display_name = EXCLUDED.display_name,
                updated_at = NOW()
            RETURNING id
        `;
        if (!conversation) throw new Error("Failed to create WhatsApp conversation");

        const [createdMessage] = await tx`
            INSERT INTO whatsapp_messages (
                id,
                organization_id,
                store_id,
                whatsapp_account_id,
                conversation_id,
                direction,
                message_type,
                body,
                caption,
                attachment_storage_key,
                attachment_file_name,
                attachment_mime_type,
                status,
                idempotency_key
            )
            VALUES (
                ${params.messageId},
                ${params.organizationId},
                ${params.storeId},
                ${params.whatsappAccountId},
                ${conversation.id},
                'outbound',
                'text',
                ${params.body},
                NULL,
                NULL,
                NULL,
                NULL,
                'queued',
                ${params.idempotencyKey}
            )
            ON CONFLICT (whatsapp_account_id, idempotency_key) DO NOTHING
            RETURNING id, status
        `;

        const [message] = createdMessage
            ? [createdMessage]
            : await tx`
                SELECT id, status
                FROM whatsapp_messages
                WHERE whatsapp_account_id = ${params.whatsappAccountId}
                  AND idempotency_key = ${params.idempotencyKey}
            `;
        if (!message) throw new Error("Failed to create WhatsApp message");

        const [createdOutbox] = await tx`
            INSERT INTO whatsapp_outbox (
                organization_id,
                store_id,
                whatsapp_account_id,
                message_id,
                sale_id,
                kind,
                status
            )
            VALUES (
                ${params.organizationId},
                ${params.storeId},
                ${params.whatsappAccountId},
                ${message.id},
                ${params.saleId},
                'invoice',
                'pending'
            )
            ON CONFLICT (whatsapp_account_id, sale_id, kind)
                WHERE kind = 'invoice' AND sale_id IS NOT NULL
            DO NOTHING
            RETURNING id, status
        `;

        const [outbox] = createdOutbox
            ? [createdOutbox]
            : await tx`
                SELECT id, status
                FROM whatsapp_outbox
                WHERE whatsapp_account_id = ${params.whatsappAccountId}
                  AND sale_id = ${params.saleId}
                  AND kind = 'invoice'
            `;
        if (!outbox) throw new Error("Failed to create WhatsApp outbox entry");

        return {
            messageId: String(message.id),
            outboxId: String(outbox.id),
            messageStatus: message.status as InvoiceOutboxRecord["messageStatus"],
            outboxStatus: outbox.status as InvoiceOutboxRecord["outboxStatus"],
        };
    });
};

export const getCustomerByPhone = async (organizationId: string, phoneNumber: string): Promise<CustomerDTO | null> => {
    const [row] = await pg`
        SELECT *
        FROM customers
        WHERE organization_id = ${organizationId}
          AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = regexp_replace(${phoneNumber}, '[^0-9]', '', 'g')
        LIMIT 1
    `;
    return row ? (snakeToCamel(row) as CustomerDTO) : null;
};

export const getConversations = async (
    organizationId: string,
    storeId: string,
    accountId: string,
): Promise<WhatsAppConversationDTO[]> => {
    const rows = await pg`
        SELECT *
        FROM whatsapp_conversations
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND whatsapp_account_id = ${accountId}
        ORDER BY last_message_at DESC NULLS LAST, updated_at DESC
        LIMIT 200
    `;
    return rows.map((row: Record<string, unknown>) => mapConversation(row));
};

export const getConversation = async (
    organizationId: string,
    storeId: string,
    accountId: string,
    conversationId: string,
): Promise<WhatsAppConversationDTO | null> => {
    const [row] = await pg`
        SELECT *
        FROM whatsapp_conversations
        WHERE id = ${conversationId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND whatsapp_account_id = ${accountId}
    `;
    return row ? mapConversation(row) : null;
};

export const getConversationMessages = async (
    organizationId: string,
    storeId: string,
    accountId: string,
    conversationId: string,
): Promise<WhatsAppMessageDTO[]> => {
    const rows = await pg`
        SELECT *
        FROM whatsapp_messages
        WHERE conversation_id = ${conversationId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND whatsapp_account_id = ${accountId}
        ORDER BY created_at ASC
        LIMIT 500
    `;
    return rows.map((row: Record<string, unknown>) => mapMessage(row));
};

export const getMessageAttachmentKey = async (
    organizationId: string,
    storeId: string,
    accountId: string,
    conversationId: string,
    messageId: string,
): Promise<{ key: string; fileName: string } | null> => {
    const [row] = await pg`
        SELECT attachment_storage_key, attachment_file_name
        FROM whatsapp_messages
        WHERE id = ${messageId}
          AND conversation_id = ${conversationId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND whatsapp_account_id = ${accountId}
          AND attachment_storage_key IS NOT NULL
          AND attachment_file_name IS NOT NULL
    `;
    return row
        ? { key: String(row.attachment_storage_key), fileName: String(row.attachment_file_name) }
        : null;
};

export const hasProviderMessage = async (accountId: string, providerMessageId: string): Promise<boolean> => {
    const [row] = await pg`
        SELECT id
        FROM whatsapp_messages
        WHERE whatsapp_account_id = ${accountId}
          AND provider_message_id = ${providerMessageId}
        LIMIT 1
    `;
    return Boolean(row);
};

export const markConversationRead = async (
    organizationId: string,
    storeId: string,
    accountId: string,
    conversationId: string,
): Promise<void> => {
    await pg`
        UPDATE whatsapp_conversations
        SET unread_count = 0,
            updated_at = NOW()
        WHERE id = ${conversationId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND whatsapp_account_id = ${accountId}
    `;
};

export const attachConversationCustomer = async (
    organizationId: string,
    storeId: string,
    accountId: string,
    conversationId: string,
    customerId: string,
): Promise<WhatsAppConversationDTO | null> => {
    const [row] = await pg`
        UPDATE whatsapp_conversations conversation
        SET customer_id = ${customerId},
            display_name = customer.name,
            updated_at = NOW()
        FROM customers customer
        WHERE conversation.id = ${conversationId}
          AND conversation.organization_id = ${organizationId}
          AND conversation.store_id = ${storeId}
          AND conversation.whatsapp_account_id = ${accountId}
          AND customer.id = ${customerId}
          AND customer.organization_id = ${organizationId}
          AND regexp_replace(COALESCE(customer.phone, ''), '[^0-9]', '', 'g') = regexp_replace(conversation.contact_phone_number, '[^0-9]', '', 'g')
        RETURNING conversation.*
    `;
    return row ? mapConversation(row) : null;
};

export const createMessageEvent = async (params: MessageEventParams): Promise<{ message: WhatsAppMessageDTO; created: boolean }> => {
    return pg.begin(async tx => {
        const [conversation] = await tx`
            INSERT INTO whatsapp_conversations (
                organization_id, store_id, whatsapp_account_id, customer_id,
                external_chat_id, contact_phone_number, display_name, last_message_at
            )
            VALUES (
                ${params.organizationId}, ${params.storeId}, ${params.whatsappAccountId}, ${params.customerId},
                ${params.externalChatId}, ${params.contactPhoneNumber}, ${params.displayName}, ${params.occurredAt}::timestamptz
            )
            ON CONFLICT (whatsapp_account_id, external_chat_id)
            DO UPDATE SET
                customer_id = COALESCE(whatsapp_conversations.customer_id, EXCLUDED.customer_id),
                contact_phone_number = EXCLUDED.contact_phone_number,
                display_name = CASE WHEN whatsapp_conversations.customer_id IS NULL THEN EXCLUDED.display_name ELSE whatsapp_conversations.display_name END,
                updated_at = NOW()
            RETURNING id
        `;
        if (!conversation) throw new Error("Failed to create WhatsApp conversation");

        if (params.direction === "outbound") {
            const [existingOutbound] = await tx`
                SELECT *
                FROM whatsapp_messages
                WHERE conversation_id = ${conversation.id}
                  AND direction = 'outbound'
                  AND provider_message_id IS NULL
                  AND status IN ('queued', 'sending')
                  AND message_type = ${params.messageType}
                  AND body IS NOT DISTINCT FROM ${params.body}
                  AND caption IS NOT DISTINCT FROM ${params.caption}
                  AND attachment_file_name IS NOT DISTINCT FROM ${params.attachmentFileName}
                  AND created_at BETWEEN ${params.occurredAt}::timestamptz - INTERVAL '5 minutes'
                      AND ${params.occurredAt}::timestamptz + INTERVAL '5 minutes'
                ORDER BY created_at DESC
                LIMIT 1
            `;
            if (existingOutbound) {
                const [reconciled] = await tx`
                    UPDATE whatsapp_messages
                    SET provider_message_id = ${params.providerMessageId},
                        status = 'sent',
                        sent_at = COALESCE(sent_at, ${params.occurredAt}::timestamptz),
                        failure_code = NULL,
                        failure_message = NULL
                    WHERE id = ${existingOutbound.id}
                    RETURNING *
                `;
                if (!reconciled) throw new Error("Failed to reconcile WhatsApp outbound message");
                await tx`
                    UPDATE whatsapp_conversations
                    SET last_message_at = GREATEST(COALESCE(last_message_at, ${params.occurredAt}::timestamptz), ${params.occurredAt}::timestamptz),
                        updated_at = NOW()
                    WHERE id = ${conversation.id}
                `;
                return { message: mapMessage(reconciled), created: false };
            }
        }

        const [createdMessage] = await tx`
            INSERT INTO whatsapp_messages (
                organization_id, store_id, whatsapp_account_id, conversation_id,
                direction, message_type, body, caption, attachment_storage_key,
                attachment_file_name, attachment_mime_type, status, provider_message_id,
                idempotency_key, created_at, sent_at, delivered_at
            )
            VALUES (
                ${params.organizationId}, ${params.storeId}, ${params.whatsappAccountId}, ${conversation.id},
                ${params.direction}, ${params.messageType}, ${params.body}, ${params.caption}, ${params.attachmentStorageKey},
                ${params.attachmentFileName}, ${params.attachmentMimeType}, ${params.direction === "inbound" ? "delivered" : "sent"}, ${params.providerMessageId},
                ${"provider:" + params.providerMessageId}, ${params.occurredAt}::timestamptz,
                ${params.direction === "outbound" ? params.occurredAt : null}::timestamptz,
                ${params.direction === "inbound" ? params.occurredAt : null}::timestamptz
            )
            ON CONFLICT (whatsapp_account_id, provider_message_id) WHERE provider_message_id IS NOT NULL DO NOTHING
            RETURNING *
        `;
        if (!createdMessage) {
            const [existing] = await tx`
                SELECT *
                FROM whatsapp_messages
                WHERE whatsapp_account_id = ${params.whatsappAccountId}
                  AND provider_message_id = ${params.providerMessageId}
            `;
            if (!existing) throw new Error("Failed to load existing WhatsApp message");
            return { message: mapMessage(existing), created: false };
        }

        await tx`
            UPDATE whatsapp_conversations
            SET last_message_at = GREATEST(COALESCE(last_message_at, ${params.occurredAt}::timestamptz), ${params.occurredAt}::timestamptz),
                unread_count = unread_count + ${params.direction === "inbound" && params.source === "realtime" ? 1 : 0},
                updated_at = NOW()
            WHERE id = ${conversation.id}
        `;
        return { message: mapMessage(createdMessage), created: true };
    });
};

export const createInboundMessage = createMessageEvent;

export const createTextOutbox = async (
    organizationId: string,
    storeId: string,
    accountId: string,
    conversationId: string,
    body: string,
): Promise<InvoiceOutboxRecord> => {
    return pg.begin(async tx => {
        const [account] = await tx`
            SELECT id
            FROM whatsapp_accounts
            WHERE id = ${accountId}
            FOR UPDATE
        `;
        if (!account) throw new Error("WhatsApp account not found");
        const [queued] = await tx`
            SELECT COUNT(*) AS count
            FROM whatsapp_outbox
            WHERE whatsapp_account_id = ${accountId}
              AND status IN ('pending', 'processing', 'retryable')
        `;
        if (Number(queued?.count ?? 0) >= pendingOutboxLimit()) {
            throw new WhatsAppOutboxLimitError();
        }
        const [conversation] = await tx`
            SELECT id, contact_phone_number
            FROM whatsapp_conversations
            WHERE id = ${conversationId}
              AND organization_id = ${organizationId}
              AND store_id = ${storeId}
              AND whatsapp_account_id = ${accountId}
        `;
        if (!conversation) throw new Error("WhatsApp conversation not found");
        const messageId = crypto.randomUUID();
        const [message] = await tx`
            INSERT INTO whatsapp_messages (
                id, organization_id, store_id, whatsapp_account_id, conversation_id,
                direction, message_type, body, status, idempotency_key
            )
            VALUES (
                ${messageId}, ${organizationId}, ${storeId}, ${accountId}, ${conversation.id},
                'outbound', 'text', ${body}, 'queued', ${"text:" + messageId}
            )
            RETURNING id, status
        `;
        if (!message) throw new Error("Failed to create WhatsApp text message");
        const [outbox] = await tx`
            INSERT INTO whatsapp_outbox (
                organization_id, store_id, whatsapp_account_id, message_id, kind, status
            )
            VALUES (${organizationId}, ${storeId}, ${accountId}, ${message.id}, 'text', 'pending')
            RETURNING id, status
        `;
        if (!outbox) throw new Error("Failed to create WhatsApp text outbox");
        await tx`
            UPDATE whatsapp_conversations
            SET last_message_at = NOW(), updated_at = NOW()
            WHERE id = ${conversation.id}
        `;
        return {
            messageId: String(message.id),
            outboxId: String(outbox.id),
            messageStatus: message.status as InvoiceOutboxRecord["messageStatus"],
            outboxStatus: outbox.status as InvoiceOutboxRecord["outboxStatus"],
        };
    });
};

export const claimNextInvoiceOutbox = async (
    leaseOwner: string,
    leaseSeconds: number,
    partition: WorkerPartition = { count: 1, index: 0 },
): Promise<InvoiceOutboxJobRecord | null> => {
    return pg.begin(async tx => {
        await tx`
            UPDATE whatsapp_outbox
            SET status = 'retryable',
                lease_owner = NULL,
                lease_expires_at = NULL,
                next_attempt_at = NOW(),
                updated_at = NOW()
            WHERE status = 'processing'
              AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
        `;

        const [candidate] = await tx`
            SELECT o.id
            FROM whatsapp_outbox o
            INNER JOIN whatsapp_accounts a ON a.id = o.whatsapp_account_id
            WHERE o.kind IN ('invoice', 'text', 'document')
              AND o.status IN ('pending', 'retryable')
              AND o.next_attempt_at <= NOW()
              AND a.status = 'connected'
              AND (((hashtext(a.id::text)::bigint % ${partition.count}) + ${partition.count}) % ${partition.count}) = ${partition.index}
              AND NOT EXISTS (
                  SELECT 1
                  FROM whatsapp_outbox active
                  WHERE active.whatsapp_account_id = o.whatsapp_account_id
                    AND active.status = 'processing'
                    AND (active.lease_expires_at IS NULL OR active.lease_expires_at > NOW())
              )
            ORDER BY o.next_attempt_at ASC, o.created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        `;
        if (!candidate) return null;

        const [claimed] = await tx`
            UPDATE whatsapp_outbox
            SET status = 'processing',
                attempt_count = attempt_count + 1,
                lease_owner = ${leaseOwner},
                lease_expires_at = NOW() + make_interval(secs => ${leaseSeconds}),
                updated_at = NOW()
            WHERE id = ${candidate.id}
            RETURNING id, message_id, whatsapp_account_id, attempt_count, lease_owner
        `;
        if (!claimed) return null;

        await tx`
            UPDATE whatsapp_messages
            SET status = 'sending',
                failure_code = NULL,
                failure_message = NULL
            WHERE id = ${claimed.message_id}
              AND status IN ('queued', 'failed')
        `;

        const [job] = await tx`
            SELECT
                o.whatsapp_account_id,
                o.id AS outbox_id,
                o.message_id,
                o.attempt_count,
                o.lease_owner,
                m.attachment_storage_key,
                m.attachment_file_name,
                m.attachment_mime_type,
                m.message_type,
                m.body,
                m.caption,
                c.contact_phone_number
            FROM whatsapp_outbox o
            INNER JOIN whatsapp_messages m ON m.id = o.message_id
            INNER JOIN whatsapp_conversations c ON c.id = m.conversation_id
            WHERE o.id = ${claimed.id}
        `;
        if (!job) {
            throw new Error("Claimed WhatsApp outbox entry could not be loaded");
        }

        return {
            accountId: String(job.whatsapp_account_id),
            outboxId: String(job.outbox_id),
            messageId: String(job.message_id),
            phoneNumber: String(job.contact_phone_number),
            messageType: job.message_type as InvoiceOutboxJobRecord["messageType"],
            body: (job.body as string | null | undefined) ?? null,
            attachmentStorageKey: (job.attachment_storage_key as string | null | undefined) ?? null,
            attachmentFileName: (job.attachment_file_name as string | null | undefined) ?? null,
            attachmentMimeType: (job.attachment_mime_type as string | null | undefined) ?? null,
            caption: (job.caption as string | null | undefined) ?? null,
            attemptCount: Number(job.attempt_count),
            leaseOwner: String(job.lease_owner),
        };
    });
};

const retryDelaySeconds = (attemptCount: number): number => {
    const exponential = Math.min(15 * 2 ** Math.max(attemptCount - 1, 0), 30 * 60);
    return Math.round(exponential * (0.8 + Math.random() * 0.4));
};

export const completeInvoiceOutbox = async (
    outboxId: string,
    leaseOwner: string,
    providerMessageId: string | null,
    failureCode: string | null,
    failureMessage: string | null,
    retryable: boolean,
): Promise<boolean> => {
    return pg.begin(async tx => {
        const [outbox] = await tx`
            SELECT id, message_id, attempt_count
            FROM whatsapp_outbox
            WHERE id = ${outboxId}
              AND status = 'processing'
              AND lease_owner = ${leaseOwner}
            FOR UPDATE
        `;
        if (!outbox) return false;

        if (providerMessageId) {
            await tx`
                UPDATE whatsapp_messages
                SET status = 'sent',
                    provider_message_id = ${providerMessageId},
                    failure_code = NULL,
                    failure_message = NULL,
                    sent_at = COALESCE(sent_at, NOW())
                WHERE id = ${outbox.message_id}
            `;
            await tx`
                UPDATE whatsapp_outbox
                SET status = 'sent',
                    lease_owner = NULL,
                    lease_expires_at = NULL,
                    last_error_code = NULL,
                    last_error_message = NULL,
                    updated_at = NOW()
                WHERE id = ${outbox.id}
            `;
            return true;
        }

        const permanentlyFailed = !retryable || Number(outbox.attempt_count) >= 5;
        const nextStatus = permanentlyFailed ? "dead_letter" : "retryable";
        const delay = retryDelaySeconds(Number(outbox.attempt_count));
        await tx`
            UPDATE whatsapp_messages
            SET status = 'failed',
                failure_code = ${failureCode},
                failure_message = ${failureMessage}
            WHERE id = ${outbox.message_id}
        `;
        await tx`
            UPDATE whatsapp_outbox
            SET status = ${nextStatus},
                lease_owner = NULL,
                lease_expires_at = NULL,
                next_attempt_at = NOW() + make_interval(secs => ${delay}),
                last_error_code = ${failureCode},
                last_error_message = ${failureMessage},
                updated_at = NOW()
            WHERE id = ${outbox.id}
        `;
        return true;
    });
};

export const updateInvoiceMessageStatus = async (
    accountId: string,
    providerMessageId: string,
    status: "delivered" | "read",
): Promise<boolean> => {
    const [row] = await pg`
        UPDATE whatsapp_messages
        SET status = CASE
                WHEN ${status} = 'read' THEN 'read'::whatsapp_message_status_enum
                ELSE CASE
                    WHEN status = 'read' THEN status
                    ELSE 'delivered'::whatsapp_message_status_enum
                END
            END,
            delivered_at = CASE WHEN ${status} IN ('delivered', 'read') THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END,
            read_at = CASE WHEN ${status} = 'read' THEN COALESCE(read_at, NOW()) ELSE read_at END
        WHERE whatsapp_account_id = ${accountId}
          AND provider_message_id = ${providerMessageId}
          AND direction = 'outbound'
        RETURNING id
    `;
    return Boolean(row);
};

export const retryInvoiceOutbox = async (
    organizationId: string,
    storeId: string,
    accountId: string,
    saleId: string,
): Promise<InvoiceOutboxRecord | null> => {
    return pg.begin(async tx => {
        const [outbox] = await tx`
            UPDATE whatsapp_outbox
            SET status = 'pending',
                next_attempt_at = NOW(),
                lease_owner = NULL,
                lease_expires_at = NULL,
                last_error_code = NULL,
                last_error_message = NULL,
                updated_at = NOW()
            WHERE organization_id = ${organizationId}
              AND store_id = ${storeId}
              AND whatsapp_account_id = ${accountId}
              AND sale_id = ${saleId}
              AND kind = 'invoice'
              AND status IN ('retryable', 'dead_letter')
            RETURNING id, message_id, status
        `;
        if (!outbox) {
            const [existing] = await tx`
                SELECT
                    o.id AS outbox_id,
                    o.status AS outbox_status,
                    m.id AS message_id,
                    m.status AS message_status
                FROM whatsapp_outbox o
                INNER JOIN whatsapp_messages m ON m.id = o.message_id
                WHERE o.organization_id = ${organizationId}
                  AND o.store_id = ${storeId}
                  AND o.whatsapp_account_id = ${accountId}
                  AND o.sale_id = ${saleId}
                  AND o.kind = 'invoice'
                LIMIT 1
            `;
            return existing
                ? {
                      messageId: String(existing.message_id),
                      outboxId: String(existing.outbox_id),
                      messageStatus: existing.message_status as InvoiceOutboxRecord["messageStatus"],
                      outboxStatus: existing.outbox_status as InvoiceOutboxRecord["outboxStatus"],
                  }
                : null;
        }

        await tx`
            UPDATE whatsapp_messages
            SET status = 'queued',
                failure_code = NULL,
                failure_message = NULL
            WHERE id = ${outbox.message_id}
        `;

        const [message] = await tx`
            SELECT id, status
            FROM whatsapp_messages
            WHERE id = ${outbox.message_id}
        `;
        return message
            ? {
                  messageId: String(message.id),
                  outboxId: String(outbox.id),
                  messageStatus: message.status as InvoiceOutboxRecord["messageStatus"],
                  outboxStatus: outbox.status as InvoiceOutboxRecord["outboxStatus"],
              }
            : null;
    });
};

const mapWorkerAccount = (row: Record<string, unknown>): WhatsAppWorkerAccountDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        id: String(mapped.id),
        phoneNumber: String(mapped.phoneNumber),
        status: mapped.status as WhatsAppWorkerAccountDTO["status"],
    };
};

export const getAccountsForWorker = async (): Promise<WhatsAppWorkerAccountDTO[]> => {
    const rows = await pg`
        SELECT id, phone_number, status
        FROM whatsapp_accounts
        WHERE status IN ('pending_qr', 'connecting', 'connected', 'failed')
        ORDER BY created_at ASC
    `;
    return rows.map(mapWorkerAccount);
};

export const getAccountsForWorkerPartition = async (partition: WorkerPartition): Promise<WhatsAppWorkerAccountDTO[]> => {
    const rows = await pg`
        SELECT id, phone_number, status
        FROM whatsapp_accounts
        WHERE status IN ('pending_qr', 'connecting', 'connected', 'failed')
          AND (((hashtext(id::text)::bigint % ${partition.count}) + ${partition.count}) % ${partition.count}) = ${partition.index}
        ORDER BY created_at ASC
    `;
    return rows.map(mapWorkerAccount);
};

export const getHistoryAnchorsForWorker = async (accountId: string): Promise<WhatsAppHistoryAnchor[]> => {
    const rows = await pg`
        SELECT DISTINCT ON (m.conversation_id)
            c.external_chat_id,
            m.provider_message_id,
            m.direction,
            FLOOR(EXTRACT(EPOCH FROM m.created_at))::bigint AS message_timestamp
        FROM whatsapp_messages m
        INNER JOIN whatsapp_conversations c ON c.id = m.conversation_id
        WHERE m.whatsapp_account_id = ${accountId}
          AND m.provider_message_id IS NOT NULL
        ORDER BY m.conversation_id, m.created_at ASC, m.id ASC
    `;
    return rows.map((row: Record<string, unknown>) => ({
        externalChatId: String(row.external_chat_id),
        providerMessageId: String(row.provider_message_id),
        fromMe: row.direction === "outbound",
        messageTimestamp: Number(row.message_timestamp),
    }));
};

export const claimProviderEvent = async (
    accountId: string,
    providerEventId: string,
    payload?: WhatsAppWorkerMessageEventJSON,
): Promise<{ claimed: ProviderEventClaim | null; completed: boolean }> => {
    const leaseOwner = "provider-events-" + randomUUID();
    const inserted = payload
        ? await pg`
            INSERT INTO whatsapp_provider_events (
                whatsapp_account_id,
                provider_event_id,
                payload,
                status,
                attempt_count,
                lease_owner,
                lease_expires_at
            )
            VALUES (
                ${accountId},
                ${providerEventId},
                ${JSON.stringify(payload)}::jsonb,
                'processing',
                1,
                ${leaseOwner},
                NOW() + INTERVAL '60 seconds'
            )
            ON CONFLICT (whatsapp_account_id, provider_event_id) DO NOTHING
            RETURNING id, whatsapp_account_id, provider_event_id, payload
        `
        : [];
    const insertedRow = inserted[0] as Record<string, unknown> | undefined;
    if (insertedRow) {
        return {
            claimed: {
                id: String(insertedRow.id),
                accountId: String(insertedRow.whatsapp_account_id),
                providerEventId: String(insertedRow.provider_event_id),
                payload: insertedRow.payload as WhatsAppWorkerMessageEventJSON,
            },
            completed: false,
        };
    }

    const [claimedRow] = await pg`
        UPDATE whatsapp_provider_events
        SET status = 'processing',
            attempt_count = attempt_count + 1,
            lease_owner = ${leaseOwner},
            lease_expires_at = NOW() + INTERVAL '60 seconds',
            updated_at = NOW()
        WHERE whatsapp_account_id = ${accountId}
          AND provider_event_id = ${providerEventId}
          AND status IN ('pending', 'retryable')
          AND next_attempt_at <= NOW()
        RETURNING id, whatsapp_account_id, provider_event_id, payload
    `;
    if (claimedRow) {
        return {
            claimed: {
                id: String(claimedRow.id),
                accountId: String(claimedRow.whatsapp_account_id),
                providerEventId: String(claimedRow.provider_event_id),
                payload: claimedRow.payload as WhatsAppWorkerMessageEventJSON,
            },
            completed: false,
        };
    }

    const [existing] = await pg`
        SELECT status
        FROM whatsapp_provider_events
        WHERE whatsapp_account_id = ${accountId}
          AND provider_event_id = ${providerEventId}
    `;
    return { claimed: null, completed: existing?.status === "completed" };
};

export const completeProviderEvent = async (eventId: string): Promise<void> => {
    await pg`
        UPDATE whatsapp_provider_events
        SET status = 'completed',
            payload = '{}'::jsonb,
            lease_owner = NULL,
            lease_expires_at = NULL,
            last_error = NULL,
            updated_at = NOW()
        WHERE id = ${eventId}
    `;
};

export const failProviderEvent = async (eventId: string, errorMessage: string, maxAttempts = 8): Promise<void> => {
    await pg`
        UPDATE whatsapp_provider_events
        SET status = CASE WHEN attempt_count >= ${maxAttempts} THEN 'dead_letter'::whatsapp_provider_event_status_enum ELSE 'retryable'::whatsapp_provider_event_status_enum END,
            next_attempt_at = NOW() + make_interval(secs => LEAST(300, GREATEST(1, POWER(2, attempt_count)::integer))),
            lease_owner = NULL,
            lease_expires_at = NULL,
            last_error = LEFT(${errorMessage}, 1_000),
            updated_at = NOW()
        WHERE id = ${eventId}
    `;
};

export const claimPendingProviderEvents = async (limit = 50): Promise<ProviderEventClaim[]> => {
    const leaseOwner = "provider-replay-" + randomUUID();
    const rows = await pg`
        WITH candidates AS (
            SELECT id
            FROM whatsapp_provider_events
            WHERE (status IN ('pending', 'retryable') AND next_attempt_at <= NOW())
               OR (status = 'processing' AND lease_expires_at < NOW())
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT ${limit}
        )
        UPDATE whatsapp_provider_events event
        SET status = 'processing',
            attempt_count = event.attempt_count + 1,
            lease_owner = ${leaseOwner},
            lease_expires_at = NOW() + INTERVAL '60 seconds',
            updated_at = NOW()
        FROM candidates
        WHERE event.id = candidates.id
        RETURNING event.id, event.whatsapp_account_id, event.provider_event_id, event.payload
    `;
    return rows.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        accountId: String(row.whatsapp_account_id),
        providerEventId: String(row.provider_event_id),
        payload: row.payload as WhatsAppWorkerMessageEventJSON,
    }));
};

export const getOperationsMetrics = async (): Promise<WhatsAppOperationsMetrics> => {
    const [row] = await pg`
        SELECT
            COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
            COUNT(*) FILTER (WHERE status = 'processing') AS processing_count,
            COUNT(*) FILTER (WHERE status = 'retryable') AS retryable_count,
            COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead_letter_count,
            COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE status IN ('pending', 'retryable')))), 0) AS oldest_pending_age_seconds,
            (SELECT COUNT(*) FROM whatsapp_accounts WHERE status = 'connected') AS connected_account_count,
            (SELECT COUNT(*) FROM whatsapp_accounts) AS account_count,
            (SELECT COUNT(*) FROM whatsapp_provider_events WHERE status = 'pending') AS provider_event_pending_count,
            (SELECT COUNT(*) FROM whatsapp_provider_events WHERE status = 'processing') AS provider_event_processing_count,
            (SELECT COUNT(*) FROM whatsapp_provider_events WHERE status = 'retryable') AS provider_event_retryable_count,
            (SELECT COUNT(*) FROM whatsapp_provider_events WHERE status = 'dead_letter') AS provider_event_dead_letter_count,
            COALESCE(
                EXTRACT(EPOCH FROM (
                    NOW() - MIN(created_at) FILTER (WHERE status IN ('pending', 'retryable'))
                )),
                0
            ) AS oldest_provider_event_age_seconds
        FROM whatsapp_outbox
    `;
    return {
        pendingCount: Number(row?.pending_count ?? 0),
        processingCount: Number(row?.processing_count ?? 0),
        retryableCount: Number(row?.retryable_count ?? 0),
        deadLetterCount: Number(row?.dead_letter_count ?? 0),
        oldestPendingAgeSeconds: Number(row?.oldest_pending_age_seconds ?? 0),
        connectedAccountCount: Number(row?.connected_account_count ?? 0),
        accountCount: Number(row?.account_count ?? 0),
        providerEventPendingCount: Number(row?.provider_event_pending_count ?? 0),
        providerEventProcessingCount: Number(row?.provider_event_processing_count ?? 0),
        providerEventRetryableCount: Number(row?.provider_event_retryable_count ?? 0),
        providerEventDeadLetterCount: Number(row?.provider_event_dead_letter_count ?? 0),
        oldestProviderEventAgeSeconds: Number(row?.oldest_provider_event_age_seconds ?? 0),
    };
};

export const createAccount = async (
    organizationId: string,
    storeId: string,
    phoneNumber: string,
    userId: string,
): Promise<WhatsAppAccountDTO> => {
    const accountId = crypto.randomUUID();
    const [row] = await pg`
        INSERT INTO whatsapp_accounts (
            id,
            organization_id,
            store_id,
            provider,
            phone_number,
            phone_number_normalized,
            session_reference,
            created_by,
            updated_by
        )
        VALUES (
            ${accountId},
            ${organizationId},
            ${storeId},
            'baileys',
            ${phoneNumber},
            ${phoneNumber},
            ${"whatsapp-auth/" + accountId},
            ${userId},
            ${userId}
        )
        RETURNING *
    `;
    if (!row) throw new Error("Unable to create WhatsApp account");
    return mapAccount(row);
};

export const updateAccountStatus = async (
    accountId: string,
    update: WhatsAppWorkerStatusUpdateJSON,
): Promise<WhatsAppAccountDTO | null> => {
    const [row] = await pg`
        UPDATE whatsapp_accounts
        SET status = ${update.status},
            last_error_code = ${update.lastErrorCode},
            last_connected_at = CASE
                WHEN ${update.status} = 'connected' THEN COALESCE(last_connected_at, NOW())
                ELSE last_connected_at
            END,
            last_seen_at = NOW(),
            updated_at = NOW()
        WHERE id = ${accountId}
        RETURNING *
    `;
    return row ? mapAccount(row) : null;
};
