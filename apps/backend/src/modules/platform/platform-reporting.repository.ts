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

const asCount = (value: unknown) => Number(value ?? 0);
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
