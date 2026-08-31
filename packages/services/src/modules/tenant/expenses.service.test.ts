import { afterEach, describe, expect, test } from "bun:test";
import { api } from "../../api";
import * as expensesService from "./expenses.service";

describe("Expenses client service", () => {
    const originalGet = api.get;
    const originalPost = api.post;
    const originalPatch = api.patch;
    const originalDelete = api.delete;

    afterEach(() => {
        api.get = originalGet;
        api.post = originalPost;
        api.patch = originalPatch;
        api.delete = originalDelete;
    });

    test("reads Expenses and records an Outgoing Payment through administrator endpoints", async () => {
        const requests: string[] = [];
        api.get = (async (url: string) => {
            requests.push(`GET ${url}`);
            return { data: { status: "success", data: null } };
        }) as typeof api.get;
        api.post = (async (url: string) => {
            requests.push(`POST ${url}`);
            return { data: { status: "success", data: null } };
        }) as typeof api.post;

        await expensesService.getExpenses("org-id");
        await expensesService.getExpense("org-id", "expense-id");
        await expensesService.createOutgoingExpensePayment("org-id", "expense-id", {
            amount: 10000,
            paymentMethod: "cash",
        });

        expect(requests).toEqual([
            "GET /organizations/org-id/expenses",
            "GET /organizations/org-id/expenses/expense-id",
            "POST /organizations/org-id/expenses/expense-id/payments",
        ]);
    });
});
