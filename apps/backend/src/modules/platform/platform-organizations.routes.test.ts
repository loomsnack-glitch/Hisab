import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import {
    FUTURE_BILLING_INSPECTION_DATE_MESSAGE,
    FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE,
    FUTURE_REPORT_INSPECTION_DATE_MESSAGE,
    type OwnerUserRecord,
    type PlatformOrganizationDetailResponse,
    type PlatformOrganizationListItemDTO,
    type PlatformOrganizationListResponse,
    type PlatformCatalogAddOnDetailResponse,
    type PlatformCatalogCategoryDetailResponse,
    type PlatformCatalogListResponse,
    type PlatformCatalogProductDetailResponse,
    type PlatformCustomerInspectionDetailResponse,
    type PlatformCustomerInspectionListResponse,
    type PlatformPurchaseInspectionDetailResponse,
    type PlatformPurchaseInspectionListResponse,
    type PlatformSaleInspectionDetailResponse,
    type PlatformSaleInspectionListResponse,
    type PlatformReportInspectionResponse,
    type PlatformTableInspectionDetailResponse,
    type PlatformTableInspectionListResponse,
    type PlatformWhatsAppInspectionResponse,
    type PlatformStoreDetailResponse,
    type PlatformStoreListResponse,
    type ServiceResponse,
} from "@repo/types";

import { createOwnerAuthService, createOwnerTokenProvider } from "./owner-auth.service";
import { createPlatformReportingService } from "./platform-reporting.service";
import type {
    PlatformDashboardMetrics,
    PlatformDashboardMetricsQuery,
    PlatformOrganizationDetailMetrics,
    PlatformOrganizationDetailMetricsQuery,
    PlatformOrganizationListMetrics,
    PlatformOrganizationListMetricsQuery,
    PlatformOrganizationStoresMetrics,
    PlatformOrganizationSalesMetrics,
    PlatformOrganizationSalesMetricsQuery,
    PlatformOrganizationSaleContextMetrics,
    PlatformCatalogListMetrics,
    PlatformCatalogListMetricsQuery,
    PlatformCatalogProductMetricsRow,
    PlatformCatalogCategoryMetricsRow,
    PlatformCatalogAddOnMetricsRow,
    PlatformOrganizationCustomersMetrics,
    PlatformOrganizationCustomersMetricsQuery,
    PlatformOrganizationCustomerDetailMetrics,
    PlatformStoreDetailMetrics,
    PlatformStoreDetailMetricsQuery,
} from "./platform-reporting.repository";
import { createPlatformRoutes } from "./platform.routes";

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerSecret = "owner-secret-that-is-isolated-from-other-auth-channels";
const now = new Date("2026-08-21T07:11:00.000Z");

const orgActive = "11111111-1111-4111-8111-111111111111";
const orgInactive = "22222222-2222-4222-8222-222222222222";
const orgMixed = "33333333-3333-4333-8333-333333333333";
const orgNoStores = "44444444-4444-4444-8444-444444444444";

const storeActive = "55555555-5555-4555-8555-555555555555";
const storeQuiet = "66666666-6666-4666-8666-666666666666";
const storeMixedActive = "77777777-7777-4777-8777-777777777777";
const storeMixedQuiet = "88888888-8888-4888-8888-888888888888";
const deviceMixedActive = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const missingOrganizationId = "99999999-9999-4999-8999-999999999999";
const missingStoreId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const saleMixedCompleted = "b1111111-1111-4111-8111-b11111111111";
const saleMixedReceivable = "b6666666-6666-4666-8666-b66666666666";
const missingSaleId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const saleQuietOld = "b2222222-2222-4222-8222-b22222222222";
const saleQuietRecent = "b3333333-3333-4333-8333-b33333333333";
const saleQuietVoided = "b4444444-4444-4444-8444-b44444444444";
const saleCafeDraft = "b5555555-5555-4555-8555-b55555555555";
const categoryMixed = "c1111111-1111-4111-8111-c11111111111";
const productMixed = "d1111111-1111-4111-8111-d11111111111";
const addOnMixed = "e1111111-1111-4111-8111-e11111111111";
const attachmentMixed = "f1111111-1111-4111-8111-f11111111111";
const missingProductId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const customerCafeActive = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1";
const customerCafeInactive = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaa2";
const customerMixedActive = "cccccccc-1111-4111-8111-ccccccccccc1";
const customerMixedDue = "cccccccc-2222-4222-8222-ccccccccccc2";
const missingCustomerId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const tableMixedEngaged = "a1111111-1111-4111-8111-a11111111111";
const tableMixedFree = "a2222222-2222-4222-8222-a22222222222";
const missingTableId = "99999999-9999-4999-8999-999999999998";
const purchaseMixedRecorded = "a3333333-3333-4333-8333-a33333333333";
const purchaseMixedVoided = "a4444444-4444-4444-8444-a44444444444";
const missingPurchaseId = "99999999-9999-4999-8999-999999999997";
const whatsappAccountMixed = "f1111111-1111-4111-8111-f11111111111";

type SaleStatus = "draft" | "completed" | "voided";

type ReportingOrganization = {
    id: string;
    name: string;
    username: string;
    creator: { firstName: string; lastName: string; phone: string };
};

type ReportingSale = {
    id: string;
    organizationId: string;
    storeId: string;
    status: SaleStatus;
    paymentStatus?: "pending" | "partial" | "paid";
    grandTotal: number;
    paidTotal?: number;
    committedAt: Date | null;
    createdAt?: Date;
    customerId?: string | null;
    customerName?: string | null;
    saleNumber?: string | null;
    updatedAt?: Date;
    paymentMethods?: string | null;
    itemCount?: number;
    itemsSummary?: string | null;
};

type ReportingSaleLine = {
    saleId: string;
    organizationId: string;
    storeId: string;
    productId: string;
    productName: string;
    categoryName: string | null;
    quantity: number;
};

type ReportingCustomer = {
    id: string;
    organizationId: string;
    name: string;
    phone: string | null;
    balance: number;
    isActive: boolean;
    marketingOptedOut?: boolean;
    createdAt: Date;
    updatedAt?: Date;
};

type ReportingLedgerEntry = {
    id: string;
    organizationId: string;
    customerId: string;
    saleId: string | null;
    paymentId: string | null;
    entryType: "sale" | "payment" | "void" | "adjustment";
    amount: number;
    balanceAfter: number;
    notes: string | null;
    createdAt: Date;
};

type ReportingDevice = {
    id: string;
    organizationId: string;
    storeId: string;
    name: string;
    loginUsername: string;
    status: "active" | "inactive" | "revoked";
    lastSeenAt: Date | null;
    createdAt: Date;
};

type ReportingCategory = {
    id: string;
    organizationId: string;
    name: string;
    sortOrder: number;
    status: "active" | "inactive";
    createdAt: Date;
    updatedAt: Date;
};

type ReportingProduct = {
    id: string;
    organizationId: string;
    categoryId: string;
    name: string;
    sortOrder: number;
    price: number;
    discount: number;
    status: "active" | "inactive";
    productType: "single" | "bundle" | "combo";
    productCode: string | null;
    productCodeKind: "manufacturer" | "internal_rcn" | null;
    hasImage: boolean;
    createdAt: Date;
    updatedAt: Date;
};

type ReportingAddOn = {
    id: string;
    organizationId: string;
    name: string;
    price: number;
    discount: number;
    status: "active" | "inactive";
    createdAt: Date;
    updatedAt: Date;
};

type ReportingAttachment = {
    id: string;
    organizationId: string;
    productId: string;
    addOnId: string;
    selectionCap: number;
    status: "active" | "inactive";
};

type ReportingTable = {
    id: string;
    organizationId: string;
    storeId: string;
    tableLabel: string;
    capacity: number | null;
    position: { x: number; y: number };
    state: "free" | "allocated" | "engaged" | "ready_to_bill" | "payment_due" | "paid";
    serviceAreaId: string | null;
    serviceAreaTitle: string | null;
    currentSaleId: string | null;
    currentSaleTotal: number | null;
    createdAt: Date;
    updatedAt: Date;
};

type ReportingPurchaseItem = {
    id: string;
    purchaseId: string;
    itemName: string;
    description: string | null;
    quantity: number;
    rate: number;
    lineTotal: number;
    createdAt: Date;
    updatedAt: Date;
};

type ReportingPurchase = {
    id: string;
    organizationId: string;
    storeId: string;
    purchaseDate: string;
    supplierName: string;
    invoiceNumber: string | null;
    notes: string | null;
    totalAmount: number;
    status: "recorded" | "voided";
    itemCount: number;
    itemsSummary: string | null;
    voidedAt: Date | null;
    voidReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: ReportingPurchaseItem[];
};

type ReportingWhatsAppAccount = {
    id: string;
    organizationId: string;
    provider: "baileys" | "cloud_api";
    phoneNumber: string;
    status: "pending_qr" | "connecting" | "connected" | "disconnected" | "failed" | "revoked";
    defaultStoreId: string | null;
    defaultStoreName: string | null;
    assignedStores: Array<{ id: string; name: string }>;
    lastConnectedAt: Date | null;
    lastSeenAt: Date | null;
    lastErrorCode: string | null;
    sessionReference: string;
    apiAccessToken: string;
    createdAt: Date;
    updatedAt: Date;
};

type ReportingWhatsAppTemplate = {
    organizationId: string;
    storeId: string;
    kind: "bill" | "due_reminder" | "promotion";
    name: string;
    body: string;
    isActive: boolean;
    isDefault: boolean;
};

type ReportingWhatsAppStoreConfig = {
    storeId: string;
    organizationId: string;
    accountId: string | null;
    accountStatus: ReportingWhatsAppAccount["status"] | null;
    messageLinks: Array<{
        key: string;
        label: string;
        type: "google_review" | "app_install" | "website" | "social" | "custom";
        isActive: boolean;
        url: string;
    }>;
};

const inWindow = (value: Date | null, startAt: Date | null, endAt: Date | null) => {
    if (!value) return false;
    if (startAt && value.getTime() < startAt.getTime()) return false;
    if (endAt && value.getTime() >= endAt.getTime()) return false;
    return true;
};

const byNameThenUsernameThenId = (left: ReportingOrganization, right: ReportingOrganization) =>
    left.name.localeCompare(right.name) || left.username.localeCompare(right.username) || left.id.localeCompare(right.id);

