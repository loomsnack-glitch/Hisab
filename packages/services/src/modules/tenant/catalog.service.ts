import type {
    AddOnResponse,
    AddOnsListResponse,
    BundleProductResponse,
    CategoriesListResponse,
    CategoryResponse,
    CreateAddOnJSON,
    CreateBundleProductJSON,
    CreateCategoryJSON,
    CreateProductAddOnAttachmentJSON,
    CreateProductJSON,
    ProductAddOnAttachmentResponse,
    ProductAddOnAttachmentsListResponse,
    ProductResponse,
    ProductsListResponse,
    ServiceResponse,
    UpdateAddOnJSON,
    UpdateBundleProductJSON,
    UpdateCategoryJSON,
    UpdateProductAddOnAttachmentJSON,
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

export const createBundleProduct = async (
    organizationId: string,
    data: CreateBundleProductJSON,
): Promise<ServiceResponse<BundleProductResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/bundle-products`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getBundleProduct = async (
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<BundleProductResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/bundle-products/${productId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateBundleProduct = async (
    organizationId: string,
    productId: string,
    data: UpdateBundleProductJSON,
): Promise<ServiceResponse<BundleProductResponse | null>> => {
    try {
        const response = await api.patch(
            `/organizations/${organizationId}/bundle-products/${productId}`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getAddOns = async (
    organizationId: string,
): Promise<ServiceResponse<AddOnsListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/add-ons`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createAddOn = async (
    organizationId: string,
    data: CreateAddOnJSON,
): Promise<ServiceResponse<AddOnResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/add-ons`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getAddOn = async (
    organizationId: string,
    addOnId: string,
): Promise<ServiceResponse<AddOnResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/add-ons/${addOnId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateAddOn = async (
    organizationId: string,
    addOnId: string,
    data: UpdateAddOnJSON,
): Promise<ServiceResponse<AddOnResponse | null>> => {
    try {
        const response = await api.patch(`/organizations/${organizationId}/add-ons/${addOnId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const deleteAddOn = async (
    organizationId: string,
    addOnId: string,
): Promise<ServiceResponse<AddOnResponse | null>> => {
    try {
        const response = await api.delete(`/organizations/${organizationId}/add-ons/${addOnId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getProductAddOnAttachments = async (
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<ProductAddOnAttachmentsListResponse | null>> => {
    try {
        const response = await api.get(
            `/organizations/${organizationId}/products/${productId}/add-on-attachments`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createProductAddOnAttachment = async (
    organizationId: string,
    productId: string,
    data: CreateProductAddOnAttachmentJSON,
): Promise<ServiceResponse<ProductAddOnAttachmentResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/products/${productId}/add-on-attachments`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateProductAddOnAttachment = async (
    organizationId: string,
    productId: string,
    attachmentId: string,
    data: UpdateProductAddOnAttachmentJSON,
): Promise<ServiceResponse<ProductAddOnAttachmentResponse | null>> => {
    try {
        const response = await api.patch(
            `/organizations/${organizationId}/products/${productId}/add-on-attachments/${attachmentId}`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const deleteProductAddOnAttachment = async (
    organizationId: string,
    productId: string,
    attachmentId: string,
): Promise<ServiceResponse<ProductAddOnAttachmentResponse | null>> => {
    try {
        const response = await api.delete(
            `/organizations/${organizationId}/products/${productId}/add-on-attachments/${attachmentId}`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
