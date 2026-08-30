import { mock } from "bun:test";
import type { MoneyAccountDTO } from "@repo/types";

export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const moneyAccountId = "11111111-1111-4111-8111-111111111111";
export const inactiveMoneyAccountId = "22222222-2222-4222-8222-222222222222";
export const now = new Date("2026-08-31T12:00:00.000Z");

export const organization = { id: organizationId, name: "Demo Org" };

export const hdfcBankAccount: MoneyAccountDTO = {
    id: moneyAccountId,
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

export const gpayUpiAccount: MoneyAccountDTO = {
    id: "33333333-3333-4333-8333-333333333333",
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

export const inactivePettyCashAccount: MoneyAccountDTO = {
    id: inactiveMoneyAccountId,
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

export const getOrganizationByIdForUser = mock(async () => organization);
export const getMoneyAccountsByOrganizationId = mock(async () => [
    hdfcBankAccount,
    inactivePettyCashAccount,
    gpayUpiAccount,
]);
export const getMoneyAccountById = mock(async () => hdfcBankAccount);

type CreateMoneyAccountRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    type: MoneyAccountDTO["type"];
    scope: MoneyAccountDTO["scope"];
    notes: string | null;
    status: MoneyAccountDTO["status"];
    createdBy: string;
    updatedBy?: string | null;
};

type UpdateMoneyAccountRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    type: MoneyAccountDTO["type"];
    scope: MoneyAccountDTO["scope"];
    notes: string | null;
    status: MoneyAccountDTO["status"];
    updatedBy: string;
};

export const createMoneyAccountRepo = mock(async (data: CreateMoneyAccountRepoArg) => ({
    ...hdfcBankAccount,
    ...data,
    createdAt: now,
    updatedAt: now,
    updatedBy: data.updatedBy ?? null,
}));

export const updateMoneyAccountRepo = mock(async (data: UpdateMoneyAccountRepoArg) => ({
    ...hdfcBankAccount,
    ...data,
    updatedAt: now,
}));

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
}));

mock.module("./money-accounts.repository", () => ({
    getMoneyAccountsByOrganizationId,
    getMoneyAccountById,
    createMoneyAccount: createMoneyAccountRepo,
    updateMoneyAccount: updateMoneyAccountRepo,
}));

export const moneyAccountsService = await import("./money-accounts.service");