const createReportingMetrics = (
    organizations: ReportingOrganization[],
    stores: Array<{ id: string; organizationId: string; name: string; address?: string | null; kotSystemEnabled?: boolean; tableManagementEnabled?: boolean; createdAt?: Date }>,
    customers: ReportingCustomer[],
    sales: ReportingSale[],
    devices: ReportingDevice[] = [],
    categories: ReportingCategory[] = [],
    products: ReportingProduct[] = [],
    addOns: ReportingAddOn[] = [],
    attachments: ReportingAttachment[] = [],
    ledgerEntries: ReportingLedgerEntry[] = [],
    saleLines: ReportingSaleLine[] = [],
    tables: ReportingTable[] = [],
    purchases: ReportingPurchase[] = [],
    whatsappAccounts: ReportingWhatsAppAccount[] = [],
    whatsappTemplates: ReportingWhatsAppTemplate[] = [],
    whatsappStoreConfigs: ReportingWhatsAppStoreConfig[] = [],
) => {
    const organizationRow = (
        query: PlatformDashboardMetricsQuery,
        organization: ReportingOrganization,
    ) => {
        const completedSales = sales.filter((sale) => sale.status === "completed");
        const activeStoreIds = new Set(
            completedSales
                .filter((sale) => inWindow(sale.committedAt, query.activityStartAt, query.activityEndAt))
                .map((sale) => sale.storeId),
        );
        const organizationStores = stores.filter((store) => store.organizationId === organization.id);
        const organizationSales = completedSales.filter((sale) => sale.organizationId === organization.id);
        const periodSales = organizationSales.filter((sale) =>
            inWindow(sale.committedAt, query.periodStartAt, query.periodEndAt),
        );
        const lastCompletedSale = organizationSales.reduce<Date | null>((latest, sale) => {
            if (!sale.committedAt) return latest;
            if (!latest || sale.committedAt.getTime() > latest.getTime()) return sale.committedAt;
            return latest;
        }, null);
        const activeStoreCount = organizationStores.filter((store) => activeStoreIds.has(store.id)).length;
        return {
            id: organization.id,
            name: organization.name,
            username: organization.username,
            isActive: activeStoreCount > 0,
            creatorFirstName: organization.creator.firstName,
            creatorLastName: organization.creator.lastName,
            creatorPhone: organization.creator.phone,
            storeCount: organizationStores.length,
            activeStoreCount,
            customerCount: customers.filter((customer) => customer.organizationId === organization.id).length,
            completedSaleCount: periodSales.length,
            completedSalesValue: periodSales.reduce((sum, sale) => sum + sale.grandTotal, 0),
            lastCompletedSaleAt: lastCompletedSale?.toISOString() ?? null,
        };
    };

    const listOrganizations = async (
        query: PlatformOrganizationListMetricsQuery,
    ): Promise<PlatformOrganizationListMetrics> => {
        const search = query.search.trim().toLowerCase();
        const rows = organizations
            .map((organization) => organizationRow(query, organization))
            .filter((organization) => {
                const haystack = [
                    organization.name,
                    organization.username,
                    organization.creatorFirstName,
                    organization.creatorLastName,
                    `${organization.creatorFirstName} ${organization.creatorLastName}`,
                    organization.creatorPhone,
                ].join(" ").toLowerCase();
                if (search && !haystack.includes(search)) return false;
                if (query.activity === "active") return organization.isActive;
                if (query.activity === "inactive") return !organization.isActive;
                return true;
            })
            .sort((left, right) => {
                const byName = left.name.localeCompare(right.name)
                    || left.username.localeCompare(right.username)
                    || left.id.localeCompare(right.id);
                if (query.sort === "name_asc") return byName;
                if (query.sort === "name_desc") {
                    return right.name.localeCompare(left.name)
                        || left.username.localeCompare(right.username)
                        || left.id.localeCompare(right.id);
                }
                if (query.sort === "sales_value_desc" || query.sort === "sales_value_asc") {
                    const diff = query.sort === "sales_value_desc"
                        ? right.completedSalesValue - left.completedSalesValue
                        : left.completedSalesValue - right.completedSalesValue;
                    return diff !== 0 ? diff : byName;
                }
                const leftSaleAt = left.lastCompletedSaleAt ? Date.parse(left.lastCompletedSaleAt) : Number.NEGATIVE_INFINITY;
                const rightSaleAt = right.lastCompletedSaleAt ? Date.parse(right.lastCompletedSaleAt) : Number.NEGATIVE_INFINITY;
                const diff = rightSaleAt - leftSaleAt;
                return diff !== 0 ? diff : byName;
            });

        const start = (query.page - 1) * query.limit;
        return {
            totalCount: rows.length,
            organizations: rows.slice(start, start + query.limit),
        };
    };

    const getOrganizationDetail = async (
        query: PlatformOrganizationDetailMetricsQuery,
    ): Promise<PlatformOrganizationDetailMetrics | null> => {
        const organization = organizations.find((item) => item.id === query.organizationId);
        if (!organization) return null;

        const completedSales = sales.filter((sale) => sale.status === "completed");
        const activeStoreIds = new Set(
            completedSales
                .filter((sale) => inWindow(sale.committedAt, query.activityStartAt, query.activityEndAt))
                .map((sale) => sale.storeId),
        );
        const organizationStores = stores
            .filter((store) => store.organizationId === organization.id)
            .slice()
            .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
        const recentSales = sales
            .filter((sale) => sale.organizationId === organization.id)
            .map((sale) => {
                const store = stores.find((item) => item.id === sale.storeId);
                const occurredAt = sale.committedAt ?? sale.updatedAt ?? new Date(0);
                return {
                    id: sale.id,
                    saleNumber: sale.saleNumber ?? null,
                    status: sale.status,
                    grandTotal: sale.grandTotal,
                    occurredAt: occurredAt.toISOString(),
                    storeId: sale.storeId,
                    storeName: store?.name ?? "",
                    sortAt: occurredAt.getTime(),
                };
            })
            .sort((left, right) => right.sortAt - left.sortAt || right.id.localeCompare(left.id))
            .slice(0, 10)
            .map(({ sortAt: _sortAt, ...sale }) => sale);

        return {
            ...organizationRow(query, organization),
            stores: organizationStores.map((store) => {
                const storeSales = completedSales.filter((sale) => sale.storeId === store.id);
                const periodSales = storeSales.filter((sale) =>
                    inWindow(sale.committedAt, query.periodStartAt, query.periodEndAt),
                );
                const lastCompletedSale = storeSales.reduce<Date | null>((latest, sale) => {
                    if (!sale.committedAt) return latest;
                    if (!latest || sale.committedAt.getTime() > latest.getTime()) return sale.committedAt;
                    return latest;
                }, null);
                const billedCustomerIds = new Set(
                    storeSales
                        .map((sale) => sale.customerId)
                        .filter((customerId): customerId is string => Boolean(customerId)),
                );
                return {
                    id: store.id,
                    name: store.name,
                    isActive: activeStoreIds.has(store.id),
                    customerCount: billedCustomerIds.size,
                    completedSaleCount: periodSales.length,
                    completedSalesValue: periodSales.reduce((sum, sale) => sum + sale.grandTotal, 0),
                    lastCompletedSaleAt: lastCompletedSale?.toISOString() ?? null,
                };
            }),
            recentSales,
        };
    };

    const listOrganizationStores = async (
        query: PlatformOrganizationDetailMetricsQuery,
    ): Promise<PlatformOrganizationStoresMetrics | null> => {
        const organization = organizations.find((item) => item.id === query.organizationId);
        if (!organization) return null;
        const detail = await getOrganizationDetail(query);
        return detail ? { stores: detail.stores } : null;
    };

    const getStoreDetail = async (
        query: PlatformStoreDetailMetricsQuery,
    ): Promise<PlatformStoreDetailMetrics | null> => {
        const store = stores.find((item) => item.id === query.storeId && item.organizationId === query.organizationId);
        if (!store) return null;

        const detail = await getOrganizationDetail(query);
        const storeMetrics = detail?.stores.find((item) => item.id === query.storeId);
        if (!storeMetrics) return null;

        const recentSales = sales
            .filter((sale) => sale.organizationId === query.organizationId && sale.storeId === query.storeId)
            .map((sale) => {
                const occurredAt = sale.committedAt ?? sale.updatedAt ?? new Date(0);
                return {
                    id: sale.id,
                    saleNumber: sale.saleNumber ?? null,
                    status: sale.status,
                    grandTotal: sale.grandTotal,
                    occurredAt: occurredAt.toISOString(),
                    storeId: sale.storeId,
                    storeName: store.name,
                    sortAt: occurredAt.getTime(),
                };
            })
            .sort((left, right) => right.sortAt - left.sortAt || right.id.localeCompare(left.id))
            .slice(0, 10)
            .map(({ sortAt: _sortAt, ...sale }) => sale);

        return {
            id: store.id,
            organizationId: store.organizationId,
            name: store.name,
            address: store.address ?? null,
            kotSystemEnabled: store.kotSystemEnabled ?? false,
            tableManagementEnabled: store.tableManagementEnabled ?? false,
            createdAt: (store.createdAt ?? new Date("2026-01-01T00:00:00.000Z")).toISOString(),
            isActive: storeMetrics.isActive,
            customerCount: storeMetrics.customerCount,
            completedSaleCount: storeMetrics.completedSaleCount,
            completedSalesValue: storeMetrics.completedSalesValue,
            lastCompletedSaleAt: storeMetrics.lastCompletedSaleAt,
            devices: devices
                .filter((device) => device.organizationId === query.organizationId && device.storeId === query.storeId)
                .map((device) => ({
                    id: device.id,
                    name: device.name,
                    loginUsername: device.loginUsername,
                    status: device.status,
                    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
                    createdAt: device.createdAt.toISOString(),
                })),
            recentSales,
        };
    };

    const getDashboardMetrics = async (query: PlatformDashboardMetricsQuery): Promise<PlatformDashboardMetrics> => {
        const listed = await listOrganizations({
            ...query,
            search: "",
            activity: "all",
            sort: "recent_activity",
            page: 1,
            limit: organizations.length || 1,
        });
        return {
            organizationCount: listed.totalCount,
            storeCount: stores.length,
            customerCount: customers.length,
            completedSaleCount: sales.filter((sale) => sale.status === "completed").length,
            activeOrganizationCount: listed.organizations.filter((organization) => organization.isActive).length,
            activeStoreCount: listed.organizations.reduce((sum, organization) => sum + organization.activeStoreCount, 0),
            periodCompletedSaleCount: listed.organizations.reduce((sum, organization) => sum + organization.completedSaleCount, 0),
            periodCompletedSalesValue: listed.organizations.reduce((sum, organization) => sum + organization.completedSalesValue, 0),
            periodCustomerCount: customers.filter((customer) => inWindow(customer.createdAt, query.periodStartAt, query.periodEndAt)).length,
        };
    };

    const listOrganizationSales = async (
        query: PlatformOrganizationSalesMetricsQuery,
    ): Promise<PlatformOrganizationSalesMetrics | null> => {
        const organization = organizations.find((item) => item.id === query.organizationId);
        if (!organization) return null;

        const organizationStores = stores
            .filter((store) => store.organizationId === organization.id)
            .slice()
            .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));

        const filtered = sales
            .filter((sale) => sale.organizationId === organization.id)
            .filter((sale) => !query.storeId || sale.storeId === query.storeId)
            .filter((sale) => !query.status || sale.status === query.status)
            .filter((sale) => !query.paymentStatus || (sale.paymentStatus ?? "pending") === query.paymentStatus)
            .filter((sale) => {
                if (!query.paymentMethod) return true;
                return (sale.paymentMethods ?? "").split(", ").includes(query.paymentMethod ?? "");
            })
            .filter((sale) => {
                const createdAt = sale.createdAt ?? sale.committedAt ?? sale.updatedAt ?? new Date(0);
                if (query.startAt && createdAt.getTime() < query.startAt.getTime()) return false;
                if (query.endAt && createdAt.getTime() >= query.endAt.getTime()) return false;
                return true;
            })
            .filter((sale) => {
                const search = query.search?.trim().toLowerCase() ?? "";
                if (!search) return true;
                const haystack = [
                    sale.saleNumber ?? "",
                    sale.customerName ?? "",
                ].join(" ").toLowerCase();
                return haystack.includes(search);
            })
            .sort((left, right) => {
                const leftCreated = (left.createdAt ?? left.committedAt ?? left.updatedAt ?? new Date(0)).getTime();
                const rightCreated = (right.createdAt ?? right.committedAt ?? right.updatedAt ?? new Date(0)).getTime();
                if (query.sort === "oldest") return leftCreated - rightCreated || left.id.localeCompare(right.id);
                if (query.sort === "highest") return right.grandTotal - left.grandTotal || rightCreated - leftCreated;
                if (query.sort === "lowest") return left.grandTotal - right.grandTotal || leftCreated - rightCreated;
                return rightCreated - leftCreated || right.id.localeCompare(left.id);
            });

        const start = (query.page - 1) * query.limit;
        const pageRows = filtered.slice(start, start + query.limit);
        const completedRows = filtered.filter((sale) => sale.status === "completed");

        return {
            stores: organizationStores.map((store) => ({ id: store.id, name: store.name })),
            sales: pageRows.map((sale) => {
                const store = stores.find((item) => item.id === sale.storeId);
                const paidTotal = sale.paidTotal ?? (sale.paymentStatus === "paid" ? sale.grandTotal : 0);
                return {
                    id: sale.id,
                    saleNumber: sale.saleNumber ?? null,
                    status: sale.status,
                    paymentStatus: sale.paymentStatus ?? "pending",
                    grandTotal: sale.grandTotal,
                    paidTotal,
                    dueTotal: Math.max(sale.grandTotal - paidTotal, 0),
                    createdAt: (sale.createdAt ?? sale.committedAt ?? sale.updatedAt ?? new Date(0)).toISOString(),
                    committedAt: sale.committedAt?.toISOString() ?? null,
                    voidedAt: sale.status === "voided" ? sale.committedAt?.toISOString() ?? null : null,
                    itemCount: sale.itemCount ?? 0,
                    itemsSummary: sale.itemsSummary ?? null,
                    paymentMethods: sale.paymentMethods ?? null,
                    customerName: sale.customerName ?? null,
                    storeId: sale.storeId,
                    storeName: store?.name ?? "",
                };
            }),
            totalCount: filtered.length,
            summary: {
                completedCount: completedRows.length,
                salesTotal: completedRows.reduce((sum, sale) => sum + sale.grandTotal, 0),
                collectedTotal: completedRows.reduce((sum, sale) => sum + (sale.paidTotal ?? (sale.paymentStatus === "paid" ? sale.grandTotal : 0)), 0),
                dueTotal: completedRows.reduce((sum, sale) => {
                    const paidTotal = sale.paidTotal ?? (sale.paymentStatus === "paid" ? sale.grandTotal : 0);
                    return sum + Math.max(sale.grandTotal - paidTotal, 0);
                }, 0),
            },
        };
    };

    const getOrganizationSaleContext = async (
        organizationId: string,
        saleId: string,
    ): Promise<PlatformOrganizationSaleContextMetrics | null> => {
        const sale = sales.find((item) => item.organizationId === organizationId && item.id === saleId);
        if (!sale) return null;
        const organization = organizations.find((item) => item.id === organizationId);
        const store = stores.find((item) => item.id === sale.storeId && item.organizationId === organizationId);
        if (!organization || !store) return null;
        return {
            organizationName: organization.name,
            storeId: store.id,
            storeName: store.name,
            storeAddress: store.address ?? null,
        };
    };

    const mapProductRow = (product: ReportingProduct): PlatformCatalogProductMetricsRow => {
        const category = categories.find((item) => item.id === product.categoryId && item.organizationId === product.organizationId);
        return {
            id: product.id,
            name: product.name,
            categoryId: product.categoryId,
            categoryName: category?.name ?? "Unknown",
            price: product.price,
            discount: product.discount,
            status: product.status,
            productType: product.productType,
            productCode: product.productCode,
            productCodeKind: product.productCodeKind,
            sortOrder: product.sortOrder,
            attachmentCount: attachments.filter((item) => item.productId === product.id && item.organizationId === product.organizationId).length,
            hasImage: product.hasImage,
            createdAt: product.createdAt.toISOString(),
            updatedAt: product.updatedAt.toISOString(),
        };
    };

    const listOrganizationCatalog = async (
        query: PlatformCatalogListMetricsQuery,
    ): Promise<PlatformCatalogListMetrics | null> => {
        const organization = organizations.find((item) => item.id === query.organizationId);
        if (!organization) return null;

        const organizationCategories = categories.filter((item) => item.organizationId === query.organizationId);
        const organizationProducts = products.filter((item) => item.organizationId === query.organizationId);
        const organizationAddOns = addOns.filter((item) => item.organizationId === query.organizationId);
        const matchesSearch = (value: string) =>
            !query.search || value.toLowerCase().includes(query.search.toLowerCase());
        const matchesStatus = (status: "active" | "inactive") =>
            query.status === "all" || query.status === status;
        const offset = (query.page - 1) * query.limit;

        if (query.tab === "categories") {
            const filtered = organizationCategories.filter(
                (item) => matchesSearch(item.name) && matchesStatus(item.status),
            );
            return {
                counts: {
                    categories: organizationCategories.length,
                    products: organizationProducts.length,
                    addOns: organizationAddOns.length,
                },
                categories: filtered.slice(offset, offset + query.limit).map((category) => ({
                    id: category.id,
                    name: category.name,
                    sortOrder: category.sortOrder,
                    status: category.status,
                    productCount: organizationProducts.filter((product) => product.categoryId === category.id).length,
                    createdAt: category.createdAt.toISOString(),
                    updatedAt: category.updatedAt.toISOString(),
                })),
                products: [],
                addOns: [],
                totalCount: filtered.length,
            };
        }

        if (query.tab === "add-ons") {
            const filtered = organizationAddOns.filter(
                (item) => matchesSearch(item.name) && matchesStatus(item.status),
            );
            return {
                counts: {
                    categories: organizationCategories.length,
                    products: organizationProducts.length,
                    addOns: organizationAddOns.length,
                },
                categories: [],
                products: [],
                addOns: filtered.slice(offset, offset + query.limit).map((addOn) => ({
                    id: addOn.id,
                    name: addOn.name,
                    price: addOn.price,
                    discount: addOn.discount,
                    status: addOn.status,
                    attachmentCount: attachments.filter((item) => item.addOnId === addOn.id && item.organizationId === addOn.organizationId).length,
                    createdAt: addOn.createdAt.toISOString(),
                    updatedAt: addOn.updatedAt.toISOString(),
                })),
                totalCount: filtered.length,
            };
        }

        const filtered = organizationProducts.filter(
            (item) =>
                (matchesSearch(item.name) || (item.productCode ? matchesSearch(item.productCode) : false))
                && matchesStatus(item.status),
        );
        return {
            counts: {
                categories: organizationCategories.length,
                products: organizationProducts.length,
                addOns: organizationAddOns.length,
            },
            categories: [],
            products: filtered.slice(offset, offset + query.limit).map(mapProductRow),
            addOns: [],
            totalCount: filtered.length,
        };
    };

    const getOrganizationCatalogProduct = async (organizationId: string, productId: string) => {
        const product = products.find((item) => item.organizationId === organizationId && item.id === productId);
        if (!product) return null;
        return {
            ...mapProductRow(product),
            attachments: attachments
                .filter((item) => item.organizationId === organizationId && item.productId === productId)
                .flatMap((attachment) => {
                    const addOn = addOns.find((item) => item.id === attachment.addOnId && item.organizationId === organizationId);
                    if (!addOn) return [];
                    return [{
                        id: attachment.id,
                        addOnId: addOn.id,
                        addOnName: addOn.name,
                        selectionCap: attachment.selectionCap,
                        status: attachment.status,
                        addOnPrice: addOn.price,
                        addOnDiscount: addOn.discount,
                        addOnStatus: addOn.status,
                    }];
                }),
        };
    };

    const getOrganizationCatalogCategory = async (organizationId: string, categoryId: string) => {
        const category = categories.find((item) => item.organizationId === organizationId && item.id === categoryId);
        if (!category) return null;
        const categoryProducts = products
            .filter((item) => item.organizationId === organizationId && item.categoryId === categoryId)
            .map(mapProductRow);
        return {
            id: category.id,
            name: category.name,
            sortOrder: category.sortOrder,
            status: category.status,
            productCount: categoryProducts.length,
            createdAt: category.createdAt.toISOString(),
            updatedAt: category.updatedAt.toISOString(),
            products: categoryProducts,
        };
    };

    const getOrganizationCatalogAddOn = async (organizationId: string, addOnId: string) => {
        const addOn = addOns.find((item) => item.organizationId === organizationId && item.id === addOnId);
        if (!addOn) return null;
        return {
            id: addOn.id,
            name: addOn.name,
            price: addOn.price,
            discount: addOn.discount,
            status: addOn.status,
            attachmentCount: attachments.filter((item) => item.addOnId === addOn.id && item.organizationId === organizationId).length,
            createdAt: addOn.createdAt.toISOString(),
            updatedAt: addOn.updatedAt.toISOString(),
            attachments: attachments
                .filter((item) => item.organizationId === organizationId && item.addOnId === addOnId)
                .flatMap((attachment) => {
                    const product = products.find((item) => item.id === attachment.productId && item.organizationId === organizationId);
                    if (!product) return [];
                    return [{
                        id: attachment.id,
                        productId: product.id,
                        productName: product.name,
                        selectionCap: attachment.selectionCap,
                        status: attachment.status,
                    }];
                }),
        };
    };

    const listOrganizationCustomers = async (
        query: PlatformOrganizationCustomersMetricsQuery,
    ): Promise<PlatformOrganizationCustomersMetrics | null> => {
        const organization = organizations.find((item) => item.id === query.organizationId);
        if (!organization) return null;

        const search = query.search.trim().toLowerCase();
        const filtered = customers
            .filter((customer) => customer.organizationId === organization.id)
            .filter((customer) => {
                if (query.status === "active") return customer.isActive;
                if (query.status === "inactive") return !customer.isActive;
                if (query.status === "due") return customer.balance > 0;
                if (query.status === "no_due") return customer.balance === 0;
                return true;
            })
            .filter((customer) => {
                if (!search) return true;
                const haystack = [customer.name, customer.phone ?? ""].join(" ").toLowerCase();
                return haystack.includes(search);
            })
            .sort((left, right) => {
                const byName = left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
                if (query.sort === "name_asc") return byName;
                if (query.sort === "name_desc") {
                    return right.name.localeCompare(left.name) || left.id.localeCompare(right.id);
                }
                if (query.sort === "oldest") {
                    return left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id);
                }
                if (query.sort === "highest_due") {
                    return right.balance - left.balance || left.id.localeCompare(right.id);
                }
                if (query.sort === "lowest_due") {
                    return left.balance - right.balance || left.id.localeCompare(right.id);
                }
                return right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id);
            });

        const start = (query.page - 1) * query.limit;
        return {
            totalCount: filtered.length,
            customers: filtered.slice(start, start + query.limit).map((customer) => ({
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                balance: customer.balance,
                isActive: customer.isActive,
                createdAt: customer.createdAt.toISOString(),
            })),
        };
    };

    const getOrganizationCustomerContext = async (
        organizationId: string,
        customerId: string,
    ): Promise<PlatformOrganizationCustomerDetailMetrics | null> => {
        const customer = customers.find((item) => item.organizationId === organizationId && item.id === customerId);
        if (!customer) return null;

        const customerSales = sales
            .filter((sale) => sale.organizationId === organizationId && sale.customerId === customerId)
            .map((sale) => {
                const store = stores.find((item) => item.id === sale.storeId);
                const paidTotal = sale.paidTotal ?? (sale.paymentStatus === "paid" ? sale.grandTotal : 0);
                return {
                    id: sale.id,
                    saleNumber: sale.saleNumber ?? null,
                    status: sale.status,
                    paymentStatus: sale.paymentStatus ?? "pending",
                    grandTotal: sale.grandTotal,
                    paidTotal,
                    dueTotal: Math.max(sale.grandTotal - paidTotal, 0),
                    createdAt: (sale.createdAt ?? sale.committedAt ?? sale.updatedAt ?? new Date(0)).toISOString(),
                    committedAt: sale.committedAt?.toISOString() ?? null,
                    voidedAt: sale.status === "voided" ? sale.committedAt?.toISOString() ?? null : null,
                    itemCount: sale.itemCount ?? 0,
                    itemsSummary: sale.itemsSummary ?? null,
                    paymentMethods: sale.paymentMethods ?? null,
                    customerName: sale.customerName ?? customer.name,
                    storeId: sale.storeId,
                    storeName: store?.name ?? "",
                };
            });

        return {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            balance: customer.balance,
            isActive: customer.isActive,
            marketingOptedOut: customer.marketingOptedOut ?? false,
            createdAt: customer.createdAt.toISOString(),
            updatedAt: (customer.updatedAt ?? customer.createdAt).toISOString(),
            ledger: ledgerEntries
                .filter((entry) => entry.organizationId === organizationId && entry.customerId === customerId)
                .map((entry) => ({
                    id: entry.id,
                    saleId: entry.saleId,
                    paymentId: entry.paymentId,
                    entryType: entry.entryType,
                    amount: entry.amount,
                    balanceAfter: entry.balanceAfter,
                    notes: entry.notes,
                    createdAt: entry.createdAt.toISOString(),
                })),
            sales: customerSales,
        };
    };

    const getOrganizationReportContext = async (organizationId: string) => {
        const organization = organizations.find((item) => item.id === organizationId);
        if (!organization) return null;
        return {
            stores: stores
                .filter((store) => store.organizationId === organizationId)
                .map((store) => ({ id: store.id, name: store.name })),
        };
    };

    const listOrganizationTables = async (
        query: {
            organizationId: string;
            storeId?: string;
            search: string;
            state: "all" | ReportingTable["state"];
            sort: "table_asc" | "table_desc" | "store_asc" | "state";
            page: number;
            limit: number;
        },
    ) => {
        const organization = organizations.find((item) => item.id === query.organizationId);
        if (!organization) return null;

        const search = query.search.trim().toLowerCase();
        const filtered = tables
            .filter((table) => table.organizationId === organization.id)
            .filter((table) => !query.storeId || table.storeId === query.storeId)
            .filter((table) => query.state === "all" || table.state === query.state)
            .filter((table) => {
                if (!search) return true;
                const haystack = [table.tableLabel, table.serviceAreaTitle ?? ""].join(" ").toLowerCase();
                return haystack.includes(search);
            })
            .sort((left, right) => {
                const store = stores.find((item) => item.id === left.storeId)?.name.localeCompare(
                    stores.find((item) => item.id === right.storeId)?.name ?? "",
                ) ?? 0;
                if (query.sort === "store_asc") return store || left.tableLabel.localeCompare(right.tableLabel);
                if (query.sort === "state") return left.state.localeCompare(right.state) || left.tableLabel.localeCompare(right.tableLabel);
                if (query.sort === "table_desc") return right.tableLabel.localeCompare(left.tableLabel);
                return left.tableLabel.localeCompare(right.tableLabel);
            });

        const start = (query.page - 1) * query.limit;
        return {
            stores: stores
                .filter((store) => store.organizationId === organization.id)
                .map((store) => ({ id: store.id, name: store.name })),
            totalCount: filtered.length,
            tables: filtered.slice(start, start + query.limit).map((table) => ({
                ...table,
                storeName: stores.find((store) => store.id === table.storeId)?.name ?? "",
            })),
        };
    };

    const getOrganizationTableContext = async (organizationId: string, tableId: string) => {
        const table = tables.find((item) => item.organizationId === organizationId && item.id === tableId);
        if (!table) return null;
        const currentSale = table.currentSaleId
            ? sales.find((sale) => sale.id === table.currentSaleId && sale.organizationId === organizationId)
            : null;
        return {
            ...table,
            storeName: stores.find((store) => store.id === table.storeId)?.name ?? "",
            currentSale: currentSale
                ? {
                    id: currentSale.id,
                    saleNumber: currentSale.saleNumber ?? null,
                    status: currentSale.status,
                    paymentStatus: currentSale.paymentStatus ?? "pending",
                    grandTotal: currentSale.grandTotal,
                    dueTotal: Math.max(currentSale.grandTotal - (currentSale.paidTotal ?? 0), 0),
                }
                : null,
        };
    };

    const listOrganizationPurchases = async (
        query: {
            organizationId: string;
            storeId?: string;
            search: string;
            status: "all" | "recorded" | "voided";
            startDate: string | null;
            endDate: string | null;
            sort: "newest" | "oldest" | "highest" | "lowest";
            page: number;
            limit: number;
        },
    ) => {
        const organization = organizations.find((item) => item.id === query.organizationId);
        if (!organization) return null;

        const search = query.search.trim().toLowerCase();
        const filtered = purchases
            .filter((purchase) => purchase.organizationId === organization.id)
            .filter((purchase) => !query.storeId || purchase.storeId === query.storeId)
            .filter((purchase) => query.status === "all" || purchase.status === query.status)
            .filter((purchase) => !query.startDate || purchase.purchaseDate >= query.startDate)
            .filter((purchase) => !query.endDate || purchase.purchaseDate <= query.endDate)
            .filter((purchase) => {
                if (!search) return true;
                const haystack = [purchase.supplierName, purchase.invoiceNumber ?? "", purchase.itemsSummary ?? ""].join(" ").toLowerCase();
                return haystack.includes(search);
            })
            .sort((left, right) => {
                if (query.sort === "oldest") {
                    return left.purchaseDate.localeCompare(right.purchaseDate) || left.id.localeCompare(right.id);
                }
                if (query.sort === "highest") {
                    return right.totalAmount - left.totalAmount || left.purchaseDate.localeCompare(right.purchaseDate);
                }
                if (query.sort === "lowest") {
                    return left.totalAmount - right.totalAmount || left.purchaseDate.localeCompare(right.purchaseDate);
                }
                return right.purchaseDate.localeCompare(left.purchaseDate) || right.id.localeCompare(left.id);
            });

        const start = (query.page - 1) * query.limit;
        return {
            stores: stores
                .filter((store) => store.organizationId === organization.id)
                .map((store) => ({ id: store.id, name: store.name })),
            totalCount: filtered.length,
            purchases: filtered.slice(start, start + query.limit).map((purchase) => ({
                ...purchase,
                storeName: stores.find((store) => store.id === purchase.storeId)?.name ?? "",
            })),
        };
    };

    const getOrganizationPurchaseContext = async (organizationId: string, purchaseId: string) => {
        const purchase = purchases.find((item) => item.organizationId === organizationId && item.id === purchaseId);
        if (!purchase) return null;
        return {
            ...purchase,
            storeName: stores.find((store) => store.id === purchase.storeId)?.name ?? "",
        };
    };

    const getOrganizationWhatsAppContext = async (organizationId: string) => {
        const organization = organizations.find((item) => item.id === organizationId);
        if (!organization) return null;

        const accounts = whatsappAccounts
            .filter((account) => account.organizationId === organization.id)
            .map((account) => ({
                id: account.id,
                provider: account.provider,
                phoneNumber: account.phoneNumber,
                status: account.status,
                defaultStoreId: account.defaultStoreId,
                defaultStoreName: account.defaultStoreName,
                assignedStores: account.assignedStores,
                lastConnectedAt: account.lastConnectedAt?.toISOString() ?? null,
                lastSeenAt: account.lastSeenAt?.toISOString() ?? null,
                lastErrorCode: account.lastErrorCode,
                createdAt: account.createdAt.toISOString(),
                updatedAt: account.updatedAt.toISOString(),
                sessionReference: account.sessionReference,
                apiAccessToken: account.apiAccessToken,
            }));

        const storeConfigs = stores
            .filter((store) => store.organizationId === organization.id)
            .map((store) => {
                const config = whatsappStoreConfigs.find((item) => item.storeId === store.id && item.organizationId === organization.id);
                return {
                    storeId: store.id,
                    storeName: store.name,
                    accountId: config?.accountId ?? null,
                    accountStatus: config?.accountStatus ?? null,
                    templates: whatsappTemplates
                        .filter((template) => template.organizationId === organization.id && template.storeId === store.id)
                        .map((template) => ({
                            storeId: template.storeId,
                            kind: template.kind,
                            name: template.name,
                            isActive: template.isActive,
                            isDefault: template.isDefault,
                            body: template.body,
                        })),
                    messageLinks: config?.messageLinks ?? [],
                };
            });

        return { accounts, storeConfigs };
    };

    return {
        getDashboardMetrics,
        listOrganizations,
        getOrganizationDetail,
        listOrganizationStores,
        getStoreDetail,
        listOrganizationCatalog,
        getOrganizationCatalogProduct,
        getOrganizationCatalogCategory,
        getOrganizationCatalogAddOn,
        listOrganizationSales,
        getOrganizationSaleContext,
        listOrganizationCustomers,
        getOrganizationCustomerContext,
        getOrganizationReportContext,
        listOrganizationTables,
        getOrganizationTableContext,
        listOrganizationPurchases,
        getOrganizationPurchaseContext,
        getOrganizationWhatsAppContext,
    };
};

