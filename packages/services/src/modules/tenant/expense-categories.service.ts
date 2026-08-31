import type {
    CreateExpenseCategoryJSON,
    ExpenseCategoriesListResponse,
    ExpenseCategoryResponse,
    ServiceResponse,
    UpdateExpenseCategoryJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getExpenseCategories = async (
    organizationId: string,
): Promise<ServiceResponse<ExpenseCategoriesListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/expense-categories`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getExpenseCategory = async (
    organizationId: string,
    expenseCategoryId: string,
): Promise<ServiceResponse<ExpenseCategoryResponse | null>> => {
    try {
        const response = await api.get(
            `/organizations/${organizationId}/expense-categories/${expenseCategoryId}`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createExpenseCategory = async (
    organizationId: string,
    data: CreateExpenseCategoryJSON,
): Promise<ServiceResponse<ExpenseCategoryResponse | null>> => {
    try {
        const response = await api.post(
            `/organizations/${organizationId}/expense-categories`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateExpenseCategory = async (
    organizationId: string,
    expenseCategoryId: string,
    data: UpdateExpenseCategoryJSON,
): Promise<ServiceResponse<ExpenseCategoryResponse | null>> => {
    try {
        const response = await api.patch(
            `/organizations/${organizationId}/expense-categories/${expenseCategoryId}`,
            data,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
