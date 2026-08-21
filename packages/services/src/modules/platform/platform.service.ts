import type {
    CreateOwnerUserJSON,
    CreateOwnerUserSVC,
    OwnerAuthResponse,
    OwnerLoginJSON,
    OwnerLoginSVC,
    OwnerUserActiveStateJSON,
    OwnerUserListResponse,
    OwnerUserResponse,
    PlatformDashboardQueryJSON,
    PlatformDashboardResponse,
    PlatformEntryResponse,
    PlatformOrganizationDetailQueryJSON,
    PlatformOrganizationDetailResponse,
    PlatformOrganizationListQueryJSON,
    PlatformOrganizationListResponse,
    PlatformBillingInspectionQueryJSON,
    PlatformCatalogAddOnDetailResponse,
    PlatformCatalogCategoryDetailResponse,
    PlatformCatalogInspectionQueryJSON,
    PlatformCatalogListResponse,
    PlatformCatalogProductDetailResponse,
    PlatformSaleInspectionDetailResponse,
    PlatformSaleInspectionListResponse,
    PlatformStoreInspectionQueryJSON,
    PlatformStoreDetailResponse,
    PlatformStoreListResponse,
    ServiceResponse,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const ownerLogin = async (data: OwnerLoginJSON): Promise<ServiceResponse<OwnerAuthResponse | null>> => {
    try {
        const response = await api.post("/platform/auth/login", data as OwnerLoginSVC);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
export const ownerAuthenticate = async (): Promise<ServiceResponse<OwnerAuthResponse | null>> => {
    try {
        const response = await api.get("/platform/auth");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformEntry = async (): Promise<ServiceResponse<PlatformEntryResponse | null>> => {
    try {
        const response = await api.get("/platform/entry");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const ownerLogout = async (): Promise<ServiceResponse<null>> => {
    try {
        const response = await api.post("/platform/auth/logout");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const listOwnerUsers = async (): Promise<ServiceResponse<OwnerUserListResponse | null>> => {
    try {
        const response = await api.get("/platform/owner-users");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createOwnerUser = async (data: CreateOwnerUserJSON): Promise<ServiceResponse<OwnerUserResponse | null>> => {
    try {
        const response = await api.post("/platform/owner-users", data as CreateOwnerUserSVC);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const setOwnerUserActiveState = async (
    ownerUserId: string,
    data: OwnerUserActiveStateJSON,
): Promise<ServiceResponse<OwnerUserResponse | null>> => {
    try {
        const response = await api.patch(`/platform/owner-users/${ownerUserId}/active-state`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformDashboard = async (
    query: PlatformDashboardQueryJSON = {},
): Promise<ServiceResponse<PlatformDashboardResponse | null>> => {
    try {
        const response = await api.get("/platform/dashboard", { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizations = async (
    query: PlatformOrganizationListQueryJSON = {},
): Promise<ServiceResponse<PlatformOrganizationListResponse | null>> => {
    try {
        const response = await api.get("/platform/organizations", { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganization = async (
    organizationId: string,
    query: PlatformOrganizationDetailQueryJSON = {},
): Promise<ServiceResponse<PlatformOrganizationDetailResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}`, { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationStores = async (
    organizationId: string,
    query: PlatformStoreInspectionQueryJSON = {},
): Promise<ServiceResponse<PlatformStoreListResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/stores`, { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformStore = async (
    organizationId: string,
    storeId: string,
    query: PlatformStoreInspectionQueryJSON = {},
): Promise<ServiceResponse<PlatformStoreDetailResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/stores/${storeId}`, { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationSales = async (
    organizationId: string,
    query: PlatformBillingInspectionQueryJSON = {},
): Promise<ServiceResponse<PlatformSaleInspectionListResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/sales`, { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationSale = async (
    organizationId: string,
    saleId: string,
): Promise<ServiceResponse<PlatformSaleInspectionDetailResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/sales/${saleId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationCatalog = async (
    organizationId: string,
    query: PlatformCatalogInspectionQueryJSON = {},
): Promise<ServiceResponse<PlatformCatalogListResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/catalog`, { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationCatalogProduct = async (
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<PlatformCatalogProductDetailResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/catalog/products/${productId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationCatalogCategory = async (
    organizationId: string,
    categoryId: string,
): Promise<ServiceResponse<PlatformCatalogCategoryDetailResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/catalog/categories/${categoryId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationCatalogAddOn = async (
    organizationId: string,
    addOnId: string,
): Promise<ServiceResponse<PlatformCatalogAddOnDetailResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/catalog/add-ons/${addOnId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