const platformFacts = () => {
    const organizations: ReportingOrganization[] = [
        {
            id: orgActive,
            name: "Active Cafe",
            username: "active-cafe",
            creator: { firstName: "Kiran", lastName: "Patel", phone: "+919800000001" },
        },
        {
            id: orgInactive,
            name: "Quiet Mart",
            username: "quiet-mart",
            creator: { firstName: "Leela", lastName: "Nair", phone: "+919800000002" },
        },
        {
            id: orgMixed,
            name: "Mixed Bistro",
            username: "mixed-bistro",
            creator: { firstName: "Omar", lastName: "Khan", phone: "+919800000003" },
        },
        {
            id: orgNoStores,
            name: "New Stand",
            username: "new-stand",
            creator: { firstName: "Priya", lastName: "Shah", phone: "+919800000004" },
        },
    ];
    const stores = [
        { id: storeActive, organizationId: orgActive, name: "Cafe Counter", address: "1 Main Street", kotSystemEnabled: true, tableManagementEnabled: false, createdAt: new Date("2026-01-01T00:00:00.000Z") },
        { id: storeQuiet, organizationId: orgInactive, name: "Quiet Aisle" },
        { id: storeMixedActive, organizationId: orgMixed, name: "Front Hall", address: "12 Market Road", kotSystemEnabled: true, tableManagementEnabled: false, createdAt: new Date("2026-01-10T00:00:00.000Z") },
        { id: storeMixedQuiet, organizationId: orgMixed, name: "Garden Patio" },
    ];
    const devices: ReportingDevice[] = [
        {
            id: deviceMixedActive,
            organizationId: orgMixed,
            storeId: storeMixedActive,
            name: "Counter POS",
            loginUsername: "front-hall-pos",
            status: "active",
            lastSeenAt: new Date("2026-08-19T09:00:00.000Z"),
            createdAt: new Date("2026-01-15T00:00:00.000Z"),
        },
    ];
    const customers: ReportingCustomer[] = [
        {
            id: customerCafeActive,
            organizationId: orgActive,
            name: "Ravi Mehta",
            phone: "+919800000101",
            balance: 0,
            isActive: true,
            createdAt: new Date("2026-01-15T10:00:00.000Z"),
        },
        {
            id: customerCafeInactive,
            organizationId: orgActive,
            name: "Sana Kapoor",
            phone: "+919800000102",
            balance: 0,
            isActive: false,
            createdAt: new Date("2026-08-20T10:00:00.000Z"),
        },
        {
            id: customerMixedActive,
            organizationId: orgMixed,
            name: "Anita Rao",
            phone: "+919800000201",
            balance: 0,
            isActive: true,
            marketingOptedOut: false,
            createdAt: new Date("2026-02-01T10:00:00.000Z"),
            updatedAt: new Date("2026-08-19T10:00:00.000Z"),
        },
        {
            id: customerMixedDue,
            organizationId: orgMixed,
            name: "Dev Patel",
            phone: "+919800000202",
            balance: 25,
            isActive: true,
            marketingOptedOut: true,
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            updatedAt: new Date("2026-08-18T10:00:00.000Z"),
        },
    ];
    const ledgerEntries: ReportingLedgerEntry[] = [
        {
            id: "a1111111-1111-4111-8111-a11111111111",
            organizationId: orgMixed,
            customerId: customerMixedDue,
            saleId: saleMixedReceivable,
            paymentId: null,
            entryType: "sale",
            amount: 25,
            balanceAfter: 25,
            notes: null,
            createdAt: new Date("2026-08-19T10:00:00.000Z"),
        },
    ];
    const sales: ReportingSale[] = [
        {
            id: "c1111111-1111-4111-8111-c11111111111",
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            saleNumber: "1",
            grandTotal: 10,
            committedAt: new Date("2026-08-14T18:30:00.000Z"),
            customerId: customerCafeActive,
        },
        {
            id: saleQuietRecent,
            organizationId: orgInactive,
            storeId: storeQuiet,
            status: "completed",
            saleNumber: "1",
            grandTotal: 12,
            committedAt: new Date("2026-08-14T18:29:59.000Z"),
        },
        {
            id: "c2222222-2222-4222-8222-c22222222222",
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            saleNumber: "2",
            grandTotal: 11,
            committedAt: new Date("2026-08-21T10:00:00.000Z"),
            customerId: customerCafeActive,
        },
        {
            id: "c3333333-3333-4333-8333-c33333333333",
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            saleNumber: "3",
            grandTotal: 15,
            committedAt: new Date("2026-08-21T18:29:59.000Z"),
            customerId: customerCafeInactive,
        },
        {
            id: "c4444444-4444-4444-8444-c44444444444",
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            saleNumber: "4",
            grandTotal: 100,
            committedAt: new Date("2026-08-18T10:00:00.000Z"),
            customerId: customerCafeActive,
        },
        {
            id: saleMixedCompleted,
            organizationId: orgMixed,
            storeId: storeMixedActive,
            status: "completed",
            paymentStatus: "paid",
            saleNumber: "12",
            grandTotal: 50.5,
            paidTotal: 50.5,
            paymentMethods: "cash",
            itemCount: 1,
            itemsSummary: "Tea",
            customerId: customerMixedActive,
            customerName: "Anita Rao",
            committedAt: new Date("2026-08-19T10:00:00.000Z"),
            createdAt: new Date("2026-08-19T10:00:00.000Z"),
        },
        {
            id: saleMixedReceivable,
            organizationId: orgMixed,
            storeId: storeMixedActive,
            status: "completed",
            paymentStatus: "partial",
            saleNumber: "13",
            grandTotal: 75,
            paidTotal: 50,
            paymentMethods: "cash",
            itemCount: 2,
            itemsSummary: "Tea, Snacks",
            customerId: customerMixedDue,
            customerName: "Dev Patel",
            committedAt: new Date("2026-08-18T10:00:00.000Z"),
            createdAt: new Date("2026-08-18T10:00:00.000Z"),
        },
        {
            id: "c5555555-5555-4555-8555-c55555555555",
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            saleNumber: "5",
            grandTotal: 25.25,
            committedAt: new Date("2026-08-20T10:00:00.000Z"),
            customerId: customerCafeInactive,
        },
        {
            id: saleQuietOld,
            organizationId: orgInactive,
            storeId: storeQuiet,
            status: "completed",
            saleNumber: "2",
            grandTotal: 40,
            committedAt: new Date("2026-08-01T10:00:00.000Z"),
        },
        {
            id: saleCafeDraft,
            organizationId: orgActive,
            storeId: storeActive,
            status: "draft",
            paymentStatus: "pending",
            saleNumber: null,
            grandTotal: 999,
            committedAt: null,
            createdAt: new Date("2026-08-21T10:00:00.000Z"),
            updatedAt: new Date("2026-08-21T10:00:00.000Z"),
            customerId: customerCafeActive,
            customerName: "Cafe Customer",
        },
        {
            id: saleQuietVoided,
            organizationId: orgInactive,
            storeId: storeQuiet,
            status: "voided",
            paymentStatus: "pending",
            saleNumber: "3",
            grandTotal: 888,
            committedAt: new Date("2026-08-20T10:00:00.000Z"),
            createdAt: new Date("2026-08-20T10:00:00.000Z"),
            customerId: customerCafeInactive,
            customerName: "Quiet Customer",
        },
    ];

    const categories: ReportingCategory[] = [
        {
            id: categoryMixed,
            organizationId: orgMixed,
            name: "Beverages",
            sortOrder: 0,
            status: "active",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
    ];
    const products: ReportingProduct[] = [
        {
            id: productMixed,
            organizationId: orgMixed,
            categoryId: categoryMixed,
            name: "Masala Chai",
            sortOrder: 0,
            price: 50,
            discount: 0,
            status: "active",
            productType: "single",
            productCode: "TEA-001",
            productCodeKind: "manufacturer",
            hasImage: false,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
    ];
    const addOns: ReportingAddOn[] = [
        {
            id: addOnMixed,
            organizationId: orgMixed,
            name: "Extra Ginger",
            price: 10,
            discount: 0,
            status: "active",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
    ];
    const attachments: ReportingAttachment[] = [
        {
            id: attachmentMixed,
            organizationId: orgMixed,
            productId: productMixed,
            addOnId: addOnMixed,
            selectionCap: 1,
            status: "active",
        },
    ];
    const saleLines: ReportingSaleLine[] = [
        {
            saleId: saleMixedCompleted,
            organizationId: orgMixed,
            storeId: storeMixedActive,
            productId: productMixed,
            productName: "Masala Chai",
            categoryName: "Beverages",
            quantity: 2,
        },
        {
            saleId: "c2222222-2222-4222-8222-c22222222222",
            organizationId: orgActive,
            storeId: storeActive,
            productId: "prod-active-coffee",
            productName: "Filter Coffee",
            categoryName: "Beverages",
            quantity: 3,
        },
        {
            saleId: "c4444444-4444-4444-8444-c44444444444",
            organizationId: orgActive,
            storeId: storeActive,
            productId: "prod-active-coffee",
            productName: "Filter Coffee",
            categoryName: "Beverages",
            quantity: 1,
        },
    ];

    const tables: ReportingTable[] = [
        {
            id: tableMixedEngaged,
            organizationId: orgMixed,
            storeId: storeMixedActive,
            tableLabel: "T1",
            capacity: 4,
            position: { x: 0.1, y: 0.2 },
            state: "engaged",
            serviceAreaId: null,
            serviceAreaTitle: null,
            currentSaleId: saleMixedReceivable,
            currentSaleTotal: 25,
            createdAt: new Date("2026-02-01T10:00:00.000Z"),
            updatedAt: new Date("2026-08-19T10:00:00.000Z"),
        },
        {
            id: tableMixedFree,
            organizationId: orgMixed,
            storeId: storeMixedQuiet,
            tableLabel: "Patio 2",
            capacity: 2,
            position: { x: 0.4, y: 0.5 },
            state: "free",
            serviceAreaId: null,
            serviceAreaTitle: "Garden",
            currentSaleId: null,
            currentSaleTotal: null,
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            updatedAt: new Date("2026-03-01T10:00:00.000Z"),
        },
    ];

    const purchases: ReportingPurchase[] = [
        {
            id: purchaseMixedRecorded,
            organizationId: orgMixed,
            storeId: storeMixedActive,
            purchaseDate: "2026-08-18",
            supplierName: "Fresh Produce Co",
            invoiceNumber: "INV-100",
            notes: "Weekly vegetables",
            totalAmount: 1200,
            status: "recorded",
            itemCount: 1,
            itemsSummary: "Tomatoes",
            voidedAt: null,
            voidReason: null,
            createdAt: new Date("2026-08-18T10:00:00.000Z"),
            updatedAt: new Date("2026-08-18T10:00:00.000Z"),
            items: [{
                id: "11111111-1111-4111-8111-111111111111",
                purchaseId: purchaseMixedRecorded,
                itemName: "Tomatoes",
                description: null,
                quantity: 10,
                rate: 120,
                lineTotal: 1200,
                createdAt: new Date("2026-08-18T10:00:00.000Z"),
                updatedAt: new Date("2026-08-18T10:00:00.000Z"),
            }],
        },
        {
            id: purchaseMixedVoided,
            organizationId: orgMixed,
            storeId: storeMixedQuiet,
            purchaseDate: "2026-08-10",
            supplierName: "Paper Supplies",
            invoiceNumber: null,
            notes: null,
            totalAmount: 500,
            status: "voided",
            itemCount: 1,
            itemsSummary: "Napkins",
            voidedAt: new Date("2026-08-11T10:00:00.000Z"),
            voidReason: "Duplicate entry",
            createdAt: new Date("2026-08-10T10:00:00.000Z"),
            updatedAt: new Date("2026-08-11T10:00:00.000Z"),
            items: [{
                id: "22222222-2222-4222-8222-222222222222",
                purchaseId: purchaseMixedVoided,
                itemName: "Napkins",
                description: null,
                quantity: 5,
                rate: 100,
                lineTotal: 500,
                createdAt: new Date("2026-08-10T10:00:00.000Z"),
                updatedAt: new Date("2026-08-10T10:00:00.000Z"),
            }],
        },
    ];

    const whatsappAccounts: ReportingWhatsAppAccount[] = [{
        id: whatsappAccountMixed,
        organizationId: orgMixed,
        provider: "baileys",
        phoneNumber: "+919811122233",
        status: "connected",
        defaultStoreId: storeMixedActive,
        defaultStoreName: "Front Hall",
        assignedStores: [{ id: storeMixedActive, name: "Front Hall" }],
        lastConnectedAt: new Date("2026-08-19T10:00:00.000Z"),
        lastSeenAt: new Date("2026-08-19T11:00:00.000Z"),
        lastErrorCode: null,
        sessionReference: "encrypted-session-ref-must-not-leak",
        apiAccessToken: "cloud-api-token-must-not-leak",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-08-19T11:00:00.000Z"),
    }];

    const whatsappTemplates: ReportingWhatsAppTemplate[] = [{
        organizationId: orgMixed,
        storeId: storeMixedActive,
        kind: "bill",
        name: "Default bill",
        body: "Thanks for your order {{sale_number}} with secret template body",
        isActive: true,
        isDefault: true,
    }];

    const whatsappStoreConfigs: ReportingWhatsAppStoreConfig[] = [{
        storeId: storeMixedActive,
        organizationId: orgMixed,
        accountId: whatsappAccountMixed,
        accountStatus: "connected",
        messageLinks: [{
            key: "google_review",
            label: "Google review",
            type: "google_review",
            isActive: true,
            url: "https://example.com/review?token=secret-link-token",
        }],
    }, {
        storeId: storeMixedQuiet,
        organizationId: orgMixed,
        accountId: null,
        accountStatus: null,
        messageLinks: [],
    }];

    return {
        organizations,
        stores,
        customers,
        sales,
        devices,
        categories,
        products,
        addOns,
        attachments,
        ledgerEntries,
        saleLines,
        tables,
        purchases,
        whatsappAccounts,
        whatsappTemplates,
        whatsappStoreConfigs,
    };
};

const activeOwner = async (): Promise<OwnerUserRecord> => ({
    id: ownerId,
    firstName: "Asha",
    lastName: "Shah",
    phone: "+919876543210",
    passwordHash: await Bun.password.hash("correct horse battery staple"),
    isActive: true,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
});

const createHarness = async () => {
    let owner = await activeOwner();
    const facts = platformFacts();
    const authService = createOwnerAuthService({
        repository: {
            getOwnerUserById: async (id) => (id === owner.id ? owner : null),
            getOwnerUserByPhone: async (phone) => (phone === owner.phone ? owner : null),
        },
        otpStore: {
            set: async () => {},
            get: async () => null,
            delete: async () => {},
        },
        sendOtp: async () => ({ ok: true }),
        createOtp: () => "482951",
        verifyPassword: Bun.password.verify,
        tokenProvider: createOwnerTokenProvider(ownerSecret),
    });
    const reportingService = createPlatformReportingService({
        repository: createReportingMetrics(
            facts.organizations,
            facts.stores,
            facts.customers,
            facts.sales,
            facts.devices,
            facts.categories,
            facts.products,
            facts.addOns,
            facts.attachments,
            facts.ledgerEntries,
            facts.saleLines,
            facts.tables,
            facts.purchases,
            facts.whatsappAccounts,
            facts.whatsappTemplates,
            facts.whatsappStoreConfigs,
        ),
        billingRepository: {
            getSaleById: async (organizationId, storeId, saleId) => {
                const sale = facts.sales.find(
                    (item) => item.organizationId === organizationId && item.storeId === storeId && item.id === saleId,
                );
                if (!sale) return null;
                const paidTotal = sale.paidTotal ?? (sale.paymentStatus === "paid" ? sale.grandTotal : 0);
                return {
                    id: sale.id,
                    organizationId: sale.organizationId,
                    storeId: sale.storeId,
                    saleNumber: sale.saleNumber ?? null,
                    status: sale.status,
                    paymentStatus: sale.paymentStatus ?? "pending",
                    subtotal: sale.grandTotal,
                    discountTotal: 0,
                    grandTotal: sale.grandTotal,
                    paidTotal,
                    dueTotal: Math.max(sale.grandTotal - paidTotal, 0),
                    itemCount: sale.itemCount ?? 0,
                    itemsSummary: sale.itemsSummary ?? null,
                    paymentMethods: sale.paymentMethods ?? null,
                    customer: sale.customerName
                        ? { id: sale.customerId ?? sale.id, name: sale.customerName, phone: null, balance: 0, isActive: true }
                        : null,
                    createdByDevice: { id: deviceMixedActive, name: "Counter POS" },
                    updatedByDevice: { id: deviceMixedActive, name: "Counter POS" },
                    createdAt: (sale.createdAt ?? sale.committedAt ?? sale.updatedAt ?? now).toISOString(),
                    updatedAt: (sale.updatedAt ?? sale.committedAt ?? sale.createdAt ?? now).toISOString(),
                    committedAt: sale.committedAt?.toISOString() ?? null,
                    voidedAt: sale.status === "voided" ? sale.committedAt?.toISOString() ?? null : null,
                    voidReason: sale.status === "voided" ? "Mistake" : null,
                    notes: null,
                };
            },
            getSaleItemsBySaleId: async (saleId) => {
                if (saleId !== saleMixedCompleted) return [];
                return [{
                    id: "item-1",
                    organizationId: orgMixed,
                    storeId: storeMixedActive,
                    saleId,
                    productId: "prod-1",
                    quantity: 1,
                    configurationSignature: "plain",
                    productNameSnapshot: "Tea",
                    unitPriceSnapshot: 50.5,
                    discountAmount: 0,
                    lineSubtotal: 50.5,
                    lineTotal: 50.5,
                    addOns: [],
                    bundleComponents: [],
                    createdAt: "2026-08-19T10:00:00.000Z",
                    updatedAt: "2026-08-19T10:00:00.000Z",
                }];
            },
            getPaymentsBySaleId: async (saleId) => {
                if (saleId !== saleMixedCompleted) return [];
                return [{
                    id: "pay-1",
                    organizationId: orgMixed,
                    storeId: storeMixedActive,
                    saleId,
                    amount: 50.5,
                    method: "cash",
                    collectedAt: "2026-08-19T10:00:00.000Z",
                    createdAt: "2026-08-19T10:00:00.000Z",
                    updatedAt: "2026-08-19T10:00:00.000Z",
                }];
            },
            getProductSalesSummary: async (organizationId, storeId, query) => {
                const createdFrom = query.createdFrom ? new Date(query.createdFrom) : null;
                const createdTo = query.createdTo ? new Date(query.createdTo) : null;
                const eligibleSaleIds = new Set(
                    facts.sales
                        .filter((sale) =>
                            sale.organizationId === organizationId
                            && sale.status === "completed"
                            && (!storeId || sale.storeId === storeId)
                            && inWindow(sale.committedAt ?? sale.createdAt ?? null, createdFrom, createdTo))
                        .map((sale) => sale.id),
                );
                const aggregated = new Map<string, {
                    productId: string;
                    productName: string;
                    categoryName: string | null;
                    quantitySold: number;
                }>();
                for (const line of facts.saleLines) {
                    if (line.organizationId !== organizationId) continue;
                    if (storeId && line.storeId !== storeId) continue;
                    if (!eligibleSaleIds.has(line.saleId)) continue;
                    const existing = aggregated.get(line.productId);
                    if (existing) {
                        existing.quantitySold += line.quantity;
                        continue;
                    }
                    aggregated.set(line.productId, {
                        productId: line.productId,
                        productName: line.productName,
                        categoryName: line.categoryName,
                        quantitySold: line.quantity,
                    });
                }
                return Array.from(aggregated.values()).sort(
                    (left, right) =>
                        right.quantitySold - left.quantitySold
                        || left.productName.localeCompare(right.productName),
                );
            },
        },
        now: () => now,
    });
    const app = new Hono().route("/platform", createPlatformRoutes(authService, undefined, reportingService));

    return {
        app,
        setOwnerActive: (isActive: boolean) => {
            owner = { ...owner, isActive, updatedAt: new Date().toISOString() };
        },
    };
};

const cookieFrom = (response: Response) => response.headers.get("set-cookie")?.split(";")[0] ?? "";

const passwordLogin = (app: Hono) =>
    app.request("/platform/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-device-id": "browser-1" },
        body: JSON.stringify({
            requestType: "user-info",
            phone: "98765 43210",
            password: "correct horse battery staple",
        }),
    });

const organizations = (app: Hono, cookie: string, query = "") =>
    app.request(`/platform/organizations${query}`, { headers: { cookie } });

const organizationDetail = (app: Hono, cookie: string, organizationId: string, query = "") =>
    app.request(`/platform/organizations/${organizationId}${query}`, { headers: { cookie } });

const organizationStores = (app: Hono, cookie: string, organizationId: string, query = "") =>
    app.request(`/platform/organizations/${organizationId}/stores${query}`, { headers: { cookie } });

const organizationStoreDetail = (app: Hono, cookie: string, organizationId: string, storeId: string, query = "") =>
    app.request(`/platform/organizations/${organizationId}/stores/${storeId}${query}`, { headers: { cookie } });

const organizationSales = (app: Hono, cookie: string, organizationId: string, query = "") =>
    app.request(`/platform/organizations/${organizationId}/sales${query}`, { headers: { cookie } });

const organizationSaleDetail = (app: Hono, cookie: string, organizationId: string, saleId: string) =>
    app.request(`/platform/organizations/${organizationId}/sales/${saleId}`, { headers: { cookie } });

const organizationCatalog = (app: Hono, cookie: string, organizationId: string, query = "") =>
    app.request(`/platform/organizations/${organizationId}/catalog${query}`, { headers: { cookie } });

const organizationCatalogProduct = (app: Hono, cookie: string, organizationId: string, productId: string) =>
    app.request(`/platform/organizations/${organizationId}/catalog/products/${productId}`, { headers: { cookie } });

const organizationCatalogCategory = (app: Hono, cookie: string, organizationId: string, categoryId: string) =>
    app.request(`/platform/organizations/${organizationId}/catalog/categories/${categoryId}`, { headers: { cookie } });

const organizationCatalogAddOn = (app: Hono, cookie: string, organizationId: string, addOnId: string) =>
    app.request(`/platform/organizations/${organizationId}/catalog/add-ons/${addOnId}`, { headers: { cookie } });

const organizationCustomers = (app: Hono, cookie: string, organizationId: string, query = "") =>
    app.request(`/platform/organizations/${organizationId}/customers${query}`, { headers: { cookie } });

const organizationCustomerDetail = (app: Hono, cookie: string, organizationId: string, customerId: string) =>
    app.request(`/platform/organizations/${organizationId}/customers/${customerId}`, { headers: { cookie } });

const organizationReports = (app: Hono, cookie: string, organizationId: string, query = "") =>
    app.request(`/platform/organizations/${organizationId}/reports${query}`, { headers: { cookie } });

const organizationTables = (app: Hono, cookie: string, organizationId: string, query = "") =>
    app.request(`/platform/organizations/${organizationId}/tables${query}`, { headers: { cookie } });

const organizationTableDetail = (app: Hono, cookie: string, organizationId: string, tableId: string) =>
    app.request(`/platform/organizations/${organizationId}/tables/${tableId}`, { headers: { cookie } });

const organizationPurchases = (app: Hono, cookie: string, organizationId: string, query = "") =>
    app.request(`/platform/organizations/${organizationId}/purchases${query}`, { headers: { cookie } });

const organizationPurchaseDetail = (app: Hono, cookie: string, organizationId: string, purchaseId: string) =>
    app.request(`/platform/organizations/${organizationId}/purchases/${purchaseId}`, { headers: { cookie } });

const organizationWhatsApp = (app: Hono, cookie: string, organizationId: string) =>
    app.request(`/platform/organizations/${organizationId}/whatsapp`, { headers: { cookie } });

const names = (rows: PlatformOrganizationListItemDTO[] | undefined) => rows?.map((row) => row.name);

describe("Platform Organization Directory API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization adoption data only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const deviceToken = await sign(
            { deviceId: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request("/platform/organizations")).status).toBe(401);
        expect((await app.request("/platform/organizations", { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);
        expect((await app.request("/platform/organizations", { headers: { authorization: `Bearer ${deviceToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizations(app, ownerCookie)).status).toBe(401);
    });

    test("returns identity, creator contact, adoption counts, and last completed Sale in recency-first order", async () => {
        const { app } = await createHarness();
        const response = await organizations(app, cookieFrom(await passwordLogin(app)));
        const body = await response.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const rows = body.data?.organizations ?? [];

        expect(response.status).toBe(200);
        expect(names(rows)).toEqual(["Active Cafe", "Mixed Bistro", "Quiet Mart", "New Stand"]);
        expect(rows.map((row) => ({
            username: row.username,
            isActive: row.isActive,
            creator: row.creator,
            storeCount: row.storeCount,
            activeStoreCount: row.activeStoreCount,
            customerCount: row.customerCount,
            completedSaleCount: row.completedSaleCount,
            completedSalesValue: row.completedSalesValue,
            lastCompletedSaleAt: row.lastCompletedSaleAt,
        }))).toEqual([
            {
                username: "active-cafe",
                isActive: true,
                creator: { firstName: "Kiran", lastName: "Patel", phone: "+919800000001" },
                storeCount: 1,
                activeStoreCount: 1,
                customerCount: 2,
                completedSaleCount: 5,
                completedSalesValue: 161.25,
                lastCompletedSaleAt: "2026-08-21T18:30:00.000Z",
            },
            {
                username: "mixed-bistro",
                isActive: true,
                creator: { firstName: "Omar", lastName: "Khan", phone: "+919800000003" },
                storeCount: 2,
                activeStoreCount: 1,
                customerCount: 2,
                completedSaleCount: 2,
                completedSalesValue: 125.5,
                lastCompletedSaleAt: "2026-08-19T10:00:00.000Z",
            },
            {
                username: "quiet-mart",
                isActive: false,
                creator: { firstName: "Leela", lastName: "Nair", phone: "+919800000002" },
                storeCount: 1,
                activeStoreCount: 0,
                customerCount: 0,
                completedSaleCount: 2,
                completedSalesValue: 52,
                lastCompletedSaleAt: "2026-08-14T18:29:59.000Z",
            },
            {
                username: "new-stand",
                isActive: false,
                creator: { firstName: "Priya", lastName: "Shah", phone: "+919800000004" },
                storeCount: 0,
                activeStoreCount: 0,
                customerCount: 0,
                completedSaleCount: 0,
                completedSalesValue: 0,
                lastCompletedSaleAt: null,
            },
        ]);
        expect(JSON.stringify(body.data)).not.toContain("999");
        expect(JSON.stringify(body.data)).not.toContain("888");
        expect(JSON.stringify(body.data)).not.toContain("deviceSecret");
        expect(body.data?.pagination).toEqual({ page: 1, limit: 20, totalCount: 4 });
    });

    test("keeps Active Organization on the seven-day window while selected-period metrics change", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const allTime = await organizations(app, cookie, "?period=all-time");
        const sevenDay = await organizations(app, cookie, "?period=7d");
        const allTimeBody = await allTime.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const sevenDayBody = await sevenDay.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const allTimeByName = Object.fromEntries((allTimeBody.data?.organizations ?? []).map((row) => [row.name, row]));
        const sevenDayByName = Object.fromEntries((sevenDayBody.data?.organizations ?? []).map((row) => [row.name, row]));

        expect(sevenDayBody.data?.reportingPeriod.selection).toBe("7d");
        expect(sevenDayByName["Active Cafe"]?.isActive).toBe(true);
        expect(sevenDayByName["Quiet Mart"]?.isActive).toBe(false);
        expect(sevenDayByName["New Stand"]?.isActive).toBe(false);
        expect(sevenDayByName["Active Cafe"]?.activeStoreCount).toBe(allTimeByName["Active Cafe"]?.activeStoreCount);
        expect(sevenDayByName["Active Cafe"]?.customerCount).toBe(2);
        expect(sevenDayByName["Active Cafe"]?.completedSaleCount).toBe(4);
        expect(sevenDayByName["Active Cafe"]?.completedSalesValue).toBe(150.25);
        expect(allTimeByName["Active Cafe"]?.completedSaleCount).toBe(5);
        expect(sevenDayByName["Quiet Mart"]?.completedSaleCount).toBe(0);
        expect(allTimeByName["Quiet Mart"]?.completedSaleCount).toBe(2);
        expect(sevenDayByName["Active Cafe"]?.lastCompletedSaleAt).toBe(allTimeByName["Active Cafe"]?.lastCompletedSaleAt);
    });

    test("filters inactive Organizations with no Store and formerly active Organizations", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const inactive = await organizations(app, cookie, "?activity=inactive&period=90d");
        const active = await organizations(app, cookie, "?activity=active&period=90d");
        const inactiveBody = await inactive.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const activeBody = await active.json() as ServiceResponse<PlatformOrganizationListResponse>;

        expect(names(inactiveBody.data?.organizations)).toEqual(["Quiet Mart", "New Stand"]);
        expect(inactiveBody.data?.organizations.every((row) => row.isActive === false)).toBe(true);
        expect(names(activeBody.data?.organizations)).toEqual(["Active Cafe", "Mixed Bistro"]);
        expect(activeBody.data?.reportingPeriod.selection).toBe("90d");
        expect(inactiveBody.data?.organizations.find((row) => row.name === "Quiet Mart")?.completedSaleCount).toBe(2);
    });

    test("searches by Organization identity or creator and paginates in recency-first order", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const byName = await organizations(app, cookie, "?search=Cafe");
        const byUsername = await organizations(app, cookie, "?search=new-stand");
        const byCreator = await organizations(app, cookie, "?search=Nair");
        const byCreatorPhone = await organizations(app, cookie, "?search=9800000003");
        const pageOne = await organizations(app, cookie, "?limit=2&page=1");
        const pageTwo = await organizations(app, cookie, "?limit=2&page=2");
        const empty = await organizations(app, cookie, "?search=zzzz");
        const byNameBody = await byName.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const byUsernameBody = await byUsername.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const byCreatorBody = await byCreator.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const byCreatorPhoneBody = await byCreatorPhone.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const pageOneBody = await pageOne.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const pageTwoBody = await pageTwo.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const emptyBody = await empty.json() as ServiceResponse<PlatformOrganizationListResponse>;

        expect(names(byNameBody.data?.organizations)).toEqual(["Active Cafe"]);
        expect(names(byUsernameBody.data?.organizations)).toEqual(["New Stand"]);
        expect(names(byCreatorBody.data?.organizations)).toEqual(["Quiet Mart"]);
        expect(names(byCreatorPhoneBody.data?.organizations)).toEqual(["Mixed Bistro"]);
        expect(names(pageOneBody.data?.organizations)).toEqual(["Active Cafe", "Mixed Bistro"]);
        expect(names(pageTwoBody.data?.organizations)).toEqual(["Quiet Mart", "New Stand"]);
        expect(pageOneBody.data?.pagination).toEqual({ page: 1, limit: 2, totalCount: 4 });
        expect(pageTwoBody.data?.pagination).toEqual({ page: 2, limit: 2, totalCount: 4 });
        expect(emptyBody.data?.organizations).toEqual([]);
        expect(emptyBody.data?.pagination.totalCount).toBe(0);
    });

    test("sorts the Organization Directory and rejects unknown sort values", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const byName = await organizations(app, cookie, "?sort=name_asc");
        const byNameDesc = await organizations(app, cookie, "?sort=name_desc");
        const bySalesValue = await organizations(app, cookie, "?sort=sales_value_asc");
        const unknown = await organizations(app, cookie, "?sort=newest");
        const byNameBody = await byName.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const byNameDescBody = await byNameDesc.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const bySalesValueBody = await bySalesValue.json() as ServiceResponse<PlatformOrganizationListResponse>;

        expect(names(byNameBody.data?.organizations)).toEqual(["Active Cafe", "Mixed Bistro", "New Stand", "Quiet Mart"]);
        expect(names(byNameDescBody.data?.organizations)).toEqual(["Quiet Mart", "New Stand", "Mixed Bistro", "Active Cafe"]);
        expect(names(bySalesValueBody.data?.organizations)).toEqual(["New Stand", "Quiet Mart", "Mixed Bistro", "Active Cafe"]);
        expect(unknown.status).toBe(400);
    });

    test("rejects malformed pagination and future-invalid custom Platform Reporting Periods", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));

        const badPage = await organizations(app, cookie, "?page=0");
        const inverted = await organizations(app, cookie, "?period=custom&startDate=2026-08-21&endDate=2026-08-01");
        const future = await organizations(app, cookie, "?period=custom&startDate=2026-08-21&endDate=2026-08-22");
        const futureBody = await future.json() as { message: string };

        expect(badPage.status).toBe(400);
        expect(inverted.status).toBe(400);
        expect(future.status).toBe(400);
        expect(futureBody.message).toBe(FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE);
    });
});

describe("Platform Organization drill-down API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization detail only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const deviceToken = await sign(
            { deviceId: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request(`/platform/organizations/${orgMixed}`)).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}`, { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}`, { headers: { authorization: `Bearer ${deviceToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizationDetail(app, ownerCookie, orgMixed)).status).toBe(401);
    });

    test("matches list aggregates and lists mixed active and inactive Stores", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const list = await organizations(app, cookie);
        const detail = await organizationDetail(app, cookie, orgMixed);
        const listBody = await list.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const detailBody = await detail.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const listRow = listBody.data?.organizations.find((row) => row.id === orgMixed);
        const organization = detailBody.data?.organization;
        expect(organization).toBeDefined();
        if (!organization) {
            throw new Error("Expected Organization detail");
        }
        const stores = organization.stores;

        expect(detail.status).toBe(200);
        expect(organization).toMatchObject({
            id: orgMixed,
            name: "Mixed Bistro",
            username: "mixed-bistro",
            isActive: true,
            creator: { firstName: "Omar", lastName: "Khan", phone: "+919800000003" },
            storeCount: 2,
            activeStoreCount: 1,
            customerCount: 2,
            completedSaleCount: 2,
            completedSalesValue: 125.5,
            lastCompletedSaleAt: "2026-08-19T10:00:00.000Z",
        });
        expect(listRow).toMatchObject({
            isActive: organization?.isActive,
            storeCount: organization?.storeCount,
            activeStoreCount: organization?.activeStoreCount,
            customerCount: organization?.customerCount,
            completedSaleCount: organization?.completedSaleCount,
            completedSalesValue: organization?.completedSalesValue,
            lastCompletedSaleAt: organization?.lastCompletedSaleAt,
            creator: organization?.creator,
        });
        expect(stores.map((store) => store.name)).toEqual(["Front Hall", "Garden Patio"]);
        expect(stores).toEqual([
            {
                id: storeMixedActive,
                name: "Front Hall",
                isActive: true,
                customerCount: 2,
                completedSaleCount: 2,
                completedSalesValue: 125.5,
                lastCompletedSaleAt: "2026-08-19T10:00:00.000Z",
            },
            {
                id: storeMixedQuiet,
                name: "Garden Patio",
                isActive: false,
                customerCount: 0,
                completedSaleCount: 0,
                completedSalesValue: 0,
                lastCompletedSaleAt: null,
            },
        ]);
        expect(stores.filter((store) => store.isActive).length).toBe(organization.activeStoreCount);
        expect(stores.reduce((sum, store) => sum + store.completedSaleCount, 0)).toBe(organization.completedSaleCount);
        expect(stores.reduce((sum, store) => sum + store.completedSalesValue, 0)).toBe(organization.completedSalesValue);
        expect(organization.completedSaleCount).not.toBeGreaterThan(2);
        expect(JSON.stringify(detailBody.data)).not.toContain("deviceSecret");
        expect(JSON.stringify(detailBody.data)).not.toContain("password");
        expect(JSON.stringify(detailBody.data)).not.toContain("Kiran Patel");
    });

    test("keeps Store activity on the seven-day window while selected-period metrics change", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const allTime = await organizationDetail(app, cookie, orgActive, "?period=all-time");
        const sevenDay = await organizationDetail(app, cookie, orgActive, "?period=7d");
        const listSevenDay = await organizations(app, cookie, "?period=7d");
        const allTimeBody = await allTime.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const sevenDayBody = await sevenDay.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const listBody = await listSevenDay.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const listRow = listBody.data?.organizations.find((row) => row.id === orgActive);
        const allTimeOrg = allTimeBody.data?.organization;
        const sevenDayOrg = sevenDayBody.data?.organization;
        const cafeStore = sevenDayOrg?.stores[0];

        expect(sevenDayBody.data?.reportingPeriod.selection).toBe("7d");
        expect(sevenDayOrg?.isActive).toBe(true);
        expect(sevenDayOrg?.activeStoreCount).toBe(allTimeOrg?.activeStoreCount);
        expect(cafeStore?.isActive).toBe(true);
        expect(cafeStore?.name).toBe("Cafe Counter");
        expect(cafeStore?.customerCount).toBe(2);
        expect(allTimeOrg?.customerCount).toBe(2);
        expect(allTimeOrg?.completedSaleCount).toBe(5);
        expect(allTimeOrg?.completedSalesValue).toBe(161.25);
        expect(sevenDayOrg?.completedSaleCount).toBe(4);
        expect(sevenDayOrg?.completedSalesValue).toBe(150.25);
        expect(cafeStore?.completedSaleCount).toBe(4);
        expect(cafeStore?.completedSalesValue).toBe(150.25);
        expect(sevenDayOrg?.lastCompletedSaleAt).toBe(allTimeOrg?.lastCompletedSaleAt);
        expect(cafeStore?.lastCompletedSaleAt).toBe(allTimeOrg?.lastCompletedSaleAt);
        expect(listRow?.completedSaleCount).toBe(sevenDayOrg?.completedSaleCount);
        expect(listRow?.completedSalesValue).toBe(sevenDayOrg?.completedSalesValue);
        expect(listRow?.isActive).toBe(sevenDayOrg?.isActive);
    });

    test("returns an empty Store list for an Organization with no Stores", async () => {
        const { app } = await createHarness();
        const detail = await organizationDetail(app, cookieFrom(await passwordLogin(app)), orgNoStores);
        const body = await detail.json() as ServiceResponse<PlatformOrganizationDetailResponse>;

        expect(detail.status).toBe(200);
        expect(body.data?.organization).toMatchObject({
            name: "New Stand",
            isActive: false,
            storeCount: 0,
            activeStoreCount: 0,
            customerCount: 0,
            completedSaleCount: 0,
            completedSalesValue: 0,
            lastCompletedSaleAt: null,
        });
        expect(body.data?.organization.stores).toEqual([]);
    });

    test("hides missing Organizations and rejects invalid ids or future-invalid periods", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const missing = await organizationDetail(app, cookie, missingOrganizationId);
        const invalid = await organizationDetail(app, cookie, "not-a-uuid");
        const future = await organizationDetail(app, cookie, orgActive, "?period=custom&startDate=2026-08-21&endDate=2026-08-22");
        const missingBody = await missing.json() as ServiceResponse<null>;
        const futureBody = await future.json() as { message: string };

        expect(missing.status).toBe(404);
        expect(missingBody.message).toBe("Organization not found");
        expect(missingBody.data).toBeNull();
        expect(JSON.stringify(missingBody)).not.toContain("Active Cafe");
        expect(JSON.stringify(missingBody)).not.toContain("Mixed Bistro");
        expect(invalid.status).toBe(400);
        expect(future.status).toBe(400);
        expect(futureBody.message).toBe(FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE);
    });

    test("returns Store-attributed recent Sales without mixing other Organizations or reusable secrets", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const mixed = await organizationDetail(app, cookie, orgMixed);
        const empty = await organizationDetail(app, cookie, orgNoStores);
        const mixedBody = await mixed.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const emptyBody = await empty.json() as ServiceResponse<PlatformOrganizationDetailResponse>;

        expect(mixedBody.data?.organization.recentSales).toEqual([
            {
                id: saleMixedCompleted,
                saleNumber: "12",
                status: "completed",
                grandTotal: 50.5,
                occurredAt: "2026-08-19T10:00:00.000Z",
                store: { id: storeMixedActive, name: "Front Hall" },
            },
            {
                id: saleMixedReceivable,
                saleNumber: "13",
                status: "completed",
                grandTotal: 75,
                occurredAt: "2026-08-18T10:00:00.000Z",
                store: { id: storeMixedActive, name: "Front Hall" },
            },
        ]);
        expect(emptyBody.data?.organization.recentSales).toEqual([]);
        expect(JSON.stringify(mixedBody.data)).not.toContain("Cafe Counter");
        expect(JSON.stringify(mixedBody.data)).not.toContain("deviceSecret");
        expect(JSON.stringify(mixedBody.data)).not.toContain("password");
        expect(JSON.stringify(mixedBody.data)).not.toContain("token");
    });

    test("keeps recent Sales independent of the selected Platform Reporting Period", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const sevenDay = await organizationDetail(app, cookie, orgInactive, "?period=7d");
        const body = await sevenDay.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const recentSales = body.data?.organization.recentSales ?? [];

        expect(body.data?.reportingPeriod.selection).toBe("7d");
        expect(body.data?.organization.completedSaleCount).toBe(0);
        expect(recentSales.map((sale) => sale.id)).toEqual([saleQuietVoided, saleQuietRecent, saleQuietOld]);
        expect(recentSales).toEqual([
            {
                id: saleQuietVoided,
                saleNumber: "3",
                status: "voided",
                grandTotal: 888,
                occurredAt: "2026-08-20T10:00:00.000Z",
                store: { id: storeQuiet, name: "Quiet Aisle" },
            },
            {
                id: saleQuietRecent,
                saleNumber: "1",
                status: "completed",
                grandTotal: 12,
                occurredAt: "2026-08-14T18:29:59.000Z",
                store: { id: storeQuiet, name: "Quiet Aisle" },
            },
            {
                id: saleQuietOld,
                saleNumber: "2",
                status: "completed",
                grandTotal: 40,
                occurredAt: "2026-08-01T10:00:00.000Z",
                store: { id: storeQuiet, name: "Quiet Aisle" },
            },
        ]);
        expect(recentSales.every((sale) => sale.store.name === "Quiet Aisle")).toBe(true);
    });
});

