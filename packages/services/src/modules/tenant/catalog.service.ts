import type {
    CategoriesListResponse,
    CategoryResponse,
    CreateCategoryJSON,
    CreateProductJSON,
    ProductResponse,
    ProductsListResponse,
    ServiceResponse,
    UpdateCategoryJSON,
    UpdateProductJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getCategories = async (
    organizationId: string,
): Promise<ServiceResponse<CategoriesListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/categories`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createCategory = async (
    organizationId: string,
    data: CreateCategoryJSON,
): Promise<ServiceResponse<CategoryResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/categories`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getCategory = async (
    organizationId: string,
    categoryId: string,
): Promise<ServiceResponse<CategoryResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/categories/${categoryId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateCategory = async (
    organizationId: string,
    categoryId: string,
    data: UpdateCategoryJSON,
): Promise<ServiceResponse<CategoryResponse | null>> => {
    try {
        const response = await api.patch(`/organizations/${organizationId}/categories/${categoryId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const deleteCategory = async (
    organizationId: string,
    categoryId: string,
): Promise<ServiceResponse<CategoryResponse | null>> => {
    try {
        const response = await api.delete(`/organizations/${organizationId}/categories/${categoryId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getProducts = async (
    organizationId: string,
): Promise<ServiceResponse<ProductsListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/products`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getCategoryProducts = async (
    organizationId: string,
    categoryId: string,
): Promise<ServiceResponse<ProductsListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/categories/${categoryId}/products`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createProduct = async (
    organizationId: string,
    data: CreateProductJSON,
): Promise<ServiceResponse<ProductResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/products`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getProduct = async (
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<ProductResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/products/${productId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateProduct = async (
    organizationId: string,
    productId: string,
    data: UpdateProductJSON,
): Promise<ServiceResponse<ProductResponse | null>> => {
    try {
        const response = await api.patch(`/organizations/${organizationId}/products/${productId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const deleteProduct = async (
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<ProductResponse | null>> => {
    try {
        const response = await api.delete(`/organizations/${organizationId}/products/${productId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
