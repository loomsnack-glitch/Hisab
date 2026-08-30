import { beforeEach, describe, expect, test } from "bun:test";
import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "@/types/hono";
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
        ]);
        harness.getMoneyAccountById.mockResolvedValue(harness.hdfcBankAccount);
        harness.createMoneyAccountRepo.mockImplementation(async (data) => ({
            ...harness.hdfcBankAccount,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
        harness.updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...harness.hdfcBankAccount,
            ...data,
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
        expect(body.data.moneyAccounts).toHaveLength(4);
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

    test("rejects a Cash Money Account payload", async () => {
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

    test("does not expose a Money Account deletion route", async () => {
        const response = await moneyAccountsRoutes.request(
            `http://localhost/${harness.organizationId}/money-accounts/${harness.moneyAccountId}`,
            { method: "DELETE" },
        );

        expect(response.status).toBe(404);
        expect(harness.updateMoneyAccountRepo).not.toHaveBeenCalled();
    });
});