describe("Platform Store inspection API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization Stores only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request(`/platform/organizations/${orgMixed}/stores`)).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}/stores`, { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizationStores(app, ownerCookie, orgMixed)).status).toBe(401);
    });

    test("lists Store activity for an Organization and matches overview aggregates", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const detail = await organizationDetail(app, cookie, orgMixed);
        const stores = await organizationStores(app, cookie, orgMixed);
        const detailBody = await detail.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const storesBody = await stores.json() as ServiceResponse<PlatformStoreListResponse>;

        expect(stores.status).toBe(200);
        expect(storesBody.data?.stores).toEqual(detailBody.data?.organization.stores);
        expect(JSON.stringify(storesBody.data)).not.toContain("deviceSecret");
        expect(JSON.stringify(storesBody.data)).not.toContain("password");
    });

    test("returns Store detail with safe device metadata and Store-attributed recent Sales", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const response = await organizationStoreDetail(app, cookie, orgMixed, storeMixedActive);
        const body = await response.json() as ServiceResponse<PlatformStoreDetailResponse>;

        expect(response.status).toBe(200);
        expect(body.data?.store).toMatchObject({
            id: storeMixedActive,
            organizationId: orgMixed,
            name: "Front Hall",
            address: "12 Market Road",
            kotSystemEnabled: true,
            tableManagementEnabled: false,
            isActive: true,
            customerCount: 2,
            completedSaleCount: 2,
            completedSalesValue: 125.5,
        });
        expect(body.data?.store.devices).toEqual([
            {
                id: deviceMixedActive,
                name: "Counter POS",
                loginUsername: "front-hall-pos",
                status: "active",
                lastSeenAt: "2026-08-19T09:00:00.000Z",
                createdAt: "2026-01-15T00:00:00.000Z",
            },
        ]);
        expect(body.data?.store.recentSales).toEqual([
            {
                id: saleMixedCompleted,
                saleNumber: "12",
                status: "completed",
                grandTotal: 50.5,
                occurredAt: "2026-08-19T10:00:00.000Z",
                store: { id: storeMixedActive, name: "Front Hall" },
            },
            {
                id: saleMixedReceivable,
                saleNumber: "13",
                status: "completed",
                grandTotal: 75,
                occurredAt: "2026-08-18T10:00:00.000Z",
                store: { id: storeMixedActive, name: "Front Hall" },
            },
        ]);
        expect(JSON.stringify(body.data)).not.toContain("deviceSecret");
        expect(JSON.stringify(body.data)).not.toContain("password");
        expect(JSON.stringify(body.data)).not.toContain("token");
        expect(JSON.stringify(body.data)).not.toContain("Garden Patio");
    });

    test("hides missing Organizations and Stores and rejects invalid ids", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const missingOrg = await organizationStores(app, cookie, missingOrganizationId);
        const missingStore = await organizationStoreDetail(app, cookie, orgMixed, missingStoreId);
        const invalidStore = await organizationStoreDetail(app, cookie, orgMixed, "not-a-uuid");
        const missingOrgBody = await missingOrg.json() as ServiceResponse<null>;
        const missingStoreBody = await missingStore.json() as ServiceResponse<null>;

        expect(missingOrg.status).toBe(404);
        expect(missingOrgBody.message).toBe("Organization not found");
        expect(missingStore.status).toBe(404);
        expect(missingStoreBody.message).toBe("Store not found");
        expect(invalidStore.status).toBe(400);
        expect(JSON.stringify(missingStoreBody)).not.toContain("Front Hall");
    });
});

