import { sql } from "bun";
import { PLATFORM_OVERVIEW_RECENT_SALE_LIMIT, type PlatformOrganizationDirectorySort } from "@repo/types";
import { pg } from "@/config/db";

export type PlatformDashboardMetricsQuery = {
    activityStartAt: Date;
    activityEndAt: Date;
    periodStartAt: Date | null;
    periodEndAt: Date | null;
};

export type PlatformDashboardMetrics = {
    organizationCount: number;
    storeCount: number;
    customerCount: number;
    completedSaleCount: number;
    activeOrganizationCount: number;
    activeStoreCount: number;
    periodCompletedSaleCount: number;
    periodCompletedSalesValue: number;
    periodCustomerCount: number;
};

export type PlatformOrganizationListMetricsQuery = PlatformDashboardMetricsQuery & {
    search: string;
    activity: "all" | "active" | "inactive";
    sort: PlatformOrganizationDirectorySort;
    page: number;
    limit: number;
};

export type PlatformOrganizationListMetricsRow = {
    id: string;
    name: string;
    username: string;
    isActive: boolean;
    creatorFirstName: string;
    creatorLastName: string;
    creatorPhone: string;
    storeCount: number;
    activeStoreCount: number;
    customerCount: number;
    completedSaleCount: number;
    completedSalesValue: number;
    lastCompletedSaleAt: string | null;
};

export type PlatformOrganizationListMetrics = {
    organizations: PlatformOrganizationListMetricsRow[];
    totalCount: number;
};

export type PlatformStoreActivityMetricsRow = {
    id: string;
    name: string;
    isActive: boolean;
    customerCount: number;
    completedSaleCount: number;
    completedSalesValue: number;
    lastCompletedSaleAt: string | null;
};

export type PlatformRecentSaleMetricsRow = {
    id: string;
    saleNumber: string | null;
    status: "draft" | "completed" | "voided";
    grandTotal: number;
    occurredAt: string;
    storeId: string;
    storeName: string;
};

export type PlatformOrganizationDetailMetrics = PlatformOrganizationListMetricsRow & {
    stores: PlatformStoreActivityMetricsRow[];
    recentSales: PlatformRecentSaleMetricsRow[];
};

export type PlatformOrganizationDetailMetricsQuery = PlatformDashboardMetricsQuery & {
    organizationId: string;
};

const asCount = (value: unknown) => Number(value ?? 0);
const asSaleStatus = (value: unknown): "draft" | "completed" | "voided" | null => {
    if (value === "draft" || value === "completed" || value === "voided") return value;
    return null;
};
const asMoney = (value: unknown) => Number(value ?? 0);

