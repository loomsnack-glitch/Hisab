import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
    ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS,
    type MoneyAccountDTO,
} from "@repo/types";

import { moneyAccountKeys } from "@/lib/query-keys";
import MoneyAccountsPage from "@/pages/money-accounts-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = new Date("2026-08-31T12:00:00.000Z");
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const hdfcBank: MoneyAccountDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "HDFC Current",
    type: "bank",
    scope: "organization_wide",
    notes: "Main operating account",
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const sharedUpi: MoneyAccountDTO = {
    id: "22222222-2222-4222-8222-222222222222",
    organizationId,
    name: "Shared UPI QR",
    type: "upi",
    scope: "organization_wide",
    notes: null,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const cardSettlement: MoneyAccountDTO = {
    id: "33333333-3333-4333-8333-333333333333",
    organizationId,
    name: "Card machine settlement",
    type: "card_settlement",
    scope: "organization_wide",
    notes: null,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const pettyCash: MoneyAccountDTO = {
    id: "44444444-4444-4444-8444-444444444444",
    organizationId,
    name: "Office petty cash",
    type: "petty_cash",
    scope: "organization_wide",
    notes: null,
    status: "inactive",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const otherAccount: MoneyAccountDTO = {
    id: "55555555-5555-4555-8555-555555555555",
    organizationId,
    name: "Director wallet",
    type: "other",
    scope: "organization_wide",
    notes: "Non-sensitive purpose note",
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const allAccounts = [hdfcBank, sharedUpi, cardSettlement, pettyCash, otherAccount];

const renderMoneyAccountsPage = (
    result: "pending" | "success" | "error" | "empty" = "success",
    moneyAccounts: MoneyAccountDTO[] = allAccounts,
) => {
    const queryClient = new QueryClient();
    if (result !== "pending") {
        queryClient.setQueryData(moneyAccountKeys.list(organizationId), {
            status: result === "error" ? "error" : "success",
            data: result === "error" ? null : { moneyAccounts: result === "empty" ? [] : moneyAccounts },
            message:
                result === "error"
                    ? "Money Accounts could not be loaded right now."
                    : "Money Accounts fetched successfully",
            code: result === "error" ? 500 : 200,
        });
    }

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/money-accounts`]}>
                <Routes>
                    <Route
                        path="/organizations/:organizationId/money-accounts"
                        element={<MoneyAccountsPage />}
                    />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe("Admin Money Accounts page", () => {
    test("shows Organization-wide Money Accounts with type, scope, status, search, and no delete command", () => {
        const markup = renderMoneyAccountsPage();

        expect(markup).toContain("data-testid=\"money-accounts-page\"");
        expect(markup).toContain("HDFC Current");
        expect(markup).toContain("Main operating account");
        expect(markup).toContain("Shared UPI QR");
        expect(markup).toContain("Card machine settlement");
        expect(markup).toContain("Office petty cash");
        expect(markup).toContain("Director wallet");
        expect(markup).toContain(ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS.bank);
        expect(markup).toContain(ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS.upi);
        expect(markup).toContain(ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS.card_settlement);
        expect(markup).toContain(ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS.petty_cash);
        expect(markup).toContain(ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS.other);
        expect(markup).toContain("Organization-wide");
        expect(markup).toContain("Add money account");
        expect(markup).toContain("Search money accounts...");
        expect(markup).toContain("Status");
        expect(markup).toContain("Type");
        expect(markup).toContain("active");
        expect(markup).toContain("inactive");
        expect(markup).toContain("Edit");
        expect(markup).not.toContain("Delete");
        expect(markup).not.toContain("Store Cash");
        expect(markup).not.toContain("bank account number");
        expect(markup).not.toContain("UPI ID");
        expect(markup).not.toContain("Select store");
    });

    test("shows a loading spinner while Money Accounts are fetched", () => {
        const markup = renderMoneyAccountsPage("pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("data-testid=\"money-accounts-page\"");
    });

    test("shows an error state when Money Accounts cannot be loaded", () => {
        const markup = renderMoneyAccountsPage("error");

        expect(markup).toContain("Unable to load money accounts");
        expect(markup).toContain("Money Accounts could not be loaded right now.");
        expect(markup).toContain("Try again");
    });

    test("shows an empty state with a create action", () => {
        const markup = renderMoneyAccountsPage("empty");

        expect(markup).toContain("No money accounts yet");
        expect(markup).toContain("Add money account");
        expect(markup).toContain("Bank, UPI, Card Settlement, Petty Cash, or Other");
        expect(markup).not.toContain("Delete");
    });
});
