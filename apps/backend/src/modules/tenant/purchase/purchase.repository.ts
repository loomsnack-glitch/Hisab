import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreatePurchaseItemREPO,
    CreatePurchaseREPO,
    PurchaseDetailDTO,
    PurchaseItemDTO,
    PurchaseListQuery,
    PurchaseSummary,
    PurchaseSummaryDTO,
    UpdatePurchaseREPO,
} from "@repo/types";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;

const mapSummary = (row: Record<string, unknown>): PurchaseSummaryDTO => {
    const mapped = mapRow<PurchaseSummaryDTO>(row);
    return {
        ...mapped,
        totalAmount: Number(mapped.totalAmount ?? 0),
        itemCount: Number(mapped.itemCount ?? 0),
    };
};

const mapItem = (row: Record<string, unknown>): PurchaseItemDTO => {
    const mapped = mapRow<PurchaseItemDTO>(row);
    return {
        ...mapped,
        quantity: Number(mapped.quantity),
        rate: Number(mapped.rate),
        lineTotal: Number(mapped.lineTotal),
    };
};

const purchaseSelect = `
    SELECT
        p.*,
        COALESCE(item_stats.item_count, 0)::int AS item_count,
        COALESCE(item_stats.items_summary, '') AS items_summary
    FROM purchases p
    LEFT JOIN (
        SELECT purchase_id, COUNT(*)::int AS item_count, STRING_AGG(item_name, ', ' ORDER BY id) AS items_summary
        FROM purchase_items
        GROUP BY purchase_id
    ) item_stats ON item_stats.purchase_id = p.id
`;

export const getPurchasesByStore = async (
    organizationId: string,
    storeId: string,
    query: PurchaseListQuery,
): Promise<PurchaseSummaryDTO[]> => {
    const search = query.search?.trim() ?? "";
    const searchPattern = search ? `%${search}%` : "";
    const status = query.status ?? "";
    const dateFrom = query.dateFrom ?? "";
    const dateTo = query.dateTo ?? "";
    const limit = query.limit ?? 50;

    const results = await pg`
        ${pg.unsafe(purchaseSelect)}
        WHERE p.organization_id = ${organizationId}
          AND p.store_id = ${storeId}
          AND (${status} = '' OR p.status::text = ${status})
          AND (${dateFrom} = '' OR p.purchase_date >= NULLIF(${dateFrom}, '')::date)
          AND (${dateTo} = '' OR p.purchase_date <= NULLIF(${dateTo}, '')::date)
          AND (
              ${search} = ''
              OR p.supplier_name ILIKE ${searchPattern}
              OR COALESCE(p.invoice_number, '') ILIKE ${searchPattern}
              OR COALESCE(item_stats.items_summary, '') ILIKE ${searchPattern}
          )
        ORDER BY p.purchase_date DESC, p.created_at DESC
        LIMIT ${limit}
    `;

    return results.map((row: Record<string, unknown>) => mapSummary(row));
};

export const getPurchaseById = async (
    organizationId: string,
    storeId: string,
    purchaseId: string,
): Promise<PurchaseSummaryDTO | null> => {
    const [result] = await pg`
        ${pg.unsafe(purchaseSelect)}
        WHERE p.organization_id = ${organizationId}
          AND p.store_id = ${storeId}
          AND p.id = ${purchaseId}
        LIMIT 1
    `;

    return result ? mapSummary(result as Record<string, unknown>) : null;
};

export const getPurchaseItems = async (purchaseId: string): Promise<PurchaseItemDTO[]> => {
    const results = await pg`
        SELECT *
        FROM purchase_items
        WHERE purchase_id = ${purchaseId}
        ORDER BY created_at ASC, id ASC
    `;

    return results.map((row: Record<string, unknown>) => mapItem(row));
};

export const getPurchaseDetails = async (
    organizationId: string,
    storeId: string,
    purchaseId: string,
): Promise<PurchaseDetailDTO | null> => {
    const summary = await getPurchaseById(organizationId, storeId, purchaseId);
    if (!summary) return null;

    return { ...summary, items: await getPurchaseItems(purchaseId) };
};

