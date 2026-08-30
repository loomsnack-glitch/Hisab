import type {
    CreateUnitJSON,
    ServiceResponse,
    UnitResponse,
    UnitsListResponse,
    UpdateUnitJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getUnits = async (
    organizationId: string,
): Promise<ServiceResponse<UnitsListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/units`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getUnit = async (
    organizationId: string,
    unitId: string,
): Promise<ServiceResponse<UnitResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/units/${unitId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createUnit = async (
    organizationId: string,
    data: CreateUnitJSON,
): Promise<ServiceResponse<UnitResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/units`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateUnit = async (
    organizationId: string,
    unitId: string,
    data: UpdateUnitJSON,
): Promise<ServiceResponse<UnitResponse | null>> => {
    try {
        const response = await api.patch(`/organizations/${organizationId}/units/${unitId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
