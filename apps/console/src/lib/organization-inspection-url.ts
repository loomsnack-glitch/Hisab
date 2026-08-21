import type {
    PaymentMethod,
    PaymentStatus,
    PlatformBillingInspectionQueryJSON,
    PlatformCustomerInspectionQueryJSON,
    PlatformPurchaseInspectionQueryJSON,
    PlatformReportInspectionQueryJSON,
    PlatformTableInspectionQueryJSON,
    SaleStatus,
    SalesSort,
} from "@repo/types";

export const organizationInspectionSections = [
    "overview",
    "stores",
    "catalog",
    "billing",
    "customers",
    "reports",
    "tables",
    "purchases",
    "whatsapp",
] as const;

export type OrganizationInspectionSection = (typeof organizationInspectionSections)[number];

export type OrganizationInspectionLocation =
    | { kind: "directory" }
    | {
        kind: "workspace";
        organizationId: string;
        section: OrganizationInspectionSection;
        resourceId?: string;
        catalogResourceKind?: CatalogResourceKind;
    }
    | { kind: "invalid"; reason: "missing-organization" | "unknown-section" };

export type BillingInspectionFilters = PlatformBillingInspectionQueryJSON;

export type CustomerInspectionFilters = PlatformCustomerInspectionQueryJSON;

export type ReportInspectionFilters = PlatformReportInspectionQueryJSON;

export type TableInspectionFilters = PlatformTableInspectionQueryJSON;

export type PurchaseInspectionFilters = PlatformPurchaseInspectionQueryJSON;

export type CatalogInspectionTab = "products" | "categories" | "add-ons";

export type CatalogResourceKind = CatalogInspectionTab;

export type CatalogInspectionFilters = {
    tab?: CatalogInspectionTab;
    search?: string;
    status?: "all" | "active" | "inactive";
    page?: number;
    limit?: number;
};

const catalogFilterKeys = ["tab", "search", "status", "page", "limit"] as const;

export const parseCatalogInspectionSearch = (search: string): CatalogInspectionFilters => {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const filters: CatalogInspectionFilters = {};

    const tab = params.get("tab");
    if (tab === "products" || tab === "categories" || tab === "add-ons") {
        filters.tab = tab;
    }

    const searchValue = params.get("search")?.trim();
    if (searchValue) filters.search = searchValue;

    const status = params.get("status");
    if (status === "all" || status === "active" || status === "inactive") {
        filters.status = status;
    }

    const page = params.get("page");
    if (page) filters.page = Number(page);

    const limit = params.get("limit");
    if (limit) filters.limit = Number(limit);

    return filters;
};

export const catalogInspectionSearchString = (filters: CatalogInspectionFilters = {}) => {
    const params = new URLSearchParams();
    for (const key of catalogFilterKeys) {
        const value = filters[key];
        if (value === undefined || value === null || value === "") continue;
        params.set(key, String(value));
    }
    const serialized = params.toString();
    return serialized ? `?${serialized}` : "";
};

export const catalogInspectionPath = (
    organizationId: string,
    target:
        | { view: "list"; filters?: CatalogInspectionFilters }
        | { view: "detail"; kind: CatalogResourceKind; id: string; filters?: CatalogInspectionFilters },
) => {
    if (target.view === "detail") {
        return `${ORGANIZATIONS_PREFIX}/${organizationId}/catalog/${target.kind}/${target.id}${catalogInspectionSearchString(target.filters)}`;
    }
    return `${ORGANIZATIONS_PREFIX}/${organizationId}/catalog${catalogInspectionSearchString(target.filters)}`;
};

const ORGANIZATIONS_PREFIX = "/organizations";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isInspectionSection = (value: string): value is OrganizationInspectionSection =>
    (organizationInspectionSections as readonly string[]).includes(value);

const billingFilterKeys = [
    "storeId",
    "status",
    "paymentStatus",
    "paymentMethod",
    "search",
    "startDate",
    "endDate",
    "sort",
    "page",
    "limit",
] as const;

export const parseBillingInspectionSearch = (search: string): BillingInspectionFilters => {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const filters: BillingInspectionFilters = {};

    const storeId = params.get("storeId");
    if (storeId) filters.storeId = storeId;

    const status = params.get("status");
    if (status === "draft" || status === "completed" || status === "voided") {
        filters.status = status satisfies SaleStatus;
    }

    const paymentStatus = params.get("paymentStatus");
    if (paymentStatus === "pending" || paymentStatus === "partial" || paymentStatus === "paid") {
        filters.paymentStatus = paymentStatus satisfies PaymentStatus;
    }

    const paymentMethod = params.get("paymentMethod");
    if (
        paymentMethod === "cash"
        || paymentMethod === "upi"
        || paymentMethod === "card"
        || paymentMethod === "bank_transfer"
        || paymentMethod === "other"
    ) {
        filters.paymentMethod = paymentMethod satisfies PaymentMethod;
    }

    const searchValue = params.get("search")?.trim();
    if (searchValue) filters.search = searchValue;

    const startDate = params.get("startDate");
    if (startDate) filters.startDate = startDate;

    const endDate = params.get("endDate");
    if (endDate) filters.endDate = endDate;

    const sort = params.get("sort");
    if (sort === "newest" || sort === "oldest" || sort === "highest" || sort === "lowest") {
        filters.sort = sort satisfies SalesSort;
    }

    const page = params.get("page");
    if (page) filters.page = Number(page);

    const limit = params.get("limit");
    if (limit) filters.limit = Number(limit);

    return filters;
};

