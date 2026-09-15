import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ProductResponseDTO } from "@repo/types";

import { catalogKeys } from "@/lib/query-keys";
import ProductsListPage from "@/pages/products-list-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = new Date("2026-09-06T00:00:00.000Z");
const createdBy = "11111111-1111-4111-8111-111111111111";
const categoryId = "11111111-1111-4111-8111-111111111111";

const category = {
    id: categoryId,
    organizationId,
    name: "Mains",
    sortOrder: 0,
    status: "active" as const,
    createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const inactiveCategoryId = "22222222-2222-4222-8222-222222222222";

const inactiveCategory = {
    ...category,
    id: inactiveCategoryId,
    name: "Archive",
    sortOrder: 1,
    status: "inactive" as const,
};

const burger: ProductResponseDTO = {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    organizationId,
    categoryId,
    name: "Burger",
    sortOrder: 0,
    price: 80,
    discount: 20,
    imagePath: null,
    productType: "single",
    productCode: null,
    productCodeKind: null,
    unitId: "98989898-9898-4989-8989-989898989898",
    defaultSellingQuantity: 1,
    allowCustomSellingQuantity: false,
    unitLabel: "pc",
    status: "active",
    createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    imageSignedUrl: null,
    labelProfile: null,
};

const retiredCake: ProductResponseDTO = {
    ...burger,
    id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
    name: "Retired Cake",
    status: "inactive",
};

const archivedSoup: ProductResponseDTO = {
    ...burger,
    id: "cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa",
    categoryId: inactiveCategoryId,
    name: "Old Soup",
};

const searchFromPath = (path: string) => (path.includes("?") ? path.slice(path.indexOf("?")) : "");

const renderProducts = (path = `/organizations/${organizationId}/products/list`) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(catalogKeys.categories(organizationId), {
        status: "success",
        data: { categories: [category, inactiveCategory] },
        message: "Categories fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(catalogKeys.products(organizationId), {
        status: "success",
        data: { products: [burger, retiredCake, archivedSoup] },
        message: "Products fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(catalogKeys.addOns(organizationId), {
        status: "success",
        data: { addOns: [] },
        message: "Add-ons fetched successfully",
        code: 200,
    });

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <NuqsTestingAdapter searchParams={searchFromPath(path)}>
                <MemoryRouter initialEntries={[path]}>
                    <Routes>
                        <Route path="/organizations/:organizationId/products/list" element={<ProductsListPage />} />
                    </Routes>
                </MemoryRouter>
            </NuqsTestingAdapter>
        </QueryClientProvider>,
    );
};

describe("Organization products page", () => {
    test("defaults to active Catalog Products and compact prices", () => {
        const markup = renderProducts();

        expect(markup).toContain("Burger");
        expect(markup).not.toContain("Retired Cake");
        expect(markup).toContain('aria-label="Edit Burger"');
        expect(markup).toContain("Search products...");
        expect(markup).toContain("Status");
        expect(markup).toContain("Category status");
        expect(markup).toContain("Mains");
        expect(markup).not.toContain("Archive");
        expect(markup).not.toContain("Old Soup");
        expect(markup).not.toContain("Org default");
        expect(markup).not.toContain("Save ");
        expect(markup).not.toContain("Effective price");
    });

    test("reads search and status filters from the URL", () => {
        const markup = renderProducts(
            `/organizations/${organizationId}/products/list?search=Cake&statuses=inactive`,
        );

        expect(markup).toContain("value=\"Cake\"");
        expect(markup).toContain("Retired Cake");
        expect(markup).not.toContain(">Burger<");
        expect(markup).toContain("Inactive");
        expect(markup).toContain('aria-label="Edit Retired Cake"');
        expect(markup).not.toContain("Mark inactive Burger");
        expect(markup).not.toContain("Mark active Retired Cake");
    });

    test("hides inactive categories by default and shows them struck through when inactive category status is selected", () => {
        const markup = renderProducts(
            `/organizations/${organizationId}/products/list?categoryStatuses=inactive`,
        );

        expect(markup).toContain("Archive");
        expect(markup).toContain("line-through");
        expect(markup).toContain("Old Soup");
        expect(markup).not.toContain("Mains");
        expect(markup).not.toContain(">Burger<");
        expect(markup).not.toContain("Retired Cake");
    });
});
