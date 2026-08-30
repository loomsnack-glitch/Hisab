import type {
    CreateVendorJSON,
    ServiceResponse,
    VendorResponse,
    VendorsListResponse,
    UpdateVendorJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getVendors = async (
    organizationId: string,
): Promise<ServiceResponse<VendorsListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/vendors`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getVendor = async (
    organizationId: string,
    vendorId: string,
): Promise<ServiceResponse<VendorResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/vendors/${vendorId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createVendor = async (
    organizationId: string,
    data: CreateVendorJSON,
): Promise<ServiceResponse<VendorResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/vendors`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateVendor = async (
    organizationId: string,
    vendorId: string,
    data: UpdateVendorJSON,
): Promise<ServiceResponse<VendorResponse | null>> => {
    try {
        const response = await api.patch(`/organizations/${organizationId}/vendors/${vendorId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