export const billingInspectionSearchString = (filters: BillingInspectionFilters = {}) => {
    const params = new URLSearchParams();
    for (const key of billingFilterKeys) {
        const value = filters[key];
        if (value === undefined || value === null || value === "") continue;
        params.set(key, String(value));
    }
    const serialized = params.toString();
    return serialized ? `?${serialized}` : "";
};

const customerFilterKeys = ["search", "status", "sort", "page", "limit"] as const;

export const parseCustomerInspectionSearch = (search: string): CustomerInspectionFilters => {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const filters: CustomerInspectionFilters = {};

    const searchValue = params.get("search")?.trim();
    if (searchValue) filters.search = searchValue;

    const status = params.get("status");
    if (status === "all" || status === "active" || status === "inactive" || status === "due" || status === "no_due") {
        filters.status = status;
    }

    const sort = params.get("sort");
    if (
        sort === "newest"
        || sort === "oldest"
        || sort === "name_asc"
        || sort === "name_desc"
        || sort === "highest_due"
        || sort === "lowest_due"
    ) {
        filters.sort = sort;
    }

    const page = params.get("page");
    if (page) filters.page = Number(page);

    const limit = params.get("limit");
    if (limit) filters.limit = Number(limit);

    return filters;
};

export const customerInspectionSearchString = (filters: CustomerInspectionFilters = {}) => {
    const params = new URLSearchParams();
    for (const key of customerFilterKeys) {
        const value = filters[key];
        if (value === undefined || value === null || value === "") continue;
        params.set(key, String(value));
    }
    const serialized = params.toString();
    return serialized ? `?${serialized}` : "";
};

const reportFilterKeys = ["storeId", "startDate", "endDate"] as const;

export const parseReportInspectionSearch = (search: string): ReportInspectionFilters => {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const filters: ReportInspectionFilters = {};

    const storeId = params.get("storeId");
    if (storeId) filters.storeId = storeId;

    const startDate = params.get("startDate");
    if (startDate) filters.startDate = startDate;

    const endDate = params.get("endDate");
    if (endDate) filters.endDate = endDate;

    return filters;
};

export const reportInspectionSearchString = (filters: ReportInspectionFilters = {}) => {
    const params = new URLSearchParams();
    for (const key of reportFilterKeys) {
        const value = filters[key];
        if (value === undefined || value === null || value === "") continue;
        params.set(key, String(value));
    }
    const serialized = params.toString();
    return serialized ? `?${serialized}` : "";
};

const tableFilterKeys = ["storeId", "search", "state", "sort", "page", "limit"] as const;

export const parseTableInspectionSearch = (search: string): TableInspectionFilters => {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const filters: TableInspectionFilters = {};

    const storeId = params.get("storeId");
    if (storeId) filters.storeId = storeId;

    const searchValue = params.get("search")?.trim();
    if (searchValue) filters.search = searchValue;

    const state = params.get("state");
    if (
        state === "all"
        || state === "free"
        || state === "allocated"
        || state === "engaged"
        || state === "ready_to_bill"
        || state === "payment_due"
        || state === "paid"
    ) {
        filters.state = state;
    }

    const sort = params.get("sort");
    if (sort === "table_asc" || sort === "table_desc" || sort === "store_asc" || sort === "state") {
        filters.sort = sort;
    }

    const page = params.get("page");
    if (page) filters.page = Number(page);

    const limit = params.get("limit");
    if (limit) filters.limit = Number(limit);

    return filters;
};

export const tableInspectionSearchString = (filters: TableInspectionFilters = {}) => {
    const params = new URLSearchParams();
    for (const key of tableFilterKeys) {
        const value = filters[key];
        if (value === undefined || value === null || value === "") continue;
        params.set(key, String(value));
    }
    const serialized = params.toString();
    return serialized ? `?${serialized}` : "";
};

const purchaseFilterKeys = ["storeId", "search", "status", "startDate", "endDate", "sort", "page", "limit"] as const;

