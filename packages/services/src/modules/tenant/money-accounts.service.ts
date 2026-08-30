import type {
    CreateMoneyAccountJSON,
    MoneyAccountResponse,
    MoneyAccountsListResponse,
    ServiceResponse,
    UpdateMoneyAccountJSON,
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
