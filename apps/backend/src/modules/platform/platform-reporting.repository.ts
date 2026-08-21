import { sql } from "bun";
import {
    PLATFORM_CUSTOMER_INSPECTION_SALE_LIMIT,
    PLATFORM_OVERVIEW_RECENT_SALE_LIMIT,
    normalizePhoneNumber,
    type PlatformOrganizationDirectorySort,
    type SalesSort,
} from "@repo/types";
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

export type PlatformOrganizationStoresMetrics = {
    stores: PlatformStoreActivityMetricsRow[];
};

export type PlatformStoreDetailMetricsQuery = PlatformOrganizationDetailMetricsQuery & {
    storeId: string;
};

export type PlatformStoreDeviceMetricsRow = {
    id: string;
    name: string;
    loginUsername: string;
    status: "active" | "inactive" | "revoked";
    lastSeenAt: string | null;
    createdAt: string;
};

export type PlatformStoreDetailMetrics = {
    id: string;
    organizationId: string;
    name: string;
    address: string | null;
    kotSystemEnabled: boolean;
    tableManagementEnabled: boolean;
    createdAt: string;
    isActive: boolean;
    customerCount: number;
    completedSaleCount: number;
    completedSalesValue: number;
    lastCompletedSaleAt: string | null;
    devices: PlatformStoreDeviceMetricsRow[];
    recentSales: PlatformRecentSaleMetricsRow[];
};

