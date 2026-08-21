import {
    STATUS_CODES,
    resolveActiveStoreWindow,
    resolveBillingInspectionDateRange,
    resolvePlatformReportingPeriod,
    type PlatformBillingInspectionQuerySVC,
    type PlatformDashboardQuerySVC,
    type PlatformDashboardResponse,
    type PlatformOrganizationDetailQuerySVC,
    type PlatformOrganizationDetailResponse,
    type PlatformOrganizationListItemDTO,
    type PlatformOrganizationListQuerySVC,
    type PlatformOrganizationListResponse,
    type PlatformSaleInspectionDetailResponse,
    type PlatformSaleInspectionListResponse,
    type PlatformStoreDetailResponse,
    type PlatformStoreInspectionQuerySVC,
    type PlatformStoreListResponse,
    type SaleDetailDTO,
    type ServiceResponse,
} from "@repo/types";
import * as billingRepository from "@/modules/tenant/billing/billing.repository";
import * as platformReportingRepository from "./platform-reporting.repository";
import type { PlatformOrganizationListMetricsRow } from "./platform-reporting.repository";

type PlatformReportingRepository = Pick<
    typeof platformReportingRepository,
    | "getDashboardMetrics"
    | "listOrganizations"
    | "getOrganizationDetail"
    | "listOrganizationStores"
    | "getStoreDetail"
    | "listOrganizationSales"
    | "getOrganizationSaleContext"
>;

type BillingReadRepository = Pick<
    typeof billingRepository,
    "getSaleById" | "getSaleItemsBySaleId" | "getPaymentsBySaleId"
>;

type PlatformReportingDependencies = {
    repository: PlatformReportingRepository;
    billingRepository: BillingReadRepository;
    now: () => Date;
};

export type PlatformReportingService = ReturnType<typeof createPlatformReportingService>;

