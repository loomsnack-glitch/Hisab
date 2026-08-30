import { beforeEach, describe, expect, test } from "bun:test";
import {
    adajanUpiAccount,
    createMoneyAccountRepo,
    getMoneyAccountById,
    getMoneyAccountsByOrganizationId,
    getOrganizationByIdForUser,
    getStoreById,
    hdfcBankAccount,
    inactiveMoneyAccountId,
    inactivePettyCashAccount,
    moneyAccountId,
    moneyAccountsService,
    organization,
    organizationId,
    otherOrganizationId,
    otherOrganizationStoreId,
    store,
    storeId,
    storeScopedMoneyAccountId,
    updateMoneyAccountRepo,
    userId,
} from "./money-accounts.service.test-harness";

describe("Organization Money Account service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getStoreById.mockClear();
        getMoneyAccountsByOrganizationId.mockClear();
        getMoneyAccountById.mockClear();
        createMoneyAccountRepo.mockClear();
        updateMoneyAccountRepo.mockClear();

        getOrganizationByIdForUser.mockResolvedValue(organization);
        getStoreById.mockResolvedValue(store);
        getMoneyAccountsByOrganizationId.mockResolvedValue([
            hdfcBankAccount,
            inactivePettyCashAccount,
            adajanUpiAccount,
        ]);
        getMoneyAccountById.mockResolvedValue(hdfcBankAccount);
        createMoneyAccountRepo.mockImplementation(async (data) => ({
            ...hdfcBankAccount,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: hdfcBankAccount.createdAt,
            updatedAt: hdfcBankAccount.updatedAt,
        }));
        updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...hdfcBankAccount,
            ...data,
            createdBy: hdfcBankAccount.createdBy,
            createdAt: hdfcBankAccount.createdAt,
            updatedAt: hdfcBankAccount.updatedAt,
        }));
    });

    test("lists Organization-wide and Store-scoped Money Accounts for a member", async () => {
        const response = await moneyAccountsService.getMoneyAccounts(userId, organizationId);

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccounts).toHaveLength(3);
        expect(
            response.data?.moneyAccounts.some(
                (account) => account.name === "HDFC Current" && account.scope === "organization_wide" && account.storeId === null,
            ),
        ).toBe(true);
        expect(
            response.data?.moneyAccounts.some(
                (account) =>
                    account.name === "Adajan UPI QR" &&
                    account.scope === "store_scoped" &&
                    account.storeId === storeId &&
                    account.status === "active",
            ),
        ).toBe(true);
        expect(
            response.data?.moneyAccounts.some(
                (account) =>
                    account.name === "Office petty cash" &&
                    account.type === "petty_cash" &&
                    account.status === "inactive",
            ),
        ).toBe(true);
        expect(getMoneyAccountsByOrganizationId).toHaveBeenCalledWith(organizationId);
    });

    test("denies Money Account listing when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await moneyAccountsService.getMoneyAccounts(userId, otherOrganizationId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(getMoneyAccountsByOrganizationId).not.toHaveBeenCalled();
    });

    test("retrieves one Organization-wide Money Account for a member", async () => {
        const response = await moneyAccountsService.getMoneyAccountDetails(userId, organizationId, moneyAccountId);

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.id).toBe(moneyAccountId);
        expect(response.data?.moneyAccount.scope).toBe("organization_wide");
        expect(response.data?.moneyAccount.storeId).toBeNull();
        expect(getMoneyAccountById).toHaveBeenCalledWith(organizationId, moneyAccountId);
    });

    test("retrieves one Store-scoped Money Account for a member", async () => {
        getMoneyAccountById.mockResolvedValue(adajanUpiAccount);

        const response = await moneyAccountsService.getMoneyAccountDetails(
            userId,
            organizationId,
            storeScopedMoneyAccountId,
        );

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.scope).toBe("store_scoped");
        expect(response.data?.moneyAccount.storeId).toBe(storeId);
        expect(response.data?.moneyAccount.name).toBe("Adajan UPI QR");
    });

    test("creates an Organization-wide Bank Money Account as active by default", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "HDFC Current",
            type: "bank",
        });

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.moneyAccount.status).toBe("active");
        expect(response.data?.moneyAccount.scope).toBe("organization_wide");
        expect(response.data?.moneyAccount.storeId).toBeNull();
        expect(response.data?.moneyAccount.organizationId).toBe(organizationId);
        expect(getStoreById).not.toHaveBeenCalled();
        expect(createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId,
                name: "HDFC Current",
                type: "bank",
                scope: "organization_wide",
                storeId: null,
                notes: null,
                status: "active",
                createdBy: userId,
            }),
        );
    });

    test("creates Organization-wide UPI, Card Settlement, Petty Cash, and Other Money Accounts", async () => {
        for (const type of ["upi", "card_settlement", "petty_cash", "other"] as const) {
            createMoneyAccountRepo.mockClear();

            const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
                name: `${type} account`,
                type,
            });

            expect(response.status).toBe("success");
            expect(createMoneyAccountRepo).toHaveBeenCalledWith(
                expect.objectContaining({
                    type,
                    scope: "organization_wide",
                    storeId: null,
                }),
            );
        }
    });

    test("creates a Store-scoped Money Account for a Store in the Organization", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Adajan UPI QR",
            type: "upi",
            scope: "store_scoped",
            storeId,
        });

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.scope).toBe("store_scoped");
        expect(response.data?.moneyAccount.storeId).toBe(storeId);
        expect(getStoreById).toHaveBeenCalledWith(organizationId, storeId);
        expect(createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Adajan UPI QR",
                type: "upi",
                scope: "store_scoped",
                storeId,
            }),
        );
    });

    test("creates a Money Account with optional notes and explicit status", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "HDFC Current",
            type: "bank",
            notes: "Main operating account",
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "HDFC Current",
                notes: "Main operating account",
                status: "inactive",
            }),
        );
    });

    test("stores blank notes as null", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "HDFC Current",
            type: "bank",
            notes: "",
        });

        expect(response.status).toBe("success");
        expect(createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                notes: null,
            }),
        );
    });

    test("rejects a Store-scoped Money Account without a Store", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Adajan UPI QR",
            type: "upi",
            scope: "store_scoped",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Store is required for a Store-scoped Money Account");
        expect(createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects a Store from another Organization", async () => {
        getStoreById.mockResolvedValue(null);

        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Adajan UPI QR",
            type: "upi",
            scope: "store_scoped",
            storeId: otherOrganizationStoreId,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Store not found");
        expect(getStoreById).toHaveBeenCalledWith(organizationId, otherOrganizationStoreId);
        expect(createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects Store assignment on an Organization-wide Money Account", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "HDFC Current",
            type: "bank",
            scope: "organization_wide",
            storeId,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("An Organization-wide Money Account cannot have a Store assignment");
        expect(createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("updates a Money Account name, type, notes, and status", async () => {
        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            {
                name: "HDFC Current Co",
                type: "upi",
                notes: "Updated notes",
                status: "inactive",
            },
        );

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.name).toBe("HDFC Current Co");
        expect(response.data?.moneyAccount.type).toBe("upi");
        expect(response.data?.moneyAccount.notes).toBe("Updated notes");
        expect(response.data?.moneyAccount.status).toBe("inactive");
        expect(response.data?.moneyAccount.scope).toBe("organization_wide");
        expect(response.data?.moneyAccount.storeId).toBeNull();
        expect(updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: moneyAccountId,
                organizationId,
                name: "HDFC Current Co",
                type: "upi",
                scope: "organization_wide",
                storeId: null,
                notes: "Updated notes",
                status: "inactive",
                updatedBy: userId,
            }),
        );
    });

    test("moves an Organization-wide Money Account to Store scope", async () => {
        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            {
                scope: "store_scoped",
                storeId,
            },
        );

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.scope).toBe("store_scoped");
        expect(response.data?.moneyAccount.storeId).toBe(storeId);
        expect(getStoreById).toHaveBeenCalledWith(organizationId, storeId);
        expect(updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                scope: "store_scoped",
                storeId,
            }),
        );
    });

    test("moves a Store-scoped Money Account to Organization-wide and removes its Store", async () => {
        getMoneyAccountById.mockResolvedValue(adajanUpiAccount);

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            storeScopedMoneyAccountId,
            { scope: "organization_wide" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.scope).toBe("organization_wide");
        expect(response.data?.moneyAccount.storeId).toBeNull();
        expect(updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: storeScopedMoneyAccountId,
                scope: "organization_wide",
                storeId: null,
            }),
        );
    });

    test("rejects moving to Store scope without a Store", async () => {
        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            { scope: "store_scoped" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Store is required for a Store-scoped Money Account");
        expect(updateMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects assigning a Store from another Organization on update", async () => {
        getStoreById.mockResolvedValue(null);

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            {
                scope: "store_scoped",
                storeId: otherOrganizationStoreId,
            },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Store not found");
        expect(updateMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("reactivates an inactive Money Account", async () => {
        getMoneyAccountById.mockResolvedValue(inactivePettyCashAccount);
        updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...inactivePettyCashAccount,
            ...data,
            createdBy: inactivePettyCashAccount.createdBy,
            createdAt: inactivePettyCashAccount.createdAt,
            updatedAt: inactivePettyCashAccount.updatedAt,
        }));

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            inactiveMoneyAccountId,
            { status: "active" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.status).toBe("active");
        expect(response.data?.moneyAccount.name).toBe("Office petty cash");
        expect(response.data?.moneyAccount.scope).toBe("organization_wide");
    });

    test("does not expose a Money Account deletion command", () => {
        expect("deleteMoneyAccount" in moneyAccountsService).toBe(false);
    });

    test("returns not found when updating a Money Account from another Organization", async () => {
        getMoneyAccountById.mockResolvedValue(null);

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            { status: "inactive" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(updateMoneyAccountRepo).not.toHaveBeenCalled();
    });
});