const asCount = (value: unknown) => Number(value ?? 0);
const asSaleStatus = (value: unknown): "draft" | "completed" | "voided" | null => {
    if (value === "draft" || value === "completed" || value === "voided") return value;
    return null;
};
const asDeviceStatus = (value: unknown): "active" | "inactive" | "revoked" | null => {
    if (value === "active" || value === "inactive" || value === "revoked") return value;
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

const mapStoreActivityRow = (row: Record<string, unknown>): PlatformStoreActivityMetricsRow => ({
    id: String(row.id),
    name: String(row.name),
    isActive: asCount(row.is_active) > 0,
    customerCount: asCount(row.customer_count),
    completedSaleCount: asCount(row.completed_sale_count),
    completedSalesValue: asMoney(row.completed_sales_value),
    lastCompletedSaleAt: asTimestamp(row.last_completed_sale_at),
});

const listOrganizationStoreRows = async (
    query: PlatformOrganizationDetailMetricsQuery,
): Promise<PlatformStoreActivityMetricsRow[]> => {
    const activityStartAt = query.activityStartAt.toISOString();
    const activityEndAt = query.activityEndAt.toISOString();
    const periodStartAt = query.periodStartAt?.toISOString() ?? null;
    const periodEndAt = query.periodEndAt?.toISOString() ?? null;

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

    return storeRows.map((row: Record<string, unknown>) => mapStoreActivityRow(row));
};

export const organizationExists = async (organizationId: string): Promise<boolean> => {
    const [row] = await pg`
        SELECT 1
        FROM organizations
        WHERE id = ${organizationId}
        LIMIT 1
    `;
    return Boolean(row);
};

export const listOrganizationStores = async (
    query: PlatformOrganizationDetailMetricsQuery,
): Promise<PlatformOrganizationStoresMetrics | null> => {
    if (!(await organizationExists(query.organizationId))) {
        return null;
    }

    return {
        stores: await listOrganizationStoreRows(query),
    };
};

export const getStoreDetail = async (
    query: PlatformStoreDetailMetricsQuery,
): Promise<PlatformStoreDetailMetrics | null> => {
    const activityStartAt = query.activityStartAt.toISOString();
    const activityEndAt = query.activityEndAt.toISOString();
    const periodStartAt = query.periodStartAt?.toISOString() ?? null;
    const periodEndAt = query.periodEndAt?.toISOString() ?? null;

    const [storeRow] = await pg`
        WITH completed_sales AS (
            SELECT store_id, customer_id, grand_total, committed_at
            FROM sales
            WHERE status = 'completed'
              AND organization_id = ${query.organizationId}
              AND store_id = ${query.storeId}
        ),
        customer_counts AS (
            SELECT COUNT(DISTINCT customer_id)::int AS customer_count
            FROM completed_sales
            WHERE customer_id IS NOT NULL
        ),
        period_sales AS (
            SELECT
                COUNT(*)::int AS completed_sale_count,
                COALESCE(SUM(grand_total), 0) AS completed_sales_value
            FROM completed_sales
            WHERE (${periodStartAt}::timestamptz IS NULL OR committed_at >= ${periodStartAt}::timestamptz)
              AND (${periodEndAt}::timestamptz IS NULL OR committed_at < ${periodEndAt}::timestamptz)
        ),
        last_sales AS (
            SELECT MAX(committed_at) AS last_completed_sale_at
            FROM completed_sales
        ),
        active_store AS (
            SELECT 1 AS is_active
            FROM completed_sales
            WHERE committed_at >= ${activityStartAt}::timestamptz
              AND committed_at < ${activityEndAt}::timestamptz
            LIMIT 1
        )
        SELECT
            store.id,
            store.organization_id,
            store.name,
            store.address,
            store.kot_system_enabled,
            store.table_management_enabled,
            store.created_at,
            COALESCE(customer_counts.customer_count, 0)::int AS customer_count,
            COALESCE(period_sales.completed_sale_count, 0)::int AS completed_sale_count,
            COALESCE(period_sales.completed_sales_value, 0) AS completed_sales_value,
            last_sales.last_completed_sale_at,
            CASE WHEN active_store.is_active IS NOT NULL THEN 1 ELSE 0 END AS is_active
        FROM stores store
        LEFT JOIN customer_counts ON TRUE
        LEFT JOIN period_sales ON TRUE
        LEFT JOIN last_sales ON TRUE
        LEFT JOIN active_store ON TRUE
        WHERE store.organization_id = ${query.organizationId}
          AND store.id = ${query.storeId}
    `;

    if (!storeRow?.id) {
        return null;
    }

    const deviceRows = await pg`
        SELECT
            id,
            name,
            login_username,
            status::text AS status,
            last_seen_at,
            created_at
        FROM store_devices
        WHERE organization_id = ${query.organizationId}
          AND store_id = ${query.storeId}
        ORDER BY created_at ASC, id ASC
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
          AND sale.store_id = ${query.storeId}
        ORDER BY COALESCE(sale.committed_at, sale.updated_at, sale.created_at) DESC, sale.id DESC
        LIMIT ${PLATFORM_OVERVIEW_RECENT_SALE_LIMIT}
    `;

    return {
        id: String(storeRow.id),
        organizationId: String(storeRow.organization_id),
        name: String(storeRow.name),
        address: storeRow.address == null ? null : String(storeRow.address),
        kotSystemEnabled: Boolean(storeRow.kot_system_enabled),
        tableManagementEnabled: Boolean(storeRow.table_management_enabled),
        createdAt: asTimestamp(storeRow.created_at) ?? new Date(0).toISOString(),
        isActive: asCount(storeRow.is_active) > 0,
        customerCount: asCount(storeRow.customer_count),
        completedSaleCount: asCount(storeRow.completed_sale_count),
        completedSalesValue: asMoney(storeRow.completed_sales_value),
        lastCompletedSaleAt: asTimestamp(storeRow.last_completed_sale_at),
        devices: deviceRows.flatMap((row: Record<string, unknown>) => {
            const status = asDeviceStatus(row.status);
            const createdAt = asTimestamp(row.created_at);
            if (!status || !createdAt) return [];
            return [{
                id: String(row.id),
                name: String(row.name),
                loginUsername: String(row.login_username),
                status,
                lastSeenAt: asTimestamp(row.last_seen_at),
                createdAt,
            }];
        }),
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

    const stores = await listOrganizationStoreRows(query);

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
        stores,
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

export type PlatformOrganizationSalesMetricsQuery = {
    organizationId: string;
    storeId?: string;
    status?: "draft" | "completed" | "voided";
    paymentStatus?: "pending" | "partial" | "paid";
    paymentMethod?: string;
    search?: string;
    startAt: Date | null;
    endAt: Date | null;
    sort: SalesSort;
    page: number;
    limit: number;
};

export type PlatformOrganizationSaleSummaryMetricsRow = {
    id: string;
    saleNumber: string | null;
    status: "draft" | "completed" | "voided";
    paymentStatus: "pending" | "partial" | "paid";
    grandTotal: number;
    paidTotal: number;
    dueTotal: number;
    createdAt: string;
    committedAt: string | null;
    voidedAt: string | null;
    itemCount: number;
    itemsSummary: string | null;
    paymentMethods: string | null;
    customerName: string | null;
    storeId: string;
    storeName: string;
};

export type PlatformOrganizationSalesMetrics = {
    stores: Array<{ id: string; name: string }>;
    sales: PlatformOrganizationSaleSummaryMetricsRow[];
    totalCount: number;
};

export type PlatformOrganizationSaleContextMetrics = {
    organizationName: string;
    storeId: string;
    storeName: string;
    storeAddress: string | null;
};

const asPaymentStatus = (value: unknown): "pending" | "partial" | "paid" | null => {
    if (value === "pending" || value === "partial" || value === "paid") return value;
    return null;
};

export const listOrganizationSales = async (
    query: PlatformOrganizationSalesMetricsQuery,
): Promise<PlatformOrganizationSalesMetrics | null> => {
    const [organization] = await pg`
        SELECT id
        FROM organizations
        WHERE id = ${query.organizationId}
    `;
    if (!organization?.id) {
        return null;
    }

    const storeRows = await pg`
        SELECT id, name
        FROM stores
        WHERE organization_id = ${query.organizationId}
        ORDER BY name ASC, id ASC
    `;

    const search = query.search?.trim() ?? "";
    const searchPattern = search ? `%${search}%` : "";
    const storeId = query.storeId ?? "";
    const status = query.status ?? "";
    const paymentStatus = query.paymentStatus ?? "";
    const paymentMethod = query.paymentMethod ?? "";
    const startAt = query.startAt?.toISOString() ?? null;
    const endAt = query.endAt?.toISOString() ?? null;
    const offset = (query.page - 1) * query.limit;
    const sort = query.sort;

    const [countRow] = await pg`
        SELECT COUNT(*)::int AS total_count
        FROM sales s
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE s.organization_id = ${query.organizationId}
          AND (${storeId} = '' OR s.store_id::text = ${storeId})
          AND (${status} = '' OR s.status::text = ${status})
          AND (${paymentStatus} = '' OR s.payment_status::text = ${paymentStatus})
          AND (
              ${paymentMethod} = ''
              OR EXISTS (
                  SELECT 1
                  FROM payments payment_filter
                  WHERE payment_filter.sale_id = s.id
                    AND payment_filter.method::text = ${paymentMethod}
              )
          )
          AND (${startAt}::timestamptz IS NULL OR s.created_at >= ${startAt}::timestamptz)
          AND (${endAt}::timestamptz IS NULL OR s.created_at < ${endAt}::timestamptz)
          AND (
              ${search} = ''
              OR CAST(s.sale_number AS TEXT) ILIKE ${searchPattern}
              OR COALESCE(c.name, '') ILIKE ${searchPattern}
              OR COALESCE(c.phone, '') ILIKE ${searchPattern}
              OR COALESCE(s.customer_name_snapshot, '') ILIKE ${searchPattern}
              OR COALESCE(s.customer_phone_snapshot, '') ILIKE ${searchPattern}
          )
    `;

    const saleRows = await pg`
        SELECT
            s.id,
            s.sale_number,
            s.status::text AS status,
            s.payment_status::text AS payment_status,
            s.grand_total,
            s.created_at,
            s.committed_at,
            s.voided_at,
            COALESCE(item_stats.item_count, 0) AS item_count,
            COALESCE(item_stats.items_summary, '') AS items_summary,
            COALESCE(payment_stats.payment_methods, '') AS payment_methods,
            COALESCE(payment_stats.paid_total, 0) AS paid_total,
            GREATEST(s.grand_total - COALESCE(payment_stats.paid_total, 0), 0) AS due_total,
            COALESCE(c.name, s.customer_name_snapshot) AS customer_name,
            store.id AS store_id,
            store.name AS store_name
        FROM sales s
        INNER JOIN stores store
          ON store.id = s.store_id
         AND store.organization_id = s.organization_id
        LEFT JOIN customers c ON c.id = s.customer_id
        LEFT JOIN (
            SELECT
                sale_id,
                COUNT(*)::int AS item_count,
                STRING_AGG(product_name_snapshot, ', ') AS items_summary
            FROM sale_items
            GROUP BY sale_id
        ) item_stats ON item_stats.sale_id = s.id
        LEFT JOIN (
            SELECT
                sale_id,
                COALESCE(SUM(amount), 0) AS paid_total,
                NULLIF(STRING_AGG(DISTINCT method::text, ', '), '') AS payment_methods
            FROM payments
            GROUP BY sale_id
        ) payment_stats ON payment_stats.sale_id = s.id
        WHERE s.organization_id = ${query.organizationId}
          AND (${storeId} = '' OR s.store_id::text = ${storeId})
          AND (${status} = '' OR s.status::text = ${status})
          AND (${paymentStatus} = '' OR s.payment_status::text = ${paymentStatus})
          AND (
              ${paymentMethod} = ''
              OR EXISTS (
                  SELECT 1
                  FROM payments payment_filter
                  WHERE payment_filter.sale_id = s.id
                    AND payment_filter.method::text = ${paymentMethod}
              )
          )
          AND (${startAt}::timestamptz IS NULL OR s.created_at >= ${startAt}::timestamptz)
          AND (${endAt}::timestamptz IS NULL OR s.created_at < ${endAt}::timestamptz)
          AND (
              ${search} = ''
              OR CAST(s.sale_number AS TEXT) ILIKE ${searchPattern}
              OR COALESCE(c.name, '') ILIKE ${searchPattern}
              OR COALESCE(c.phone, '') ILIKE ${searchPattern}
              OR COALESCE(s.customer_name_snapshot, '') ILIKE ${searchPattern}
              OR COALESCE(s.customer_phone_snapshot, '') ILIKE ${searchPattern}
          )
        ORDER BY
            CASE WHEN ${sort} = 'newest' THEN s.created_at END DESC,
            CASE WHEN ${sort} = 'oldest' THEN s.created_at END ASC,
            CASE WHEN ${sort} = 'highest' THEN s.grand_total END DESC,
            CASE WHEN ${sort} = 'lowest' THEN s.grand_total END ASC,
            CASE WHEN ${sort} IN ('newest', 'highest') THEN s.id END DESC,
            CASE WHEN ${sort} IN ('oldest', 'lowest') THEN s.id END ASC
        LIMIT ${query.limit}
        OFFSET ${offset}
    `;

    return {
        stores: storeRows.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            name: String(row.name),
        })),
        sales: saleRows.flatMap((row: Record<string, unknown>) => {
            const statusValue = asSaleStatus(row.status);
            const paymentStatusValue = asPaymentStatus(row.payment_status);
            const createdAt = asTimestamp(row.created_at);
            if (!statusValue || !paymentStatusValue || !createdAt) return [];
            return [{
                id: String(row.id),
                saleNumber: row.sale_number == null ? null : String(row.sale_number),
                status: statusValue,
                paymentStatus: paymentStatusValue,
                grandTotal: asMoney(row.grand_total),
                paidTotal: asMoney(row.paid_total),
                dueTotal: asMoney(row.due_total),
                createdAt,
                committedAt: asTimestamp(row.committed_at),
                voidedAt: asTimestamp(row.voided_at),
                itemCount: asCount(row.item_count),
                itemsSummary: row.items_summary ? String(row.items_summary) : null,
                paymentMethods: row.payment_methods ? String(row.payment_methods) : null,
                customerName: row.customer_name ? String(row.customer_name) : null,
                storeId: String(row.store_id),
                storeName: String(row.store_name),
            }];
        }),
        totalCount: asCount(countRow?.total_count),
    };
};

