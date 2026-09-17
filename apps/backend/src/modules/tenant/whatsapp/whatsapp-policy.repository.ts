import type { WhatsAppStorePolicyMode } from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";

type Database = typeof pg | Bun.TransactionSQL;

type PolicyRow = {
    id: string;
    organizationId: string;
    storeId: string;
    mode: WhatsAppStorePolicyMode;
    whatsappAccountId: string | null;
    revision: number;
    effectiveFrom: string | Date;
    effectiveTo: string | Date | null;
};

export class StorePolicyAccountNotLinkedError extends Error {
    constructor() {
        super("WhatsApp Cloud account must be linked to this Store");
        this.name = "StorePolicyAccountNotLinkedError";
    }
}

const mapPolicy = (row: Record<string, unknown>): PolicyRow => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        id: String(mapped.id),
        organizationId: String(mapped.organizationId),
        storeId: String(mapped.storeId),
        mode: mapped.mode as WhatsAppStorePolicyMode,
        whatsappAccountId: (mapped.whatsappAccountId as string | null | undefined) ?? null,
        revision: Number(mapped.revision),
        effectiveFrom: mapped.effectiveFrom as string | Date,
        effectiveTo: (mapped.effectiveTo as string | Date | null | undefined) ?? null,
    };
};

const selectCurrentPolicy = async (
    organizationId: string,
    storeId: string,
    database: Database = pg,
    forUpdate = false,
): Promise<PolicyRow | null> => {
    const rows = forUpdate
        ? await database`
            SELECT id, organization_id, store_id, mode, whatsapp_account_id, revision,
                   effective_from, effective_to
            FROM whatsapp_store_policies
            WHERE organization_id = ${organizationId}
              AND store_id = ${storeId}
              AND effective_to IS NULL
            LIMIT 1
            FOR UPDATE
        `
        : await database`
            SELECT id, organization_id, store_id, mode, whatsapp_account_id, revision,
                   effective_from, effective_to
            FROM whatsapp_store_policies
            WHERE organization_id = ${organizationId}
              AND store_id = ${storeId}
              AND effective_to IS NULL
            LIMIT 1
        `;
    const row = rows[0] as Record<string, unknown> | undefined;
    return row ? mapPolicy(row) : null;
};

export const getCurrentPolicy = (
    organizationId: string,
    storeId: string,
): Promise<PolicyRow | null> => selectCurrentPolicy(organizationId, storeId);

export const replaceCurrentPolicy = async (
    organizationId: string,
    storeId: string,
    mode: WhatsAppStorePolicyMode,
    whatsappAccountId: string | null,
    userId: string,
): Promise<PolicyRow> => {
    return pg.begin(async (transaction) => {
        const current = await selectCurrentPolicy(organizationId, storeId, transaction, true);

        if (mode === "organization_cloud" && whatsappAccountId) {
            const [assignment] = await transaction`
                SELECT 1
                FROM whatsapp_account_stores
                WHERE organization_id = ${organizationId}
                  AND whatsapp_account_id = ${whatsappAccountId}
                  AND store_id = ${storeId}
                FOR UPDATE
            `;
            if (!assignment) throw new StorePolicyAccountNotLinkedError();
        }

        if (current && current.mode === mode && current.whatsappAccountId === whatsappAccountId) {
            return current;
        }

        if (current) {
            await transaction`
                UPDATE whatsapp_store_policies
                SET effective_to = NOW(), ended_by = ${userId}
                WHERE id = ${current.id}
                  AND organization_id = ${organizationId}
                  AND effective_to IS NULL
            `;
        }

        const revision = (current?.revision ?? 0) + 1;
        const [row] = await transaction`
            INSERT INTO whatsapp_store_policies (
                organization_id,
                store_id,
                mode,
                whatsapp_account_id,
                revision,
                created_by
            ) VALUES (
                ${organizationId},
                ${storeId},
                ${mode},
                ${whatsappAccountId},
                ${revision},
                ${userId}
            )
            RETURNING id, organization_id, store_id, mode, whatsapp_account_id,
                      revision, effective_from, effective_to
        `;
        return mapPolicy(row as Record<string, unknown>);
    });
};

export type { PolicyRow };