export const createPurchase = async (
    purchase: CreatePurchaseREPO,
    tx?: Bun.TransactionSQL,
): Promise<PurchaseSummaryDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO purchases ${camelToSnakeSql({
            id: purchase.id,
            organization_id: purchase.organizationId,
            store_id: purchase.storeId,
            purchase_date: purchase.purchaseDate,
            supplier_name: purchase.supplierName,
            invoice_number: purchase.invoiceNumber ?? null,
            notes: purchase.notes ?? null,
            total_amount: purchase.totalAmount,
            status: purchase.status,
            created_by_user_id: purchase.createdByUserId ?? null,
            created_by_device_id: purchase.createdByDeviceId ?? null,
        })}
        RETURNING *
    `;

    return result ? mapSummary({ ...(result as Record<string, unknown>), item_count: 0, items_summary: "" }) : null;
};

export const createPurchaseItem = async (
    item: CreatePurchaseItemREPO,
    tx?: Bun.TransactionSQL,
): Promise<PurchaseItemDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO purchase_items ${camelToSnakeSql({
            id: item.id,
            purchase_id: item.purchaseId,
            item_name: item.itemName,
            description: item.description ?? null,
            quantity: item.quantity,
            rate: item.rate,
            line_total: item.lineTotal,
        })}
        RETURNING *
    `;

    return result ? mapItem(result as Record<string, unknown>) : null;
};

export const updatePurchase = async (
    purchase: UpdatePurchaseREPO,
    tx?: Bun.TransactionSQL,
): Promise<PurchaseSummaryDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE purchases
        SET purchase_date = ${purchase.purchaseDate},
            supplier_name = ${purchase.supplierName},
            invoice_number = ${purchase.invoiceNumber ?? null},
            notes = ${purchase.notes ?? null},
            total_amount = ${purchase.totalAmount},
            updated_by_user_id = ${purchase.updatedByUserId ?? null},
            updated_by_device_id = ${purchase.updatedByDeviceId ?? null},
            updated_at = NOW()
        WHERE id = ${purchase.id}
          AND organization_id = ${purchase.organizationId}
          AND store_id = ${purchase.storeId}
          AND status = 'recorded'
        RETURNING *
    `;

    return result ? mapSummary({ ...(result as Record<string, unknown>), item_count: 0, items_summary: "" }) : null;
};

export const deletePurchaseItems = async (purchaseId: string, tx?: Bun.TransactionSQL) => {
    const db = tx || pg;
    await db`DELETE FROM purchase_items WHERE purchase_id = ${purchaseId}`;
};

export const voidPurchase = async (
    organizationId: string,
    storeId: string,
    purchaseId: string,
    reason: string,
    actor: { userId?: string | null; deviceId?: string | null },
): Promise<PurchaseSummaryDTO | null> => {
    const [result] = await pg`
        UPDATE purchases
        SET status = 'voided',
            voided_at = NOW(),
            void_reason = ${reason},
            updated_by_user_id = ${actor.userId ?? null},
            updated_by_device_id = ${actor.deviceId ?? null},
            updated_at = NOW()
        WHERE id = ${purchaseId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND status = 'recorded'
        RETURNING *
    `;

    return result ? mapSummary({ ...(result as Record<string, unknown>), item_count: 0, items_summary: "" }) : null;
};

export const getPurchaseSummary = async (
    organizationId: string,
    storeId: string,
): Promise<PurchaseSummary> => {
    const [result] = await pg`
        WITH business_clock AS (
            SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date AS today
        )
        SELECT
            COALESCE(SUM(p.total_amount) FILTER (WHERE p.purchase_date = business_clock.today), 0) AS today_amount,
            COUNT(*) FILTER (WHERE p.purchase_date = business_clock.today)::int AS today_count,
            COALESCE(SUM(p.total_amount) FILTER (WHERE p.purchase_date >= date_trunc('week', business_clock.today)::date AND p.purchase_date <= business_clock.today), 0) AS this_week_amount,
            COUNT(*) FILTER (WHERE p.purchase_date >= date_trunc('week', business_clock.today)::date AND p.purchase_date <= business_clock.today)::int AS this_week_count,
            COALESCE(SUM(p.total_amount) FILTER (WHERE p.purchase_date >= date_trunc('month', business_clock.today)::date AND p.purchase_date <= business_clock.today), 0) AS this_month_amount,
            COUNT(*) FILTER (WHERE p.purchase_date >= date_trunc('month', business_clock.today)::date AND p.purchase_date <= business_clock.today)::int AS this_month_count
        FROM purchases p
        CROSS JOIN business_clock
        WHERE p.organization_id = ${organizationId}
          AND p.store_id = ${storeId}
          AND p.status = 'recorded'
    `;

    const row = result as Record<string, unknown>;
    return {
        today: { amount: Number(row.today_amount ?? 0), count: Number(row.today_count ?? 0) },
        thisWeek: { amount: Number(row.this_week_amount ?? 0), count: Number(row.this_week_count ?? 0) },
        thisMonth: { amount: Number(row.this_month_amount ?? 0), count: Number(row.this_month_count ?? 0) },
    };
};