export const getOrganizationSaleContext = async (
    organizationId: string,
    saleId: string,
): Promise<PlatformOrganizationSaleContextMetrics | null> => {
    const [row] = await pg`
        SELECT
            organization.name AS organization_name,
            store.id AS store_id,
            store.name AS store_name,
            store.address AS store_address
        FROM sales sale
        INNER JOIN organizations organization ON organization.id = sale.organization_id
        INNER JOIN stores store
          ON store.id = sale.store_id
         AND store.organization_id = sale.organization_id
        WHERE sale.organization_id = ${organizationId}
          AND sale.id = ${saleId}
    `;

    if (!row?.store_id) {
        return null;
    }

    return {
        organizationName: String(row.organization_name),
        storeId: String(row.store_id),
        storeName: String(row.store_name),
        storeAddress: row.store_address == null ? null : String(row.store_address),
    };
};

export type PlatformCatalogListMetricsQuery = {
    organizationId: string;
    tab: "products" | "categories" | "add-ons";
    search: string;
    status: "all" | "active" | "inactive";
    page: number;
    limit: number;
};

export type PlatformCatalogCategoryMetricsRow = {
    id: string;
    name: string;
    sortOrder: number;
    status: "active" | "inactive";
    productCount: number;
    createdAt: string;
    updatedAt: string;
};