describe("Platform Catalog inspection API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization Catalog only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request(`/platform/organizations/${orgMixed}/catalog`)).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}/catalog`, { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizationCatalog(app, ownerCookie, orgMixed)).status).toBe(401);
    });

    test("lists Products, Categories, and Add-ons with counts, filters, and pagination", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const products = await organizationCatalog(app, cookie, orgMixed);
        const categories = await organizationCatalog(app, cookie, orgMixed, "?tab=categories");
        const addOns = await organizationCatalog(app, cookie, orgMixed, "?tab=add-ons&search=Ginger");
        const productsBody = await products.json() as ServiceResponse<PlatformCatalogListResponse>;
        const categoriesBody = await categories.json() as ServiceResponse<PlatformCatalogListResponse>;
        const addOnsBody = await addOns.json() as ServiceResponse<PlatformCatalogListResponse>;

        expect(products.status).toBe(200);
        expect(productsBody.data?.counts).toEqual({ categories: 1, products: 1, addOns: 1 });
        expect(productsBody.data?.products.map((product) => product.name)).toEqual(["Masala Chai"]);
        expect(categoriesBody.data?.categories.map((category) => category.name)).toEqual(["Beverages"]);
        expect(addOnsBody.data?.addOns.map((addOn) => addOn.name)).toEqual(["Extra Ginger"]);
        expect(JSON.stringify(productsBody.data)).not.toContain("password");
        expect(JSON.stringify(productsBody.data)).not.toContain("token");
        expect(JSON.stringify(productsBody.data)).not.toContain("deviceSecret");
    });

    test("returns Product, Category, and Add-on detail with attachment metadata", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const product = await organizationCatalogProduct(app, cookie, orgMixed, productMixed);
        const category = await organizationCatalogCategory(app, cookie, orgMixed, categoryMixed);
        const addOn = await organizationCatalogAddOn(app, cookie, orgMixed, addOnMixed);
        const productBody = await product.json() as ServiceResponse<PlatformCatalogProductDetailResponse>;
        const categoryBody = await category.json() as ServiceResponse<PlatformCatalogCategoryDetailResponse>;
        const addOnBody = await addOn.json() as ServiceResponse<PlatformCatalogAddOnDetailResponse>;

        expect(product.status).toBe(200);
        expect(productBody.data?.product.name).toBe("Masala Chai");
        expect(productBody.data?.product.attachments).toEqual([
            expect.objectContaining({
                addOnName: "Extra Ginger",
                selectionCap: 1,
                status: "active",
            }),
        ]);
        expect(categoryBody.data?.category.products.map((item) => item.name)).toEqual(["Masala Chai"]);
        expect(addOnBody.data?.addOn.attachments).toEqual([
            expect.objectContaining({
                productName: "Masala Chai",
                selectionCap: 1,
            }),
        ]);
    });

    test("returns 404 for missing Organization and catalog resources without leaking other tenant data", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const missingOrg = await organizationCatalog(app, cookie, missingOrganizationId);
        const missingProduct = await organizationCatalogProduct(app, cookie, orgMixed, missingProductId);
        const missingOrgBody = await missingOrg.json() as ServiceResponse<null>;
        const missingProductBody = await missingProduct.json() as ServiceResponse<null>;

        expect(missingOrg.status).toBe(404);
        expect(missingOrgBody.message).toBe("Organization not found");
        expect(missingProduct.status).toBe(404);
        expect(missingProductBody.message).toBe("Product not found");
        expect(JSON.stringify(missingProductBody)).not.toContain("Masala Chai");
    });
});

