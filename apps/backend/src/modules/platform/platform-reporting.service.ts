import {
    PLATFORM_REPORTING_TIMEZONE,
    STATUS_CODES,
    resolveActiveStoreWindow,
    resolveBillingInspectionDateRange,
    resolvePlatformReportingPeriod,
    resolveReportInspectionDateRange,
    resolveBillActivityDateRange,
    buildPlatformBillActivitySeries,
    billActivityGranularityForRange,
    formatPlatformReportDateRangeLabel,
    type PlatformBillingInspectionQuerySVC,
    type PlatformCatalogAddOnDetailResponse,
    type PlatformCatalogCategoryDetailResponse,
    type PlatformCatalogInspectionQuerySVC,
    type PlatformCatalogListResponse,
    type PlatformCatalogProductDetailResponse,
    type PlatformCustomerInspectionDetailResponse,
    type PlatformCustomerInspectionListResponse,
    type PlatformCustomerInspectionQuerySVC,
    type PlatformDashboardQuerySVC,
    type PlatformDashboardResponse,
    type PlatformOrganizationDetailQuerySVC,
    type PlatformOrganizationDetailResponse,
    type PlatformOrganizationListItemDTO,
    type PlatformOrganizationListQuerySVC,
    type PlatformOrganizationListResponse,
    type PlatformPurchaseInspectionDetailResponse,
    type PlatformPurchaseInspectionListResponse,
    type PlatformPurchaseInspectionQuerySVC,
    type PlatformReportInspectionQuerySVC,
    type PlatformReportInspectionResponse,
    type PlatformBillActivityQuerySVC,
    type PlatformBillActivityResponse,
    type PlatformSaleInspectionDetailResponse,
    type PlatformSaleInspectionListResponse,
    type PlatformStoreDetailResponse,
    type PlatformStoreInspectionQuerySVC,
    type PlatformStoreListResponse,
    type PlatformTableInspectionDetailResponse,
    type PlatformTableInspectionListResponse,
    type PlatformTableInspectionQuerySVC,
    type PlatformWhatsAppInspectionResponse,
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
    | "listOrganizationCatalog"
    | "getOrganizationCatalogProduct"
    | "getOrganizationCatalogCategory"
    | "getOrganizationCatalogAddOn"
    | "listOrganizationSales"
    | "getOrganizationSaleContext"
    | "listOrganizationCustomers"
    | "getOrganizationCustomerContext"
    | "getOrganizationReportContext"
    | "listOrganizationBillActivity"
    | "listOrganizationTables"
    | "getOrganizationTableContext"
    | "listOrganizationPurchases"
    | "getOrganizationPurchaseContext"
    | "getOrganizationWhatsAppContext"
>;

type BillingReadRepository = Pick<
    typeof billingRepository,
    "getSaleById" | "getSaleItemsBySaleId" | "getPaymentsBySaleId" | "getProductSalesSummary"
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

const toCatalogProductSummary = (product: {
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
    createdAt: string;
    updatedAt: string;
}) => ({
    id: product.id,
    name: product.name,
    category: {
        id: product.categoryId,
        name: product.categoryName,
    },
    price: product.price,
    discount: product.discount,
    status: product.status,
    productType: product.productType,
    productCode: product.productCode,
    productCodeKind: product.productCodeKind,
    sortOrder: product.sortOrder,
    attachmentCount: product.attachmentCount,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
});

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

    listOrganizationCatalog: async (
        organizationId: string,
        query: PlatformCatalogInspectionQuerySVC,
    ): Promise<ServiceResponse<PlatformCatalogListResponse | null>> => {
        const catalog = await dependencies.repository.listOrganizationCatalog({
            organizationId,
            tab: query.tab,
            search: query.search ?? "",
            status: query.status,
            page: query.page,
            limit: query.limit,
        });

        if (!catalog) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Catalog retrieved successfully",
            data: {
                tab: query.tab,
                counts: catalog.counts,
                categories: catalog.categories.map((category) => ({
                    id: category.id,
                    name: category.name,
                    sortOrder: category.sortOrder,
                    status: category.status,
                    productCount: category.productCount,
                    createdAt: category.createdAt,
                    updatedAt: category.updatedAt,
                })),
                products: catalog.products.map(toCatalogProductSummary),
                addOns: catalog.addOns.map((addOn) => ({
                    id: addOn.id,
                    name: addOn.name,
                    price: addOn.price,
                    discount: addOn.discount,
                    status: addOn.status,
                    attachmentCount: addOn.attachmentCount,
                    createdAt: addOn.createdAt,
                    updatedAt: addOn.updatedAt,
                })),
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    totalCount: catalog.totalCount,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganizationCatalogProduct: async (
        organizationId: string,
        productId: string,
    ): Promise<ServiceResponse<PlatformCatalogProductDetailResponse | null>> => {
        const product = await dependencies.repository.getOrganizationCatalogProduct(organizationId, productId);
        if (!product) {
            return {
                status: "error",
                message: "Product not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Catalog Product retrieved successfully",
            data: {
                product: {
                    ...toCatalogProductSummary(product),
                    hasImage: product.hasImage,
                    attachments: product.attachments.map((attachment) => ({
                        id: attachment.id,
                        addOnId: attachment.addOnId,
                        addOnName: attachment.addOnName,
                        selectionCap: attachment.selectionCap,
                        status: attachment.status,
                        addOnPrice: attachment.addOnPrice,
                        addOnDiscount: attachment.addOnDiscount,
                        addOnStatus: attachment.addOnStatus,
                    })),
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganizationCatalogCategory: async (
        organizationId: string,
        categoryId: string,
    ): Promise<ServiceResponse<PlatformCatalogCategoryDetailResponse | null>> => {
        const category = await dependencies.repository.getOrganizationCatalogCategory(organizationId, categoryId);
        if (!category) {
            return {
                status: "error",
                message: "Category not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Catalog Category retrieved successfully",
            data: {
                category: {
                    id: category.id,
                    name: category.name,
                    sortOrder: category.sortOrder,
                    status: category.status,
                    productCount: category.productCount,
                    createdAt: category.createdAt,
                    updatedAt: category.updatedAt,
                    products: category.products.map(toCatalogProductSummary),
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganizationCatalogAddOn: async (
        organizationId: string,
        addOnId: string,
    ): Promise<ServiceResponse<PlatformCatalogAddOnDetailResponse | null>> => {
        const addOn = await dependencies.repository.getOrganizationCatalogAddOn(organizationId, addOnId);
        if (!addOn) {
            return {
                status: "error",
                message: "Add-on not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Catalog Add-on retrieved successfully",
            data: {
                addOn: {
                    id: addOn.id,
                    name: addOn.name,
                    price: addOn.price,
                    discount: addOn.discount,
                    status: addOn.status,
                    attachmentCount: addOn.attachmentCount,
                    createdAt: addOn.createdAt,
                    updatedAt: addOn.updatedAt,
                    attachments: addOn.attachments.map((attachment) => ({
                        id: attachment.id,
                        productId: attachment.productId,
                        productName: attachment.productName,
                        selectionCap: attachment.selectionCap,
                        status: attachment.status,
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
                summary: metrics.summary,
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
                        createdAt: typeof sale.createdAt === "string" ? sale.createdAt : sale.createdAt.toISOString(),
                        committedAt: sale.committedAt
                            ? (typeof sale.committedAt === "string" ? sale.committedAt : sale.committedAt.toISOString())
                            : null,
                        voidedAt: sale.voidedAt
                            ? (typeof sale.voidedAt === "string" ? sale.voidedAt : sale.voidedAt.toISOString())
                            : null,
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

    listOrganizationCustomers: async (
        organizationId: string,
        query: PlatformCustomerInspectionQuerySVC,
    ): Promise<ServiceResponse<PlatformCustomerInspectionListResponse | null>> => {
        const customers = await dependencies.repository.listOrganizationCustomers({
            organizationId,
            search: query.search ?? "",
            status: query.status,
            sort: query.sort,
            page: query.page,
            limit: query.limit,
        });

        if (!customers) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Customers retrieved successfully",
            data: {
                customers: customers.customers.map((customer) => ({
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    balance: customer.balance,
                    isActive: customer.isActive,
                    createdAt: customer.createdAt,
                })),
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    totalCount: customers.totalCount,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganizationCustomer: async (
        organizationId: string,
        customerId: string,
    ): Promise<ServiceResponse<PlatformCustomerInspectionDetailResponse | null>> => {
        const customer = await dependencies.repository.getOrganizationCustomerContext(organizationId, customerId);
        if (!customer) {
            return {
                status: "error",
                message: "Customer not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Customer retrieved successfully",
            data: {
                customer: {
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    balance: customer.balance,
                    isActive: customer.isActive,
                    marketingOptedOut: customer.marketingOptedOut,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                    ledger: customer.ledger.map((entry) => ({
                        id: entry.id,
                        organizationId,
                        customerId: customer.id,
                        saleId: entry.saleId,
                        paymentId: entry.paymentId,
                        entryType: entry.entryType,
                        amount: entry.amount,
                        balanceAfter: entry.balanceAfter,
                        notes: entry.notes,
                        createdAt: entry.createdAt,
                    })),
                    sales: customer.sales.map(toSaleInspectionSummary),
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganizationReports: async (
        organizationId: string,
        query: PlatformReportInspectionQuerySVC,
    ): Promise<ServiceResponse<PlatformReportInspectionResponse | null>> => {
        const now = dependencies.now();
        const resolvedDates = resolveReportInspectionDateRange(query, now);
        if (!resolvedDates.ok) {
            return reportingPeriodError(resolvedDates.message);
        }

        const baseContext = await dependencies.repository.getOrganizationReportContext(organizationId);
        if (!baseContext) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        if (query.storeId && !baseContext.stores.some((store) => store.id === query.storeId)) {
            return {
                status: "error",
                message: "Store not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        const products = await dependencies.billingRepository.getProductSalesSummary(
            organizationId,
            query.storeId,
            {
                createdFrom: resolvedDates.range.startAt?.toISOString(),
                createdTo: resolvedDates.range.endAt?.toISOString(),
            },
        );
        const totalQuantitySold = products.reduce((sum, product) => sum + product.quantitySold, 0);

        return {
            status: "success",
            message: "Platform Organization Reports retrieved successfully",
            data: {
                dateRange: {
                    startDate: resolvedDates.range.startDate,
                    endDate: resolvedDates.range.endDate,
                    label: formatPlatformReportDateRangeLabel(
                        resolvedDates.range.startDate,
                        resolvedDates.range.endDate,
                    ),
                    timezone: PLATFORM_REPORTING_TIMEZONE,
                },
                stores: baseContext.stores,
                productSales: {
                    products,
                    productCount: products.length,
                    totalQuantitySold,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganizationBillActivity: async (
        organizationId: string,
        query: PlatformBillActivityQuerySVC,
    ): Promise<ServiceResponse<PlatformBillActivityResponse | null>> => {
        const now = dependencies.now();
        const resolvedDates = resolveBillActivityDateRange(query, now);
        if (!resolvedDates.ok) {
            return reportingPeriodError(resolvedDates.message);
        }

        const startDate = resolvedDates.range.startDate ?? "";
        const endDate = resolvedDates.range.endDate ?? "";
        const granularity = billActivityGranularityForRange(startDate, endDate);
        const metrics = await dependencies.repository.listOrganizationBillActivity({
            organizationId,
            startAt: resolvedDates.range.startAt ?? now,
            endAt: resolvedDates.range.endAt ?? now,
            granularity,
        });

        if (!metrics) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        const series = buildPlatformBillActivitySeries(startDate, endDate, metrics.buckets);
        return {
            status: "success",
            message: "Platform Organization bill activity retrieved successfully",
            data: {
                dateRange: {
                    startDate,
                    endDate,
                    label: formatPlatformReportDateRangeLabel(startDate, endDate),
                    timezone: PLATFORM_REPORTING_TIMEZONE,
                },
                ...series,
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    listOrganizationTables: async (
        organizationId: string,
        query: PlatformTableInspectionQuerySVC,
    ): Promise<ServiceResponse<PlatformTableInspectionListResponse | null>> => {
        const tables = await dependencies.repository.listOrganizationTables({
            organizationId,
            storeId: query.storeId,
            search: query.search ?? "",
            state: query.state,
            sort: query.sort,
            page: query.page,
            limit: query.limit,
        });

        if (!tables) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        if (query.storeId && !tables.stores.some((store) => store.id === query.storeId)) {
            return {
                status: "error",
                message: "Store not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Tables retrieved successfully",
            data: {
                stores: tables.stores,
                tables: tables.tables.map((table) => ({
                    id: table.id,
                    tableLabel: table.tableLabel,
                    capacity: table.capacity,
                    position: table.position,
                    state: table.state,
                    store: { id: table.storeId, name: table.storeName },
                    serviceArea: table.serviceAreaId && table.serviceAreaTitle
                        ? { id: table.serviceAreaId, title: table.serviceAreaTitle }
                        : null,
                    currentSaleId: table.currentSaleId,
                    currentSaleTotal: table.currentSaleTotal,
                    createdAt: table.createdAt,
                    updatedAt: table.updatedAt,
                })),
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    totalCount: tables.totalCount,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganizationTable: async (
        organizationId: string,
        tableId: string,
    ): Promise<ServiceResponse<PlatformTableInspectionDetailResponse | null>> => {
        const table = await dependencies.repository.getOrganizationTableContext(organizationId, tableId);
        if (!table) {
            return {
                status: "error",
                message: "Table not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Table retrieved successfully",
            data: {
                table: {
                    id: table.id,
                    tableLabel: table.tableLabel,
                    capacity: table.capacity,
                    position: table.position,
                    state: table.state,
                    store: { id: table.storeId, name: table.storeName },
                    serviceArea: table.serviceAreaId && table.serviceAreaTitle
                        ? { id: table.serviceAreaId, title: table.serviceAreaTitle }
                        : null,
                    currentSaleId: table.currentSaleId,
                    currentSaleTotal: table.currentSaleTotal,
                    createdAt: table.createdAt,
                    updatedAt: table.updatedAt,
                    currentSale: table.currentSale,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    listOrganizationPurchases: async (
        organizationId: string,
        query: PlatformPurchaseInspectionQuerySVC,
    ): Promise<ServiceResponse<PlatformPurchaseInspectionListResponse | null>> => {
        const now = dependencies.now();
        const resolvedDates = resolveBillingInspectionDateRange(query, now);
        if (!resolvedDates.ok) {
            return reportingPeriodError(resolvedDates.message);
        }

        const purchases = await dependencies.repository.listOrganizationPurchases({
            organizationId,
            storeId: query.storeId,
            search: query.search ?? "",
            status: query.status,
            startDate: resolvedDates.range.startDate,
            endDate: resolvedDates.range.endDate,
            sort: query.sort,
            page: query.page,
            limit: query.limit,
        });

        if (!purchases) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        if (query.storeId && !purchases.stores.some((store) => store.id === query.storeId)) {
            return {
                status: "error",
                message: "Store not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Purchases retrieved successfully",
            data: {
                stores: purchases.stores,
                purchases: purchases.purchases.map((purchase) => ({
                    id: purchase.id,
                    purchaseDate: purchase.purchaseDate,
                    supplierName: purchase.supplierName,
                    invoiceNumber: purchase.invoiceNumber,
                    notes: purchase.notes,
                    totalAmount: purchase.totalAmount,
                    status: purchase.status,
                    itemCount: purchase.itemCount,
                    itemsSummary: purchase.itemsSummary,
                    voidedAt: purchase.voidedAt,
                    voidReason: purchase.voidReason,
                    createdAt: purchase.createdAt,
                    updatedAt: purchase.updatedAt,
                    store: { id: purchase.storeId, name: purchase.storeName },
                })),
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    totalCount: purchases.totalCount,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganizationPurchase: async (
        organizationId: string,
        purchaseId: string,
    ): Promise<ServiceResponse<PlatformPurchaseInspectionDetailResponse | null>> => {
        const purchase = await dependencies.repository.getOrganizationPurchaseContext(organizationId, purchaseId);
        if (!purchase) {
            return {
                status: "error",
                message: "Purchase not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization Purchase retrieved successfully",
            data: {
                purchase: {
                    id: purchase.id,
                    purchaseDate: purchase.purchaseDate,
                    supplierName: purchase.supplierName,
                    invoiceNumber: purchase.invoiceNumber,
                    notes: purchase.notes,
                    totalAmount: purchase.totalAmount,
                    status: purchase.status,
                    itemCount: purchase.itemCount,
                    itemsSummary: purchase.itemsSummary,
                    voidedAt: purchase.voidedAt,
                    voidReason: purchase.voidReason,
                    createdAt: purchase.createdAt,
                    updatedAt: purchase.updatedAt,
                    store: { id: purchase.storeId, name: purchase.storeName },
                    items: purchase.items.map((item) => ({
                        id: item.id,
                        purchaseId: item.purchaseId,
                        itemName: item.itemName,
                        description: item.description,
                        quantity: item.quantity,
                        rate: item.rate,
                        lineTotal: item.lineTotal,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt,
                    })),
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganizationWhatsApp: async (
        organizationId: string,
    ): Promise<ServiceResponse<PlatformWhatsAppInspectionResponse | null>> => {
        const whatsapp = await dependencies.repository.getOrganizationWhatsAppContext(organizationId);
        if (!whatsapp) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization WhatsApp retrieved successfully",
            data: {
                accounts: whatsapp.accounts.map((account) => ({
                    id: account.id,
                    provider: account.provider,
                    phoneNumber: account.phoneNumber,
                    status: account.status,
                    lastConnectedAt: account.lastConnectedAt,
                    lastSeenAt: account.lastSeenAt,
                    lastErrorCode: account.lastErrorCode,
                    defaultStore: account.defaultStoreId && account.defaultStoreName
                        ? { id: account.defaultStoreId, name: account.defaultStoreName }
                        : null,
                    assignedStores: account.assignedStores,
                    createdAt: account.createdAt,
                    updatedAt: account.updatedAt,
                })),
                storeConfigs: whatsapp.storeConfigs.map((config) => ({
                    store: { id: config.storeId, name: config.storeName },
                    accountId: config.accountId,
                    accountStatus: config.accountStatus,
                    templates: config.templates.map((template) => ({
                        kind: template.kind,
                        name: template.name,
                        isActive: template.isActive,
                        isDefault: template.isDefault,
                    })),
                    messageLinks: config.messageLinks.map((link) => ({
                        key: link.key,
                        label: link.label,
                        type: link.type,
                        isActive: link.isActive,
                    })),
                })),
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