export type PlatformCatalogProductMetricsRow = {
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
    price: number;
    discount: number;
    status: "active" | "inactive";
    productType: "single" | "bundle" | "combo";
    productCode: string | null;
    productCodeKind: "manufacturer" | "internal_rcn" | null;
    sortOrder: number;
    attachmentCount: number;
    hasImage: boolean;
    createdAt: string;
    updatedAt: string;
};

export type PlatformCatalogAddOnMetricsRow = {
    id: string;
    name: string;
    price: number;
    discount: number;
    status: "active" | "inactive";
    attachmentCount: number;
    createdAt: string;
    updatedAt: string;
};

export type PlatformCatalogAttachmentMetricsRow = {
    id: string;
    addOnId: string;
    addOnName: string;
    selectionCap: number;
    status: "active" | "inactive";
    addOnPrice: number;
    addOnDiscount: number;
    addOnStatus: "active" | "inactive";
};

export type PlatformCatalogProductAttachmentMetricsRow = {
    id: string;
    productId: string;
    productName: string;
    selectionCap: number;
    status: "active" | "inactive";
};

export type PlatformCatalogListMetrics = {
    counts: {
        categories: number;
        products: number;
        addOns: number;
    };
    categories: PlatformCatalogCategoryMetricsRow[];
    products: PlatformCatalogProductMetricsRow[];
    addOns: PlatformCatalogAddOnMetricsRow[];
    totalCount: number;
};

const asCategoryStatus = (value: unknown): "active" | "inactive" | null => {
    if (value === "active" || value === "inactive") return value;
    return null;
};

const asProductStatus = asCategoryStatus;

const asAddOnStatus = asCategoryStatus;

const asAttachmentStatus = asCategoryStatus;

const asProductType = (value: unknown): "single" | "bundle" | "combo" | null => {
    if (value === "single" || value === "bundle" || value === "combo") return value;
    return null;
};

const asProductCodeKind = (value: unknown): "manufacturer" | "internal_rcn" | null => {
    if (value === "manufacturer" || value === "internal_rcn") return value;
    return null;
};

const mapCategoryRow = (row: Record<string, unknown>): PlatformCatalogCategoryMetricsRow | null => {
    const status = asCategoryStatus(row.status);
    const createdAt = asTimestamp(row.created_at);
    const updatedAt = asTimestamp(row.updated_at);
    if (!status || !createdAt || !updatedAt) return null;
    return {
        id: String(row.id),
        name: String(row.name),
        sortOrder: asCount(row.sort_order),
        status,
        productCount: asCount(row.product_count),
        createdAt,
        updatedAt,
    };
};

const mapProductRow = (row: Record<string, unknown>): PlatformCatalogProductMetricsRow | null => {
    const status = asProductStatus(row.status);
    const productType = asProductType(row.product_type);
    const createdAt = asTimestamp(row.created_at);
    const updatedAt = asTimestamp(row.updated_at);
    if (!status || !productType || !createdAt || !updatedAt) return null;
    return {
        id: String(row.id),
        name: String(row.name),
        categoryId: String(row.category_id),
        categoryName: String(row.category_name),
        price: asMoney(row.price),
        discount: asMoney(row.discount),
        status,
        productType,
        productCode: row.product_code == null ? null : String(row.product_code),
        productCodeKind: asProductCodeKind(row.product_code_kind),
        sortOrder: asCount(row.sort_order),
        attachmentCount: asCount(row.attachment_count),
        hasImage: Boolean(row.image_path),
        createdAt,
        updatedAt,
    };
};

const mapAddOnRow = (row: Record<string, unknown>): PlatformCatalogAddOnMetricsRow | null => {
    const status = asAddOnStatus(row.status);
    const createdAt = asTimestamp(row.created_at);
    const updatedAt = asTimestamp(row.updated_at);
    if (!status || !createdAt || !updatedAt) return null;
    return {
        id: String(row.id),
        name: String(row.name),
        price: asMoney(row.price),
        discount: asMoney(row.discount),
        status,
        attachmentCount: asCount(row.attachment_count),
        createdAt,
        updatedAt,
    };
};

const catalogSearchPattern = (search: string) => `%${search.replace(/[%_\\]/g, "\\$&")}%`;

