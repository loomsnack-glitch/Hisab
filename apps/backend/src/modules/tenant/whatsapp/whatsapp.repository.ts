import type {
    WhatsAppAccountDTO,
    WhatsAppAccountStatus,
    WhatsAppWorkerAccountDTO,
    WhatsAppWorkerStatusUpdateJSON,
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
    messageId: string;
    idempotencyKey: string;
    attachmentStorageKey: string;
    attachmentFileName: string;
};

type WhatsAppMessageStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed";
type WhatsAppOutboxStatus = "pending" | "processing" | "sent" | "retryable" | "dead_letter" | "cancelled";

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
                'document',
                ${`Sale ${params.saleId}`},
                ${params.attachmentStorageKey},
                ${params.attachmentFileName},
                'application/pdf',
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

export const getAccountsForWorker = async (): Promise<WhatsAppWorkerAccountDTO[]> => {
    const rows = await pg`
        SELECT id, phone_number, status
        FROM whatsapp_accounts
        WHERE status IN ('pending_qr', 'connecting', 'connected', 'failed')
        ORDER BY created_at ASC
    `;
    return rows.map((row: Record<string, unknown>) => {
        const mapped = snakeToCamel(row) as Record<string, unknown>;
        return {
            id: String(mapped.id),
            phoneNumber: String(mapped.phoneNumber),
            status: mapped.status as WhatsAppWorkerAccountDTO["status"],
        };
    });
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
