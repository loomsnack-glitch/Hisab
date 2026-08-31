import {
    STATUS_CODES,
    normalizeExpenseCategoryName,
    type CreateExpenseCategorySVC,
    type ExpenseCategoryDTO,
    type ExpenseCategoriesListResponse,
    type ExpenseCategoryResponse,
    type ServiceResponse,
    type UpdateExpenseCategorySVC,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as expenseCategoriesRepository from "./expense-categories.repository";

const isUniqueViolation = (error: unknown): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505";

const uniqueNameConflict = (): ServiceResponse<null> => ({
    status: "error",
    message: "An Expense Category with this name already exists in this organization",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const getOrganizationForUser = async (organizationId: string, userId: string) =>
    organizationRepository.getOrganizationByIdForUser(organizationId, userId);

const organizationNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Organization not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const expenseCategoryNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Expense Category not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

export const getExpenseCategories = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<ExpenseCategoriesListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const expenseCategories =
        await expenseCategoriesRepository.getExpenseCategoriesByOrganizationId(organizationId);
    return {
        status: "success",
        data: { expenseCategories },
        message: "Expense Categories fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getExpenseCategoryDetails = async (
    userId: string,
    organizationId: string,
    expenseCategoryId: string,
): Promise<ServiceResponse<ExpenseCategoryResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const expenseCategory = await expenseCategoriesRepository.getExpenseCategoryById(
        organizationId,
        expenseCategoryId,
    );
    if (!expenseCategory) {
        return expenseCategoryNotFound();
    }

    return {
        status: "success",
        data: { expenseCategory },
        message: "Expense Category fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createExpenseCategory = async (
    userId: string,
    organizationId: string,
    expenseCategoryData: CreateExpenseCategorySVC,
): Promise<ServiceResponse<ExpenseCategoryResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const nameToken = normalizeExpenseCategoryName(expenseCategoryData.name);
    if (
        await expenseCategoriesRepository.expenseCategoryNameExistsInOrganization(
            organizationId,
            nameToken,
        )
    ) {
        return uniqueNameConflict();
    }

    try {
        const expenseCategory = await expenseCategoriesRepository.createExpenseCategory({
            id: crypto.randomUUID(),
            organizationId,
            name: expenseCategoryData.name,
            kind: "custom",
            predefinedKey: null,
            status: expenseCategoryData.status ?? "active",
            createdBy: userId,
        });

        if (!expenseCategory) {
            return {
                status: "error",
                message: "Failed to create Expense Category",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        return {
            status: "success",
            data: { expenseCategory },
            message: "Expense Category created successfully",
            code: STATUS_CODES.CREATED,
        };
    } catch (error) {
        if (isUniqueViolation(error)) {
            return uniqueNameConflict();
        }
        throw error;
    }
};

export const updateExpenseCategory = async (
    userId: string,
    organizationId: string,
    expenseCategoryId: string,
    expenseCategoryData: UpdateExpenseCategorySVC,
): Promise<ServiceResponse<ExpenseCategoryResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await expenseCategoriesRepository.getExpenseCategoryById(
        organizationId,
        expenseCategoryId,
    );
    if (!existing) {
        return expenseCategoryNotFound();
    }

    if (existing.kind === "predefined" && expenseCategoryData.name !== undefined) {
        return {
            status: "error",
            message: "Predefined Expense Category definitions cannot be edited",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const nextName = expenseCategoryData.name ?? existing.name;
    const nextStatus = expenseCategoryData.status ?? existing.status;

    const nameChanged =
        normalizeExpenseCategoryName(nextName) !== normalizeExpenseCategoryName(existing.name);
    if (nameChanged) {
        if (
            await expenseCategoriesRepository.expenseCategoryNameExistsInOrganization(
                organizationId,
                normalizeExpenseCategoryName(nextName),
                expenseCategoryId,
            )
        ) {
            return uniqueNameConflict();
        }
    }

    try {
        const expenseCategory = await expenseCategoriesRepository.updateExpenseCategory({
            id: expenseCategoryId,
            organizationId,
            name: nextName,
            status: nextStatus,
            updatedBy: userId,
        });

        if (!expenseCategory) {
            return {
                status: "error",
                message: "Failed to update Expense Category",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        return {
            status: "success",
            data: { expenseCategory },
            message: "Expense Category updated successfully",
            code: STATUS_CODES.SUCCESS,
        };
    } catch (error) {
        if (isUniqueViolation(error)) {
            return uniqueNameConflict();
        }
        throw error;
    }
};

export const seedDefaultExpenseCategories = async (
    organizationId: string,
    createdBy: string,
    tx?: Bun.TransactionSQL,
): Promise<ExpenseCategoryDTO[]> => {
    return expenseCategoriesRepository.seedDefaultExpenseCategories(
        organizationId,
        createdBy,
        tx,
    );
};