export const listOrganizationCatalog = async (
    query: PlatformCatalogListMetricsQuery,
): Promise<PlatformCatalogListMetrics | null> => {
    if (!(await organizationExists(query.organizationId))) {
        return null;
    }

    const search = query.search.trim();
    const searchPattern = search ? catalogSearchPattern(search) : null;
    const statusFilter = query.status === "all" ? null : query.status;
    const offset = (query.page - 1) * query.limit;

    const [countRow] = await pg`
        SELECT
            (SELECT COUNT(*)::int FROM categories WHERE organization_id = ${query.organizationId}) AS category_count,
            (SELECT COUNT(*)::int FROM products WHERE organization_id = ${query.organizationId}) AS product_count,
            (SELECT COUNT(*)::int FROM add_ons WHERE organization_id = ${query.organizationId}) AS add_on_count
    `;

    if (query.tab === "categories") {
        const [totalRow] = await pg`
            SELECT COUNT(*)::int AS total_count
            FROM categories category
            WHERE category.organization_id = ${query.organizationId}
              AND (${statusFilter}::category_status_enum IS NULL OR category.status = ${statusFilter}::category_status_enum)
              AND (
                ${searchPattern}::text IS NULL
                OR category.name ILIKE ${searchPattern}
              )
        `;

        const categoryRows = await pg`
            SELECT
                category.id,
                category.name,
                category.sort_order,
                category.status::text AS status,
                category.created_at,
                category.updated_at,
                (
                    SELECT COUNT(*)::int
                    FROM products product
                    WHERE product.organization_id = category.organization_id
                      AND product.category_id = category.id
                ) AS product_count
            FROM categories category
            WHERE category.organization_id = ${query.organizationId}
              AND (${statusFilter}::category_status_enum IS NULL OR category.status = ${statusFilter}::category_status_enum)
              AND (
                ${searchPattern}::text IS NULL
                OR category.name ILIKE ${searchPattern}
              )
            ORDER BY category.sort_order ASC, category.created_at ASC, category.id ASC
            LIMIT ${query.limit}
            OFFSET ${offset}
        `;

        return {
            counts: {
                categories: asCount(countRow?.category_count),
                products: asCount(countRow?.product_count),
                addOns: asCount(countRow?.add_on_count),
            },
            categories: categoryRows.flatMap((row: Record<string, unknown>) => {
                const mapped = mapCategoryRow(row);
                return mapped ? [mapped] : [];
            }),
            products: [],
            addOns: [],
            totalCount: asCount(totalRow?.total_count),
        };
    }

    if (query.tab === "add-ons") {
        const [totalRow] = await pg`
            SELECT COUNT(*)::int AS total_count
            FROM add_ons add_on
            WHERE add_on.organization_id = ${query.organizationId}
              AND (${statusFilter}::add_on_status_enum IS NULL OR add_on.status = ${statusFilter}::add_on_status_enum)
              AND (
                ${searchPattern}::text IS NULL
                OR add_on.name ILIKE ${searchPattern}
              )
        `;

        const addOnRows = await pg`
            SELECT
                add_on.id,
                add_on.name,
                add_on.price,
                add_on.discount,
                add_on.status::text AS status,
                add_on.created_at,
                add_on.updated_at,
                (
                    SELECT COUNT(*)::int
                    FROM product_add_on_attachments attachment
                    WHERE attachment.organization_id = add_on.organization_id
                      AND attachment.add_on_id = add_on.id
                ) AS attachment_count
            FROM add_ons add_on
            WHERE add_on.organization_id = ${query.organizationId}
              AND (${statusFilter}::add_on_status_enum IS NULL OR add_on.status = ${statusFilter}::add_on_status_enum)
              AND (
                ${searchPattern}::text IS NULL
                OR add_on.name ILIKE ${searchPattern}
              )
            ORDER BY add_on.created_at ASC, add_on.id ASC
            LIMIT ${query.limit}
            OFFSET ${offset}
        `;

        return {
            counts: {
                categories: asCount(countRow?.category_count),
                products: asCount(countRow?.product_count),
                addOns: asCount(countRow?.add_on_count),
            },
            categories: [],
            products: [],
            addOns: addOnRows.flatMap((row: Record<string, unknown>) => {
                const mapped = mapAddOnRow(row);
                return mapped ? [mapped] : [];
            }),
            totalCount: asCount(totalRow?.total_count),
        };
    }

    const [totalRow] = await pg`
        SELECT COUNT(*)::int AS total_count
        FROM products product
        INNER JOIN categories category
          ON category.id = product.category_id
         AND category.organization_id = product.organization_id
        WHERE product.organization_id = ${query.organizationId}
          AND (${statusFilter}::product_status_enum IS NULL OR product.status = ${statusFilter}::product_status_enum)
          AND (
            ${searchPattern}::text IS NULL
            OR product.name ILIKE ${searchPattern}
            OR product.product_code ILIKE ${searchPattern}
          )
    `;

    const productRows = await pg`
        SELECT
            product.id,
            product.name,
            product.price,
            product.discount,
            product.status::text AS status,
            product.product_type::text AS product_type,
            product.product_code,
            product.product_code_kind::text AS product_code_kind,
            product.sort_order,
            product.image_path,
            product.created_at,
            product.updated_at,
            category.id AS category_id,
            category.name AS category_name,
            (
                SELECT COUNT(*)::int
                FROM product_add_on_attachments attachment
                WHERE attachment.organization_id = product.organization_id
                  AND attachment.product_id = product.id
            ) AS attachment_count
        FROM products product
        INNER JOIN categories category
          ON category.id = product.category_id
         AND category.organization_id = product.organization_id
        WHERE product.organization_id = ${query.organizationId}
          AND (${statusFilter}::product_status_enum IS NULL OR product.status = ${statusFilter}::product_status_enum)
          AND (
            ${searchPattern}::text IS NULL
            OR product.name ILIKE ${searchPattern}
            OR product.product_code ILIKE ${searchPattern}
          )
        ORDER BY category.sort_order ASC, product.sort_order ASC, product.created_at ASC, product.id ASC
        LIMIT ${query.limit}
        OFFSET ${offset}
    `;

    return {
        counts: {
            categories: asCount(countRow?.category_count),
            products: asCount(countRow?.product_count),
            addOns: asCount(countRow?.add_on_count),
        },
        categories: [],
        products: productRows.flatMap((row: Record<string, unknown>) => {
            const mapped = mapProductRow(row);
            return mapped ? [mapped] : [];
        }),
        addOns: [],
        totalCount: asCount(totalRow?.total_count),
    };
};

