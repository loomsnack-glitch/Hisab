import type { ServiceResponse, StartStoreTrialResponse, StoreCommercialStatusResponse } from "@repo/types";
import { api, handleApiError } from "../../api";

export const getStoreCommercialStatus = async (
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<StoreCommercialStatusResponse | null>> => {
    try {
        const response = await api.get(
            `/organizations/${organizationId}/stores/${storeId}/commercial`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const startStoreTrial = async (
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<StartStoreTrialResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/stores/${storeId}/commercial/trial`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
