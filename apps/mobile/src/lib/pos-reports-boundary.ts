import type {
    ProductSalesSummaryListResponse,
    ProductSalesSummaryQuery,
    SalesListQuery,
    SalesListSummary,
    ServiceResponse,
} from "@repo/types";
import { getPosTodayBounds } from "./pos-bills-boundary";

export type PosReportsDateFilter = "today" | "all";

export type PosReportScope = {
    organizationId: string;
    storeId: string;
    deviceId: string;
};

export const buildPosReportsQueries = (
    date: PosReportsDateFilter,
    now: Date = new Date(),
): { sales: SalesListQuery; products: ProductSalesSummaryQuery } => {
    const bounds = date === "today"
        ? getPosTodayBounds(now)
        : {};

    return {
        sales: { status: "completed", limit: 1, sort: "newest", ...bounds },
        products: bounds,
    };
};

export const getAverageSaleValue = (summary: SalesListSummary | null) => {
    if (!summary || summary.completedCount === 0) {
        return 0;
    }

    return summary.salesTotal / summary.completedCount;
};

export const unwrapPosProductSalesResponse = (
    response: ServiceResponse<ProductSalesSummaryListResponse | null>,
) => {
    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || "Unable to load Products Sold");
    }

    return response.data.summary;
};

export const posReportsKeys = {
    all: ["pos", "reports"] as const,
    sales: (scope: PosReportScope | null, query: SalesListQuery) => [
        ...posReportsKeys.all,
        "sales",
        scope?.organizationId ?? null,
        scope?.storeId ?? null,
        scope?.deviceId ?? null,
        query,
    ] as const,
    products: (scope: PosReportScope | null, query: ProductSalesSummaryQuery) => [
        ...posReportsKeys.all,
        "products",
        scope?.organizationId ?? null,
        scope?.storeId ?? null,
        scope?.deviceId ?? null,
        query,
    ] as const,
};