export const getOrganizationCatalogProduct = async (
    organizationId: string,
    productId: string,
): Promise<(PlatformCatalogProductMetricsRow & { attachments: PlatformCatalogAttachmentMetricsRow[] }) | null> => {
    const [productRow] = await pg`
        SELECT
            product.id,
            product.name,
            product.price,
            product.discount,
            product.status::text AS status,
            product.product_type::text AS product_type,
            product.product_code,
            product.product_code_kind::text AS product_code_kind,
            product.sort_order,
            product.image_path,
            product.created_at,
            product.updated_at,
            category.id AS category_id,
            category.name AS category_name,
            (
                SELECT COUNT(*)::int
                FROM product_add_on_attachments attachment
                WHERE attachment.organization_id = product.organization_id
                  AND attachment.product_id = product.id
            ) AS attachment_count
        FROM products product
        INNER JOIN categories category
          ON category.id = product.category_id
         AND category.organization_id = product.organization_id
        WHERE product.organization_id = ${organizationId}
          AND product.id = ${productId}
    `;

    const product = productRow ? mapProductRow(productRow) : null;
    if (!product) return null;

    const attachmentRows = await pg`
        SELECT
            attachment.id,
            attachment.add_on_id,
            attachment.selection_cap,
            attachment.status::text AS status,
            add_on.name AS add_on_name,
            add_on.price AS add_on_price,
            add_on.discount AS add_on_discount,
            add_on.status::text AS add_on_status
        FROM product_add_on_attachments attachment
        INNER JOIN add_ons add_on
          ON add_on.id = attachment.add_on_id
         AND add_on.organization_id = attachment.organization_id
        WHERE attachment.organization_id = ${organizationId}
          AND attachment.product_id = ${productId}
        ORDER BY attachment.created_at ASC, attachment.id ASC
    `;

    return {
        ...product,
        attachments: attachmentRows.flatMap((row: Record<string, unknown>) => {
            const status = asAttachmentStatus(row.status);
            const addOnStatus = asAddOnStatus(row.add_on_status);
            if (!status || !addOnStatus) return [];
            return [{
                id: String(row.id),
                addOnId: String(row.add_on_id),
                addOnName: String(row.add_on_name),
                selectionCap: asCount(row.selection_cap),
                status,
                addOnPrice: asMoney(row.add_on_price),
                addOnDiscount: asMoney(row.add_on_discount),
                addOnStatus,
            }];
        }),
    };
};

export const getOrganizationCatalogCategory = async (
    organizationId: string,
    categoryId: string,
): Promise<(PlatformCatalogCategoryMetricsRow & { products: PlatformCatalogProductMetricsRow[] }) | null> => {
    const [categoryRow] = await pg`
        SELECT
            category.id,
            category.name,
            category.sort_order,
            category.status::text AS status,
            category.created_at,
            category.updated_at,
            (
                SELECT COUNT(*)::int
                FROM products product
                WHERE product.organization_id = category.organization_id
                  AND product.category_id = category.id
            ) AS product_count
        FROM categories category
        WHERE category.organization_id = ${organizationId}
          AND category.id = ${categoryId}
    `;

    const category = categoryRow ? mapCategoryRow(categoryRow) : null;
    if (!category) return null;

    const productRows = await pg`
        SELECT
            product.id,
            product.name,
            product.price,
            product.discount,
            product.status::text AS status,
            product.product_type::text AS product_type,
            product.product_code,
            product.product_code_kind::text AS product_code_kind,
            product.sort_order,
            product.image_path,
            product.created_at,
            product.updated_at,
            category.id AS category_id,
            category.name AS category_name,
            (
                SELECT COUNT(*)::int
                FROM product_add_on_attachments attachment
                WHERE attachment.organization_id = product.organization_id
                  AND attachment.product_id = product.id
            ) AS attachment_count
        FROM products product
        INNER JOIN categories category
          ON category.id = product.category_id
         AND category.organization_id = product.organization_id
        WHERE product.organization_id = ${organizationId}
          AND product.category_id = ${categoryId}
        ORDER BY product.sort_order ASC, product.created_at ASC, product.id ASC
    `;

    return {
        ...category,
        products: productRows.flatMap((row: Record<string, unknown>) => {
            const mapped = mapProductRow(row);
            return mapped ? [mapped] : [];
        }),
    };
};

