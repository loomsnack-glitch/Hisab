import { mock } from "bun:test";
import type { MoneyAccountDTO } from "@repo/types";

export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const moneyAccountId = "11111111-1111-4111-8111-111111111111";
export const inactiveMoneyAccountId = "22222222-2222-4222-8222-222222222222";
export const storeScopedMoneyAccountId = "44444444-4444-4444-8444-444444444444";
export const cashMoneyAccountId = "55555555-5555-4555-8555-555555555555";
export const inactiveCashMoneyAccountId = "66666666-6666-4666-8666-666666666666";
export const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const otherOrganizationStoreId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const vesuStoreId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
export const now = new Date("2026-08-31T12:00:00.000Z");

export const organization = { id: organizationId, name: "Demo Org" };
export const store = { id: storeId, organizationId, name: "Adajan" };
export const vesuStore = { id: vesuStoreId, organizationId, name: "Vesu" };

export const hdfcBankAccount: MoneyAccountDTO = {
    id: moneyAccountId,
    organizationId,
    name: "HDFC Current",
    type: "bank",
    scope: "organization_wide",
    storeId: null,
    notes: "Main operating account",
    status: "active",
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const gpayUpiAccount: MoneyAccountDTO = {
    id: "33333333-3333-4333-8333-333333333333",
    organizationId,
    name: "Shared UPI QR",
    type: "upi",
    scope: "organization_wide",
    storeId: null,
    notes: null,
    status: "active",
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const inactivePettyCashAccount: MoneyAccountDTO = {
    id: inactiveMoneyAccountId,
    organizationId,
    name: "Office petty cash",
    type: "petty_cash",
    scope: "organization_wide",
    storeId: null,
    notes: null,
    status: "inactive",
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const adajanUpiAccount: MoneyAccountDTO = {
    id: storeScopedMoneyAccountId,
    organizationId,
    name: "Adajan UPI QR",
    type: "upi",
    scope: "store_scoped",
    storeId,
    notes: "Counter QR",
    status: "active",
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const adajanCashAccount: MoneyAccountDTO = {
    id: cashMoneyAccountId,
    organizationId,
    name: "Adajan cash",
    type: "cash",
    scope: "store_scoped",
    storeId,
    notes: "Physical till",
    status: "active",
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const inactiveAdajanCashAccount: MoneyAccountDTO = {
    id: inactiveCashMoneyAccountId,
    organizationId,
    name: "Old Adajan till",
    type: "cash",
    scope: "store_scoped",
    storeId,
    notes: null,
    status: "inactive",
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const activeCashUniqueViolation = () =>
    Object.assign(new Error("duplicate key value violates unique constraint \"money_accounts_one_active_cash_per_store\""), {
        code: "23505",
        constraint: "money_accounts_one_active_cash_per_store",
    });

export const messageOnlyActiveCashUniqueViolation = () =>
    new Error('duplicate key value violates unique constraint "money_accounts_one_active_cash_per_store"');

export const wrappedActiveCashUniqueViolation = () =>
    Object.assign(new Error("Failed query: insert into \"money_accounts\""), {
        cause: Object.assign(
            new Error('duplicate key value violates unique constraint "money_accounts_one_active_cash_per_store"'),
            { code: "23505" },
        ),
    });

export const getOrganizationByIdForUser = mock(async () => organization);
export const getStoreById = mock(async () => store);
export const getMoneyAccountsByOrganizationId = mock(async () => [
    hdfcBankAccount,
    inactivePettyCashAccount,
    gpayUpiAccount,
    adajanUpiAccount,
]);
export const getMoneyAccountById = mock(async () => hdfcBankAccount);

type CreateMoneyAccountRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    type: MoneyAccountDTO["type"];
    scope: MoneyAccountDTO["scope"];
    storeId: string | null;
    notes: string | null;
    status: MoneyAccountDTO["status"];
    openingBalance: number;
    createdBy: string;
    updatedBy?: string | null;
};

type UpdateMoneyAccountRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    type: MoneyAccountDTO["type"];
    scope: MoneyAccountDTO["scope"];
    storeId: string | null;
    notes: string | null;
    status: MoneyAccountDTO["status"];
    openingBalance: number;
    updatedBy: string;
};

export const createMoneyAccountRepo = mock(async (data: CreateMoneyAccountRepoArg) => ({
    ...hdfcBankAccount,
    ...data,
    balance: data.openingBalance,
    hasMovements: false,
    createdAt: now,
    updatedAt: now,
    updatedBy: data.updatedBy ?? null,
}));

export const updateMoneyAccountRepo = mock(async (data: UpdateMoneyAccountRepoArg) => ({
    ...hdfcBankAccount,
    ...data,
    balance: data.openingBalance,
    hasMovements: hdfcBankAccount.hasMovements,
    updatedAt: now,
}));

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
    getStoreById,
}));

mock.module("./money-accounts.repository", () => ({
    getMoneyAccountsByOrganizationId,
    getMoneyAccountById,
    createMoneyAccount: createMoneyAccountRepo,
    updateMoneyAccount: updateMoneyAccountRepo,
}));

export const moneyAccountsService = await import("./money-accounts.service");
