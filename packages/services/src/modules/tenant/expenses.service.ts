import type {
    CreateDraftExpenseJSON,
    CreateOutgoingPaymentJSON,
    ExpenseResponse,
    ExpensesListResponse,
    RecordExpenseJSON,
    ReverseOutgoingPaymentJSON,
    ServiceResponse,
    UpdateDraftExpenseJSON,
    VoidExpenseJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getExpenses = async (
    organizationId: string,
): Promise<ServiceResponse<ExpensesListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/expenses`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getExpense = async (
    organizationId: string,
    expenseId: string,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/expenses/${expenseId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createDraftExpense = async (
    organizationId: string,
    data: CreateDraftExpenseJSON,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/expenses`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateDraftExpense = async (
    organizationId: string,
    expenseId: string,
    data: UpdateDraftExpenseJSON,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    try {
        const response = await api.patch(
            `/organizations/${organizationId}/expenses/${expenseId}`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const discardDraftExpense = async (
    organizationId: string,
    expenseId: string,
): Promise<ServiceResponse<{ discarded: true } | null>> => {
    try {
        const response = await api.delete(`/organizations/${organizationId}/expenses/${expenseId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const recordExpense = async (
    organizationId: string,
    expenseId: string,
    data: RecordExpenseJSON = {},
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/expenses/${expenseId}/record`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createOutgoingExpensePayment = async (
    organizationId: string,
    expenseId: string,
    data: CreateOutgoingPaymentJSON,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/expenses/${expenseId}/payments`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const reverseOutgoingExpensePayment = async (
    organizationId: string,
    expenseId: string,
    paymentId: string,
    data: ReverseOutgoingPaymentJSON,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/expenses/${expenseId}/payments/${paymentId}/reverse`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const voidExpense = async (
    organizationId: string,
    expenseId: string,
    data: VoidExpenseJSON,
): Promise<ServiceResponse<ExpenseResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/expenses/${expenseId}/void`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
