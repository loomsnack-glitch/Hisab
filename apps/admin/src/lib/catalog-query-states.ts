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
