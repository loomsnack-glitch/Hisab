import type { CommercialFeatureListStatusFilter } from "@repo/types";

export const commercialCatalogPath = "/catalog";
export const commercialCatalogModulesPath = "/catalog/modules";
export const commercialCatalogPlansPath = "/catalog/plans";

export const commercialFeaturePath = (featureId: string) => `/catalog/features/${featureId}`;
export const commercialModulePath = (moduleId: string) => `/catalog/modules/${moduleId}`;

export const isCommercialCatalogPath = (pathname: string) =>
    pathname === commercialCatalogPath || pathname.startsWith(`${commercialCatalogPath}/`);

export type CommercialCatalogLocation =
    | { kind: "features" }
    | { kind: "feature"; featureId: string }
    | { kind: "modules" }
    | { kind: "module"; moduleId: string }
    | { kind: "plans" };

export const parseCommercialCatalogPath = (pathname: string): CommercialCatalogLocation => {
    const featureMatch = pathname.match(/^\/catalog\/features\/([^/]+)$/);
    if (featureMatch?.[1]) {
        return { kind: "feature", featureId: featureMatch[1] };
    }
    const moduleMatch = pathname.match(/^\/catalog\/modules\/([^/]+)$/);
    if (moduleMatch?.[1]) {
        return { kind: "module", moduleId: moduleMatch[1] };
    }
    if (pathname === commercialCatalogModulesPath || pathname.startsWith(`${commercialCatalogModulesPath}/`)) {
        return { kind: "modules" };
    }
    if (pathname === commercialCatalogPlansPath || pathname.startsWith(`${commercialCatalogPlansPath}/`)) {
        return { kind: "plans" };
    }
    return { kind: "features" };
};

export type CommercialCatalogListFilters = {
    search?: string;
    status?: CommercialFeatureListStatusFilter;
};

export const parseCommercialCatalogSearch = (search: string): CommercialCatalogListFilters => {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const filters: CommercialCatalogListFilters = {};
    const searchValue = params.get("search")?.trim();
    if (searchValue) filters.search = searchValue;
    const status = params.get("status");
    if (status === "draft" || status === "active" || status === "retired" || status === "discarded" || status === "all") {
        filters.status = status;
    }
    return filters;
};

const listPath = (basePath: string, filters: CommercialCatalogListFilters = {}): string => {
    const params = new URLSearchParams();
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
};

export const commercialCatalogListPath = (filters: CommercialCatalogListFilters = {}): string =>
    listPath(commercialCatalogPath, filters);

export const commercialCatalogModulesListPath = (filters: CommercialCatalogListFilters = {}): string =>
    listPath(commercialCatalogModulesPath, filters);
