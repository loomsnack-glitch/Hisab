import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ExpenseDTO } from "@repo/types";

import { expenseKeys } from "@/lib/query-keys";
import ExpensesPage from "@/pages/expenses-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const expenseCategoryId = "11111111-1111-4111-8111-111111111111";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const now = new Date("2026-08-31T12:00:00.000Z");

const draftExpense: ExpenseDTO = {
    id: "88888888-8888-4888-8888-888888888888",
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
    outgoingPayments: [],
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const recordedExpense: ExpenseDTO = {
    ...draftExpense,
    id: "77777777-7777-4777-8777-777777777777",
    lifecycle: "recorded",
    payableStatus: "due",
    dueAmount: 25000,
    recordedAt: now,
    invoiceReference: "RENT-SEP",
};

const renderExpensesPage = (
    result: "pending" | "success" | "error" | "empty" = "success",
    expenses: ExpenseDTO[] = [draftExpense, recordedExpense],
) => {
    const queryClient = new QueryClient();
    if (result !== "pending") {
        queryClient.setQueryData(expenseKeys.list(organizationId), {
            status: result === "error" ? "error" : "success",
            data: result === "error" ? null : { expenses: result === "empty" ? [] : expenses },
            message: result === "error"
                ? "Expenses could not be loaded right now."
                : "Expenses fetched successfully",
            code: result === "error" ? 500 : 200,
        });
    }

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/expenses`]}>
                <Routes>
                    <Route path="/organizations/:organizationId/expenses" element={<ExpensesPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe("Admin Expenses page", () => {
    test("shows Store, Category, lifecycle, totals, and due amount", () => {
        const markup = renderExpensesPage();

        expect(markup).toContain("data-testid=\"expenses-page\"");
        expect(markup).toContain("Rent");
        expect(markup).toContain("Adajan");
        expect(markup).toContain("Draft");
        expect(markup).toContain("Recorded");
        expect(markup).toContain("Due");
        expect(markup).toContain("Paid");
        expect(markup).toContain("Add expense");
        expect(markup).toContain("Search expenses...");
        expect(markup).toContain("View");
        expect(markup).toContain("Edit");
        expect(markup).toContain(`/organizations/${organizationId}/expenses/${draftExpense.id}`);
        expect(markup).toContain("RENT-AUG");
    });

    test("shows a loading spinner while Expenses are fetched", () => {
        const markup = renderExpensesPage("pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("data-testid=\"expenses-page\"");
    });

    test("shows an error state when Expenses cannot be loaded", () => {
        const markup = renderExpensesPage("error");

        expect(markup).toContain("Unable to load expenses");
        expect(markup).toContain("Expenses could not be loaded right now.");
        expect(markup).toContain("Try again");
    });

    test("shows an empty state with a create action", () => {
        const markup = renderExpensesPage("empty");

        expect(markup).toContain("No expenses yet");
        expect(markup).toContain("Add expense");
    });
});
