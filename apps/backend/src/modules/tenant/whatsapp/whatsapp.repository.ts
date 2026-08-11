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

export type InvoiceOutboxJobRecord = {
    accountId: string;
    outboxId: string;
    messageId: string;
    phoneNumber: string;
    attachmentStorageKey: string;
    attachmentFileName: string;
    attachmentMimeType: string;
    caption: string | null;
    attemptCount: number;
    leaseOwner: string;
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

export const claimNextInvoiceOutbox = async (
    leaseOwner: string,
    leaseSeconds: number,
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
            WHERE o.kind = 'invoice'
              AND o.status IN ('pending', 'retryable')
              AND o.next_attempt_at <= NOW()
              AND a.status = 'connected'
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
                m.caption,
                c.contact_phone_number
            FROM whatsapp_outbox o
            INNER JOIN whatsapp_messages m ON m.id = o.message_id
            INNER JOIN whatsapp_conversations c ON c.id = m.conversation_id
            WHERE o.id = ${claimed.id}
        `;
        if (!job || !job.attachment_storage_key || !job.attachment_file_name || !job.attachment_mime_type) {
            throw new Error("Claimed WhatsApp invoice has no document attachment");
        }

        return {
            accountId: String(job.whatsapp_account_id),
            outboxId: String(job.outbox_id),
            messageId: String(job.message_id),
            phoneNumber: String(job.contact_phone_number),
            attachmentStorageKey: String(job.attachment_storage_key),
            attachmentFileName: String(job.attachment_file_name),
            attachmentMimeType: String(job.attachment_mime_type),
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
          AND message_type = 'document'
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