export const parsePurchaseInspectionSearch = (search: string): PurchaseInspectionFilters => {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const filters: PurchaseInspectionFilters = {};

    const storeId = params.get("storeId");
    if (storeId) filters.storeId = storeId;

    const searchValue = params.get("search")?.trim();
    if (searchValue) filters.search = searchValue;

    const status = params.get("status");
    if (status === "all" || status === "recorded" || status === "voided") {
        filters.status = status;
    }

    const startDate = params.get("startDate");
    if (startDate) filters.startDate = startDate;

    const endDate = params.get("endDate");
    if (endDate) filters.endDate = endDate;

    const sort = params.get("sort");
    if (sort === "newest" || sort === "oldest" || sort === "highest" || sort === "lowest") {
        filters.sort = sort;
    }

    const page = params.get("page");
    if (page) filters.page = Number(page);

    const limit = params.get("limit");
    if (limit) filters.limit = Number(limit);

    return filters;
};

export const purchaseInspectionSearchString = (filters: PurchaseInspectionFilters = {}) => {
    const params = new URLSearchParams();
    for (const key of purchaseFilterKeys) {
        const value = filters[key];
        if (value === undefined || value === null || value === "") continue;
        params.set(key, String(value));
    }
    const serialized = params.toString();
    return serialized ? `?${serialized}` : "";
};

export const isOrganizationsPath = (pathname: string) =>
    pathname === ORGANIZATIONS_PREFIX || pathname.startsWith(`${ORGANIZATIONS_PREFIX}/`);

export const organizationDirectoryPath = ORGANIZATIONS_PREFIX;

export const organizationInspectionPath = (
    organizationId: string,
    section: OrganizationInspectionSection = "overview",
    resourceId?: string,
    sectionFilters?: BillingInspectionFilters | CustomerInspectionFilters | ReportInspectionFilters | TableInspectionFilters | PurchaseInspectionFilters,
) => {
    let pathname: string;
    if (section === "overview" && !resourceId) {
        pathname = `${ORGANIZATIONS_PREFIX}/${organizationId}`;
    } else if (resourceId) {
        pathname = `${ORGANIZATIONS_PREFIX}/${organizationId}/${section}/${resourceId}`;
    } else {
        pathname = `${ORGANIZATIONS_PREFIX}/${organizationId}/${section}`;
    }

    if (section === "billing") {
        return `${pathname}${billingInspectionSearchString(sectionFilters as BillingInspectionFilters | undefined)}`;
    }

    if (section === "customers") {
        return `${pathname}${customerInspectionSearchString(sectionFilters as CustomerInspectionFilters | undefined)}`;
    }

    if (section === "reports") {
        return `${pathname}${reportInspectionSearchString(sectionFilters as ReportInspectionFilters | undefined)}`;
    }

    if (section === "tables") {
        return `${pathname}${tableInspectionSearchString(sectionFilters as TableInspectionFilters | undefined)}`;
    }

    if (section === "purchases") {
        return `${pathname}${purchaseInspectionSearchString(sectionFilters as PurchaseInspectionFilters | undefined)}`;
    }

    return pathname;
};

export const parseOrganizationInspectionPath = (pathname: string): OrganizationInspectionLocation | null => {
    if (pathname === ORGANIZATIONS_PREFIX) return { kind: "directory" };
    if (!pathname.startsWith(`${ORGANIZATIONS_PREFIX}/`)) return null;

    const parts = pathname.slice(`${ORGANIZATIONS_PREFIX}/`.length).split("/").filter(Boolean);
    if (parts.length === 0) return { kind: "directory" };

    const organizationId = parts[0] ?? "";
    if (!UUID_PATTERN.test(organizationId)) {
        return { kind: "invalid", reason: "missing-organization" };
    }

    if (parts.length === 1) {
        return { kind: "workspace", organizationId, section: "overview" };
    }

    const sectionPart = parts[1] ?? "";
    if (!isInspectionSection(sectionPart)) {
        return { kind: "invalid", reason: "unknown-section" };
    }

    if (sectionPart === "catalog") {
        const catalogKind = parts[2];
        const catalogResourceId = parts[3];
        if (
            catalogKind === "products"
            || catalogKind === "categories"
            || catalogKind === "add-ons"
        ) {
            if (!catalogResourceId) {
                return { kind: "workspace", organizationId, section: "catalog" };
            }
            return {
                kind: "workspace",
                organizationId,
                section: "catalog",
                catalogResourceKind: catalogKind,
                resourceId: catalogResourceId,
            };
        }
        return { kind: "workspace", organizationId, section: "catalog" };
    }

    const resourceId = parts[2];
    if (sectionPart === "overview") {
        return { kind: "workspace", organizationId, section: "overview" };
    }

    return resourceId
        ? { kind: "workspace", organizationId, section: sectionPart, resourceId }
        : { kind: "workspace", organizationId, section: sectionPart };
};
