import type { CommercialFeatureListStatusFilter } from "@repo/types";

export const commercialCatalogPath = "/catalog";

export const commercialFeaturePath = (featureId: string) => `/catalog/features/${featureId}`;

export const isCommercialCatalogPath = (pathname: string) =>
    pathname === commercialCatalogPath || pathname.startsWith(`${commercialCatalogPath}/`);

export type CommercialCatalogLocation =
    | { kind: "features" }
    | { kind: "feature"; featureId: string };

export const parseCommercialCatalogPath = (pathname: string): CommercialCatalogLocation => {
    const match = pathname.match(/^\/catalog\/features\/([^/]+)$/);
    if (match?.[1]) {
        return { kind: "feature", featureId: match[1] };
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

export const commercialCatalogListPath = (filters: CommercialCatalogListFilters = {}): string => {
    const params = new URLSearchParams();
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    const query = params.toString();
    return query ? `${commercialCatalogPath}?${query}` : commercialCatalogPath;
};
