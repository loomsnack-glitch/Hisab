import type {
    CreateMoneyAccountJSON,
    MoneyAccountHistoryQuery,
    MoneyAccountHistoryResponse,
    MoneyAccountPaymentRouteMethod,
    MoneyAccountPaymentRouteResponse,
    MoneyAccountPaymentRoutesResponse,
    MoneyAccountResponse,
    MoneyAccountsListResponse,
    RecordManualMoneyMovementJSON,
    ServiceResponse,
    UpdateMoneyAccountJSON,
    UpsertMoneyAccountPaymentRouteJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getMoneyAccounts = async (
    organizationId: string,
): Promise<ServiceResponse<MoneyAccountsListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/money-accounts`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getMoneyAccount = async (
    organizationId: string,
    moneyAccountId: string,
): Promise<ServiceResponse<MoneyAccountResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/money-accounts/${moneyAccountId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createMoneyAccount = async (
    organizationId: string,
    data: CreateMoneyAccountJSON,
): Promise<ServiceResponse<MoneyAccountResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/money-accounts`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateMoneyAccount = async (
    organizationId: string,
    moneyAccountId: string,
    data: UpdateMoneyAccountJSON,
): Promise<ServiceResponse<MoneyAccountResponse | null>> => {
    try {
        const response = await api.patch(
            `/organizations/${organizationId}/money-accounts/${moneyAccountId}`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getMoneyAccountPaymentRoutes = async (
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<MoneyAccountPaymentRoutesResponse | null>> => {
    try {
        const response = await api.get(
            `/organizations/${organizationId}/stores/${storeId}/money-account-payment-routes`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const upsertMoneyAccountPaymentRoute = async (
    organizationId: string,
    storeId: string,
    data: UpsertMoneyAccountPaymentRouteJSON,
): Promise<ServiceResponse<MoneyAccountPaymentRouteResponse | null>> => {
    try {
        const response = await api.put(
            `/organizations/${organizationId}/stores/${storeId}/money-account-payment-routes`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const clearMoneyAccountPaymentRoute = async (
    organizationId: string,
    storeId: string,
    paymentMethod: MoneyAccountPaymentRouteMethod,
): Promise<ServiceResponse<MoneyAccountPaymentRoutesResponse | null>> => {
    try {
        const response = await api.delete(
            `/organizations/${organizationId}/stores/${storeId}/money-account-payment-routes/${paymentMethod}`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getMoneyAccountHistory = async (
    organizationId: string,
    moneyAccountId: string,
    query: MoneyAccountHistoryQuery = {},
): Promise<ServiceResponse<MoneyAccountHistoryResponse | null>> => {
    try {
        const response = await api.get(
            `/organizations/${organizationId}/money-accounts/${moneyAccountId}/history`,
            { params: query },
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const recordMoneyAccountDeposit = async (
    organizationId: string,
    moneyAccountId: string,
    data: RecordManualMoneyMovementJSON,
): Promise<ServiceResponse<MoneyAccountResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/money-accounts/${moneyAccountId}/deposits`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const recordMoneyAccountWithdrawal = async (
    organizationId: string,
    moneyAccountId: string,
    data: RecordManualMoneyMovementJSON,
): Promise<ServiceResponse<MoneyAccountResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/money-accounts/${moneyAccountId}/withdrawals`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