export const getOrganizationCatalogAddOn = async (
    organizationId: string,
    addOnId: string,
): Promise<(PlatformCatalogAddOnMetricsRow & { attachments: PlatformCatalogProductAttachmentMetricsRow[] }) | null> => {
    const [addOnRow] = await pg`
        SELECT
            add_on.id,
            add_on.name,
            add_on.price,
            add_on.discount,
            add_on.status::text AS status,
            add_on.created_at,
            add_on.updated_at,
            (
                SELECT COUNT(*)::int
                FROM product_add_on_attachments attachment
                WHERE attachment.organization_id = add_on.organization_id
                  AND attachment.add_on_id = add_on.id
            ) AS attachment_count
        FROM add_ons add_on
        WHERE add_on.organization_id = ${organizationId}
          AND add_on.id = ${addOnId}
    `;

    const addOn = addOnRow ? mapAddOnRow(addOnRow) : null;
    if (!addOn) return null;

    const attachmentRows = await pg`
        SELECT
            attachment.id,
            attachment.product_id,
            attachment.selection_cap,
            attachment.status::text AS status,
            product.name AS product_name
        FROM product_add_on_attachments attachment
        INNER JOIN products product
          ON product.id = attachment.product_id
         AND product.organization_id = attachment.organization_id
        WHERE attachment.organization_id = ${organizationId}
          AND attachment.add_on_id = ${addOnId}
        ORDER BY product.sort_order ASC, product.created_at ASC, attachment.id ASC
    `;

    return {
        ...addOn,
        attachments: attachmentRows.flatMap((row: Record<string, unknown>) => {
            const status = asAttachmentStatus(row.status);
            if (!status) return [];
            return [{
                id: String(row.id),
                productId: String(row.product_id),
                productName: String(row.product_name),
                selectionCap: asCount(row.selection_cap),
                status,
            }];
        }),
    };
};

export type PlatformOrganizationCustomersMetricsQuery = {
    organizationId: string;
    search: string;
    status: "all" | "active" | "inactive" | "due" | "no_due";
    sort: "newest" | "oldest" | "name_asc" | "name_desc" | "highest_due" | "lowest_due";
    page: number;
    limit: number;
};

export type PlatformOrganizationCustomerSummaryMetricsRow = {
    id: string;
    name: string;
    phone: string | null;
    balance: number;
    isActive: boolean;
    createdAt: string;
};

export type PlatformOrganizationCustomersMetrics = {
    customers: PlatformOrganizationCustomerSummaryMetricsRow[];
    totalCount: number;
};

export type PlatformOrganizationCustomerDetailMetrics = {
    id: string;
    name: string;
    phone: string | null;
    balance: number;
    isActive: boolean;
    marketingOptedOut: boolean;
    createdAt: string;
    updatedAt: string;
    ledger: Array<{
        id: string;
        saleId: string | null;
        paymentId: string | null;
        entryType: "sale" | "payment" | "void" | "adjustment";
        amount: number;
        balanceAfter: number;
        notes: string | null;
        createdAt: string;
    }>;
    sales: PlatformOrganizationSaleSummaryMetricsRow[];
};

const customerSearchPattern = (search: string) => `%${search.replace(/[%_\\]/g, "\\$&")}%`;

export const listOrganizationCustomers = async (
    query: PlatformOrganizationCustomersMetricsQuery,
): Promise<PlatformOrganizationCustomersMetrics | null> => {
    if (!(await organizationExists(query.organizationId))) {
        return null;
    }

    const search = query.search.trim();
    const searchPattern = search ? customerSearchPattern(search) : null;
    const normalizedPhoneSearch = search ? normalizePhoneNumber(search) : null;
    const normalizedPhonePattern = normalizedPhoneSearch ? customerSearchPattern(normalizedPhoneSearch) : null;
    const statusFilter = query.status;
    const offset = (query.page - 1) * query.limit;
    const sort = query.sort;

    const statusClause = {
        all: sql``,
        active: sql`AND c.is_active = TRUE`,
        inactive: sql`AND c.is_active = FALSE`,
        due: sql`AND c.balance > 0`,
        no_due: sql`AND c.balance = 0`,
    }[statusFilter];

    const orderClause = {
        newest: sql`c.created_at DESC, c.id DESC`,
        oldest: sql`c.created_at ASC, c.id ASC`,
        name_asc: sql`LOWER(c.name) ASC, c.id ASC`,
        name_desc: sql`LOWER(c.name) DESC, c.id DESC`,
        highest_due: sql`c.balance DESC, c.id DESC`,
        lowest_due: sql`c.balance ASC, c.id ASC`,
    }[sort];

    const [countRow] = await pg`
        SELECT COUNT(*)::int AS total_count
        FROM customers c
        WHERE c.organization_id = ${query.organizationId}
          ${statusClause}
          AND (
            ${searchPattern}::text IS NULL
            OR c.name ILIKE ${searchPattern}
            OR COALESCE(c.phone, '') ILIKE ${searchPattern}
            OR (${normalizedPhonePattern}::text IS NOT NULL AND COALESCE(c.phone, '') ILIKE ${normalizedPhonePattern})
          )
    `;

    const customerRows = await pg`
        SELECT
            c.id,
            c.name,
            c.phone,
            c.balance,
            c.is_active,
            c.created_at
        FROM customers c
        WHERE c.organization_id = ${query.organizationId}
          ${statusClause}
          AND (
            ${searchPattern}::text IS NULL
            OR c.name ILIKE ${searchPattern}
            OR COALESCE(c.phone, '') ILIKE ${searchPattern}
            OR (${normalizedPhonePattern}::text IS NOT NULL AND COALESCE(c.phone, '') ILIKE ${normalizedPhonePattern})
          )
        ORDER BY ${orderClause}
        LIMIT ${query.limit}
        OFFSET ${offset}
    `;

    return {
        customers: customerRows.flatMap((row: Record<string, unknown>) => {
            const createdAt = asTimestamp(row.created_at);
            if (!createdAt) return [];
            return [{
                id: String(row.id),
                name: String(row.name),
                phone: row.phone == null ? null : String(row.phone),
                balance: asMoney(row.balance),
                isActive: Boolean(row.is_active),
                createdAt,
            }];
        }),
        totalCount: asCount(countRow?.total_count),
    };
};

