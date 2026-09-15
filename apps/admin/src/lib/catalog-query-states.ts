import { parseAsArrayOf, parseAsString, parseAsStringLiteral } from "nuqs";

export const CATALOG_STATUSES = ["active", "inactive"] as const;

export type CatalogStatusFilter = (typeof CATALOG_STATUSES)[number];

const searchParser = parseAsString.withDefault("");
const statusListParser = parseAsArrayOf(parseAsStringLiteral(CATALOG_STATUSES));

export const catalogFilterUrlOptions = {
    history: "replace" as const,
    clearOnDefault: true,
};

export const catalogListFilterParsers = {
    search: searchParser,
    statuses: statusListParser.withDefault(["active"]),
};

export const storeCatalogListFilterParsers = {
    ...catalogListFilterParsers,
    orgStatuses: statusListParser.withDefault(["active"]),
};

export const organizationProductListFilterParsers = {
    ...catalogListFilterParsers,
    categoryStatuses: statusListParser.withDefault(["active"]),
};

export const storeProductListFilterParsers = {
    ...storeCatalogListFilterParsers,
    categoryStatuses: statusListParser.withDefault(["active"]),
    orgCategoryStatuses: statusListParser.withDefault(["active"]),
};

export const toggleCatalogStatusFilter = (
    current: readonly CatalogStatusFilter[],
    value: string,
): CatalogStatusFilter[] => {
    const next = value as CatalogStatusFilter;
    return current.includes(next) ? current.filter((item) => item !== next) : [...current, next];
};

export const catalogStatusFilterAllows = (
    status: CatalogStatusFilter,
    filters: readonly CatalogStatusFilter[],
) => filters.length === 0 || filters.includes(status);
