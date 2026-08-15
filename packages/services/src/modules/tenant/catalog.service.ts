import type {
    AddOnResponse,
    AddOnsListResponse,
    BundleProductResponse,
    ComboProductResponse,
    ComboProductsListResponse,
    CategoriesListResponse,
    CategoryResponse,
    CreateAddOnJSON,
    CreateBundleProductJSON,
    CreateComboProductJSON,
    CreateCategoryJSON,
    CreateLabelTemplateJSON,
    CreateProductAddOnAttachmentJSON,
    CreateProductJSON,
    ProductAddOnAttachmentResponse,
    ProductAddOnAttachmentsListResponse,
    ProductResponse,
    ProductsListResponse,
    ReorderCategoriesJSON,
    ReorderProductsJSON,
    LabelTemplateResponse,
    LabelTemplatesListResponse,
    ServiceResponse,
    UpdateAddOnJSON,
    UpdateBundleProductJSON,
    UpdateComboProductJSON,
    UpdateCategoryJSON,
    UpdateLabelTemplateJSON,
    UpdateProductAddOnAttachmentJSON,
    UpdateProductLabelProfileJSON,
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

export const reorderCategories = async (
    organizationId: string,
    data: ReorderCategoriesJSON,
): Promise<ServiceResponse<null>> => {
    try {
        const response = await api.put(`/organizations/${organizationId}/categories/order`, data);
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

export const getProducts = async (organizationId: string): Promise<ServiceResponse<ProductsListResponse | null>> => {
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

export const reorderProducts = async (
    organizationId: string,
    data: ReorderProductsJSON,
): Promise<ServiceResponse<null>> => {
    try {
        const response = await api.put(`/organizations/${organizationId}/products/order`, data);
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

export const updateProductLabelProfile = async (
    organizationId: string,
    productId: string,
    data: UpdateProductLabelProfileJSON,
): Promise<ServiceResponse<ProductResponse | null>> => {
    try {
        const response = await api.patch(
            `/organizations/${organizationId}/products/${productId}/label-profile`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const generateInternalProductCode = async (
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<ProductResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/products/${productId}/generate-internal-product-code`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const reuseInternalProductCode = async (
    organizationId: string,
    productId: string,
    productCode: string,
): Promise<ServiceResponse<ProductResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/products/${productId}/reuse-internal-product-code`,
            { productCode },
        );
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
        const response = await api.patch(`/organizations/${organizationId}/bundle-products/${productId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createComboProduct = async (
    organizationId: string,
    data: CreateComboProductJSON,
): Promise<ServiceResponse<ComboProductResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/combo-products`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getComboProduct = async (
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<ComboProductResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/combo-products/${productId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getComboProducts = async (
    organizationId: string,
): Promise<ServiceResponse<ComboProductsListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/combo-products`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateComboProduct = async (
    organizationId: string,
    productId: string,
    data: UpdateComboProductJSON,
): Promise<ServiceResponse<ComboProductResponse | null>> => {
    try {
        const response = await api.patch(`/organizations/${organizationId}/combo-products/${productId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getAddOns = async (organizationId: string): Promise<ServiceResponse<AddOnsListResponse | null>> => {
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
        const response = await api.get(`/organizations/${organizationId}/products/${productId}/add-on-attachments`);
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

export const getLabelTemplates = async (
    organizationId: string,
): Promise<ServiceResponse<LabelTemplatesListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/label-templates`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createLabelTemplate = async (
    organizationId: string,
    data: CreateLabelTemplateJSON,
): Promise<ServiceResponse<LabelTemplateResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/label-templates`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getLabelTemplate = async (
    organizationId: string,
    labelTemplateId: string,
): Promise<ServiceResponse<LabelTemplateResponse | null>> => {
    try {
        const response = await api.get(
            `/organizations/${organizationId}/label-templates/${labelTemplateId}`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateLabelTemplate = async (
    organizationId: string,
    labelTemplateId: string,
    data: UpdateLabelTemplateJSON,
): Promise<ServiceResponse<LabelTemplateResponse | null>> => {
    try {
        const response = await api.patch(
            `/organizations/${organizationId}/label-templates/${labelTemplateId}`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const deleteLabelTemplate = async (
    organizationId: string,
    labelTemplateId: string,
): Promise<ServiceResponse<LabelTemplateResponse | null>> => {
    try {
        const response = await api.delete(
            `/organizations/${organizationId}/label-templates/${labelTemplateId}`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
