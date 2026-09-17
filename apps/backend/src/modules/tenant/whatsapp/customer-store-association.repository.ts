import type {
    WhatsAppCustomerStoreActivitySource,
    WhatsAppCustomerStoreAssociationDTO,
} from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";

type Database = typeof pg | Bun.TransactionSQL;

export type RecordCustomerStoreActivityInput = {
    organizationId: string;
    customerId: string;
    storeId: string;
    source: WhatsAppCustomerStoreActivitySource;
    sourceReference: string;
    occurredAt: string | Date;
    createdBy?: string | null;
};

const mapAssociation = (row: Record<string, unknown>): WhatsAppCustomerStoreAssociationDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        id: String(mapped.id),
        organizationId: String(mapped.organizationId),
        customerId: String(mapped.customerId),
        storeId: String(mapped.storeId),
        originSource: mapped.originSource as WhatsAppCustomerStoreActivitySource,
        originSourceReference: String(mapped.originSourceReference),
        firstSeenAt: mapped.firstSeenAt as string | Date,
        lastActivityAt: mapped.lastActivityAt as string | Date,
        lastActivitySource: mapped.lastActivitySource as WhatsAppCustomerStoreActivitySource,
        lastActivitySourceReference: String(mapped.lastActivitySourceReference),
        createdBy: (mapped.createdBy as string | null | undefined) ?? null,
        createdAt: mapped.createdAt as string | Date,
        updatedAt: mapped.updatedAt as string | Date,
    };
};

const getAssociation = async (
    database: Database,
    input: Pick<RecordCustomerStoreActivityInput, "organizationId" | "customerId" | "storeId">,
    forUpdate = false,
): Promise<WhatsAppCustomerStoreAssociationDTO | null> => {
    const rows = forUpdate
        ? await database`
            SELECT *
            FROM whatsapp_customer_store_associations
            WHERE organization_id = ${input.organizationId}
              AND customer_id = ${input.customerId}
              AND store_id = ${input.storeId}
            FOR UPDATE
        `
        : await database`
            SELECT *
            FROM whatsapp_customer_store_associations
            WHERE organization_id = ${input.organizationId}
              AND customer_id = ${input.customerId}
              AND store_id = ${input.storeId}
        `;
    const row = rows[0] as Record<string, unknown> | undefined;
    return row ? mapAssociation(row) : null;
};

const recordCustomerStoreActivityInDatabase = async (
    database: Database,
    input: RecordCustomerStoreActivityInput,
): Promise<WhatsAppCustomerStoreAssociationDTO> => {
    const existing = await getAssociation(database, input, true);
    const association = existing
        ? existing
        : await (async () => {
            const [row] = await database`
                INSERT INTO whatsapp_customer_store_associations (
                    organization_id,
                    customer_id,
                    store_id,
                    origin_source,
                    origin_source_reference,
                    first_seen_at,
                    last_activity_at,
                    last_activity_source,
                    last_activity_source_reference,
                    created_by
                ) VALUES (
                    ${input.organizationId},
                    ${input.customerId},
                    ${input.storeId},
                    ${input.source},
                    ${input.sourceReference},
                    ${input.occurredAt},
                    ${input.occurredAt},
                    ${input.source},
                    ${input.sourceReference},
                    ${input.createdBy ?? null}
                )
                ON CONFLICT (organization_id, customer_id, store_id) DO NOTHING
                RETURNING *
            `;
            if (row) return mapAssociation(row as Record<string, unknown>);
            const concurrent = await getAssociation(database, input, true);
            if (!concurrent) throw new Error("Customer Store association could not be created");
            return concurrent;
        })();

    const [event] = await database`
        INSERT INTO whatsapp_customer_store_activity_events (
            organization_id,
            customer_id,
            store_id,
            association_id,
            source,
            source_reference,
            occurred_at,
            created_by
        ) VALUES (
            ${input.organizationId},
            ${input.customerId},
            ${input.storeId},
            ${association.id},
            ${input.source},
            ${input.sourceReference},
            ${input.occurredAt},
            ${input.createdBy ?? null}
        )
        ON CONFLICT (association_id, source, source_reference) DO NOTHING
        RETURNING id
    `;

    if (!event) return association;

    const [updated] = await database`
        UPDATE whatsapp_customer_store_associations
        SET last_activity_at = ${input.occurredAt},
            last_activity_source = ${input.source},
            last_activity_source_reference = ${input.sourceReference},
            updated_at = NOW()
        WHERE id = ${association.id}
          AND organization_id = ${input.organizationId}
          AND (
              last_activity_at < ${input.occurredAt}
              OR (
                  last_activity_at = ${input.occurredAt}
                  AND last_activity_source_reference < ${input.sourceReference}
              )
          )
        RETURNING *
    `;
    return updated
        ? mapAssociation(updated as Record<string, unknown>)
        : association;
};

export const recordCustomerStoreActivity = (
    input: RecordCustomerStoreActivityInput,
): Promise<WhatsAppCustomerStoreAssociationDTO> =>
    pg.begin(transaction => recordCustomerStoreActivityInDatabase(transaction, input));

export const listCustomerStoreAssociations = async (
    organizationId: string,
    customerId: string,
): Promise<WhatsAppCustomerStoreAssociationDTO[]> => {
    const rows = await pg`
        SELECT *
        FROM whatsapp_customer_store_associations
        WHERE organization_id = ${organizationId}
          AND customer_id = ${customerId}
        ORDER BY last_activity_at DESC, store_id ASC
    `;
    return rows.map(row => mapAssociation(row as Record<string, unknown>));
};

export { recordCustomerStoreActivityInDatabase };