export const getDashboardMetrics = async (
    query: PlatformDashboardMetricsQuery,
): Promise<PlatformDashboardMetrics> => {
    const activityStartAt = query.activityStartAt.toISOString();
    const activityEndAt = query.activityEndAt.toISOString();
    const periodStartAt = query.periodStartAt?.toISOString() ?? null;
    const periodEndAt = query.periodEndAt?.toISOString() ?? null;

    const [row] = await pg`
        SELECT
            (SELECT COUNT(*)::int FROM organizations) AS organization_count,
            (SELECT COUNT(*)::int FROM stores) AS store_count,
            (SELECT COUNT(*)::int FROM customers) AS customer_count,
            (
                SELECT COUNT(*)::int
                FROM sales
                WHERE status = 'completed'
            ) AS completed_sale_count,
            (
                SELECT COUNT(*)::int
                FROM stores store_activity
                WHERE EXISTS (
                    SELECT 1
                    FROM sales completed_sale
                    WHERE completed_sale.store_id = store_activity.id
                      AND completed_sale.status = 'completed'
                      AND completed_sale.committed_at >= ${activityStartAt}::timestamptz
                      AND completed_sale.committed_at < ${activityEndAt}::timestamptz
                )
            ) AS active_store_count,
            (
                SELECT COUNT(*)::int
                FROM organizations organization_activity
                WHERE EXISTS (
                    SELECT 1
                    FROM stores store_activity
                    JOIN sales completed_sale
                      ON completed_sale.store_id = store_activity.id
                     AND completed_sale.status = 'completed'
                     AND completed_sale.committed_at >= ${activityStartAt}::timestamptz
                     AND completed_sale.committed_at < ${activityEndAt}::timestamptz
                    WHERE store_activity.organization_id = organization_activity.id
                )
            ) AS active_organization_count,
            (
                SELECT COUNT(*)::int
                FROM sales
                WHERE status = 'completed'
                  AND (${periodStartAt}::timestamptz IS NULL OR committed_at >= ${periodStartAt}::timestamptz)
                  AND (${periodEndAt}::timestamptz IS NULL OR committed_at < ${periodEndAt}::timestamptz)
            ) AS period_completed_sale_count,
            (
                SELECT COALESCE(SUM(grand_total), 0)
                FROM sales
                WHERE status = 'completed'
                  AND (${periodStartAt}::timestamptz IS NULL OR committed_at >= ${periodStartAt}::timestamptz)
                  AND (${periodEndAt}::timestamptz IS NULL OR committed_at < ${periodEndAt}::timestamptz)
            ) AS period_completed_sales_value,
            (
                SELECT COUNT(*)::int
                FROM customers
                WHERE (${periodStartAt}::timestamptz IS NULL OR created_at >= ${periodStartAt}::timestamptz)
                  AND (${periodEndAt}::timestamptz IS NULL OR created_at < ${periodEndAt}::timestamptz)
            ) AS period_customer_count
    `;

    return {
        organizationCount: asCount(row?.organization_count),
        storeCount: asCount(row?.store_count),
        customerCount: asCount(row?.customer_count),
        completedSaleCount: asCount(row?.completed_sale_count),
        activeOrganizationCount: asCount(row?.active_organization_count),
        activeStoreCount: asCount(row?.active_store_count),
        periodCompletedSaleCount: asCount(row?.period_completed_sale_count),
        periodCompletedSalesValue: asMoney(row?.period_completed_sales_value),
        periodCustomerCount: asCount(row?.period_customer_count),
    };
};

const asTimestamp = (value: unknown): string | null => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toOrganizationMetricsRow = (row: Record<string, unknown>): PlatformOrganizationListMetricsRow => {
    const activeStoreCount = asCount(row.active_store_count);
    return {
        id: String(row.id),
        name: String(row.name),
        username: String(row.username),
        isActive: activeStoreCount > 0,
        creatorFirstName: String(row.creator_first_name),
        creatorLastName: String(row.creator_last_name),
        creatorPhone: String(row.creator_phone),
        storeCount: asCount(row.store_count),
        activeStoreCount,
        customerCount: asCount(row.customer_count),
        completedSaleCount: asCount(row.completed_sale_count),
        completedSalesValue: asMoney(row.completed_sales_value),
        lastCompletedSaleAt: asTimestamp(row.last_completed_sale_at),
    };
};

