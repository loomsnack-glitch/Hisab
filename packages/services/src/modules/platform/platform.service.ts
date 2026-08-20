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
