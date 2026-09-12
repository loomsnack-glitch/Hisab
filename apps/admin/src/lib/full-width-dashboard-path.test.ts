import { describe, expect, test } from "bun:test";

import { isFullWidthDashboardPath } from "@/lib/full-width-dashboard-path";

describe("isFullWidthDashboardPath", () => {
    test("uses the full dashboard width for catalog and billing routes", () => {
        expect(
            isFullWidthDashboardPath(
                "/organizations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/products/list",
            ),
        ).toBe(true);
        expect(
            isFullWidthDashboardPath(
                "/organizations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/workspaces/cccccccc-cccc-4ccc-8ccc-cccccccccccc/products",
            ),
        ).toBe(true);
        expect(
            isFullWidthDashboardPath(
                "/organizations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/workspaces/cccccccc-cccc-4ccc-8ccc-cccccccccccc/tables",
            ),
        ).toBe(true);
        expect(
            isFullWidthDashboardPath(
                "/organizations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/billing",
            ),
        ).toBe(true);
        expect(
            isFullWidthDashboardPath(
                "/organizations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/units",
            ),
        ).toBe(true);
    });

    test("keeps the centered container for other organization routes", () => {
        expect(
            isFullWidthDashboardPath(
                "/organizations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/customers",
            ),
        ).toBe(false);
        expect(
            isFullWidthDashboardPath(
                "/organizations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/workspaces/cccccccc-cccc-4ccc-8ccc-cccccccccccc/settings",
            ),
        ).toBe(false);
    });
});
