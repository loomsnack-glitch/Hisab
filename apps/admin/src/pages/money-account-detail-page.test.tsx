import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MoneyAccountDTO, MoneyAccountHistoryResponse } from "@repo/types";

import { moneyAccountKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/format";
import MoneyAccountDetailPage from "@/pages/money-account-detail-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const moneyAccountId = "11111111-1111-4111-8111-111111111111";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-08-31T12:00:00.000Z");
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const moneyAccount: MoneyAccountDTO = {
    id: moneyAccountId,
    organizationId,
    name: "HDFC Current",
    type: "bank",
    scope: "organization_wide",
    storeId: null,
    notes: "Main operating account",
    status: "active",
    openingBalance: 100,
    balance: 350.5,
    hasMovements: true,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const historyWithPayments: MoneyAccountHistoryResponse = {
    moneyAccount,
    openingBalance: 100,
    balance: 350.5,
    entries: [
        {
            kind: "opening_balance",
            amount: 100,
            occurredAt: now,
        },
        {
            kind: "pos_payment",
            id: "14141414-1414-4141-8141-141414141414",
            amount: 250.5,
            occurredAt: now,
            storeId,
            paymentId: "16161616-1616-4161-8161-161616161616",
            saleId: "18181818-1818-4181-8181-181818181818",
            saleNumber: "12",
            paymentMethod: "upi",
        },
    ],
};

const renderHistoryPage = (
    result: "pending" | "success" | "error" | "empty" = "success",
    history: MoneyAccountHistoryResponse = historyWithPayments,
) => {
    const queryClient = new QueryClient();
    if (result !== "pending") {
        queryClient.setQueryData(moneyAccountKeys.history(organizationId, moneyAccountId), {
            status: result === "error" ? "error" : "success",
            data: result === "error" ? null : result === "empty"
                ? {
                    ...history,
                    balance: history.openingBalance,
                    moneyAccount: { ...history.moneyAccount, balance: history.openingBalance, hasMovements: false },
                    entries: [history.entries[0]],
                }
                : history,
            message:
                result === "error"
                    ? "Money Account history could not be loaded right now."
                    : "Money Account history fetched successfully",
            code: result === "error" ? 500 : 200,
        });
    }

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/money-accounts/${moneyAccountId}`]}>
                <Routes>
                    <Route
                        path="/organizations/:organizationId/money-accounts/:moneyAccountId"
                        element={<MoneyAccountDetailPage />}
                    />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe("Admin Money Account history page", () => {
    test("shows Opening Balance, calculated Balance, and linked Sale/Payment history", () => {
        const markup = renderHistoryPage();

        expect(markup).toContain("data-testid=\"money-account-history-page\"");
        expect(markup).toContain("HDFC Current");
        expect(markup).toContain("Opening Balance");
        expect(markup).toContain("Calculated balance");
        expect(markup).toContain("Starting amount");
        expect(markup).toContain("Opening Balance plus signed Movements");
        expect(markup).toContain("POS Payment");
        expect(markup).toContain("UPI");
        expect(markup).toContain("Sale 12");
        expect(markup).toContain("Immutable history");
        expect(markup).toContain("cannot be edited");
        expect(markup).toContain("Identity locked after Movement");
        expect(markup).toContain("Back to money accounts");
        expect(markup).not.toContain("Add movement");
        expect(markup).not.toContain("Correct balance");
    });

    test("shows a bill-edit reversal as a dedicated negative history entry", () => {
        const markup = renderHistoryPage("success", {
            moneyAccount: { ...moneyAccount, openingBalance: 5, balance: 50 },
            openingBalance: 5,
            balance: 50,
            entries: [
                {
                    kind: "opening_balance",
                    amount: 5,
                    occurredAt: now,
                },
                {
                    kind: "pos_payment",
                    id: "14141414-1414-4141-8141-141414141414",
                    amount: 90,
                    occurredAt: now,
                    storeId,
                    paymentId: "16161616-1616-4161-8161-161616161616",
                    saleId: "18181818-1818-4181-8181-181818181818",
                    saleNumber: "12",
                    paymentMethod: "cash",
                },
                {
                    kind: "sale_replacement_reversal",
                    id: "20202020-2020-4020-8020-202020202020",
                    amount: -90,
                    occurredAt: now,
                    storeId,
                    reversedMovementId: "14141414-1414-4141-8141-141414141414",
                    originalPaymentId: "16161616-1616-4161-8161-161616161616",
                    saleId: "18181818-1818-4181-8181-181818181818",
                    saleNumber: "12",
                    paymentMethod: "cash",
                },
                {
                    kind: "pos_payment",
                    id: "21212121-2121-4121-8121-212121212121",
                    amount: 45,
                    occurredAt: now,
                    storeId,
                    paymentId: "23232323-2323-4232-8232-232323232323",
                    saleId: "24242424-2424-4242-8242-242424242424",
                    saleNumber: "13",
                    paymentMethod: "cash",
                },
            ],
        });

        expect(markup).toContain("Bill edit reversal");
        expect(markup).toContain("Sale 12");
        expect(markup).toContain("Sale 13");
        expect(markup).toContain("POS Payment");
        expect(markup).toContain("Cash");
        expect(markup).toContain("Automatic reversal of the original tracked Payment");
        expect(markup).toContain(formatCurrency(-90));
        expect(markup).toContain(formatCurrency(45));
        expect(markup).not.toContain("No tracked POS Payments yet.");
    });

    test("shows a Purchase payment as a negative history entry linked to the Purchase", () => {
        const markup = renderHistoryPage("success", {
            moneyAccount: { ...moneyAccount, balance: 60 },
            openingBalance: 100,
            balance: 60,
            entries: [
                {
                    kind: "opening_balance",
                    amount: 100,
                    occurredAt: now,
                },
                {
                    kind: "outgoing_purchase_payment",
                    id: "14141414-1414-4141-8141-141414141414",
                    amount: -40,
                    occurredAt: now,
                    storeId,
                    outgoingPaymentId: "12121212-1212-4121-8121-121212121212",
                    purchaseId: "88888888-8888-4888-8888-888888888888",
                    vendorName: "Fresh Farms",
                    paymentMethod: "cash",
                },
            ],
        });

        expect(markup).toContain("Purchase payment");
        expect(markup).toContain("Fresh Farms");
        expect(markup).toContain("Cash");
        expect(markup).toContain("View Purchase");
        expect(markup).toContain(`/organizations/${organizationId}/purchases/88888888-8888-4888-8888-888888888888`);
        expect(markup).toContain(formatCurrency(-40));
    });

    test("shows an Expense payment as a negative history entry linked to the Expense", () => {
        const markup = renderHistoryPage("success", {
            moneyAccount: { ...moneyAccount, balance: 60 },
            openingBalance: 100,
            balance: 60,
            entries: [
                {
                    kind: "opening_balance",
                    amount: 100,
                    occurredAt: now,
                },
                {
                    kind: "outgoing_expense_payment",
                    id: "14141414-1414-4141-8141-141414141414",
                    amount: -40,
                    occurredAt: now,
                    storeId,
                    outgoingPaymentId: "12121212-1212-4121-8121-121212121212",
                    expenseId: "77777777-7777-4777-8777-777777777777",
                    expenseCategoryName: "Rent",
                    paymentMethod: "cash",
                },
            ],
        });

        expect(markup).toContain("Expense payment");
        expect(markup).toContain("Rent");
        expect(markup).toContain("Cash");
        expect(markup).toContain("View Expense");
        expect(markup).toContain(`/organizations/${organizationId}/expenses/77777777-7777-4777-8777-777777777777`);
        expect(markup).toContain(formatCurrency(-40));
    });

    test("shows an empty tracked-payments state with Opening Balance", () => {
        const markup = renderHistoryPage("empty");

        expect(markup).toContain("Opening Balance");
        expect(markup).toContain("No tracked POS Payments yet.");
        expect(markup).not.toContain("Sale 12");
    });

    test("keeps inactive-account history readable and explains blocked future routing", () => {
        const markup = renderHistoryPage("success", {
            ...historyWithPayments,
            moneyAccount: { ...moneyAccount, status: "inactive" },
        });

        expect(markup).toContain("This Money Account is inactive. Historic Movements remain visible.");
        expect(markup).toContain("those payments stay blocked until an administrator repairs the configuration");
        expect(markup).toContain("POS Payment");
        expect(markup).toContain("Sale 12");
        expect(markup).toContain("Immutable history");
    });

    test("shows a loading spinner while history is fetched", () => {
        const markup = renderHistoryPage("pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("data-testid=\"money-account-history-page\"");
    });

    test("shows an error state when history cannot be loaded", () => {
        const markup = renderHistoryPage("error");

        expect(markup).toContain("Unable to load account history");
        expect(markup).toContain("Money Account history could not be loaded right now.");
        expect(markup).toContain("Try again");
    });
});