describe("Platform Billing inspection API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization Sales only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request(`/platform/organizations/${orgMixed}/sales`)).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}/sales`, { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizationSales(app, ownerCookie, orgMixed)).status).toBe(401);
    });

    test("lists bills across all Stores by default with Store attribution and pagination", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const response = await organizationSales(app, cookie, orgMixed);
        const body = await response.json() as ServiceResponse<PlatformSaleInspectionListResponse>;

        expect(response.status).toBe(200);
        expect(body.data?.stores.map((store) => store.name)).toEqual(["Front Hall", "Garden Patio"]);
        expect(body.data?.sales).toEqual([
            expect.objectContaining({
                id: saleMixedCompleted,
                saleNumber: "12",
                status: "completed",
                paymentStatus: "paid",
                store: { id: storeMixedActive, name: "Front Hall" },
            }),
            expect.objectContaining({
                id: saleMixedReceivable,
                saleNumber: "13",
                status: "completed",
                paymentStatus: "partial",
                store: { id: storeMixedActive, name: "Front Hall" },
            }),
        ]);
        expect(body.data?.pagination).toEqual({ page: 1, limit: 20, totalCount: 2 });
        expect(JSON.stringify(body.data)).not.toContain("deviceSecret");
        expect(JSON.stringify(body.data)).not.toContain("password");
        expect(JSON.stringify(body.data)).not.toContain("token");
    });

    test("filters bills by Store, status, search, and billing date range without using the Dashboard reporting period", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const filtered = await organizationSales(
            app,
            cookie,
            orgActive,
            "?status=draft&search=Cafe&startDate=2026-08-21&endDate=2026-08-21",
        );
        const dashboardPeriod = await organizationDetail(app, cookie, orgActive, "?period=7d");
        const filteredBody = await filtered.json() as ServiceResponse<PlatformSaleInspectionListResponse>;
        const dashboardBody = await dashboardPeriod.json() as ServiceResponse<PlatformOrganizationDetailResponse>;

        expect(filteredBody.data?.sales.map((sale) => sale.id)).toEqual([saleCafeDraft]);
        expect(filteredBody.data?.sales[0]?.store.name).toBe("Cafe Counter");
        expect(dashboardBody.data?.organization.completedSaleCount).toBe(4);
        expect(filteredBody.data?.sales[0]?.status).toBe("draft");
    });

    test("returns read-only Sale detail with line items, payments, device attribution, and receipt preview", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const response = await organizationSaleDetail(app, cookie, orgMixed, saleMixedCompleted);
        const body = await response.json() as ServiceResponse<PlatformSaleInspectionDetailResponse>;

        expect(response.status).toBe(200);
        expect(body.data?.sale).toMatchObject({
            id: saleMixedCompleted,
            saleNumber: "12",
            status: "completed",
            paymentStatus: "paid",
            store: { id: storeMixedActive, name: "Front Hall" },
            createdByDevice: { id: deviceMixedActive, name: "Counter POS" },
            updatedByDevice: { id: deviceMixedActive, name: "Counter POS" },
            receipt: {
                organizationName: "Mixed Bistro",
                storeName: "Front Hall",
                storeAddress: "12 Market Road",
            },
        });
        expect(body.data?.sale.items).toHaveLength(1);
        expect(body.data?.sale.payments).toHaveLength(1);
        expect(body.data?.sale.receipt.previewText).toContain("Mixed Bistro");
        expect(JSON.stringify(body.data)).not.toContain("deviceSecret");
        expect(JSON.stringify(body.data)).not.toContain("Collect Payment");
    });

    test("hides missing Organizations and Sales and rejects invalid ids or future billing dates", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const missingOrg = await organizationSales(app, cookie, missingOrganizationId);
        const missingSale = await organizationSaleDetail(app, cookie, orgMixed, missingSaleId);
        const invalidSale = await organizationSaleDetail(app, cookie, orgMixed, "not-a-uuid");
        const future = await organizationSales(app, cookie, orgMixed, "?startDate=2026-08-21&endDate=2026-08-22");
        const missingOrgBody = await missingOrg.json() as ServiceResponse<null>;
        const missingSaleBody = await missingSale.json() as ServiceResponse<null>;
        const futureBody = await future.json() as { message: string };

        expect(missingOrg.status).toBe(404);
        expect(missingOrgBody.message).toBe("Organization not found");
        expect(missingSale.status).toBe(404);
        expect(missingSaleBody.message).toBe("Sale not found");
        expect(invalidSale.status).toBe(400);
        expect(future.status).toBe(400);
        expect(futureBody.message).toBe(FUTURE_BILLING_INSPECTION_DATE_MESSAGE);
        expect(JSON.stringify(missingSaleBody)).not.toContain("Front Hall");
    });
});

