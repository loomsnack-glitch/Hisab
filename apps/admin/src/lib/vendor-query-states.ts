import {
    createSerializer,
    parseAsArrayOf,
    parseAsString,
    parseAsStringLiteral,
} from "nuqs";

const VENDOR_STATUSES = ["active", "inactive"] as const;

const searchParser = parseAsString.withDefault("");
const statusListParser = parseAsArrayOf(parseAsStringLiteral(VENDOR_STATUSES));

export const vendorFilterUrlOptions = {
    history: "replace" as const,
    clearOnDefault: true,
};

export const vendorListFilterParsers = {
    search: searchParser,
    statuses: statusListParser.withDefault(["active"]),
};

export const vendorItemsFilterParsers = {
    search: searchParser,
    statuses: statusListParser.withDefault(["active"]),
    vendorIds: parseAsArrayOf(parseAsString).withDefault([]),
};

const serializeVendorItemsFilters = createSerializer(vendorItemsFilterParsers);

export const getVendorItemsHref = (organizationId: string, vendorId: string) =>
    serializeVendorItemsFilters(`/organizations/${organizationId}/vendors/items`, {
        vendorIds: [vendorId],
    });