const reportingPeriodError = (message: string) => ({
    status: "error" as const,
    message,
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const getSaleLineDiscountTotal = (
    items: Array<{
        discountAmount: number | string | null | undefined;
        addOns?: Array<{ discountAmount: number | string | null | undefined }>;
    }>,
) =>
    items.reduce((sum, item) => {
        const itemDiscount = Number(item.discountAmount ?? 0);
        const addOnDiscount = (item.addOns ?? []).reduce(
            (addOnSum, addOn) => addOnSum + Number(addOn.discountAmount ?? 0),
            0,
        );
        return sum + itemDiscount + addOnDiscount;
    }, 0);

const deriveOrderDiscountAmount = (
    discountTotal: number | string | null | undefined,
    lineDiscountTotal: number | string | null | undefined,
) => Math.max(Number(discountTotal ?? 0) - Number(lineDiscountTotal ?? 0), 0);

const buildReceiptPreview = (params: {
    organizationName: string;
    storeName: string;
    storeAddress: string | null;
    sale: SaleDetailDTO;
}) => {
    const lines = [
        params.organizationName,
        params.storeName,
        ...(params.storeAddress ? [params.storeAddress] : []),
        "",
        `Bill ${params.sale.saleNumber ?? "Draft"}`,
        `Status ${params.sale.status}`,
        "",
        ...params.sale.items.map((item) => {
            const addOnLines = (item.addOns ?? []).map(
                (addOn) => `  + ${addOn.addOnNameSnapshot} x${addOn.totalQuantity}`,
            );
            return [`${item.productNameSnapshot} x${item.quantity}`, ...addOnLines].join("\n");
        }),
        "",
        `Subtotal ${params.sale.subtotal}`,
        `Discount ${params.sale.discountTotal}`,
        `Total ${params.sale.grandTotal}`,
        `Paid ${params.sale.paidTotal}`,
        `Due ${params.sale.dueTotal}`,
    ];
    return lines.join("\n");
};

const toSaleInspectionSummary = (
    sale: platformReportingRepository.PlatformOrganizationSaleSummaryMetricsRow,
) => ({
    id: sale.id,
    saleNumber: sale.saleNumber,
    status: sale.status,
    paymentStatus: sale.paymentStatus,
    grandTotal: sale.grandTotal,
    paidTotal: sale.paidTotal,
    dueTotal: sale.dueTotal,
    createdAt: sale.createdAt,
    committedAt: sale.committedAt,
    voidedAt: sale.voidedAt,
    itemCount: sale.itemCount,
    itemsSummary: sale.itemsSummary,
    paymentMethods: sale.paymentMethods,
    customerName: sale.customerName,
    store: {
        id: sale.storeId,
        name: sale.storeName,
    },
});

const toOrganizationListItem = (
    organization: PlatformOrganizationListMetricsRow,
): PlatformOrganizationListItemDTO => ({
    id: organization.id,
    name: organization.name,
    username: organization.username,
    isActive: organization.isActive,
    creator: {
        firstName: organization.creatorFirstName,
        lastName: organization.creatorLastName,
        phone: organization.creatorPhone,
    },
    storeCount: organization.storeCount,
    activeStoreCount: organization.activeStoreCount,
    customerCount: organization.customerCount,
    completedSaleCount: organization.completedSaleCount,
    completedSalesValue: organization.completedSalesValue,
    lastCompletedSaleAt: organization.lastCompletedSaleAt,
});

export const createPlatformReportingService = (dependencies: PlatformReportingDependencies) => ({
    getDashboard: async (
        query: PlatformDashboardQuerySVC,
    ): Promise<ServiceResponse<PlatformDashboardResponse | null>> => {
        const now = dependencies.now();
        const resolved = resolvePlatformReportingPeriod(query, now);
        if (!resolved.ok) {
            return reportingPeriodError(resolved.message);
        }

        const activityWindow = resolveActiveStoreWindow(now);
        const metrics = await dependencies.repository.getDashboardMetrics({
            activityStartAt: activityWindow.startAt,
            activityEndAt: activityWindow.endAt,
            periodStartAt: resolved.period.startAt,
            periodEndAt: resolved.period.endAt,
        });

        return {
            status: "success",
            message: "Platform dashboard retrieved successfully",
            data: {
                reportingPeriod: {
                    selection: resolved.period.selection,
                    startDate: resolved.period.startDate,
                    endDate: resolved.period.endDate,
                },
                allTime: {
                    organizationCount: metrics.organizationCount,
                    storeCount: metrics.storeCount,
                    customerCount: metrics.customerCount,
                    completedSaleCount: metrics.completedSaleCount,
                },
                activity: {
                    activeOrganizationCount: metrics.activeOrganizationCount,
                    activeStoreCount: metrics.activeStoreCount,
                },
                reportingPeriodMetrics: {
                    completedSaleCount: metrics.periodCompletedSaleCount,
                    completedSalesValue: metrics.periodCompletedSalesValue,
                    customerCount: metrics.periodCustomerCount,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    listOrganizations: async (
        query: PlatformOrganizationListQuerySVC,
    ): Promise<ServiceResponse<PlatformOrganizationListResponse | null>> => {
        const now = dependencies.now();
        const resolved = resolvePlatformReportingPeriod(query, now);
        if (!resolved.ok) {
            return reportingPeriodError(resolved.message);
        }

        const activityWindow = resolveActiveStoreWindow(now);
        const metrics = await dependencies.repository.listOrganizations({
            activityStartAt: activityWindow.startAt,
            activityEndAt: activityWindow.endAt,
            periodStartAt: resolved.period.startAt,
            periodEndAt: resolved.period.endAt,
            search: query.search ?? "",
            activity: query.activity,
            sort: query.sort,
            page: query.page,
            limit: query.limit,
        });

        return {
            status: "success",
            message: "Platform Organizations retrieved successfully",
            data: {
                reportingPeriod: {
                    selection: resolved.period.selection,
                    startDate: resolved.period.startDate,
                    endDate: resolved.period.endDate,
                },
                organizations: metrics.organizations.map(toOrganizationListItem),
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    totalCount: metrics.totalCount,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganization: async (
        organizationId: string,
        query: PlatformOrganizationDetailQuerySVC,
    ): Promise<ServiceResponse<PlatformOrganizationDetailResponse | null>> => {
        const now = dependencies.now();
        const resolved = resolvePlatformReportingPeriod(query, now);
        if (!resolved.ok) {
            return reportingPeriodError(resolved.message);
        }

        const activityWindow = resolveActiveStoreWindow(now);
        const organization = await dependencies.repository.getOrganizationDetail({
            organizationId,
            activityStartAt: activityWindow.startAt,
            activityEndAt: activityWindow.endAt,
            periodStartAt: resolved.period.startAt,
            periodEndAt: resolved.period.endAt,
        });

        if (!organization) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization retrieved successfully",
            data: {
                reportingPeriod: {
                    selection: resolved.period.selection,
                    startDate: resolved.period.startDate,
                    endDate: resolved.period.endDate,
                },
                organization: {
                    ...toOrganizationListItem(organization),
                    stores: organization.stores.map((store) => ({
                        id: store.id,
                        name: store.name,
                        isActive: store.isActive,
                        customerCount: store.customerCount,
                        completedSaleCount: store.completedSaleCount,
                        completedSalesValue: store.completedSalesValue,
                        lastCompletedSaleAt: store.lastCompletedSaleAt,
                    })),
                    recentSales: organization.recentSales.map((sale) => ({
                        id: sale.id,
                        saleNumber: sale.saleNumber,
                        status: sale.status,
                        grandTotal: sale.grandTotal,
                        occurredAt: sale.occurredAt,
                        store: {
                            id: sale.storeId,
                            name: sale.storeName,
                        },
                    })),
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    listOrganizationStores: async (
        organizationId: string,
        query: PlatformStoreInspectionQuerySVC,
    ): Promise<ServiceResponse<PlatformStoreListResponse | null>> => {
        const now = dependencies.now();
        const resolved = resolvePlatformReportingPeriod(query, now);
        if (!resolved.ok) {
            return reportingPeriodError(resolved.message);
        }

        const activityWindow = resolveActiveStoreWindow(now);
        const stores = await dependencies.repository.listOrganizationStores({
            organizationId,
            activityStartAt: activityWindow.startAt,
            activityEndAt: activityWindow.endAt,
            periodStartAt: resolved.period.startAt,
            periodEndAt: resolved.period.endAt,
        });

        if (!stores) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Stores retrieved successfully",
            data: {
                reportingPeriod: {
                    selection: resolved.period.selection,
                    startDate: resolved.period.startDate,
                    endDate: resolved.period.endDate,
                },
                stores: stores.stores.map((store) => ({
                    id: store.id,
                    name: store.name,
                    isActive: store.isActive,
                    customerCount: store.customerCount,
                    completedSaleCount: store.completedSaleCount,
                    completedSalesValue: store.completedSalesValue,
                    lastCompletedSaleAt: store.lastCompletedSaleAt,
                })),
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getStore: async (
        organizationId: string,
        storeId: string,
        query: PlatformStoreInspectionQuerySVC,
    ): Promise<ServiceResponse<PlatformStoreDetailResponse | null>> => {
        const now = dependencies.now();
        const resolved = resolvePlatformReportingPeriod(query, now);
        if (!resolved.ok) {
            return reportingPeriodError(resolved.message);
        }

        const activityWindow = resolveActiveStoreWindow(now);
        const store = await dependencies.repository.getStoreDetail({
            organizationId,
            storeId,
            activityStartAt: activityWindow.startAt,
            activityEndAt: activityWindow.endAt,
            periodStartAt: resolved.period.startAt,
            periodEndAt: resolved.period.endAt,
        });

        if (!store) {
            return {
                status: "error",
                message: "Store not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Store retrieved successfully",
            data: {
                reportingPeriod: {
                    selection: resolved.period.selection,
                    startDate: resolved.period.startDate,
                    endDate: resolved.period.endDate,
                },
                store: {
                    id: store.id,
                    organizationId: store.organizationId,
                    name: store.name,
                    address: store.address,
                    kotSystemEnabled: store.kotSystemEnabled,
                    tableManagementEnabled: store.tableManagementEnabled,
                    createdAt: store.createdAt,
                    isActive: store.isActive,
                    customerCount: store.customerCount,
                    completedSaleCount: store.completedSaleCount,
                    completedSalesValue: store.completedSalesValue,
                    lastCompletedSaleAt: store.lastCompletedSaleAt,
                    devices: store.devices.map((device) => ({
                        id: device.id,
                        name: device.name,
                        loginUsername: device.loginUsername,
                        status: device.status,
                        lastSeenAt: device.lastSeenAt,
                        createdAt: device.createdAt,
                    })),
                    recentSales: store.recentSales.map((sale) => ({
                        id: sale.id,
                        saleNumber: sale.saleNumber,
                        status: sale.status,
                        grandTotal: sale.grandTotal,
                        occurredAt: sale.occurredAt,
                        store: {
                            id: sale.storeId,
                            name: sale.storeName,
                        },
                    })),
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    listOrganizationSales: async (
        organizationId: string,
        query: PlatformBillingInspectionQuerySVC,
    ): Promise<ServiceResponse<PlatformSaleInspectionListResponse | null>> => {
        const now = dependencies.now();
        const resolvedDates = resolveBillingInspectionDateRange(query, now);
        if (!resolvedDates.ok) {
            return reportingPeriodError(resolvedDates.message);
        }

        const metrics = await dependencies.repository.listOrganizationSales({
            organizationId,
            storeId: query.storeId,
            status: query.status,
            paymentStatus: query.paymentStatus,
            paymentMethod: query.paymentMethod,
            search: query.search,
            startAt: resolvedDates.range.startAt,
            endAt: resolvedDates.range.endAt,
            sort: query.sort,
            page: query.page,
            limit: query.limit,
        });

        if (!metrics) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Sales retrieved successfully",
            data: {
                stores: metrics.stores,
                sales: metrics.sales.map(toSaleInspectionSummary),
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    totalCount: metrics.totalCount,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganizationSale: async (
        organizationId: string,
        saleId: string,
    ): Promise<ServiceResponse<PlatformSaleInspectionDetailResponse | null>> => {
        const context = await dependencies.repository.getOrganizationSaleContext(organizationId, saleId);
        if (!context) {
            return {
                status: "error",
                message: "Sale not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        const sale = await dependencies.billingRepository.getSaleById(
            organizationId,
            context.storeId,
            saleId,
        );
        if (!sale) {
            return {
                status: "error",
                message: "Sale not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        const [items, payments] = await Promise.all([
            dependencies.billingRepository.getSaleItemsBySaleId(saleId),
            dependencies.billingRepository.getPaymentsBySaleId(saleId),
        ]);
        const lineDiscountTotal = getSaleLineDiscountTotal(items);
        const saleDetail: SaleDetailDTO = {
            ...sale,
            items,
            payments,
            orderDiscountAmount: deriveOrderDiscountAmount(sale.discountTotal, lineDiscountTotal),
        };
        const receiptPreview = buildReceiptPreview({
            organizationName: context.organizationName,
            storeName: context.storeName,
            storeAddress: context.storeAddress,
            sale: saleDetail,
        });

        return {
            status: "success",
            message: "Platform Organization Sale retrieved successfully",
            data: {
                sale: {
                    ...toSaleInspectionSummary({
                        id: sale.id,
                        saleNumber: sale.saleNumber ?? null,
                        status: sale.status,
                        paymentStatus: sale.paymentStatus,
                        grandTotal: sale.grandTotal,
                        paidTotal: sale.paidTotal,
                        dueTotal: sale.dueTotal,
                        createdAt: sale.createdAt,
                        committedAt: sale.committedAt ?? null,
                        voidedAt: sale.voidedAt ?? null,
                        itemCount: sale.itemCount,
                        itemsSummary: sale.itemsSummary ?? null,
                        paymentMethods: sale.paymentMethods ?? null,
                        customerName: sale.customer?.name ?? sale.customerNameSnapshot ?? null,
                        storeId: context.storeId,
                        storeName: context.storeName,
                    }),
                    subtotal: sale.subtotal,
                    discountTotal: sale.discountTotal,
                    orderDiscountAmount: saleDetail.orderDiscountAmount,
                    notes: sale.notes ?? null,
                    voidReason: sale.voidReason ?? null,
                    customer: sale.customer,
                    createdByDevice: sale.createdByDevice ?? null,
                    updatedByDevice: sale.updatedByDevice ?? null,
                    items,
                    payments,
                    receipt: {
                        organizationName: context.organizationName,
                        storeName: context.storeName,
                        storeAddress: context.storeAddress,
                        previewText: receiptPreview,
                    },
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },
});

const defaultDependencies = (): PlatformReportingDependencies => ({
    repository: platformReportingRepository,
    billingRepository,
    now: () => new Date(),
});

let defaultService: PlatformReportingService | null = null;

export const getPlatformReportingService = (): PlatformReportingService => {
    defaultService ??= createPlatformReportingService(defaultDependencies());
    return defaultService;
};
