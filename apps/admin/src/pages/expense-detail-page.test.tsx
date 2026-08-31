import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ExpenseDTO } from "@repo/types";

import { formatCurrency } from "@/lib/format";
import { expenseKeys } from "@/lib/query-keys";
import ExpenseDetailPage from "@/pages/expense-detail-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const expenseId = "88888888-8888-4888-8888-888888888888";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const expenseCategoryId = "11111111-1111-4111-8111-111111111111";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const now = new Date("2026-08-31T12:00:00.000Z");

const draftExpense: ExpenseDTO = {
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
    voidedAt: null,
    voidReason: null,
    outgoingPayments: [],
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const recordedExpense: ExpenseDTO = {
    ...draftExpense,
    lifecycle: "recorded",
    payableStatus: "due",
    dueAmount: 25000,
    recordedAt: now,
};

const renderDetailPage = (
    result: "pending" | "success" | "error" = "success",
    expense: ExpenseDTO = draftExpense,
) => {
    const queryClient = new QueryClient();
    if (result !== "pending") {
        queryClient.setQueryData(expenseKeys.detail(organizationId, expenseId), {
            status: result === "error" ? "error" : "success",
            data: result === "error" ? null : { expense },
            message: result === "error"
                ? "Expense could not be loaded right now."
                : "Expense fetched successfully",
            code: result === "error" ? 500 : 200,
        });
    }

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/expenses/${expenseId}`]}>
                <Routes>
                    <Route
                        path="/organizations/:organizationId/expenses/:expenseId"
                        element={<ExpenseDetailPage />}
                    />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe("Admin Expense detail page", () => {
    test("shows Category, Store, totals, notes, reference, and draft actions", () => {
        const markup = renderDetailPage("success", draftExpense);

        expect(markup).toContain("data-testid=\"expense-detail-page\"");
        expect(markup).toContain("Rent");
        expect(markup).toContain("Adajan");
        expect(markup).toContain("Draft");
        expect(markup).toContain("Shop rent for August");
        expect(markup).toContain("RENT-AUG");
        expect(markup).toContain("Edit draft");
        expect(markup).toContain("Record expense");
        expect(markup).toContain("Discard draft");
        expect(markup).toContain(formatCurrency(25000));
        expect(markup).toContain("Back to expenses");
    });

    test("shows due-only recorded Expense without draft mutation actions", () => {
        const markup = renderDetailPage("success", recordedExpense);

        expect(markup).toContain("Recorded");
        expect(markup).toContain("Due");
        expect(markup).toContain(formatCurrency(0));
        expect(markup).toContain(formatCurrency(25000));
        expect(markup).not.toContain("Edit draft");
        expect(markup).not.toContain("Discard draft");
        expect(markup).not.toContain(">Record expense<");
        expect(markup).toContain("Record payment");
        expect(markup).toContain("Outgoing Payments");
        expect(markup).toContain("No Outgoing Payments recorded yet.");
    });

    test("shows a recorded Expense with later settlement actions and payment history", () => {
        const partialExpense: ExpenseDTO = {
            ...recordedExpense,
            payableStatus: "partial",
            paidTotal: 10000,
            dueAmount: 15000,
            outgoingPayments: [
                {
                    id: "12121212-1212-4121-8121-121212121212",
                    organizationId,
                    purchaseId: null,
                    expenseId,
                    amount: 10000,
                    paymentMethod: "cash",
                    moneyAccountId: null,
                    moneyAccountName: null,
                    reference: "CASH-1",
                    notes: null,
                    paidAt: now,
                    reversedAt: null,
                    reversalReason: null,
                    reversalKind: null,
                    createdBy: userId,
                    createdAt: now,
                },
            ],
        };
        const markup = renderDetailPage("success", partialExpense);

        expect(markup).toContain("Partial");
        expect(markup).toContain("Record payment");
        expect(markup).toContain("Cash");
        expect(markup).toContain("CASH-1");
        expect(markup).toContain(formatCurrency(10000));
        expect(markup).toContain(formatCurrency(15000));
        expect(markup).not.toContain("No Outgoing Payments recorded yet.");
        expect(markup).toContain("Reverse payment");
        expect(markup).toContain("Void expense");
    });

    test("shows a voided Expense without settlement or discard, and offers a replacement", () => {
        const voidedExpense: ExpenseDTO = {
            ...recordedExpense,
            lifecycle: "voided",
            payableStatus: null,
            paidTotal: 0,
            dueAmount: null,
            voidedAt: now,
            voidReason: "Entered against the wrong category",
            outgoingPayments: [
                {
                    id: "12121212-1212-4121-8121-121212121212",
                    organizationId,
                    purchaseId: null,
                    expenseId,
                    amount: 10000,
                    paymentMethod: "cash",
                    moneyAccountId: null,
                    moneyAccountName: null,
                    reference: "CASH-1",
                    notes: null,
                    paidAt: now,
                    reversedAt: now,
                    reversalReason: "Entered against the wrong category",
                    reversalKind: "payable_void",
                    createdBy: userId,
                    createdAt: now,
                },
            ],
        };
        const markup = renderDetailPage("success", voidedExpense);

        expect(markup).toContain("Voided");
        expect(markup).toContain("Entered against the wrong category");
        expect(markup).toContain("Payable Void reversal");
        expect(markup).toContain("Create replacement");
        expect(markup).toContain("Rent");
        expect(markup).not.toContain("Record payment");
        expect(markup).not.toContain("Discard draft");
        expect(markup).not.toContain("Reverse payment");
        expect(markup).not.toContain("Void expense");
    });

    test("shows a loading spinner while the Expense is fetched", () => {
        const markup = renderDetailPage("pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("data-testid=\"expense-detail-page\"");
    });

    test("shows an error state when the Expense cannot be loaded", () => {
        const markup = renderDetailPage("error");

        expect(markup).toContain("Unable to load expense");
        expect(markup).toContain("Expense could not be loaded right now.");
        expect(markup).toContain("Try again");
    });
});
