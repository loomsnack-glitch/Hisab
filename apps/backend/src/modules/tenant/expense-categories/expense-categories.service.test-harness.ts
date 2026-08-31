import { mock } from "bun:test";
import { SEEDED_EXPENSE_CATEGORIES, type ExpenseCategoryDTO } from "@repo/types";

export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const expenseCategoryId = "11111111-1111-4111-8111-111111111111";
export const customExpenseCategoryId = "22222222-2222-4222-8222-222222222222";
export const now = new Date("2026-08-31T12:00:00.000Z");

export const organization = { id: organizationId, name: "Demo Org" };

export const rentCategory: ExpenseCategoryDTO = {
    id: expenseCategoryId,
    organizationId,
    name: "Rent",
    kind: "predefined",
    predefinedKey: "rent",
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const packagingCategory: ExpenseCategoryDTO = {
    id: customExpenseCategoryId,
    organizationId,
    name: "Packaging",
    kind: "custom",
    predefinedKey: null,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const seededExpenseCategories: ExpenseCategoryDTO[] = SEEDED_EXPENSE_CATEGORIES.map(
    (definition, index) => ({
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        organizationId,
        name: definition.name,
        kind: "predefined" as const,
        predefinedKey: definition.key,
        status: "active" as const,
        createdBy: userId,
        updatedBy: null,
        createdAt: now,
        updatedAt: now,
    }),
);

export const getOrganizationByIdForUser = mock(async () => organization);
export const getExpenseCategoriesByOrganizationId = mock(async () => [
    ...seededExpenseCategories,
    packagingCategory,
]);
export const getExpenseCategoryById = mock(async () => rentCategory);
export const expenseCategoryNameExistsInOrganization = mock(async () => false);
export const createExpenseCategoryRepo = mock(async (data: CreateExpenseCategoryRepoArg) => ({
    ...packagingCategory,
    ...data,
    kind: data.kind,
    predefinedKey: data.predefinedKey,
    createdAt: now,
    updatedAt: now,
    updatedBy: data.updatedBy ?? null,
}));
export const updateExpenseCategoryRepo = mock(async (data: UpdateExpenseCategoryRepoArg) => ({
    ...rentCategory,
    ...data,
    updatedAt: now,
}));
export const seedDefaultExpenseCategoriesRepo = mock(async () => seededExpenseCategories);

type CreateExpenseCategoryRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    kind: ExpenseCategoryDTO["kind"];
    predefinedKey: string | null;
    status: ExpenseCategoryDTO["status"];
    createdBy: string;
    updatedBy?: string | null;
};

type UpdateExpenseCategoryRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    status: ExpenseCategoryDTO["status"];
    updatedBy: string;
};

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
}));

mock.module("./expense-categories.repository", () => ({
    getExpenseCategoriesByOrganizationId,
    getExpenseCategoryById,
    expenseCategoryNameExistsInOrganization,
    createExpenseCategory: createExpenseCategoryRepo,
    updateExpenseCategory: updateExpenseCategoryRepo,
    seedDefaultExpenseCategories: seedDefaultExpenseCategoriesRepo,
}));

export const expenseCategoriesService = await import("./expense-categories.service");
