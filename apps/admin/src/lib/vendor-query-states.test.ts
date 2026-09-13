import { describe, expect, test } from "bun:test";

import { getVendorItemsHref } from "@/lib/vendor-query-states";

describe("getVendorItemsHref", () => {
    test("opens Vendor Items with that Vendor preselected", () => {
        expect(
            getVendorItemsHref(
                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "11111111-1111-4111-8111-111111111111",
            ),
        ).toBe(
            "/organizations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/vendors/items?vendorIds=11111111-1111-4111-8111-111111111111",
        );
    });
});
