import type {
    PaymentMethod,
    PaymentStatus,
    PlatformBillingInspectionQueryJSON,
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
    }
    | { kind: "invalid"; reason: "missing-organization" | "unknown-section" };

export type BillingInspectionFilters = PlatformBillingInspectionQueryJSON;

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

export const isOrganizationsPath = (pathname: string) =>
    pathname === ORGANIZATIONS_PREFIX || pathname.startsWith(`${ORGANIZATIONS_PREFIX}/`);

export const organizationDirectoryPath = ORGANIZATIONS_PREFIX;

export const organizationInspectionPath = (
    organizationId: string,
    section: OrganizationInspectionSection = "overview",
    resourceId?: string,
    billingFilters?: BillingInspectionFilters,
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
        return `${pathname}${billingInspectionSearchString(billingFilters)}`;
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

    const resourceId = parts[2];
    if (sectionPart === "overview") {
        return { kind: "workspace", organizationId, section: "overview" };
    }

    return resourceId
        ? { kind: "workspace", organizationId, section: sectionPart, resourceId }
        : { kind: "workspace", organizationId, section: sectionPart };
};
