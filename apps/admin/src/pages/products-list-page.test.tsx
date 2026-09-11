import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
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

const renderProducts = () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(catalogKeys.categories(organizationId), {
        status: "success",
        data: { categories: [category] },
        message: "Categories fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(catalogKeys.products(organizationId), {
        status: "success",
        data: { products: [burger, retiredCake] },
        message: "Products fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(catalogKeys.addOns(organizationId), {
        status: "success",
        data: { addOns: [] },
        message: "Add-ons fetched successfully",
        code: 200,
    });

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/products/list",
                element: <ProductsListPage />,
            },
        ],
        { initialEntries: [`/organizations/${organizationId}/products/list`] },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

describe("Organization products page", () => {
    test("lists compact prices and only labels inactive Catalog Products", () => {
        const markup = renderProducts();

        expect(markup).toContain("Burger");
        expect(markup).toContain("Retired Cake");
        expect(markup).toContain("Mark inactive Burger");
        expect(markup).toContain("Mark active Retired Cake");
        expect(markup).toContain("Inactive");
        expect(markup).not.toContain("Org default");
        expect(markup).not.toContain("Save ");
        expect(markup).not.toContain("Effective price");
    });
});