export const listOrganizations = async (
    query: PlatformOrganizationListMetricsQuery,
): Promise<PlatformOrganizationListMetrics> => {
    const activityStartAt = query.activityStartAt.toISOString();
    const activityEndAt = query.activityEndAt.toISOString();
    const periodStartAt = query.periodStartAt?.toISOString() ?? null;
    const periodEndAt = query.periodEndAt?.toISOString() ?? null;
    const search = query.search.trim();
    const searchPattern = search ? `%${search}%` : "";
    const offset = (query.page - 1) * query.limit;
    const searchClause = search
        ? sql`AND (
                organization.name ILIKE ${searchPattern}
                OR organization.username ILIKE ${searchPattern}
                OR creator.first_name ILIKE ${searchPattern}
                OR creator.last_name ILIKE ${searchPattern}
                OR (creator.first_name || ' ' || creator.last_name) ILIKE ${searchPattern}
                OR creator.phone ILIKE ${searchPattern}
            )`
        : sql``;
    const activityClause =
        query.activity === "active"
            ? sql`AND COALESCE(active_store_counts.active_store_count, 0) > 0`
            : query.activity === "inactive"
                ? sql`AND COALESCE(active_store_counts.active_store_count, 0) = 0`
                : sql``;
    const orderClause =
        query.sort === "name_asc"
            ? sql`ORDER BY name ASC, username ASC, id ASC`
            : query.sort === "name_desc"
                ? sql`ORDER BY name DESC, username ASC, id ASC`
                : query.sort === "sales_value_desc"
                    ? sql`ORDER BY completed_sales_value DESC, name ASC, username ASC, id ASC`
                    : query.sort === "sales_value_asc"
                        ? sql`ORDER BY completed_sales_value ASC, name ASC, username ASC, id ASC`
                        : sql`ORDER BY last_completed_sale_at DESC NULLS LAST, name ASC, username ASC, id ASC`;

    const rows = await pg`
        WITH completed_sales AS (
            SELECT organization_id, store_id, grand_total, committed_at
            FROM sales
            WHERE status = 'completed'
        ),
        store_counts AS (
            SELECT organization_id, COUNT(*)::int AS store_count
            FROM stores
            GROUP BY organization_id
        ),
        active_store_counts AS (
            SELECT store.organization_id, COUNT(DISTINCT store.id)::int AS active_store_count
            FROM stores store
            JOIN completed_sales completed_sale
              ON completed_sale.store_id = store.id
             AND completed_sale.committed_at >= ${activityStartAt}::timestamptz
             AND completed_sale.committed_at < ${activityEndAt}::timestamptz
            GROUP BY store.organization_id
        ),
        customer_counts AS (
            SELECT organization_id, COUNT(*)::int AS customer_count
            FROM customers
            GROUP BY organization_id
        ),
        period_sales AS (
            SELECT
                organization_id,
                COUNT(*)::int AS completed_sale_count,
                COALESCE(SUM(grand_total), 0) AS completed_sales_value
            FROM completed_sales
            WHERE (${periodStartAt}::timestamptz IS NULL OR committed_at >= ${periodStartAt}::timestamptz)
              AND (${periodEndAt}::timestamptz IS NULL OR committed_at < ${periodEndAt}::timestamptz)
            GROUP BY organization_id
        ),
        last_sales AS (
            SELECT organization_id, MAX(committed_at) AS last_completed_sale_at
            FROM completed_sales
            GROUP BY organization_id
        ),
        filtered AS (
            SELECT
                organization.id,
                organization.name,
                organization.username,
                creator.first_name AS creator_first_name,
                creator.last_name AS creator_last_name,
                creator.phone AS creator_phone,
                COALESCE(store_counts.store_count, 0)::int AS store_count,
                COALESCE(active_store_counts.active_store_count, 0)::int AS active_store_count,
                COALESCE(customer_counts.customer_count, 0)::int AS customer_count,
                COALESCE(period_sales.completed_sale_count, 0)::int AS completed_sale_count,
                COALESCE(period_sales.completed_sales_value, 0) AS completed_sales_value,
                last_sales.last_completed_sale_at
            FROM organizations organization
            JOIN users creator ON creator.id = organization.created_by
            LEFT JOIN store_counts ON store_counts.organization_id = organization.id
            LEFT JOIN active_store_counts ON active_store_counts.organization_id = organization.id
            LEFT JOIN customer_counts ON customer_counts.organization_id = organization.id
            LEFT JOIN period_sales ON period_sales.organization_id = organization.id
            LEFT JOIN last_sales ON last_sales.organization_id = organization.id
            WHERE TRUE
              ${searchClause}
              ${activityClause}
        )
        SELECT
            paged.id,
            paged.name,
            paged.username,
            paged.creator_first_name,
            paged.creator_last_name,
            paged.creator_phone,
            paged.store_count,
            paged.active_store_count,
            paged.customer_count,
            paged.completed_sale_count,
            paged.completed_sales_value,
            paged.last_completed_sale_at,
            counted.total_count
        FROM (SELECT COUNT(*)::int AS total_count FROM filtered) counted
        LEFT JOIN (
            SELECT *
            FROM filtered
            ${orderClause}
            LIMIT ${query.limit}
            OFFSET ${offset}
        ) paged ON TRUE
    `;

    return {
        totalCount: asCount(rows[0]?.total_count),
        organizations: rows
            .filter((row: Record<string, unknown>) => row.id)
            .map((row: Record<string, unknown>) => toOrganizationMetricsRow(row)),
    };
};

