import { mock } from "bun:test";
import type {
    CreateExpenseREPO,
    ExpenseCategoryDTO,
    ExpenseDTO,
    UpdateExpenseREPO,
} from "@repo/types";

export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const expenseCategoryId = "11111111-1111-4111-8111-111111111111";
export const inactiveExpenseCategoryId = "22222222-2222-4222-8222-222222222222";
export const expenseId = "88888888-8888-4888-8888-888888888888";
export const now = new Date("2026-08-31T12:00:00.000Z");

export const organization = { id: organizationId, name: "Demo Org" };
export const store = { id: storeId, organizationId, name: "Adajan" };

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

export const inactiveMarketingCategory: ExpenseCategoryDTO = {
    id: inactiveExpenseCategoryId,
    organizationId,
    name: "Marketing",
    kind: "predefined",
    predefinedKey: "marketing",
    status: "inactive",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const draftExpense: ExpenseDTO = {
    id: expenseId,
    organizationId,
    storeId,
    storeName: "Adajan",
    expenseCategoryId,
    expenseCategoryName: "Rent",
    lifecycle: "draft",
    payableStatus: null,
    effectiveDate: "2026-08-30",
    invoiceReference: "RENT-AUG",
    notes: "Shop rent for August",
    total: 25000,
    paidTotal: 0,
    dueAmount: null,
    recordedAt: null,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const recordedExpense: ExpenseDTO = {
    ...draftExpense,
    lifecycle: "recorded",
    payableStatus: "due",
    dueAmount: 25000,
    recordedAt: now,
};

let storedExpense: ExpenseDTO | null = draftExpense;

export const resetStoredExpense = (expense: ExpenseDTO | null) => {
    storedExpense = expense ? { ...expense } : null;
};

export const getOrganizationByIdForUser = mock(
    async (): Promise<{ id: string; name: string } | null> => organization,
);
export const getStoreById = mock(
    async (): Promise<{ id: string; organizationId: string; name: string } | null> => store,
);
export const getExpenseCategoryById = mock(async (_organizationId: string, id: string) => {
    if (id === inactiveExpenseCategoryId) return inactiveMarketingCategory;
    if (id === expenseCategoryId) return rentCategory;
    return null;
});
export const getExpensesByOrganizationId = mock(async () => [draftExpense]);
export const getExpenseById = mock(async (_organizationId: string, id: string) => {
    if (!storedExpense || storedExpense.id !== id) {
        return null;
    }
    return storedExpense;
});

export const createExpenseRepo = mock(async (data: CreateExpenseREPO) => {
    storedExpense = {
        ...draftExpense,
        ...data,
        storeName: store.name,
        updatedBy: data.updatedBy ?? null,
        createdAt: now,
        updatedAt: now,
    };
    return storedExpense;
});

export const updateExpenseRepo = mock(async (data: UpdateExpenseREPO) => {
    storedExpense = {
        ...(storedExpense ?? draftExpense),
        ...data,
        storeName: store.name,
        createdAt: storedExpense?.createdAt ?? now,
        updatedAt: now,
    };
    return storedExpense;
});

export const deleteExpenseRepo = mock(async () => {
    storedExpense = null;
    return true;
});

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
    getStoreById,
}));

mock.module("@/modules/tenant/expense-categories/expense-categories.repository", () => ({
    getExpenseCategoryById,
}));

mock.module("./expenses.repository", () => ({
    getExpensesByOrganizationId,
    getExpenseById,
    createExpense: createExpenseRepo,
    updateExpense: updateExpenseRepo,
    deleteExpense: deleteExpenseRepo,
}));

export const expensesService = await import("./expenses.service");
