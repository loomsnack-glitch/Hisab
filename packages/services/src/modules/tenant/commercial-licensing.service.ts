import type {
    ConsoleStoreCommercialInspectionResponse,
    CoTermAddOnCheckoutResponse,
    CreateCommercialRefundAndRevocationJSON,
    CreateCoTermAddOnCheckoutJSON,
    CreatePaidPlanCheckoutJSON,
    CreateStoreAccessGrantJSON,
    PaidPlanCheckoutResponse,
    ServiceResponse,
    StartStoreTrialResponse,
    StoreCommercialStatusResponse,
} from "@repo/types";
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

export const createPaidPlanCheckout = async (
    organizationId: string,
    storeId: string,
    data: CreatePaidPlanCheckoutJSON,
): Promise<ServiceResponse<PaidPlanCheckoutResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/stores/${storeId}/commercial/checkout`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createCoTermAddOnCheckout = async (
    organizationId: string,
    storeId: string,
    data: CreateCoTermAddOnCheckoutJSON,
): Promise<ServiceResponse<CoTermAddOnCheckoutResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/stores/${storeId}/commercial/checkout/add-on`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPlatformStoreCommercialStatus = async (
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<ConsoleStoreCommercialInspectionResponse | null>> => {
    try {
        const response = await api.get(
            `/platform/organizations/${organizationId}/stores/${storeId}/commercial`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createStoreAccessGrant = async (
    organizationId: string,
    storeId: string,
    data: CreateStoreAccessGrantJSON,
): Promise<ServiceResponse<ConsoleStoreCommercialInspectionResponse | null>> => {
    try {
        const response = await api.post(
            `/platform/organizations/${organizationId}/stores/${storeId}/commercial/grants`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const refundAndRevokeLicense = async (
    organizationId: string,
    storeId: string,
    data: CreateCommercialRefundAndRevocationJSON,
): Promise<ServiceResponse<ConsoleStoreCommercialInspectionResponse | null>> => {
    try {
        const response = await api.post(
            `/platform/organizations/${organizationId}/stores/${storeId}/commercial/refunds`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
