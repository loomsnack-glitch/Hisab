import type {
    CreateDraftPurchaseJSON,
    CreateOutgoingPaymentJSON,
    PurchaseResponse,
    PurchasesListResponse,
    RecordPurchaseJSON,
    ReverseOutgoingPaymentJSON,
    ServiceResponse,
    UpdateDraftPurchaseJSON,
    VoidPurchaseJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getPurchases = async (
    organizationId: string,
): Promise<ServiceResponse<PurchasesListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/purchases`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPurchase = async (
    organizationId: string,
    purchaseId: string,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/purchases/${purchaseId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createDraftPurchase = async (
    organizationId: string,
    data: CreateDraftPurchaseJSON,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/purchases`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateDraftPurchase = async (
    organizationId: string,
    purchaseId: string,
    data: UpdateDraftPurchaseJSON,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.patch(
            `/organizations/${organizationId}/purchases/${purchaseId}`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const discardDraftPurchase = async (
    organizationId: string,
    purchaseId: string,
): Promise<ServiceResponse<{ discarded: true } | null>> => {
    try {
        const response = await api.delete(`/organizations/${organizationId}/purchases/${purchaseId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const recordPurchase = async (
    organizationId: string,
    purchaseId: string,
    data: RecordPurchaseJSON = {},
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/purchases/${purchaseId}/record`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createOutgoingPurchasePayment = async (
    organizationId: string,
    purchaseId: string,
    data: CreateOutgoingPaymentJSON,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/purchases/${purchaseId}/payments`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const reverseOutgoingPurchasePayment = async (
    organizationId: string,
    purchaseId: string,
    paymentId: string,
    data: ReverseOutgoingPaymentJSON,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/purchases/${purchaseId}/payments/${paymentId}/reverse`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const voidPurchase = async (
    organizationId: string,
    purchaseId: string,
    data: VoidPurchaseJSON,
): Promise<ServiceResponse<PurchaseResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/purchases/${purchaseId}/void`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
