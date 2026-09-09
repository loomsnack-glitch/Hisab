import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { ProductResponseDTO, StoreDTO, StoreProductOfferingResponseDTO, StoreWithDevicesDTO } from "@repo/types";

import { catalogKeys, organizationKeys } from "@/lib/query-keys";
import { getStoreProductsPath } from "@/lib/store-workspace-routes";
import StoreProductOfferingsPage from "@/pages/store-product-offerings-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const adajanId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const vesuId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const productId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const inactiveProductId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const orgInactiveProductId = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const offeringId = "ffffffff-ffff-4fff-4fff-ffffffffffff";
const inactiveOfferingId = "aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbbb";
const orgInactiveOfferingId = "cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa";
const now = new Date("2026-09-06T00:00:00.000Z");

const adajan: StoreWithDevicesDTO = {
    id: adajanId,
    organizationId,
    name: "Adajan",
    address: "Ring Road",
    reviewPlatform: null,
    reviewLink: null,
    socialMediaName: null,
    socialMediaLink: null,
    whatsappLinks: [],
    kotSystemEnabled: false,
    tableManagementEnabled: false,
    moneyAccountTrackingEnabled: false,
    devices: [],
    createdBy: "11111111-1111-4111-8111-111111111111",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const product: ProductResponseDTO = {
    id: productId,
    organizationId,
    categoryId: "11111111-1111-4111-8111-111111111111",
    name: "Burger",
    sortOrder: 0,
    price: 100,
    discount: 10,
    imagePath: null,
    productType: "single",
    productCode: null,
    productCodeKind: null,
    unitId: "98989898-9898-4989-8989-989898989898",
    defaultSellingQuantity: 1,
    allowCustomSellingQuantity: false,
    unitLabel: "pc",
    status: "active",
    createdBy: adajan.createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    imageSignedUrl: null,
    labelProfile: null,
};

const category = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "Mains",
    sortOrder: 0,
    status: "active" as const,
    createdBy: adajan.createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const inactiveProduct: ProductResponseDTO = {
    ...product,
    id: inactiveProductId,
    name: "Seasonal Wrap",
};

const orgInactiveProduct: ProductResponseDTO = {
    ...product,
    id: orgInactiveProductId,
    name: "Retired Cake",
    status: "inactive",
};

const offering: StoreProductOfferingResponseDTO = {
    id: offeringId,
    organizationId,
    storeId: adajanId,
    productId,
    priceOverride: 25,
    discountOverride: null,
    effectivePrice: 135,
    effectiveDiscount: 5,
    isPriceInherited: false,
    isDiscountInherited: true,
    price: 135,
    discount: 5,
    status: "active",
    createdBy: adajan.createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    product,
};

const inactiveOffering: StoreProductOfferingResponseDTO = {
    ...offering,
    id: inactiveOfferingId,
    productId: inactiveProductId,
    priceOverride: null,
    discountOverride: null,
    effectivePrice: inactiveProduct.price,
    effectiveDiscount: inactiveProduct.discount,
    isPriceInherited: true,
    isDiscountInherited: true,
    price: inactiveProduct.price,
    discount: inactiveProduct.discount,
    status: "inactive",
    product: inactiveProduct,
};

const orgInactiveOffering: StoreProductOfferingResponseDTO = {
    ...offering,
    id: orgInactiveOfferingId,
    productId: orgInactiveProductId,
    priceOverride: null,
    discountOverride: null,
    effectivePrice: orgInactiveProduct.price,
    effectiveDiscount: orgInactiveProduct.discount,
    isPriceInherited: true,
    isDiscountInherited: true,
    price: orgInactiveProduct.price,
    discount: orgInactiveProduct.discount,
    status: "active",
    product: orgInactiveProduct,
};

const organizationResponse = {
    status: "success" as const,
    data: {
        organization: {
            id: organizationId,
            name: "Panini House",
            username: "panini_house",
            tagline: null,
            createdBy: adajan.createdBy,
            updatedBy: null,
            createdAt: now,
            updatedAt: now,
            stores: [adajan],
        },
    },
    message: "Organization fetched successfully",
    code: 200,
};

const storeResponse = (store: StoreDTO) => ({
    status: "success" as const,
    data: { store },
    message: "Store fetched successfully",
    code: 200,
});

const renderProducts = () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(organizationKeys.detail(organizationId), organizationResponse);
    queryClient.setQueryData(organizationKeys.store(organizationId, adajanId), storeResponse(adajan));
    queryClient.setQueryData(catalogKeys.storeProductOfferings(organizationId, adajanId), {
        status: "success",
        data: { offerings: [offering, inactiveOffering, orgInactiveOffering] },
        message: "Store Product Offerings fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(catalogKeys.categories(organizationId), {
        status: "success",
        data: { categories: [category] },
        message: "Categories fetched successfully",
        code: 200,
    });

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/workspaces/:storeId/products",
                element: <StoreProductOfferingsPage />,
            },
        ],
        { initialEntries: [getStoreProductsPath(organizationId, adajanId)] },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

describe("Store Products page", () => {
    test("lists every Organization Catalog Product with this Store's price and status", () => {
        const markup = renderProducts();

        expect(markup).toContain("Products");
        expect(markup).toContain("Burger");
        expect(markup).toContain("Seasonal Wrap");
        expect(markup).toContain("Retired Cake");
        expect(markup).toContain("Search products...");
        expect(markup).toContain("Mains");
        expect(markup).toContain("Inactive");
        expect(markup).toContain("Inactive in org");
        expect(markup).toContain("Edit Store price for Burger");
        expect(markup).toContain("Mark inactive Burger");
        expect(markup).toContain("Mark active Seasonal Wrap");
        expect(markup).toContain("Store price");
        expect(markup).not.toContain("Effective price");
        expect(markup).not.toContain("Inherits Organization defaults");
        expect(markup).not.toContain("Price overridden");
        expect(markup).not.toContain("Save ");
        expect(markup).not.toContain("Org default");
        expect(markup).not.toContain("Add product");
        expect(markup).not.toContain("Add Combo");
        expect(markup).not.toContain("Reorder");
        expect(markup).not.toContain("Remove");
        expect(markup).not.toContain("Add catalog product");
        expect(markup).not.toContain("Create product");
        expect(markup).not.toContain("Add vendor");
        expect(markup).not.toContain(vesuId);
    });

    test("registers a Store workspace products route without replacing Organization catalog routes", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");

        expect(appSource).toContain(
            'path="/organizations/:organizationId/workspaces/:storeId/products"',
        );
        expect(appSource).toContain('path="/organizations/:organizationId/workspaces/:storeId"');
        expect(appSource).toContain('path="/organizations/:organizationId/products"');
    });
});
