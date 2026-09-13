import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import StoreVendorAvailabilitiesPage from "@/pages/store-vendor-availabilities-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("StoreVendorAvailabilitiesPage", () => {
    test("renders under development state", () => {
        const markup = renderToStaticMarkup(
            <MemoryRouter
                initialEntries={[`/organizations/${organizationId}/workspaces/${storeId}/vendors`]}
            >
                <Routes>
                    <Route
                        path="/organizations/:organizationId/workspaces/:storeId/vendors"
                        element={<StoreVendorAvailabilitiesPage />}
                    />
                </Routes>
            </MemoryRouter>,
        );

        expect(markup).toContain("data-testid=\"store-vendor-availabilities-page\"");
        expect(markup).toContain("data-testid=\"under-development\"");
        expect(markup).toContain("Vendors");
        expect(markup).toContain("Coming soon");
    });
});
