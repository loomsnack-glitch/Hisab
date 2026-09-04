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
    PlatformCustomerInspectionDetailResponse,
    PlatformCustomerInspectionListResponse,
    PlatformCustomerInspectionQueryJSON,
    PlatformReportInspectionQueryJSON,
    PlatformReportInspectionResponse,
    PlatformBillActivityQueryJSON,
    PlatformBillActivityResponse,
    PlatformTableInspectionDetailResponse,
    PlatformTableInspectionListResponse,
    PlatformTableInspectionQueryJSON,
    PlatformWhatsAppInspectionResponse,
    PlatformSaleInspectionDetailResponse,
    PlatformSaleInspectionListResponse,
    PlatformStoreInspectionQueryJSON,
    PlatformStoreDetailResponse,
    PlatformStoreListResponse,
    ServiceResponse,
    CommercialFeatureDetailResponse,
    CommercialFeatureListQueryJSON,
    CommercialFeatureListResponse,
    CreateCommercialFeatureJSON,
    CreateCommercialFeatureSVC,
    UpdateCommercialFeatureDraftJSON,
    UpdateCommercialFeatureDraftSVC,
    CommercialModuleDetailResponse,
    CommercialModuleListQueryJSON,
    CommercialModuleListResponse,
    CreateCommercialModuleJSON,
    CreateCommercialModuleSVC,
    UpdateCommercialModuleDraftJSON,
    UpdateCommercialModuleDraftSVC,
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

export const getPlatformOrganizationCustomers = async (
    organizationId: string,
    query: PlatformCustomerInspectionQueryJSON = {},
): Promise<ServiceResponse<PlatformCustomerInspectionListResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/customers`, { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationCustomer = async (
    organizationId: string,
    customerId: string,
): Promise<ServiceResponse<PlatformCustomerInspectionDetailResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/customers/${customerId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationReports = async (
    organizationId: string,
    query: PlatformReportInspectionQueryJSON = {},
): Promise<ServiceResponse<PlatformReportInspectionResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/reports`, { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationBillActivity = async (
    organizationId: string,
    query: PlatformBillActivityQueryJSON = {},
): Promise<ServiceResponse<PlatformBillActivityResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/bill-activity`, { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationTables = async (
    organizationId: string,
    query: PlatformTableInspectionQueryJSON = {},
): Promise<ServiceResponse<PlatformTableInspectionListResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/tables`, { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationTable = async (
    organizationId: string,
    tableId: string,
): Promise<ServiceResponse<PlatformTableInspectionDetailResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/tables/${tableId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformOrganizationWhatsApp = async (
    organizationId: string,
): Promise<ServiceResponse<PlatformWhatsAppInspectionResponse | null>> => {
    try {
        const response = await api.get(`/platform/organizations/${organizationId}/whatsapp`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const listCommercialFeatures = async (
    query: CommercialFeatureListQueryJSON = {},
): Promise<ServiceResponse<CommercialFeatureListResponse | null>> => {
    try {
        const response = await api.get("/platform/catalog/features", { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getCommercialFeature = async (
    featureId: string,
): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
    try {
        const response = await api.get(`/platform/catalog/features/${featureId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createCommercialFeature = async (
    data: CreateCommercialFeatureJSON,
): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
    try {
        const response = await api.post("/platform/catalog/features", data as CreateCommercialFeatureSVC);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateCommercialFeatureDraft = async (
    featureId: string,
    revisionId: string,
    data: UpdateCommercialFeatureDraftJSON,
): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
    try {
        const response = await api.patch(
            `/platform/catalog/features/${featureId}/revisions/${revisionId}`,
            data as UpdateCommercialFeatureDraftSVC,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const publishCommercialFeatureRevision = async (
    featureId: string,
    revisionId: string,
): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
    try {
        const response = await api.post(`/platform/catalog/features/${featureId}/revisions/${revisionId}/publish`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const retireCommercialFeatureRevision = async (
    featureId: string,
    revisionId: string,
): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
    try {
        const response = await api.post(`/platform/catalog/features/${featureId}/revisions/${revisionId}/retire`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const discardCommercialFeatureRevision = async (
    featureId: string,
    revisionId: string,
): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
    try {
        const response = await api.post(`/platform/catalog/features/${featureId}/revisions/${revisionId}/discard`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createCommercialFeatureSuccessor = async (
    featureId: string,
    revisionId: string,
): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
    try {
        const response = await api.post(`/platform/catalog/features/${featureId}/revisions/${revisionId}/successor`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const listCommercialModules = async (
    query: CommercialModuleListQueryJSON = {},
): Promise<ServiceResponse<CommercialModuleListResponse | null>> => {
    try {
        const response = await api.get("/platform/catalog/modules", { params: query });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getCommercialModule = async (
    moduleId: string,
): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
    try {
        const response = await api.get(`/platform/catalog/modules/${moduleId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createCommercialModule = async (
    data: CreateCommercialModuleJSON,
): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
    try {
        const response = await api.post("/platform/catalog/modules", data as CreateCommercialModuleSVC);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateCommercialModuleDraft = async (
    moduleId: string,
    revisionId: string,
    data: UpdateCommercialModuleDraftJSON,
): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
    try {
        const response = await api.patch(
            `/platform/catalog/modules/${moduleId}/revisions/${revisionId}`,
            data as UpdateCommercialModuleDraftSVC,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const publishCommercialModuleRevision = async (
    moduleId: string,
    revisionId: string,
): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
    try {
        const response = await api.post(`/platform/catalog/modules/${moduleId}/revisions/${revisionId}/publish`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const retireCommercialModuleRevision = async (
    moduleId: string,
    revisionId: string,
): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
    try {
        const response = await api.post(`/platform/catalog/modules/${moduleId}/revisions/${revisionId}/retire`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const discardCommercialModuleRevision = async (
    moduleId: string,
    revisionId: string,
): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
    try {
        const response = await api.post(`/platform/catalog/modules/${moduleId}/revisions/${revisionId}/discard`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createCommercialModuleSuccessor = async (
    moduleId: string,
    revisionId: string,
): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
    try {
        const response = await api.post(`/platform/catalog/modules/${moduleId}/revisions/${revisionId}/successor`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
