import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
    MONEY_ACCOUNT_SCOPE_LABELS,
    MONEY_ACCOUNT_TYPE_LABELS,
    type MoneyAccountDTO,
} from "@repo/types";

import { moneyAccountKeys, organizationKeys } from "@/lib/query-keys";
import MoneyAccountsPage from "@/pages/money-accounts-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-08-31T12:00:00.000Z");
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const trackedMoney = {
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
} as const;

const hdfcBank: MoneyAccountDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "HDFC Current",
    type: "bank",
    scope: "organization_wide",
    storeId: null,
    notes: "Main operating account",
    status: "active",
    ...trackedMoney,
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
    storeId: null,
    notes: null,
    status: "active",
    ...trackedMoney,
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
    storeId: null,
    notes: null,
    status: "active",
    ...trackedMoney,
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
    storeId: null,
    notes: null,
    status: "inactive",
    ...trackedMoney,
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
    storeId: null,
    notes: "Non-sensitive purpose note",
    status: "active",
    ...trackedMoney,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const adajanUpi: MoneyAccountDTO = {
    id: "66666666-6666-4666-8666-666666666666",
    organizationId,
    name: "Adajan UPI QR",
    type: "upi",
    scope: "store_scoped",
    storeId,
    notes: "Counter QR",
    status: "active",
    ...trackedMoney,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const adajanCash: MoneyAccountDTO = {
    id: "77777777-7777-4777-8777-777777777777",
    organizationId,
    name: "Adajan cash",
    type: "cash",
    scope: "store_scoped",
    storeId,
    notes: "Physical till",
    status: "active",
    ...trackedMoney,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const inactiveAdajanCash: MoneyAccountDTO = {
    id: "88888888-8888-4888-8888-888888888888",
    organizationId,
    name: "Old Adajan till",
    type: "cash",
    scope: "store_scoped",
    storeId,
    notes: null,
    status: "inactive",
    ...trackedMoney,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const allAccounts = [hdfcBank, sharedUpi, cardSettlement, pettyCash, otherAccount, adajanUpi, adajanCash, inactiveAdajanCash];

const seedOrganizationDetails = (queryClient: QueryClient) => {
    queryClient.setQueryData(organizationKeys.detail(organizationId), {
        status: "success",
        data: {
            organization: {
                id: organizationId,
                name: "Demo Org",
                username: "demo",
                tagline: null,
                createdBy: userId,
                updatedBy: null,
                createdAt: now,
                updatedAt: now,
                stores: [
                    {
                        id: storeId,
                        organizationId,
                        name: "Adajan",
                        address: null,
                        devices: [],
                        createdBy: userId,
                        createdAt: now,
                        updatedAt: now,
                    },
                ],
            },
        },
        message: "Organization fetched successfully",
        code: 200,
    });
};

const renderMoneyAccountsPage = (
    result: "pending" | "success" | "error" | "empty" = "success",
    moneyAccounts: MoneyAccountDTO[] = allAccounts,
) => {
    const queryClient = new QueryClient();
    seedOrganizationDetails(queryClient);
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
    test("shows Organization-wide and Store-scoped Money Accounts with type, scope, Store, status, search, and no delete command", () => {
        const markup = renderMoneyAccountsPage();

        expect(markup).toContain("data-testid=\"money-accounts-page\"");
        expect(markup).toContain("HDFC Current");
        expect(markup).toContain("Main operating account");
        expect(markup).toContain("Shared UPI QR");
        expect(markup).toContain("Card machine settlement");
        expect(markup).toContain("Office petty cash");
        expect(markup).toContain("Director wallet");
        expect(markup).toContain("Adajan UPI QR");
        expect(markup).toContain("Adajan cash");
        expect(markup).toContain("Old Adajan till");
        expect(markup).toContain("Adajan");
        expect(markup).toContain(MONEY_ACCOUNT_TYPE_LABELS.bank);
        expect(markup).toContain(MONEY_ACCOUNT_TYPE_LABELS.upi);
        expect(markup).toContain(MONEY_ACCOUNT_TYPE_LABELS.card_settlement);
        expect(markup).toContain(MONEY_ACCOUNT_TYPE_LABELS.petty_cash);
        expect(markup).toContain(MONEY_ACCOUNT_TYPE_LABELS.other);
        expect(markup).toContain(MONEY_ACCOUNT_TYPE_LABELS.cash);
        expect(markup).toContain(MONEY_ACCOUNT_SCOPE_LABELS.organization_wide);
        expect(markup).toContain(MONEY_ACCOUNT_SCOPE_LABELS.store_scoped);
        expect(markup).toContain("Every store");
        expect(markup).toContain("Opening Balance");
        expect(markup).toContain("Balance");
        expect(markup).toContain("Add money account");
        expect(markup).toContain("Search money accounts...");
        expect(markup).toContain("Status");
        expect(markup).toContain("Type");
        expect(markup).toContain("Scope");
        expect(markup).toContain("Store");
        expect(markup).toContain("active");
        expect(markup).toContain("inactive");
        expect(markup).toContain("Edit");
        expect(markup).toContain("View history");
        expect(markup).not.toContain("Delete");
        expect(markup).not.toContain("bank account number");
        expect(markup).not.toContain("UPI ID");
    });

    test("shows Opening Balance, calculated Balance, and lock state after Movements", () => {
        const lockedBank: MoneyAccountDTO = {
            ...hdfcBank,
            openingBalance: 500,
            balance: 500,
            hasMovements: true,
        };
        const markup = renderMoneyAccountsPage("success", [lockedBank]);

        expect(markup).toContain("Opening Balance");
        expect(markup).toContain("Balance");
        expect(markup).toContain("Type, availability, Store, and Opening Balance are locked");
        expect(markup).not.toContain("current balance");
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
        expect(markup).toContain("Cash, Bank, UPI, Card Settlement, Petty Cash, or Other");
        expect(markup).toContain("Cash belongs to one Store");
        expect(markup).not.toContain("Delete");
    });
});
