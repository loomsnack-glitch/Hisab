import type { CommercialCatalogRevisionStatus } from "@repo/types";

export const commercialCatalogRevisionStatuses = [
    "draft",
    "active",
    "retired",
    "discarded",
] as const satisfies readonly CommercialCatalogRevisionStatus[];

export const commercialCatalogPath = "/plans";
export const commercialCatalogPlansPath = "/plans/list";
export const commercialCatalogModulesPath = "/plans/modules";
export const commercialCatalogFeaturesPath = "/plans/features";
export const commercialCatalogStorefrontPath = "/plans/storefront";

export const commercialFeaturePath = (featureId: string) => `/plans/features/${featureId}`;
export const commercialModulePath = (moduleId: string) => `/plans/modules/${moduleId}`;
export const commercialPlanPath = (planId: string) => `/plans/list/${planId}`;

export const isCommercialCatalogPath = (pathname: string) =>
    pathname === commercialCatalogPath || pathname.startsWith(`${commercialCatalogPath}/`);

export type CommercialCatalogLocation =
    | { kind: "features" }
    | { kind: "feature"; featureId: string }
    | { kind: "modules" }
    | { kind: "module"; moduleId: string }
    | { kind: "plans" }
    | { kind: "plan"; planId: string }
    | { kind: "storefront" };

export const parseCommercialCatalogPath = (pathname: string): CommercialCatalogLocation => {
    const featureMatch = pathname.match(/^\/plans\/features\/([^/]+)$/);
    if (featureMatch?.[1]) {
        return { kind: "feature", featureId: featureMatch[1] };
    }
    const moduleMatch = pathname.match(/^\/plans\/modules\/([^/]+)$/);
    if (moduleMatch?.[1]) {
        return { kind: "module", moduleId: moduleMatch[1] };
    }
    const planMatch = pathname.match(/^\/plans\/list\/([^/]+)$/);
    if (planMatch?.[1]) {
        return { kind: "plan", planId: planMatch[1] };
    }
    if (pathname === commercialCatalogStorefrontPath || pathname.startsWith(`${commercialCatalogStorefrontPath}/`)) {
        return { kind: "storefront" };
    }
    if (pathname === commercialCatalogModulesPath || pathname.startsWith(`${commercialCatalogModulesPath}/`)) {
        return { kind: "modules" };
    }
    if (pathname === commercialCatalogFeaturesPath || pathname.startsWith(`${commercialCatalogFeaturesPath}/`)) {
        return { kind: "features" };
    }
    return { kind: "plans" };
};

export type CommercialCatalogListFilters = {
    search?: string;
    statuses?: CommercialCatalogRevisionStatus[];
};

const parseStatusValues = (value: string): CommercialCatalogRevisionStatus[] =>
    value
        .split(",")
        .map((part) => part.trim())
        .filter((part): part is CommercialCatalogRevisionStatus =>
            commercialCatalogRevisionStatuses.includes(part as CommercialCatalogRevisionStatus));

export const parseCommercialCatalogSearch = (search: string): CommercialCatalogListFilters => {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const filters: CommercialCatalogListFilters = {};
    const searchValue = params.get("search")?.trim();
    if (searchValue) filters.search = searchValue;
    const statuses = [...new Set(params.getAll("status").flatMap(parseStatusValues))];
    if (statuses.length > 0) filters.statuses = statuses;
    return filters;
};

const listPath = (basePath: string, filters: CommercialCatalogListFilters = {}): string => {
    const params = new URLSearchParams();
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    if (filters.statuses?.length) params.set("status", [...filters.statuses].sort().join(","));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
};

export const commercialCatalogFeaturesListPath = (filters: CommercialCatalogListFilters = {}): string =>
    listPath(commercialCatalogFeaturesPath, filters);

export const commercialCatalogModulesListPath = (filters: CommercialCatalogListFilters = {}): string =>
    listPath(commercialCatalogModulesPath, filters);

export const commercialCatalogPlansListPath = (filters: CommercialCatalogListFilters = {}): string =>
    listPath(commercialCatalogPlansPath, filters);
