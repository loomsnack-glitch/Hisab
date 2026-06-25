import type {
    CreateOrganizationJSON,
    CreateStoreDeviceJSON,
    CreateStoreJSON,
    OrganizationDetailsResponse,
    OrganizationResponse,
    OrganizationsListResponse,
    ServiceResponse,
    StoreDeviceResponse,
    StoreDeviceSecretResponse,
    StoreDevicesListResponse,
    StoreResponse,
    StoresListResponse,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getOrganizations = async (): Promise<ServiceResponse<OrganizationsListResponse | null>> => {
    try {
        const response = await api.get("/organizations");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createOrganization = async (
    data: CreateOrganizationJSON,
): Promise<ServiceResponse<OrganizationResponse | null>> => {
    try {
        const response = await api.post("/organizations", data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getOrganizationDetails = async (
    organizationId: string,
): Promise<ServiceResponse<OrganizationDetailsResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getStores = async (
    organizationId: string,
): Promise<ServiceResponse<StoresListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createStore = async (
    organizationId: string,
    data: CreateStoreJSON,
): Promise<ServiceResponse<StoreResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getStoreDevices = async (
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<StoreDevicesListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/devices`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createStoreDevice = async (
    organizationId: string,
    storeId: string,
    data: CreateStoreDeviceJSON,
): Promise<ServiceResponse<StoreDeviceResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/devices`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getStoreDeviceSecret = async (
    organizationId: string,
    storeId: string,
    deviceId: string,
): Promise<ServiceResponse<StoreDeviceSecretResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/devices/${deviceId}/secret`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
