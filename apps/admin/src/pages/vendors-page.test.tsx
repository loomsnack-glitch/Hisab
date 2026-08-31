import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { UnitDTO, VendorDTO, VendorItemDTO } from "@repo/types";

import { unitKeys, purchaseKeys, vendorKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/format";
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

const kilogram: UnitDTO = {
    id: "33333333-3333-4333-8333-333333333333",
    organizationId,
    name: "kilogram",
    label: "kg",
    kind: "predefined",
    predefinedKey: "kilogram",
    status: "active",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const inactiveCrate: UnitDTO = {
    id: "55555555-5555-4555-8555-555555555555",
    organizationId,
    name: "Crate",
    label: "crt",
    kind: "custom",
    predefinedKey: null,
    status: "inactive",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const tomato: VendorItemDTO = {
    id: "44444444-4444-4444-8444-444444444444",
    organizationId,
    vendorId: freshFarms.id,
    name: "Tomato",
    unitId: kilogram.id,
    defaultPurchasePrice: 40.5,
    status: "active",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const millersTomato: VendorItemDTO = {
    id: "66666666-6666-4666-8666-666666666666",
    organizationId,
    vendorId: millers.id,
    name: "Tomato",
    unitId: kilogram.id,
    defaultPurchasePrice: 55,
    status: "active",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const onion: VendorItemDTO = {
    id: "77777777-7777-4777-8777-777777777777",
    organizationId,
    vendorId: freshFarms.id,
    name: "Onion",
    unitId: kilogram.id,
    defaultPurchasePrice: 20,
    status: "inactive",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const cabbage: VendorItemDTO = {
    id: "88888888-8888-4888-8888-888888888888",
    organizationId,
    vendorId: freshFarms.id,
    name: "Cabbage",
    unitId: inactiveCrate.id,
    defaultPurchasePrice: 18,
    status: "active",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const seedVendors = (
    queryClient: QueryClient,
    result: "success" | "error" | "empty",
    vendors: VendorDTO[],
) => {
    queryClient.setQueryData(vendorKeys.list(organizationId), {
        status: result === "error" ? "error" : "success",
        data: result === "error" ? null : { vendors: result === "empty" ? [] : vendors },
        message: result === "error" ? "Vendors could not be loaded right now." : "Vendors fetched successfully",
        code: result === "error" ? 500 : 200,
    });
};

const seedUnits = (queryClient: QueryClient) => {
    queryClient.setQueryData(unitKeys.list(organizationId), {
        status: "success",
        data: { units: [kilogram, inactiveCrate] },
        message: "Units fetched successfully",
        code: 200,
    });
};

const seedItems = (
    queryClient: QueryClient,
    result: "success" | "error" | "empty",
    vendorItems: VendorItemDTO[],
) => {
    queryClient.setQueryData(vendorKeys.items(organizationId), {
        status: result === "error" ? "error" : "success",
        data: result === "error" ? null : { vendorItems: result === "empty" ? [] : vendorItems },
        message: result === "error" ? "Vendor Items could not be loaded right now." : "Vendor Items fetched successfully",
        code: result === "error" ? 500 : 200,
    });
};

const renderVendorsPage = (
    result: "pending" | "success" | "error" | "empty" = "success",
    vendors: VendorDTO[] = [freshFarms, millers],
    path = `/organizations/${organizationId}/vendors`,
    itemsResult: "pending" | "success" | "error" | "empty" = "success",
    vendorItems: VendorItemDTO[] = [tomato, millersTomato, onion, cabbage],
) => {
    const queryClient = new QueryClient();
    if (result !== "pending") {
        seedVendors(queryClient, result, vendors);
        queryClient.setQueryData(purchaseKeys.list(organizationId), {
            status: "success",
            data: {
                purchases: [],
                vendorOutstanding: result === "empty"
                    ? []
                    : [{ vendorId: freshFarms.id, vendorName: freshFarms.name, outstandingAmount: 106.5 }],
            },
            message: "Purchases fetched successfully",
            code: 200,
        });
    }
    if (itemsResult !== "pending") {
        seedItems(queryClient, itemsResult, vendorItems);
        seedUnits(queryClient);
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

const itemsPath = `/organizations/${organizationId}/vendors?tab=items`;

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
        expect(markup).toContain("Outstanding");
        expect(markup).toContain(formatCurrency(106.5));
        expect(markup).toContain("active");
        expect(markup).toContain("inactive");
        expect(markup).toContain("Edit");
        expect(markup).not.toContain("Delete");
        expect(markup).not.toContain("No vendor items yet");
        expect(markup).not.toContain("Add item");
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
});

describe("Admin Vendor Items tab", () => {
    test("groups Vendor Items by Vendor, defaults to active Items, and has no delete command", () => {
        const markup = renderVendorsPage("success", [freshFarms, millers], itemsPath);

        expect(markup).toContain("data-testid=\"vendor-items-catalogue-tab\"");
        expect(markup).toContain("data-testid=\"vendor-items-catalogue\"");
        expect(markup).toContain("data-testid=\"vendor-item-group\"");
        expect(markup).toContain("aria-label=\"Fresh Farms items\"");
        expect(markup).toContain("aria-label=\"Miller Spices items\"");
        expect(markup).toContain("Fresh Farms");
        expect(markup).toContain("Miller Spices");
        expect(markup).toContain("Tomato");
        expect(markup).toContain("Cabbage");
        expect(markup).toContain("kilogram (kg)");
        expect(markup).toContain("Crate (crt, inactive)");
        expect(markup).toContain("Search items...");
        expect(markup).toContain("aria-label=\"Item status\"");
        expect(markup).toContain("Add item");
        expect(markup).toContain("Edit");
        expect(markup).not.toContain("Onion");
        expect(markup).not.toContain("Delete");
        expect(markup).not.toContain("vendor-items-placeholder");
    });

    test("shows a loading spinner while Vendor Items are fetched", () => {
        const markup = renderVendorsPage("success", [freshFarms, millers], itemsPath, "pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("Tomato");
        expect(markup).not.toContain("Add item");
    });

    test("shows an error state when Vendor Items cannot be loaded", () => {
        const markup = renderVendorsPage("success", [freshFarms, millers], itemsPath, "error");

        expect(markup).toContain("Unable to load vendor items");
        expect(markup).toContain("Vendor Items could not be loaded right now.");
        expect(markup).toContain("Try again");
        expect(markup).not.toContain("Delete");
    });

    test("shows an empty state with a create action when Vendors exist", () => {
        const markup = renderVendorsPage("success", [freshFarms, millers], itemsPath, "empty");

        expect(markup).toContain("No vendor items yet");
        expect(markup).toContain("Add item");
        expect(markup).not.toContain("Delete");
    });

    test("keeps inactive-Vendor Items visible when those Items are active", () => {
        const markup = renderVendorsPage(
            "success",
            [freshFarms, millers],
            itemsPath,
            "success",
            [millersTomato],
        );

        expect(markup).toContain("Miller Spices items");
        expect(markup).toContain("Tomato");
        expect(markup).not.toContain("Onion");
    });
});
