import { beforeEach, describe, expect, test } from "bun:test";
import {
    adajanCashAccount,
    cashMoneyAccountId,
    createExpenseRepo,
    createMoneyAccountMovementRepo,
    createOutgoingPaymentRepo,
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
    hdfcBankAccount,
    inactiveExpenseCategoryId,
    isMoneyAccountTrackingActive,
    lockExpenseById,
    lockMoneyAccountById,
    lockPaymentRouteByStoreAndMethod,
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
        lockExpenseById.mockClear();
        createOutgoingPaymentRepo.mockClear();
        createMoneyAccountMovementRepo.mockClear();
        lockMoneyAccountById.mockClear();
        lockPaymentRouteByStoreAndMethod.mockClear();
        isMoneyAccountTrackingActive.mockClear();

        getOrganizationByIdForUser.mockResolvedValue({ id: organizationId, name: "Demo Org" });
        getStoreById.mockResolvedValue({ id: storeId, organizationId, name: "Adajan" });
        isMoneyAccountTrackingActive.mockResolvedValue(false);
        lockMoneyAccountById.mockResolvedValue(adajanCashAccount);
        createMoneyAccountMovementRepo.mockResolvedValue({
            id: "14141414-1414-4141-8141-141414141414",
            organizationId,
            moneyAccountId: cashMoneyAccountId,
            storeId,
            amount: -10000,
            occurredAt: new Date("2026-08-31T12:00:00.000Z"),
            sourceKind: "outgoing_expense_payment" as const,
            paymentId: null,
            outgoingPaymentId: "12121212-1212-4121-8121-121212121212",
            reversedMovementId: null,
            createdAt: new Date("2026-08-31T12:00:00.000Z"),
        });
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

    test("records an untracked Cash Outgoing Payment without a Money Account Movement", async () => {
        resetStoredExpense(recordedExpense);

        const response = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 10000, paymentMethod: "cash", reference: "CASH-1" },
        );

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.expense.payableStatus).toBe("partial");
        expect(response.data?.expense.paidTotal).toBe(10000);
        expect(response.data?.expense.dueAmount).toBe(15000);
        expect(response.data?.expense.outgoingPayments).toHaveLength(1);
        expect(response.data?.expense.outgoingPayments[0]?.paymentMethod).toBe("cash");
        expect(response.data?.expense.outgoingPayments[0]?.moneyAccountId).toBeNull();
        expect(response.data?.expense.outgoingPayments[0]?.expenseId).toBe(expenseId);
        expect(response.data?.expense.outgoingPayments[0]?.purchaseId).toBeNull();
        expect(createOutgoingPaymentRepo).toHaveBeenCalled();
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
        expect(lockMoneyAccountById).not.toHaveBeenCalled();
        expect(lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("rejects Bank Transfer and Other without Money Account Tracking", async () => {
        resetStoredExpense(recordedExpense);

        const response = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 10000, paymentMethod: "bank_transfer", moneyAccountId: hdfcBankAccount.id },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
    });

    test("rejects an Outgoing Payment on a Draft Expense", async () => {
        const response = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 10000, paymentMethod: "cash" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
    });

    test("rejects an Outgoing Payment that would overpay the remaining due", async () => {
        resetStoredExpense(recordedExpense);

        const response = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 25000.01, paymentMethod: "upi" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
    });

    test("accepts a later partial payment until the Expense is paid", async () => {
        resetStoredExpense(recordedExpense);

        const first = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 10000, paymentMethod: "cash" },
        );
        const second = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 15000, paymentMethod: "upi" },
        );

        expect(first.data?.expense.payableStatus).toBe("partial");
        expect(second.status).toBe("success");
        expect(second.data?.expense.payableStatus).toBe("paid");
        expect(second.data?.expense.paidTotal).toBe(25000);
        expect(second.data?.expense.dueAmount).toBe(0);
        expect(second.data?.expense.outgoingPayments).toHaveLength(2);
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
    });

    test("records a tracked Cash payment as one negative Movement on the selected eligible account", async () => {
        resetStoredExpense(recordedExpense);
        isMoneyAccountTrackingActive.mockResolvedValue(true);

        const response = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 10000, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );

        expect(response.status).toBe("success");
        expect(response.data?.expense.payableStatus).toBe("partial");
        expect(lockMoneyAccountById).toHaveBeenCalledWith(
            organizationId,
            cashMoneyAccountId,
            expect.anything(),
        );
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                moneyAccountId: cashMoneyAccountId,
                storeId,
                amount: -10000,
                sourceKind: "outgoing_expense_payment",
                paymentId: null,
            }),
            expect.anything(),
        );
        expect(lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("records a tracked Bank Transfer against an Organization-wide Bank account", async () => {
        resetStoredExpense(recordedExpense);
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        lockMoneyAccountById.mockResolvedValue(hdfcBankAccount);

        const response = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 10000, paymentMethod: "bank_transfer", moneyAccountId: hdfcBankAccount.id },
        );

        expect(response.status).toBe("success");
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                moneyAccountId: hdfcBankAccount.id,
                amount: -10000,
                sourceKind: "outgoing_expense_payment",
            }),
            expect.anything(),
        );
        expect(lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("rejects a tracked payment when the selected Money Account has insufficient balance", async () => {
        resetStoredExpense(recordedExpense);
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        lockMoneyAccountById.mockResolvedValue({ ...adajanCashAccount, balance: 10 });

        const response = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 10000, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );

        expect(response.status).toBe("error");
        expect(response.message).toMatch(/sufficient balance/i);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
        expect(updateExpenseRepo).not.toHaveBeenCalled();
    });

    test("rejects a tracked payment for an ineligible or other-Store Money Account", async () => {
        resetStoredExpense(recordedExpense);
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        lockMoneyAccountById.mockResolvedValue(hdfcBankAccount);

        const response = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 10000, paymentMethod: "cash", moneyAccountId: hdfcBankAccount.id },
        );

        expect(response.status).toBe("error");
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
    });

    test("does not backfill an untracked payment after tracking is enabled", async () => {
        resetStoredExpense(recordedExpense);

        const untracked = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 10000, paymentMethod: "cash" },
        );
        expect(untracked.status).toBe("success");
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();

        isMoneyAccountTrackingActive.mockResolvedValue(true);
        const tracked = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 5000, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );

        expect(tracked.status).toBe("success");
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledTimes(1);
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledWith(
            expect.objectContaining({ amount: -5000 }),
            expect.anything(),
        );
        expect(lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("rolls back Expense settlement when the Money Account Movement cannot be created", async () => {
        resetStoredExpense(recordedExpense);
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        createMoneyAccountMovementRepo.mockResolvedValue(null);

        const response = await expensesService.createOutgoingExpensePayment(
            userId,
            organizationId,
            expenseId,
            { amount: 10000, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );

        expect(response.status).toBe("error");
        expect(updateExpenseRepo).not.toHaveBeenCalled();
    });

    test("denies Outgoing Payments when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);
        resetStoredExpense(recordedExpense);

        const response = await expensesService.createOutgoingExpensePayment(
            userId,
            otherOrganizationId,
            expenseId,
            { amount: 10000, paymentMethod: "cash" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
        expect(lockExpenseById).not.toHaveBeenCalled();
    });
});
