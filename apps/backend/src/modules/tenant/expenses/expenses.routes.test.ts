import { beforeEach, describe, expect, test } from "bun:test";
import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "@/types/hono";
import { authMiddleware } from "@/middlewares/auth.middleware";

const harness = await import("./expenses.service.test-harness");
const { createExpensesRoutes } = await import("./expenses.routes");

const authenticatedUser: MiddlewareHandler<{ Variables: AppVariables }> = async (context, next) => {
    context.set("authUser", { id: harness.userId } as AppVariables["authUser"]);
    await next();
};

const expensesRoutes = createExpensesRoutes(authenticatedUser);
const unauthenticatedRoutes = createExpensesRoutes(authMiddleware);

const readBody = async (response: Response) => (await response.json()) as any;

const createPayload = {
    storeId: harness.storeId,
    expenseCategoryId: harness.expenseCategoryId,
    effectiveDate: "2026-08-30",
    invoiceReference: "RENT-AUG",
    notes: "Shop rent for August",
    total: 25000,
};

describe("Organization Expense routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getStoreById.mockClear();
        harness.getExpensesByOrganizationId.mockClear();
        harness.getExpenseById.mockClear();
        harness.createExpenseRepo.mockClear();
        harness.updateExpenseRepo.mockClear();
        harness.deleteExpenseRepo.mockClear();
        harness.lockExpenseById.mockClear();
        harness.createOutgoingPaymentRepo.mockClear();
        harness.createMoneyAccountMovementRepo.mockClear();
        harness.lockPaymentRouteByStoreAndMethod.mockClear();
        harness.isMoneyAccountTrackingActive.mockClear();

        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getStoreById.mockResolvedValue(harness.store);
        harness.isMoneyAccountTrackingActive.mockResolvedValue(false);
        harness.resetStoredExpense(harness.draftExpense);
        harness.getExpensesByOrganizationId.mockResolvedValue([harness.draftExpense]);
    });

    test("rejects unauthenticated Expense listing", async () => {
        const response = await unauthenticatedRoutes.request(
            `http://localhost/${harness.organizationId}/expenses`,
        );

        expect(response.status).toBe(401);
        const body = await readBody(response);
        expect(body.message).toBe("Authentication is required");
    });

    test("lists Organization Expenses for an authenticated administrator", async () => {
        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses`,
        );

        expect(response.status).toBe(200);
        const body = await readBody(response);
        expect(body.data.expenses).toHaveLength(1);
        expect(body.data.expenses[0].expenseCategoryName).toBe("Rent");
        expect(body.data.expenses[0].storeName).toBe("Adajan");
    });

    test("creates a Draft Expense at the Organization administrator seam", async () => {
        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createPayload),
            },
        );

        expect(response.status).toBe(201);
        const body = await readBody(response);
        expect(body.data.expense.lifecycle).toBe("draft");
        expect(body.data.expense.payableStatus).toBeNull();
        expect(harness.createExpenseRepo).toHaveBeenCalled();
    });

    test("rejects an Expense payload that includes payment or snapshot fields", async () => {
        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...createPayload,
                    paidTotal: 10,
                    payableStatus: "due",
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createExpenseRepo).not.toHaveBeenCalled();
    });

    test("rejects a future effective date at the route seam", async () => {
        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...createPayload,
                    effectiveDate: "2099-01-01",
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createExpenseRepo).not.toHaveBeenCalled();
    });

    test("returns Expense details with category snapshot, totals, and notes", async () => {
        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses/${harness.expenseId}`,
        );

        expect(response.status).toBe(200);
        const body = await readBody(response);
        expect(body.data.expense.expenseCategoryName).toBe("Rent");
        expect(body.data.expense.notes).toBe("Shop rent for August");
        expect(body.data.expense.invoiceReference).toBe("RENT-AUG");
        expect(body.data.expense.total).toBe(25000);
    });

    test("updates a Draft Expense", async () => {
        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses/${harness.expenseId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: "Updated notes" }),
            },
        );

        expect(response.status).toBe(200);
        const body = await readBody(response);
        expect(body.data.expense.notes).toBe("Updated notes");
    });

    test("discards a Draft Expense", async () => {
        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses/${harness.expenseId}`,
            { method: "DELETE" },
        );

        expect(response.status).toBe(200);
        const body = await readBody(response);
        expect(body.data.discarded).toBe(true);
        expect(harness.deleteExpenseRepo).toHaveBeenCalled();
    });

    test("records a Draft Expense as due-only", async () => {
        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses/${harness.expenseId}/record`,
            { method: "POST" },
        );

        expect(response.status).toBe(200);
        const body = await readBody(response);
        expect(body.data.expense.lifecycle).toBe("recorded");
        expect(body.data.expense.payableStatus).toBe("due");
        expect(body.data.expense.paidTotal).toBe(0);
        expect(body.data.expense.dueAmount).toBe(25000);
    });

    test("denies Expense access when the user is not a member of the Organization", async () => {
        harness.getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses`,
        );

        expect(response.status).toBe(404);
        expect(harness.getExpensesByOrganizationId).not.toHaveBeenCalled();
    });

    test("rejects an invalid expense id", async () => {
        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses/not-a-uuid`,
        );

        expect(response.status).toBe(400);
    });

    test("records an Outgoing Payment against a recorded Expense", async () => {
        harness.resetStoredExpense(harness.recordedExpense);

        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses/${harness.expenseId}/payments`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: 10000, paymentMethod: "cash" }),
            },
        );

        expect(response.status).toBe(201);
        const body = await readBody(response);
        expect(body.data.expense.payableStatus).toBe("partial");
        expect(body.data.expense.paidTotal).toBe(10000);
        expect(harness.createOutgoingPaymentRepo).toHaveBeenCalled();
        expect(harness.createMoneyAccountMovementRepo).not.toHaveBeenCalled();
        expect(harness.lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("rejects a zero Outgoing Payment amount at the route seam", async () => {
        harness.resetStoredExpense(harness.recordedExpense);

        const response = await expensesRoutes.request(
            `http://localhost/${harness.organizationId}/expenses/${harness.expenseId}/payments`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: 0, paymentMethod: "cash" }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createOutgoingPaymentRepo).not.toHaveBeenCalled();
    });

    test("rejects unauthenticated Outgoing Payments", async () => {
        const response = await unauthenticatedRoutes.request(
            `http://localhost/${harness.organizationId}/expenses/${harness.expenseId}/payments`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: 10000, paymentMethod: "cash" }),
            },
        );

        expect(response.status).toBe(401);
    });
});
