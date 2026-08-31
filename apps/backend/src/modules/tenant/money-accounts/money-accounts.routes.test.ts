import { beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "@/types/hono";
import { PaymentMethodSchema } from "@repo/types";
import { authMiddleware } from "@/middlewares/auth.middleware";

const harness = await import("./money-accounts.service.test-harness");
const { createMoneyAccountsRoutes } = await import("./money-accounts.routes");

const authenticatedUser: MiddlewareHandler<{ Variables: AppVariables }> = async (context, next) => {
    context.set("authUser", { id: harness.userId } as AppVariables["authUser"]);
    await next();
};

const moneyAccountsRoutes = createMoneyAccountsRoutes(authenticatedUser);
const unauthenticatedRoutes = createMoneyAccountsRoutes(authMiddleware);

describe("Organization Money Account routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getStoreById.mockClear();
        harness.getMoneyAccountsByOrganizationId.mockClear();
        harness.getMoneyAccountById.mockClear();
        harness.createMoneyAccountRepo.mockClear();
        harness.updateMoneyAccountRepo.mockClear();

        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getStoreById.mockResolvedValue(harness.store);
        harness.getMoneyAccountsByOrganizationId.mockResolvedValue([
            harness.hdfcBankAccount,
            harness.inactivePettyCashAccount,
            harness.gpayUpiAccount,
            harness.adajanUpiAccount,
            harness.adajanCashAccount,
            harness.inactiveAdajanCashAccount,
        ]);
        harness.getMoneyAccountById.mockResolvedValue(harness.hdfcBankAccount);
        harness.createMoneyAccountRepo.mockImplementation(async (data) => ({
            ...harness.hdfcBankAccount,
            ...data,
            openingBalance: data.openingBalance,
            balance: data.openingBalance,
            hasMovements: false,
            updatedBy: data.updatedBy ?? null,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
        harness.updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...harness.hdfcBankAccount,
            ...data,
            openingBalance: data.openingBalance,
            balance: data.openingBalance,
            hasMovements: harness.hdfcBankAccount.hasMovements,
            createdBy: harness.hdfcBankAccount.createdBy,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
    });

    test("rejects unauthenticated Money Account listing with administrator authentication", async () => {
        const response = await unauthenticatedRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
        );

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Authentication is required");
        expect(body.message).not.toBe("Device authentication is required");
    });

    test("lists Organization-wide and Store-scoped Money Accounts for an authenticated administrator", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.moneyAccounts).toHaveLength(6);
        expect(
            body.data.moneyAccounts.some(
                (account: { name: string; scope: string; storeId: string | null }) =>
                    account.name === "HDFC Current" &&
                    account.scope === "organization_wide" &&
                    account.storeId === null,
            ),
        ).toBe(true);
        expect(
            body.data.moneyAccounts.some(
                (account: { name: string; scope: string; storeId: string | null }) =>
                    account.name === "Adajan UPI QR" &&
                    account.scope === "store_scoped" &&
                    account.storeId === harness.storeId,
            ),
        ).toBe(true);
        expect(
            body.data.moneyAccounts.some(
                (account: { name: string; type: string; storeId: string | null; status: string }) =>
                    account.name === "Adajan cash" &&
                    account.type === "cash" &&
                    account.storeId === harness.storeId &&
                    account.status === "active",
            ),
        ).toBe(true);
        expect(
            body.data.moneyAccounts.some(
                (account: { name: string; type: string; status: string }) =>
                    account.name === "Old Adajan till" &&
                    account.type === "cash" &&
                    account.status === "inactive",
            ),
        ).toBe(true);
    });

    test("retrieves one Organization-wide Money Account for an authenticated administrator", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts/${harness.moneyAccountId}`,
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.moneyAccount.name).toBe("HDFC Current");
        expect(body.data.moneyAccount.scope).toBe("organization_wide");
        expect(body.data.moneyAccount.storeId).toBeNull();
        expect(body.data.moneyAccount.openingBalance).toBe(0);
        expect(body.data.moneyAccount.balance).toBe(0);
    });

    test("creates an Organization-wide Money Account at the Organization administrator seam", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "HDFC Current", type: "bank", notes: "Main operating account" }),
            },
        );

        expect(response.status).toBe(201);
        expect(harness.createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId: harness.organizationId,
                name: "HDFC Current",
                type: "bank",
                scope: "organization_wide",
                storeId: null,
                notes: "Main operating account",
                status: "active",
            }),
        );
    });

    test("creates a Store-scoped Money Account at the Organization administrator seam", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Adajan UPI QR",
                    type: "upi",
                    scope: "store_scoped",
                    storeId: harness.storeId,
                }),
            },
        );

        expect(response.status).toBe(201);
        expect(harness.getStoreById).toHaveBeenCalledWith(harness.organizationId, harness.storeId);
        expect(harness.createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Adajan UPI QR",
                type: "upi",
                scope: "store_scoped",
                storeId: harness.storeId,
            }),
        );
    });

    test("rejects an Organization-wide Cash Money Account payload", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Store cash", type: "cash" }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("creates a Store-scoped Cash Money Account at the Organization administrator seam", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Adajan cash",
                    type: "cash",
                    scope: "store_scoped",
                    storeId: harness.storeId,
                }),
            },
        );

        expect(response.status).toBe(201);
        expect(harness.getStoreById).toHaveBeenCalledWith(harness.organizationId, harness.storeId);
        expect(harness.createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Adajan cash",
                type: "cash",
                scope: "store_scoped",
                storeId: harness.storeId,
                status: "active",
            }),
        );
    });

    test("rejects a Cash Money Account without a Store", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Adajan cash",
                    type: "cash",
                    scope: "store_scoped",
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects a second active Cash Money Account for the same Store", async () => {
        harness.createMoneyAccountRepo.mockImplementation(async () => {
            throw harness.activeCashUniqueViolation();
        });

        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Second till",
                    type: "cash",
                    scope: "store_scoped",
                    storeId: harness.storeId,
                }),
            },
        );

        expect(response.status).toBe(409);
        const body = await response.json();
        expect(body.message).toBe("This Store already has an active Cash Money Account");
        expect(body.message).not.toContain("duplicate key");
    });

    test("does not expose a Postgres unique-constraint message for a second active Cash account", async () => {
        harness.createMoneyAccountRepo.mockImplementation(async () => {
            throw harness.messageOnlyActiveCashUniqueViolation();
        });

        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Second till",
                    type: "cash",
                    scope: "store_scoped",
                    storeId: harness.storeId,
                }),
            },
        );

        expect(response.status).toBe(409);
        const body = await response.json();
        expect(body.message).toBe("This Store already has an active Cash Money Account");
        expect(JSON.stringify(body)).not.toContain("duplicate key");
        expect(JSON.stringify(body)).not.toContain("money_accounts_one_active_cash_per_store");
    });

    test("deactivates a Store Cash Account and then activates its replacement", async () => {
        harness.getMoneyAccountById.mockResolvedValue(harness.adajanCashAccount);
        harness.updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...harness.adajanCashAccount,
            ...data,
            createdBy: harness.adajanCashAccount.createdBy,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));

        const deactivate = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts/${harness.cashMoneyAccountId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "inactive" }),
            },
        );

        expect(deactivate.status).toBe(200);
        expect((await deactivate.json()).data.moneyAccount.status).toBe("inactive");

        harness.getMoneyAccountById.mockResolvedValue(harness.inactiveAdajanCashAccount);
        harness.updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...harness.inactiveAdajanCashAccount,
            ...data,
            createdBy: harness.inactiveAdajanCashAccount.createdBy,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));

        const activateReplacement = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts/${harness.inactiveCashMoneyAccountId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "active" }),
            },
        );

        expect(activateReplacement.status).toBe(200);
        const body = await activateReplacement.json();
        expect(body.data.moneyAccount.status).toBe("active");
        expect(body.data.moneyAccount.type).toBe("cash");
        expect(body.data.moneyAccount.storeId).toBe(harness.storeId);
    });

    test("rejects Store assignment on an Organization-wide Money Account", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "HDFC Current",
                    type: "bank",
                    storeId: harness.storeId,
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects a Store-scoped Money Account without a Store", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Adajan UPI QR",
                    type: "upi",
                    scope: "store_scoped",
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects a Store from another Organization", async () => {
        harness.getStoreById.mockResolvedValue(null);

        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Adajan UPI QR",
                    type: "upi",
                    scope: "store_scoped",
                    storeId: harness.otherOrganizationStoreId,
                }),
            },
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Store not found");
        expect(harness.createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects sensitive financial identifier fields", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "HDFC Current",
                    type: "bank",
                    bankAccountNumber: "123456789012",
                    upiId: "shop@upi",
                    balance: 1000,
                    hasMovements: true,
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects a Money Account without a name", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "bank" }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("updates Money Account status for the authenticated Organization", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts/${harness.moneyAccountId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "inactive" }),
            },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.moneyAccount.status).toBe("inactive");
        expect(body.data.moneyAccount.name).toBe("HDFC Current");
        expect(body.data.moneyAccount.scope).toBe("organization_wide");
    });

    test("moves a Money Account between Store scope and Organization-wide scope", async () => {
        const toStoreScoped = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts/${harness.moneyAccountId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scope: "store_scoped", storeId: harness.storeId }),
            },
        );

        expect(toStoreScoped.status).toBe(200);
        expect(harness.updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                scope: "store_scoped",
                storeId: harness.storeId,
            }),
        );

        harness.getMoneyAccountById.mockResolvedValue(harness.adajanUpiAccount);
        harness.updateMoneyAccountRepo.mockClear();

        const toOrganizationWide = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts/${harness.storeScopedMoneyAccountId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scope: "organization_wide" }),
            },
        );

        expect(toOrganizationWide.status).toBe(200);
        expect(harness.updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                scope: "organization_wide",
                storeId: null,
            }),
        );
    });

    test("denies Money Account access when the user is not a member of the Organization", async () => {
        harness.getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
        );

        expect(response.status).toBe(404);
        expect(harness.getMoneyAccountsByOrganizationId).not.toHaveBeenCalled();
    });

    test("creates a Money Account with an Opening Balance for an authenticated administrator", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "HDFC Current",
                    type: "bank",
                    openingBalance: 500,
                }),
            },
        );

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body.data.moneyAccount.openingBalance).toBe(500);
        expect(body.data.moneyAccount.balance).toBe(500);
        expect(harness.createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                openingBalance: 500,
            }),
        );
    });

    test("rejects Opening Balance changes after the first Movement", async () => {
        harness.getMoneyAccountById.mockResolvedValue({
            ...harness.hdfcBankAccount,
            hasMovements: true,
            openingBalance: 100,
            balance: 250,
        });

        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts/${harness.moneyAccountId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ openingBalance: 50 }),
            },
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toContain("cannot be changed after this Money Account has Movements");
        expect(harness.updateMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("does not expose a Money Account deletion route", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts/${harness.moneyAccountId}`,
            { method: "DELETE" },
        );

        expect(response.status).toBe(404);
        expect(harness.updateMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("does not expose Money Account configuration through device-authenticated POS access", () => {
        const posRoutes = readFileSync(join(import.meta.dir, "..", "..", "pos", "pos.routes.ts"), "utf8");

        expect(posRoutes).not.toContain("money-accounts");
        expect(posRoutes).not.toContain("Money Account");
        expect(PaymentMethodSchema.options).toEqual(["cash", "upi", "card", "bank_transfer", "other"]);
    });
});
