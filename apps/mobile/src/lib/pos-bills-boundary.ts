import type { PaymentMethod, PaymentStatus, SalesListQuery, SalesListResponse, ServiceResponse } from "@repo/types";

export type PosBillsDateFilter = "today" | "all";
export type PosBillsStatusFilter = "completed" | "draft";
export type PosBillsPaymentStatusFilter = "all" | Exclude<PaymentStatus, "pending"> | "due";
export type PosBillsPaymentMethodFilter = "all" | PaymentMethod;

export type PosBillsFilters = {
    status: PosBillsStatusFilter;
    customerId?: string;
    date: PosBillsDateFilter;
    paymentStatus: PosBillsPaymentStatusFilter;
    paymentMethod: PosBillsPaymentMethodFilter;
    search: string;
};

export const getPosTodayBounds = (now: Date = new Date()) => {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    return { createdFrom: from.toISOString(), createdTo: to.toISOString() };
};

export const buildPosBillsQuery = (
    filters: PosBillsFilters,
    now: Date = new Date(),
): SalesListQuery => {
    const paymentStatus = filters.paymentStatus === "due"
        ? "pending"
        : filters.paymentStatus === "all"
          ? undefined
          : filters.paymentStatus;

    return {
        limit: 30,
        sort: "newest",
        status: filters.status,
        customerId: filters.customerId,
        search: filters.search.trim() || undefined,
        paymentStatus,
        paymentMethod: filters.paymentMethod === "all" ? undefined : filters.paymentMethod,
        ...(filters.date === "today" ? getPosTodayBounds(now) : {}),
    };
};

export const unwrapPosSalesResponse = (
    response: ServiceResponse<SalesListResponse | null>,
): SalesListResponse => {
    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || "Unable to load POS Bills");
    }

    return response.data;
};

export const posBillsKeys = {
    all: ["pos", "bills"] as const,
    list: (scope: { organizationId: string; storeId: string; deviceId: string } | null, query: SalesListQuery) => [
        ...posBillsKeys.all,
        scope?.organizationId ?? null,
        scope?.storeId ?? null,
        scope?.deviceId ?? null,
        query,
    ] as const,
};
