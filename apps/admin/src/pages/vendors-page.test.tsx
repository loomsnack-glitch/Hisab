import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { VendorDTO } from "@repo/types";

import { vendorKeys } from "@/lib/query-keys";
import VendorsPage from "@/pages/vendors-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = new Date("2026-08-31T12:00:00.000Z");

const freshFarms: VendorDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "Fresh Farms",
    description: "Daily produce supplier",
    status: "active",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const millers: VendorDTO = {
    id: "22222222-2222-4222-8222-222222222222",
    organizationId,
    name: "Miller Spices",
    description: null,
    status: "inactive",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const renderVendorsPage = (
    result: "pending" | "success" | "error" | "empty" = "success",
    vendors: VendorDTO[] = [freshFarms, millers],
    path = `/organizations/${organizationId}/vendors`,
) => {
    const queryClient = new QueryClient();
    if (result !== "pending") {
        queryClient.setQueryData(vendorKeys.list(organizationId), {
            status: result === "error" ? "error" : "success",
            data: result === "error" ? null : { vendors: result === "empty" ? [] : vendors },
            message: result === "error" ? "Vendors could not be loaded right now." : "Vendors fetched successfully",
            code: result === "error" ? 500 : 200,
        });
    }

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/organizations/:organizationId/vendors" element={<VendorsPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe("Admin Vendors page", () => {
    test("opens the default Vendors tab with search, status, and no delete command", () => {
        const markup = renderVendorsPage();

        expect(markup).toContain("data-testid=\"vendors-page\"");
        expect(markup).toContain("data-testid=\"vendors-directory\"");
        expect(markup).toContain("aria-label=\"Vendors navigation tabs\"");
        expect(markup).toContain("Vendors");
        expect(markup).toContain("Items");
        expect(markup).toContain("Fresh Farms");
        expect(markup).toContain("Daily produce supplier");
        expect(markup).toContain("Miller Spices");
        expect(markup).toContain("Add vendor");
        expect(markup).toContain("Search vendors...");
        expect(markup).toContain("Status");
        expect(markup).toContain("active");
        expect(markup).toContain("inactive");
        expect(markup).toContain("Edit");
        expect(markup).not.toContain("Delete");
        expect(markup).not.toContain("No vendor items yet");
    });

    test("shows a loading spinner while Vendors are fetched", () => {
        const markup = renderVendorsPage("pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("Fresh Farms");
    });

    test("shows an error state when Vendors cannot be loaded", () => {
        const markup = renderVendorsPage("error");

        expect(markup).toContain("Unable to load vendors");
        expect(markup).toContain("Vendors could not be loaded right now.");
        expect(markup).toContain("Try again");
    });

    test("shows an empty state with a create action", () => {
        const markup = renderVendorsPage("empty");

        expect(markup).toContain("No vendors yet");
        expect(markup).toContain("Add vendor");
    });

    test("opens the Items tab without Vendor Item management", () => {
        const markup = renderVendorsPage(
            "success",
            [freshFarms, millers],
            `/organizations/${organizationId}/vendors?tab=items`,
        );

        expect(markup).toContain("data-testid=\"vendor-items-placeholder\"");
        expect(markup).toContain("No vendor items yet");
        expect(markup).not.toContain("Add item");
        expect(markup).not.toContain("Delete");
    });
});
