import { beforeEach, describe, expect, test } from "bun:test";
import {
    createExpenseRepo,
    deleteExpenseRepo,
    draftExpense,
    expenseCategoryId,
    expenseId,
    expensesService,
    getExpenseById,
    getExpenseCategoryById,
    getExpensesByOrganizationId,
    getOrganizationByIdForUser,
    getStoreById,
    inactiveExpenseCategoryId,
    organizationId,
    otherOrganizationId,
    recordedExpense,
    rentCategory,
    resetStoredExpense,
    storeId,
    updateExpenseRepo,
    userId,
} from "./expenses.service.test-harness";

const createPayload = {
    storeId,
    expenseCategoryId,
    effectiveDate: "2026-08-30",
    invoiceReference: "RENT-AUG",
    notes: "Shop rent for August",
    total: 25000,
};

describe("Organization Expense service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getStoreById.mockClear();
        getExpenseCategoryById.mockClear();
        getExpensesByOrganizationId.mockClear();
        getExpenseById.mockClear();
        createExpenseRepo.mockClear();
        updateExpenseRepo.mockClear();
        deleteExpenseRepo.mockClear();

        getOrganizationByIdForUser.mockResolvedValue({ id: organizationId, name: "Demo Org" });
        getStoreById.mockResolvedValue({ id: storeId, organizationId, name: "Adajan" });
        resetStoredExpense(draftExpense);
        getExpensesByOrganizationId.mockResolvedValue([draftExpense]);
    });

    test("lists Expenses for a member with Store, Category, lifecycle, totals, and due amount", async () => {
        const response = await expensesService.getExpenses(userId, organizationId);

        expect(response.status).toBe("success");
        expect(response.data?.expenses).toHaveLength(1);
        expect(response.data?.expenses[0]?.storeName).toBe("Adajan");
        expect(response.data?.expenses[0]?.expenseCategoryName).toBe("Rent");
        expect(response.data?.expenses[0]?.lifecycle).toBe("draft");
        expect(response.data?.expenses[0]?.total).toBe(25000);
        expect(response.data?.expenses[0]?.dueAmount).toBeNull();
    });

    test("denies Expense listing when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await expensesService.getExpenses(userId, otherOrganizationId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(getExpensesByOrganizationId).not.toHaveBeenCalled();
    });

    test("creates a Draft Expense without Payable Status, due amount, or payment", async () => {
        const response = await expensesService.createDraftExpense(userId, organizationId, createPayload);

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.expense.lifecycle).toBe("draft");
        expect(response.data?.expense.payableStatus).toBeNull();
        expect(response.data?.expense.paidTotal).toBe(0);
        expect(response.data?.expense.dueAmount).toBeNull();
        expect(createExpenseRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId,
                storeId,
                expenseCategoryId,
                expenseCategoryName: "Rent",
                lifecycle: "draft",
                payableStatus: null,
                paidTotal: 0,
                dueAmount: null,
                recordedAt: null,
                total: 25000,
            }),
        );
    });

    test("snapshots the Expense Category name on a Draft Expense", async () => {
        const response = await expensesService.createDraftExpense(userId, organizationId, createPayload);

        expect(response.status).toBe("success");
        expect(response.data?.expense.expenseCategoryName).toBe("Rent");
        expect(response.data?.expense.expenseCategoryId).toBe(expenseCategoryId);
    });

    test("rejects a Draft Expense for a Store that does not belong to the Organization", async () => {
        getStoreById.mockResolvedValue(null);

        const response = await expensesService.createDraftExpense(userId, organizationId, createPayload);

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(response.message).toBe("Store not found");
        expect(createExpenseRepo).not.toHaveBeenCalled();
    });

    test("rejects a Draft Expense with an inactive Expense Category", async () => {
        const response = await expensesService.createDraftExpense(userId, organizationId, {
            ...createPayload,
            expenseCategoryId: inactiveExpenseCategoryId,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toMatch(/active Expense Category/i);
        expect(createExpenseRepo).not.toHaveBeenCalled();
    });

    test("edits a Draft Expense total, category, and notes", async () => {
        const response = await expensesService.updateDraftExpense(userId, organizationId, expenseId, {
            notes: "Updated notes",
            total: 26000,
        });

        expect(response.status).toBe("success");
        expect(response.data?.expense.notes).toBe("Updated notes");
        expect(response.data?.expense.total).toBe(26000);
        expect(response.data?.expense.payableStatus).toBeNull();
        expect(updateExpenseRepo).toHaveBeenCalled();
    });

    test("does not allow editing a recorded Expense", async () => {
        resetStoredExpense(recordedExpense);

        const response = await expensesService.updateDraftExpense(userId, organizationId, expenseId, {
            notes: "should fail",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toMatch(/Draft Expense can be edited/i);
        expect(updateExpenseRepo).not.toHaveBeenCalled();
    });

    test("discards a Draft Expense", async () => {
        const response = await expensesService.discardDraftExpense(userId, organizationId, expenseId);

        expect(response.status).toBe("success");
        expect(response.data?.discarded).toBe(true);
        expect(deleteExpenseRepo).toHaveBeenCalledWith(organizationId, expenseId);
    });

    test("does not discard a recorded Expense", async () => {
        resetStoredExpense(recordedExpense);

        const response = await expensesService.discardDraftExpense(userId, organizationId, expenseId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(deleteExpenseRepo).not.toHaveBeenCalled();
    });

    test("records a valid Draft Expense as a due-only payable with paid total of zero", async () => {
        const response = await expensesService.recordExpense(userId, organizationId, expenseId);

        expect(response.status).toBe("success");
        expect(response.data?.expense.lifecycle).toBe("recorded");
        expect(response.data?.expense.payableStatus).toBe("due");
        expect(response.data?.expense.paidTotal).toBe(0);
        expect(response.data?.expense.dueAmount).toBe(25000);
        expect(response.data?.expense.total).toBe(25000);
        expect(response.data?.expense.recordedAt).toBeTruthy();
        expect(updateExpenseRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                lifecycle: "recorded",
                payableStatus: "due",
                paidTotal: 0,
                dueAmount: 25000,
            }),
        );
    });

    test("does not record when the Expense Category is no longer active", async () => {
        getExpenseCategoryById.mockImplementation(async () => ({
            ...rentCategory,
            status: "inactive" as const,
        }));

        const response = await expensesService.recordExpense(userId, organizationId, expenseId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(updateExpenseRepo).not.toHaveBeenCalled();
    });

    test("recorded Expense snapshots remain the stored Expense Category name after later category changes", async () => {
        resetStoredExpense(recordedExpense);
        getExpenseCategoryById.mockResolvedValue({ ...rentCategory, name: "Shop Rent", status: "inactive" });

        const response = await expensesService.getExpenseDetails(userId, organizationId, expenseId);

        expect(response.status).toBe("success");
        expect(response.data?.expense.expenseCategoryName).toBe("Rent");
        expect(response.data?.expense.total).toBe(25000);
        expect(response.data?.expense.payableStatus).toBe("due");
    });
});