export const getOrganizationDetail = async (
    query: PlatformOrganizationDetailMetricsQuery,
): Promise<PlatformOrganizationDetailMetrics | null> => {
    const activityStartAt = query.activityStartAt.toISOString();
    const activityEndAt = query.activityEndAt.toISOString();
    const periodStartAt = query.periodStartAt?.toISOString() ?? null;
    const periodEndAt = query.periodEndAt?.toISOString() ?? null;

    const [organization] = await pg`
        WITH completed_sales AS (
            SELECT organization_id, store_id, grand_total, committed_at
            FROM sales
            WHERE status = 'completed'
              AND organization_id = ${query.organizationId}
        ),
        store_counts AS (
            SELECT organization_id, COUNT(*)::int AS store_count
            FROM stores
            WHERE organization_id = ${query.organizationId}
            GROUP BY organization_id
        ),
        active_store_counts AS (
            SELECT store.organization_id, COUNT(DISTINCT store.id)::int AS active_store_count
            FROM stores store
            JOIN completed_sales completed_sale
              ON completed_sale.store_id = store.id
             AND completed_sale.committed_at >= ${activityStartAt}::timestamptz
             AND completed_sale.committed_at < ${activityEndAt}::timestamptz
            WHERE store.organization_id = ${query.organizationId}
            GROUP BY store.organization_id
        ),
        customer_counts AS (
            SELECT organization_id, COUNT(*)::int AS customer_count
            FROM customers
            WHERE organization_id = ${query.organizationId}
            GROUP BY organization_id
        ),
        period_sales AS (
            SELECT
                organization_id,
                COUNT(*)::int AS completed_sale_count,
                COALESCE(SUM(grand_total), 0) AS completed_sales_value
            FROM completed_sales
            WHERE (${periodStartAt}::timestamptz IS NULL OR committed_at >= ${periodStartAt}::timestamptz)
              AND (${periodEndAt}::timestamptz IS NULL OR committed_at < ${periodEndAt}::timestamptz)
            GROUP BY organization_id
        ),
        last_sales AS (
            SELECT organization_id, MAX(committed_at) AS last_completed_sale_at
            FROM completed_sales
            GROUP BY organization_id
        )
        SELECT
            organization.id,
            organization.name,
            organization.username,
            creator.first_name AS creator_first_name,
            creator.last_name AS creator_last_name,
            creator.phone AS creator_phone,
            COALESCE(store_counts.store_count, 0)::int AS store_count,
            COALESCE(active_store_counts.active_store_count, 0)::int AS active_store_count,
            COALESCE(customer_counts.customer_count, 0)::int AS customer_count,
            COALESCE(period_sales.completed_sale_count, 0)::int AS completed_sale_count,
            COALESCE(period_sales.completed_sales_value, 0) AS completed_sales_value,
            last_sales.last_completed_sale_at
        FROM organizations organization
        JOIN users creator ON creator.id = organization.created_by
        LEFT JOIN store_counts ON store_counts.organization_id = organization.id
        LEFT JOIN active_store_counts ON active_store_counts.organization_id = organization.id
        LEFT JOIN customer_counts ON customer_counts.organization_id = organization.id
        LEFT JOIN period_sales ON period_sales.organization_id = organization.id
        LEFT JOIN last_sales ON last_sales.organization_id = organization.id
        WHERE organization.id = ${query.organizationId}
    `;

    if (!organization?.id) {
        return null;
    }

    const storeRows = await pg`
        WITH completed_sales AS (
            SELECT store_id, customer_id, grand_total, committed_at
            FROM sales
            WHERE status = 'completed'
              AND organization_id = ${query.organizationId}
        ),
        customer_counts AS (
            SELECT store_id, COUNT(DISTINCT customer_id)::int AS customer_count
            FROM completed_sales
            WHERE customer_id IS NOT NULL
            GROUP BY store_id
        ),
        period_sales AS (
            SELECT
                store_id,
                COUNT(*)::int AS completed_sale_count,
                COALESCE(SUM(grand_total), 0) AS completed_sales_value
            FROM completed_sales
            WHERE (${periodStartAt}::timestamptz IS NULL OR committed_at >= ${periodStartAt}::timestamptz)
              AND (${periodEndAt}::timestamptz IS NULL OR committed_at < ${periodEndAt}::timestamptz)
            GROUP BY store_id
        ),
        last_sales AS (
            SELECT store_id, MAX(committed_at) AS last_completed_sale_at
            FROM completed_sales
            GROUP BY store_id
        ),
        active_stores AS (
            SELECT DISTINCT store_id
            FROM completed_sales
            WHERE committed_at >= ${activityStartAt}::timestamptz
              AND committed_at < ${activityEndAt}::timestamptz
        )
        SELECT
            store.id,
            store.name,
            COALESCE(customer_counts.customer_count, 0)::int AS customer_count,
            COALESCE(period_sales.completed_sale_count, 0)::int AS completed_sale_count,
            COALESCE(period_sales.completed_sales_value, 0) AS completed_sales_value,
            last_sales.last_completed_sale_at,
            CASE WHEN active_stores.store_id IS NOT NULL THEN 1 ELSE 0 END AS is_active
        FROM stores store
        LEFT JOIN customer_counts ON customer_counts.store_id = store.id
        LEFT JOIN period_sales ON period_sales.store_id = store.id
        LEFT JOIN last_sales ON last_sales.store_id = store.id
        LEFT JOIN active_stores ON active_stores.store_id = store.id
        WHERE store.organization_id = ${query.organizationId}
        ORDER BY store.name ASC, store.id ASC
    `;

    const recentSaleRows = await pg`
        SELECT
            sale.id,
            sale.sale_number,
            sale.status::text AS status,
            sale.grand_total,
            COALESCE(sale.committed_at, sale.updated_at, sale.created_at) AS occurred_at,
            store.id AS store_id,
            store.name AS store_name
        FROM sales sale
        INNER JOIN stores store
          ON store.id = sale.store_id
         AND store.organization_id = sale.organization_id
        WHERE sale.organization_id = ${query.organizationId}
        ORDER BY COALESCE(sale.committed_at, sale.updated_at, sale.created_at) DESC, sale.id DESC
        LIMIT ${PLATFORM_OVERVIEW_RECENT_SALE_LIMIT}
    `;

    return {
        ...toOrganizationMetricsRow(organization),
        stores: storeRows.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            name: String(row.name),
            isActive: asCount(row.is_active) > 0,
            customerCount: asCount(row.customer_count),
            completedSaleCount: asCount(row.completed_sale_count),
            completedSalesValue: asMoney(row.completed_sales_value),
            lastCompletedSaleAt: asTimestamp(row.last_completed_sale_at),
        })),
        recentSales: recentSaleRows.flatMap((row: Record<string, unknown>) => {
            const status = asSaleStatus(row.status);
            const occurredAt = asTimestamp(row.occurred_at);
            if (!status || !occurredAt) return [];
            return [{
                id: String(row.id),
                saleNumber: row.sale_number == null ? null : String(row.sale_number),
                status,
                grandTotal: asMoney(row.grand_total),
                occurredAt,
                storeId: String(row.store_id),
                storeName: String(row.store_name),
            }];
        }),
    };
};
