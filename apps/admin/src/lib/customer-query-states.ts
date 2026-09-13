import { parseAsArrayOf, parseAsString, parseAsStringLiteral } from "nuqs";

const CUSTOMER_STATUSES = ["active", "inactive"] as const;
const CUSTOMER_DUES = ["has_due", "no_due"] as const;
const CUSTOMER_SORTS = [
    "newest",
    "oldest",
    "name_asc",
    "name_desc",
    "highest_due",
    "lowest_due",
] as const;

const searchParser = parseAsString.withDefault("");

export const customerFilterUrlOptions = {
    history: "replace" as const,
    clearOnDefault: true,
};

export const customerListFilterParsers = {
    search: searchParser,
    statuses: parseAsArrayOf(parseAsStringLiteral(CUSTOMER_STATUSES)).withDefault(["active"]),
    dues: parseAsArrayOf(parseAsStringLiteral(CUSTOMER_DUES)).withDefault([]),
    sort: parseAsStringLiteral(CUSTOMER_SORTS).withDefault("newest"),
};