describe("Platform Customer inspection API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization Customers only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request(`/platform/organizations/${orgMixed}/customers`)).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}/customers`, { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizationCustomers(app, ownerCookie, orgMixed)).status).toBe(401);
    });

    test("lists Customers with search, status filters, sort, and pagination", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const allCustomers = await organizationCustomers(app, cookie, orgMixed);
        const dueCustomers = await organizationCustomers(app, cookie, orgMixed, "?status=due");
        const searchedCustomers = await organizationCustomers(app, cookie, orgMixed, "?search=Anita");
        const allBody = await allCustomers.json() as ServiceResponse<PlatformCustomerInspectionListResponse>;
        const dueBody = await dueCustomers.json() as ServiceResponse<PlatformCustomerInspectionListResponse>;
        const searchedBody = await searchedCustomers.json() as ServiceResponse<PlatformCustomerInspectionListResponse>;

        expect(allCustomers.status).toBe(200);
        expect(allBody.data?.customers.map((customer) => customer.name)).toEqual(["Dev Patel", "Anita Rao"]);
        expect(dueBody.data?.customers.map((customer) => customer.name)).toEqual(["Dev Patel"]);
        expect(searchedBody.data?.customers.map((customer) => customer.name)).toEqual(["Anita Rao"]);
        expect(JSON.stringify(allBody.data)).not.toContain("password");
        expect(JSON.stringify(allBody.data)).not.toContain("token");
        expect(JSON.stringify(allBody.data)).not.toContain("deviceSecret");
    });

    test("returns Customer detail with ledger and billing context", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const response = await organizationCustomerDetail(app, cookie, orgMixed, customerMixedDue);
        const body = await response.json() as ServiceResponse<PlatformCustomerInspectionDetailResponse>;

        expect(response.status).toBe(200);
        expect(body.data?.customer.name).toBe("Dev Patel");
        expect(body.data?.customer.balance).toBe(25);
        expect(body.data?.customer.ledger).toEqual([
            expect.objectContaining({
                entryType: "sale",
                amount: 25,
                balanceAfter: 25,
            }),
        ]);
        expect(body.data?.customer.sales).toEqual([
            expect.objectContaining({
                saleNumber: "13",
                paymentStatus: "partial",
                store: { id: storeMixedActive, name: "Front Hall" },
            }),
        ]);
    });

    test("returns 404 for missing Organization and Customers without leaking other tenant data", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const missingOrg = await organizationCustomers(app, cookie, missingOrganizationId);
        const missingCustomer = await organizationCustomerDetail(app, cookie, orgMixed, missingCustomerId);
        const missingOrgBody = await missingOrg.json() as ServiceResponse<null>;
        const missingCustomerBody = await missingCustomer.json() as ServiceResponse<null>;

        expect(missingOrg.status).toBe(404);
        expect(missingOrgBody.message).toBe("Organization not found");
        expect(missingCustomer.status).toBe(404);
        expect(missingCustomerBody.message).toBe("Customer not found");
        expect(JSON.stringify(missingCustomerBody)).not.toContain("Dev Patel");
    });
});

