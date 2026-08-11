import type {
    WhatsAppAccountDTO,
    WhatsAppAccountStatus,
    WhatsAppWorkerAccountDTO,
    WhatsAppWorkerStatusUpdateJSON,
} from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";

type AccountRow = Record<string, unknown>;

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
