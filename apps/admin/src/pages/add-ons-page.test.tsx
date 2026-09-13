import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AddOnDTO } from "@repo/types";

import { catalogKeys } from "@/lib/query-keys";
import AddOnsPage from "@/pages/add-ons-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = new Date("2026-09-06T00:00:00.000Z");
const createdBy = "11111111-1111-4111-8111-111111111111";

const extraCheese: AddOnDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "Extra Cheese",
    price: 20,
    discount: 0,
    status: "active",
    createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const retiredMayo: AddOnDTO = {
    ...extraCheese,
    id: "22222222-2222-4222-8222-222222222222",
    name: "Retired Mayo",
    status: "inactive",
};

const searchFromPath = (path: string) => (path.includes("?") ? path.slice(path.indexOf("?")) : "");

const renderAddOns = (path = `/organizations/${organizationId}/products/add-ons`) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(catalogKeys.addOns(organizationId), {
        status: "success",
        data: { addOns: [extraCheese, retiredMayo] },
        message: "Add-ons fetched successfully",
        code: 200,
    });

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <NuqsTestingAdapter searchParams={searchFromPath(path)}>
                <MemoryRouter initialEntries={[path]}>
                    <Routes>
                        <Route path="/organizations/:organizationId/products/add-ons" element={<AddOnsPage />} />
                    </Routes>
                </MemoryRouter>
            </NuqsTestingAdapter>
        </QueryClientProvider>,
    );
};

describe("Organization add-ons page", () => {
    test("defaults to active add-ons and shows a status filter", () => {
        const markup = renderAddOns();

        expect(markup).toContain("Extra Cheese");
        expect(markup).not.toContain("Retired Mayo");
        expect(markup).toContain("Search add-ons...");
        expect(markup).toContain("Status");
        expect(markup).toContain("Add add-on");
    });

    test("reads search and status filters from the URL", () => {
        const markup = renderAddOns(
            `/organizations/${organizationId}/products/add-ons?search=Mayo&statuses=inactive`,
        );

        expect(markup).toContain("value=\"Mayo\"");
        expect(markup).toContain("Retired Mayo");
        expect(markup).not.toContain(">Extra Cheese<");
        expect(markup).toContain("Inactive");
    });
});