describe("Platform Report inspection API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization product sales only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request(`/platform/organizations/${orgMixed}/reports`)).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}/reports`, { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizationReports(app, ownerCookie, orgMixed)).status).toBe(401);
    });

    test("returns product sales for an explicit report range without using the Dashboard reporting period", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const reportRange = await organizationReports(app, cookie, orgActive, "?startDate=2026-08-21&endDate=2026-08-21");
        const dashboardPeriod = await organizationDetail(app, cookie, orgActive, "?period=7d");
        const reportBody = await reportRange.json() as ServiceResponse<PlatformReportInspectionResponse>;
        const dashboardBody = await dashboardPeriod.json() as ServiceResponse<PlatformOrganizationDetailResponse>;

        expect(reportRange.status).toBe(200);
        expect(reportBody.data?.dateRange).toMatchObject({
            startDate: "2026-08-21",
            endDate: "2026-08-21",
            label: "2026-08-21",
            timezone: "Asia/Kolkata",
        });
        expect(reportBody.data?.productSales.products).toEqual([
            {
                productId: "prod-active-coffee",
                productName: "Filter Coffee",
                categoryName: "Beverages",
                quantitySold: 3,
            },
        ]);
        expect(dashboardBody.data?.reportingPeriod.selection).toBe("7d");
        expect(dashboardBody.data?.organization.completedSaleCount).not.toBe(reportBody.data?.productSales.totalQuantitySold);
        expect(JSON.stringify(reportBody.data)).not.toContain("deviceSecret");
        expect(JSON.stringify(reportBody.data)).not.toContain("password");
        expect(JSON.stringify(reportBody.data)).not.toContain("token");
    });

    test("filters product sales by Store and keeps Organization isolation", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const mixedReport = await organizationReports(app, cookie, orgMixed);
        const otherOrgReport = await organizationReports(app, cookie, orgActive, `?storeId=${storeMixedActive}`);
        const mixedBody = await mixedReport.json() as ServiceResponse<PlatformReportInspectionResponse>;
        const otherOrgBody = await otherOrgReport.json() as ServiceResponse<null>;

        expect(mixedBody.data?.productSales.products[0]).toMatchObject({
            productName: "Masala Chai",
            quantitySold: 2,
        });
        expect(otherOrgBody.message).toBe("Store not found");
        expect(otherOrgReport.status).toBe(404);
    });

    test("rejects missing Organizations, invalid store ids, and future-invalid report dates", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const missingOrg = await organizationReports(app, cookie, missingOrganizationId);
        const invalidStore = await organizationReports(app, cookie, orgMixed, `?storeId=${storeActive}`);
        const future = await organizationReports(app, cookie, orgMixed, "?startDate=2026-08-21&endDate=2026-08-22");
        const missingOrgBody = await missingOrg.json() as ServiceResponse<null>;
        const futureBody = await future.json() as { message: string };

        expect(missingOrg.status).toBe(404);
        expect(missingOrgBody.message).toBe("Organization not found");
        expect(invalidStore.status).toBe(404);
        expect(future.status).toBe(400);
        expect(futureBody.message).toBe(FUTURE_REPORT_INSPECTION_DATE_MESSAGE);
        expect(JSON.stringify(missingOrgBody)).not.toContain("Masala Chai");
    });
});

describe("Platform Table inspection API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization Tables only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request(`/platform/organizations/${orgMixed}/tables`)).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}/tables`, { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizationTables(app, ownerCookie, orgMixed)).status).toBe(401);
    });

    test("lists Tables with store, state, search filters, and pagination", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const allTables = await organizationTables(app, cookie, orgMixed);
        const engagedTables = await organizationTables(app, cookie, orgMixed, "?state=engaged");
        const patioTables = await organizationTables(app, cookie, orgMixed, "?search=Patio");
        const allBody = await allTables.json() as ServiceResponse<PlatformTableInspectionListResponse>;
        const engagedBody = await engagedTables.json() as ServiceResponse<PlatformTableInspectionListResponse>;
        const patioBody = await patioTables.json() as ServiceResponse<PlatformTableInspectionListResponse>;

        expect(allTables.status).toBe(200);
        expect(allBody.data?.tables.map((table) => table.tableLabel)).toEqual(["Patio 2", "T1"]);
        expect(engagedBody.data?.tables.map((table) => table.tableLabel)).toEqual(["T1"]);
        expect(patioBody.data?.tables.map((table) => table.tableLabel)).toEqual(["Patio 2"]);
        expect(JSON.stringify(allBody.data)).not.toContain("password");
        expect(JSON.stringify(allBody.data)).not.toContain("token");
        expect(JSON.stringify(allBody.data)).not.toContain("deviceSecret");
    });

    test("returns Table detail with current sale context", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const response = await organizationTableDetail(app, cookie, orgMixed, tableMixedEngaged);
        const body = await response.json() as ServiceResponse<PlatformTableInspectionDetailResponse>;

        expect(response.status).toBe(200);
        expect(body.data?.table.tableLabel).toBe("T1");
        expect(body.data?.table.store).toEqual({ id: storeMixedActive, name: "Front Hall" });
        expect(body.data?.table.currentSale).toEqual(
            expect.objectContaining({
                saleNumber: "13",
                paymentStatus: "partial",
            }),
        );
    });

    test("returns 404 for missing Organization, Tables, and cross-Organization store filters", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const missingOrg = await organizationTables(app, cookie, missingOrganizationId);
        const missingTable = await organizationTableDetail(app, cookie, orgMixed, missingTableId);
        const otherOrgStore = await organizationTables(app, cookie, orgActive, `?storeId=${storeMixedActive}`);
        const missingOrgBody = await missingOrg.json() as ServiceResponse<null>;
        const missingTableBody = await missingTable.json() as ServiceResponse<null>;

        expect(missingOrg.status).toBe(404);
        expect(missingOrgBody.message).toBe("Organization not found");
        expect(missingTable.status).toBe(404);
        expect(missingTableBody.message).toBe("Table not found");
        expect(otherOrgStore.status).toBe(404);
        expect(JSON.stringify(missingTableBody)).not.toContain("T1");
    });
});

describe("Platform Purchase inspection API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization Purchases only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request(`/platform/organizations/${orgMixed}/purchases`)).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}/purchases`, { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizationPurchases(app, ownerCookie, orgMixed)).status).toBe(401);
    });

    test("lists Purchases with store, status, search filters, and pagination", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const allPurchases = await organizationPurchases(app, cookie, orgMixed);
        const recordedPurchases = await organizationPurchases(app, cookie, orgMixed, "?status=recorded");
        const searchedPurchases = await organizationPurchases(app, cookie, orgMixed, "?search=Paper");
        const allBody = await allPurchases.json() as ServiceResponse<PlatformPurchaseInspectionListResponse>;
        const recordedBody = await recordedPurchases.json() as ServiceResponse<PlatformPurchaseInspectionListResponse>;
        const searchedBody = await searchedPurchases.json() as ServiceResponse<PlatformPurchaseInspectionListResponse>;

        expect(allPurchases.status).toBe(200);
        expect(allBody.data?.purchases.map((purchase) => purchase.supplierName)).toEqual(["Fresh Produce Co", "Paper Supplies"]);
        expect(recordedBody.data?.purchases.map((purchase) => purchase.supplierName)).toEqual(["Fresh Produce Co"]);
        expect(searchedBody.data?.purchases.map((purchase) => purchase.supplierName)).toEqual(["Paper Supplies"]);
        expect(JSON.stringify(allBody.data)).not.toContain("password");
        expect(JSON.stringify(allBody.data)).not.toContain("token");
        expect(JSON.stringify(allBody.data)).not.toContain("deviceSecret");
    });

    test("returns Purchase detail with line items", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const response = await organizationPurchaseDetail(app, cookie, orgMixed, purchaseMixedRecorded);
        const body = await response.json() as ServiceResponse<PlatformPurchaseInspectionDetailResponse>;

        expect(response.status).toBe(200);
        expect(body.data?.purchase.supplierName).toBe("Fresh Produce Co");
        expect(body.data?.purchase.store).toEqual({ id: storeMixedActive, name: "Front Hall" });
        expect(body.data?.purchase.items).toEqual([
            expect.objectContaining({
                itemName: "Tomatoes",
                lineTotal: 1200,
            }),
        ]);
    });

    test("returns 404 for missing Organization, Purchases, invalid store scope, and future dates", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const missingOrg = await organizationPurchases(app, cookie, missingOrganizationId);
        const missingPurchase = await organizationPurchaseDetail(app, cookie, orgMixed, missingPurchaseId);
        const otherOrgStore = await organizationPurchases(app, cookie, orgActive, `?storeId=${storeMixedActive}`);
        const future = await organizationPurchases(app, cookie, orgMixed, "?startDate=2026-08-21&endDate=2026-08-22");
        const missingOrgBody = await missingOrg.json() as ServiceResponse<null>;
        const missingPurchaseBody = await missingPurchase.json() as ServiceResponse<null>;
        const futureBody = await future.json() as { message: string };

        expect(missingOrg.status).toBe(404);
        expect(missingOrgBody.message).toBe("Organization not found");
        expect(missingPurchase.status).toBe(404);
        expect(missingPurchaseBody.message).toBe("Purchase not found");
        expect(otherOrgStore.status).toBe(404);
        expect(future.status).toBe(400);
        expect(futureBody.message).toBe(FUTURE_BILLING_INSPECTION_DATE_MESSAGE);
        expect(JSON.stringify(missingPurchaseBody)).not.toContain("Fresh Produce Co");
    });
});

describe("Platform WhatsApp inspection API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization WhatsApp metadata only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request(`/platform/organizations/${orgMixed}/whatsapp`)).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}/whatsapp`, { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizationWhatsApp(app, ownerCookie, orgMixed)).status).toBe(401);
    });

    test("returns safe WhatsApp connection and configuration metadata without reusable secrets", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const response = await organizationWhatsApp(app, cookie, orgMixed);
        const body = await response.json() as ServiceResponse<PlatformWhatsAppInspectionResponse>;

        expect(response.status).toBe(200);
        expect(body.data?.accounts).toEqual([{
            id: whatsappAccountMixed,
            provider: "baileys",
            phoneNumber: "+919811122233",
            status: "connected",
            lastConnectedAt: "2026-08-19T10:00:00.000Z",
            lastSeenAt: "2026-08-19T11:00:00.000Z",
            lastErrorCode: null,
            defaultStore: { id: storeMixedActive, name: "Front Hall" },
            assignedStores: [{ id: storeMixedActive, name: "Front Hall" }],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-08-19T11:00:00.000Z",
        }]);
        expect(body.data?.storeConfigs).toEqual([
            {
                store: { id: storeMixedActive, name: "Front Hall" },
                accountId: whatsappAccountMixed,
                accountStatus: "connected",
                templates: [{
                    kind: "bill",
                    name: "Default bill",
                    isActive: true,
                    isDefault: true,
                }],
                messageLinks: [{
                    key: "google_review",
                    label: "Google review",
                    type: "google_review",
                    isActive: true,
                }],
            },
            {
                store: { id: storeMixedQuiet, name: "Garden Patio" },
                accountId: null,
                accountStatus: null,
                templates: [],
                messageLinks: [],
            },
        ]);

        const serialized = JSON.stringify(body.data);
        expect(serialized).not.toContain("sessionReference");
        expect(serialized).not.toContain("encrypted-session-ref-must-not-leak");
        expect(serialized).not.toContain("apiAccessToken");
        expect(serialized).not.toContain("cloud-api-token-must-not-leak");
        expect(serialized).not.toContain("deviceSecret");
        expect(serialized).not.toContain("password");
        expect(serialized).not.toContain("secret-link-token");
        expect(serialized).not.toContain("secret template body");
    });

    test("hides missing Organizations and rejects invalid ids", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const missingOrg = await organizationWhatsApp(app, cookie, missingOrganizationId);
        const invalidOrg = await app.request("/platform/organizations/not-a-uuid/whatsapp", { headers: { cookie } });
        const missingOrgBody = await missingOrg.json() as ServiceResponse<null>;

        expect(missingOrg.status).toBe(404);
        expect(missingOrgBody.message).toBe("Organization not found");
        expect(invalidOrg.status).toBe(400);
        expect(JSON.stringify(missingOrgBody)).not.toContain("Front Hall");
    });
});
