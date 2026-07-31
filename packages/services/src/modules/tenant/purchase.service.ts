import type {
    CreatePurchaseJSON,
    PurchaseListQuery,
    PurchaseResponse,
    PurchaseSummaryResponse,
    PurchasesListResponse,
    ServiceResponse,
    UpdatePurchaseJSON,
    VoidPurchaseJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getPurchases = async (
    organizationId: string,
    storeId: string,
    params?: PurchaseListQuery,
): Promise<ServiceResponse<PurchasesListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/purchases`, { params });
        return response.data;
    } catch (error) { return handleApiError(error); }
};

export const getPurchaseSummary = async (
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<PurchaseSummaryResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/purchases/summary`);
        return response.data;
    } catch (error) { return handleApiError(error); }
};

export const getPurchase = async (
    organizationId: string,
    storeId: string,
    purchaseId: string,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/purchases/${purchaseId}`);
        return response.data;
    } catch (error) { return handleApiError(error); }
};

export const createPurchase = async (
    organizationId: string,
    storeId: string,
    data: CreatePurchaseJSON,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/purchases`, data);
        return response.data;
    } catch (error) { return handleApiError(error); }
};

export const updatePurchase = async (
    organizationId: string,
    storeId: string,
    purchaseId: string,
    data: UpdatePurchaseJSON,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.patch(`/organizations/${organizationId}/stores/${storeId}/purchases/${purchaseId}`, data);
        return response.data;
    } catch (error) { return handleApiError(error); }
};

export const voidPurchase = async (
    organizationId: string,
    storeId: string,
    purchaseId: string,
    data: VoidPurchaseJSON,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/purchases/${purchaseId}/void`, data);
        return response.data;
    } catch (error) { return handleApiError(error); }
};