export const getOrganizationCustomerContext = async (
    organizationId: string,
    customerId: string,
): Promise<PlatformOrganizationCustomerDetailMetrics | null> => {
    const [customerRow] = await pg`
        SELECT
            c.id,
            c.name,
            c.phone,
            c.balance,
            c.is_active,
            c.marketing_opted_out,
            c.created_at,
            c.updated_at
        FROM customers c
        WHERE c.organization_id = ${organizationId}
          AND c.id = ${customerId}
    `;

    if (!customerRow?.id) {
        return null;
    }

    const createdAt = asTimestamp(customerRow.created_at);
    const updatedAt = asTimestamp(customerRow.updated_at);
    if (!createdAt || !updatedAt) {
        return null;
    }

    const ledgerRows = await pg`
        SELECT
            entry.id,
            entry.sale_id,
            entry.payment_id,
            entry.entry_type::text AS entry_type,
            entry.amount,
            entry.balance_after,
            entry.notes,
            entry.created_at
        FROM customer_ledger entry
        WHERE entry.organization_id = ${organizationId}
          AND entry.customer_id = ${customerId}
        ORDER BY entry.created_at ASC, entry.id ASC
    `;

    const saleRows = await pg`
        SELECT
            s.id,
            s.sale_number,
            s.status::text AS status,
            s.payment_status::text AS payment_status,
            s.grand_total,
            s.created_at,
            s.committed_at,
            s.voided_at,
            COALESCE(item_stats.item_count, 0) AS item_count,
            COALESCE(item_stats.items_summary, '') AS items_summary,
            COALESCE(payment_stats.payment_methods, '') AS payment_methods,
            COALESCE(payment_stats.paid_total, 0) AS paid_total,
            GREATEST(s.grand_total - COALESCE(payment_stats.paid_total, 0), 0) AS due_total,
            COALESCE(c.name, s.customer_name_snapshot) AS customer_name,
            store.id AS store_id,
            store.name AS store_name
        FROM sales s
        INNER JOIN stores store
          ON store.id = s.store_id
         AND store.organization_id = s.organization_id
        LEFT JOIN customers c ON c.id = s.customer_id
        LEFT JOIN (
            SELECT
                sale_id,
                COUNT(*)::int AS item_count,
                STRING_AGG(product_name_snapshot, ', ') AS items_summary
            FROM sale_items
            GROUP BY sale_id
        ) item_stats ON item_stats.sale_id = s.id
        LEFT JOIN (
            SELECT
                sale_id,
                COALESCE(SUM(amount), 0) AS paid_total,
                NULLIF(STRING_AGG(DISTINCT method::text, ', '), '') AS payment_methods
            FROM payments
            GROUP BY sale_id
        ) payment_stats ON payment_stats.sale_id = s.id
        WHERE s.organization_id = ${organizationId}
          AND s.customer_id = ${customerId}
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT ${PLATFORM_CUSTOMER_INSPECTION_SALE_LIMIT}
    `;

    return {
        id: String(customerRow.id),
        name: String(customerRow.name),
        phone: customerRow.phone == null ? null : String(customerRow.phone),
        balance: asMoney(customerRow.balance),
        isActive: Boolean(customerRow.is_active),
        marketingOptedOut: Boolean(customerRow.marketing_opted_out),
        createdAt,
        updatedAt,
        ledger: ledgerRows.flatMap((row: Record<string, unknown>) => {
            const entryType = row.entry_type;
            const entryCreatedAt = asTimestamp(row.created_at);
            if (
                entryType !== "sale"
                && entryType !== "payment"
                && entryType !== "void"
                && entryType !== "adjustment"
            ) {
                return [];
            }
            if (!entryCreatedAt) return [];
            return [{
                id: String(row.id),
                saleId: row.sale_id == null ? null : String(row.sale_id),
                paymentId: row.payment_id == null ? null : String(row.payment_id),
                entryType,
                amount: Number(row.amount ?? 0),
                balanceAfter: asMoney(row.balance_after),
                notes: row.notes == null ? null : String(row.notes),
                createdAt: entryCreatedAt,
            }];
        }),
        sales: saleRows.flatMap((row: Record<string, unknown>) => {
            const statusValue = asSaleStatus(row.status);
            const paymentStatusValue = asPaymentStatus(row.payment_status);
            const saleCreatedAt = asTimestamp(row.created_at);
            if (!statusValue || !paymentStatusValue || !saleCreatedAt) return [];
            return [{
                id: String(row.id),
                saleNumber: row.sale_number == null ? null : String(row.sale_number),
                status: statusValue,
                paymentStatus: paymentStatusValue,
                grandTotal: asMoney(row.grand_total),
                paidTotal: asMoney(row.paid_total),
                dueTotal: asMoney(row.due_total),
                createdAt: saleCreatedAt,
                committedAt: asTimestamp(row.committed_at),
                voidedAt: asTimestamp(row.voided_at),
                itemCount: asCount(row.item_count),
                itemsSummary: row.items_summary ? String(row.items_summary) : null,
                paymentMethods: row.payment_methods ? String(row.payment_methods) : null,
                customerName: row.customer_name ? String(row.customer_name) : null,
                storeId: String(row.store_id),
                storeName: String(row.store_name),
            }];
        }),
    };
};
