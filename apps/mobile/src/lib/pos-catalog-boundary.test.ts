import { describe, expect, it } from "bun:test";
import type {
    CategoriesListResponse,
    ProductsListResponse,
    ServiceResponse,
} from "@repo/types";
import {
    getCategoriesFromResponse,
    getProductsFromResponse,
    filterCatalogProducts,
    posCatalogKeys,
    unwrapCatalogResponse,
} from "./pos-catalog-boundary";

const scope = {
    organizationId: "org-1",
    storeId: "store-1",
    deviceId: "device-1",
};

describe("POS catalog boundary", () => {
    it("scopes Product and Category keys to Organization, Store, and Device", () => {
        expect(posCatalogKeys.products(scope)).toEqual([
            "pos",
            "catalog",
            "products",
            "org-1",
            "store-1",
            "device-1",
        ]);
        expect(posCatalogKeys.categories({ ...scope, storeId: "store-2" })).not.toEqual(
            posCatalogKeys.categories(scope),
        );
        expect(posCatalogKeys.products(null)).toContain(null);
    });

    it("normalizes successful Product and Category responses", () => {
        const productsResponse = {
            status: "success",
            message: "Products loaded",
            code: 200,
            data: { products: [{ id: "product-1" }] },
        } as unknown as ServiceResponse<ProductsListResponse>;
        const categoriesResponse = {
            status: "success",
            message: "Categories loaded",
            code: 200,
            data: { categories: [{ id: "category-1" }] },
        } as unknown as ServiceResponse<CategoriesListResponse>;

        expect(getProductsFromResponse(productsResponse).map((product) => product.id)).toEqual(["product-1"]);
        expect(getCategoriesFromResponse(categoriesResponse).map((category) => category.id)).toEqual(["category-1"]);
    });

    it("turns service error responses into query errors", () => {
        const response = {
            status: "error",
            message: "Catalog unavailable",
            code: 503,
        } as ServiceResponse<null>;

        expect(() => unwrapCatalogResponse(response, "Catalog failed")).toThrow("Catalog unavailable");
    });

    it("filters Products by name/code and Category", () => {
        const products = [
            { id: "product-1", categoryId: "category-1", name: "Masala Tea", productCode: "TEA-1" },
            { id: "product-2", categoryId: "category-2", name: "Samosa", productCode: null },
        ] as unknown as import("@repo/types").ProductResponseDTO[];

        expect(filterCatalogProducts(products, "tea", null).map((product) => product.id)).toEqual(["product-1"]);
        expect(filterCatalogProducts(products, "", "category-2").map((product) => product.id)).toEqual(["product-2"]);
        expect(filterCatalogProducts(products, "tea", "category-2")).toEqual([]);
    });
});
