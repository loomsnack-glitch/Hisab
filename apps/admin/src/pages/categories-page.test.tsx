import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { CategoryDTO } from "@repo/types";

import { catalogKeys } from "@/lib/query-keys";
import CategoriesPage from "@/pages/categories-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = new Date("2026-09-06T00:00:00.000Z");
const createdBy = "11111111-1111-4111-8111-111111111111";

const mains: CategoryDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "Mains",
    sortOrder: 0,
    status: "active",
    createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const archived: CategoryDTO = {
    ...mains,
    id: "22222222-2222-4222-8222-222222222222",
    name: "Archived Sides",
    sortOrder: 1,
    status: "inactive",
};

const searchFromPath = (path: string) => (path.includes("?") ? path.slice(path.indexOf("?")) : "");

const renderCategories = (path = `/organizations/${organizationId}/products/categories`) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(catalogKeys.categories(organizationId), {
        status: "success",
        data: { categories: [mains, archived] },
        message: "Categories fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(catalogKeys.products(organizationId), {
        status: "success",
        data: { products: [] },
        message: "Products fetched successfully",
        code: 200,
    });

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <NuqsTestingAdapter searchParams={searchFromPath(path)}>
                <MemoryRouter initialEntries={[path]}>
                    <Routes>
                        <Route path="/organizations/:organizationId/products/categories" element={<CategoriesPage />} />
                    </Routes>
                </MemoryRouter>
            </NuqsTestingAdapter>
        </QueryClientProvider>,
    );
};

describe("Organization categories page", () => {
    test("defaults to active categories and shows a status filter", () => {
        const markup = renderCategories();

        expect(markup).toContain("Mains");
        expect(markup).not.toContain("Archived Sides");
        expect(markup).toContain("Search categories...");
        expect(markup).toContain("Status");
        expect(markup).toContain("Add category");
    });

    test("reads search and status filters from the URL", () => {
        const markup = renderCategories(
            `/organizations/${organizationId}/products/categories?search=Archived&statuses=inactive`,
        );

        expect(markup).toContain("value=\"Archived\"");
        expect(markup).toContain("Archived Sides");
        expect(markup).not.toContain(">Mains<");
        expect(markup).toContain("inactive");
    });
});
