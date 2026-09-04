import type {
    CategoriesListResponse,
    ProductsListResponse,
    ServiceResponse,
} from "@repo/types";

export type PosCatalogScope = {
    organizationId: string;
    storeId: string;
    deviceId: string;
};

export const posCatalogKeys = {
    all: ["pos", "catalog"] as const,
    categories: (scope: PosCatalogScope | null) =>
        [...posCatalogKeys.all, "categories", scope?.organizationId ?? null, scope?.storeId ?? null, scope?.deviceId ?? null] as const,
    products: (scope: PosCatalogScope | null) =>
        [...posCatalogKeys.all, "products", scope?.organizationId ?? null, scope?.storeId ?? null, scope?.deviceId ?? null] as const,
};

export const unwrapCatalogResponse = <T>(
    response: ServiceResponse<T | null>,
    fallbackMessage: string,
): T => {
    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || fallbackMessage);
    }

    return response.data;
};

export const getCategoriesFromResponse = (
    response: ServiceResponse<CategoriesListResponse | null>,
) => (response.status === "success" ? response.data?.categories ?? [] : []);

export const getProductsFromResponse = (
    response: ServiceResponse<ProductsListResponse | null>,
) => (response.status === "success" ? response.data?.products ?? [] : []);
