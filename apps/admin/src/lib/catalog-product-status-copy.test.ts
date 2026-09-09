import { describe, expect, test } from "bun:test";

import {
    bulkCatalogProductStatusChangedMessage,
    catalogProductStatusChangedMessage,
    catalogProductStatusLabel,
    markCatalogProductStatusLabel,
} from "@/lib/catalog-product-status-copy";

describe("catalog product status copy", () => {
    test("uses Active and Inactive for status labels and actions", () => {
        expect(catalogProductStatusLabel("inactive")).toBe("Inactive");
        expect(markCatalogProductStatusLabel("inactive")).toBe("Mark inactive");
        expect(catalogProductStatusChangedMessage("Burger", "inactive")).toBe("Burger is now inactive");
        expect(bulkCatalogProductStatusChangedMessage(2, "inactive")).toBe("2 products are now inactive");
    });
});
