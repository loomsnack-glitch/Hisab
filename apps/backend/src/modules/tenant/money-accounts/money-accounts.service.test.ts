import { beforeEach, describe, expect, test } from "bun:test";
import {
    adajanUpiAccount,
    createMoneyAccountRepo,
    getMoneyAccountById,
    getMoneyAccountsByOrganizationId,
    getOrganizationByIdForUser,
    getStoreById,
    hdfcBankAccount,
    inactiveAdajanCashAccount,
    inactiveCashMoneyAccountId,
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
    vesuStore,
    vesuStoreId,
    adajanCashAccount,
    cashMoneyAccountId,
    activeCashUniqueViolation,
    messageOnlyActiveCashUniqueViolation,
    wrappedActiveCashUniqueViolation,
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
            adajanCashAccount,
            inactiveAdajanCashAccount,
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
        expect(response.data?.moneyAccounts).toHaveLength(5);
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
                    account.name === "Adajan cash" &&
                    account.type === "cash" &&
                    account.scope === "store_scoped" &&
                    account.storeId === storeId &&
                    account.status === "active",
            ),
        ).toBe(true);
        expect(
            response.data?.moneyAccounts.some(
                (account) =>
                    account.name === "Old Adajan till" &&
                    account.type === "cash" &&
                    account.status === "inactive",
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

    test("creates a Store-scoped Cash Money Account for a Store in the Organization", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Adajan cash",
            type: "cash",
            scope: "store_scoped",
            storeId,
        });

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.moneyAccount.type).toBe("cash");
        expect(response.data?.moneyAccount.scope).toBe("store_scoped");
        expect(response.data?.moneyAccount.storeId).toBe(storeId);
        expect(response.data?.moneyAccount.status).toBe("active");
        expect(getStoreById).toHaveBeenCalledWith(organizationId, storeId);
        expect(createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Adajan cash",
                type: "cash",
                scope: "store_scoped",
                storeId,
                status: "active",
            }),
        );
    });

    test("creates an inactive Cash Money Account while another Store Cash Account is active", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Spare till",
            type: "cash",
            scope: "store_scoped",
            storeId,
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "cash",
                storeId,
                status: "inactive",
            }),
        );
    });

    test("creates a Cash Money Account for a different Store", async () => {
        getStoreById.mockImplementation(async (_organizationId, requestedStoreId) =>
            requestedStoreId === vesuStoreId ? vesuStore : store,
        );

        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Vesu cash",
            type: "cash",
            scope: "store_scoped",
            storeId: vesuStoreId,
        });

        expect(response.status).toBe("success");
        expect(getStoreById).toHaveBeenCalledWith(organizationId, vesuStoreId);
        expect(createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "cash",
                storeId: vesuStoreId,
            }),
        );
    });

    test("rejects an Organization-wide Cash Money Account", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Shared cash",
            type: "cash",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("A Cash Money Account must be Store-scoped");
        expect(createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects a Cash Money Account without a Store", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Adajan cash",
            type: "cash",
            scope: "store_scoped",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Store is required for a Store-scoped Money Account");
        expect(createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects a Cash Money Account assigned to a Store from another Organization", async () => {
        getStoreById.mockResolvedValue(null);

        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Adajan cash",
            type: "cash",
            scope: "store_scoped",
            storeId: otherOrganizationStoreId,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Store not found");
        expect(createMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("maps a concurrent second active Cash Money Account to a Store conflict", async () => {
        createMoneyAccountRepo.mockImplementation(async () => {
            throw activeCashUniqueViolation();
        });

        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Second till",
            type: "cash",
            scope: "store_scoped",
            storeId,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toBe("This Store already has an active Cash Money Account");
        expect(response.message).not.toContain("duplicate key");
    });

    test("maps a Postgres Cash unique-constraint message without a 23505 code to a Store conflict", async () => {
        createMoneyAccountRepo.mockImplementation(async () => {
            throw messageOnlyActiveCashUniqueViolation();
        });

        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Second till",
            type: "cash",
            scope: "store_scoped",
            storeId,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toBe("This Store already has an active Cash Money Account");
        expect(response.message).not.toContain("duplicate key");
        expect(response.message).not.toContain("money_accounts_one_active_cash_per_store");
    });

    test("maps a wrapped Cash unique-constraint error to a Store conflict", async () => {
        createMoneyAccountRepo.mockImplementation(async () => {
            throw wrappedActiveCashUniqueViolation();
        });

        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "Second till",
            type: "cash",
            scope: "store_scoped",
            storeId,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toBe("This Store already has an active Cash Money Account");
        expect(response.message).not.toContain("duplicate key");
    });

    test("deactivates the Store Cash Account so a replacement can be created", async () => {
        getMoneyAccountById.mockResolvedValue(adajanCashAccount);
        updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...adajanCashAccount,
            ...data,
            createdBy: adajanCashAccount.createdBy,
            createdAt: adajanCashAccount.createdAt,
            updatedAt: adajanCashAccount.updatedAt,
        }));

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            cashMoneyAccountId,
            { status: "inactive" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.status).toBe("inactive");
        expect(response.data?.moneyAccount.type).toBe("cash");
        expect(response.data?.moneyAccount.storeId).toBe(storeId);
        expect(updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: cashMoneyAccountId,
                type: "cash",
                status: "inactive",
                storeId,
            }),
        );
    });

    test("activates a replacement Cash Money Account after the previous one is inactive", async () => {
        getMoneyAccountById.mockResolvedValue(inactiveAdajanCashAccount);
        updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...inactiveAdajanCashAccount,
            ...data,
            createdBy: inactiveAdajanCashAccount.createdBy,
            createdAt: inactiveAdajanCashAccount.createdAt,
            updatedAt: inactiveAdajanCashAccount.updatedAt,
        }));

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            inactiveCashMoneyAccountId,
            { status: "active" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.status).toBe("active");
        expect(response.data?.moneyAccount.type).toBe("cash");
        expect(response.data?.moneyAccount.storeId).toBe(storeId);
    });

    test("rejects activating a second Cash Money Account while another is active for the Store", async () => {
        getMoneyAccountById.mockResolvedValue(inactiveAdajanCashAccount);
        updateMoneyAccountRepo.mockImplementation(async () => {
            throw activeCashUniqueViolation();
        });

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            inactiveCashMoneyAccountId,
            { status: "active" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toBe("This Store already has an active Cash Money Account");
        expect(response.message).not.toContain("duplicate key");
    });

    test("maps a Postgres Cash unique-constraint message on update without a 23505 code", async () => {
        getMoneyAccountById.mockResolvedValue(inactiveAdajanCashAccount);
        updateMoneyAccountRepo.mockImplementation(async () => {
            throw messageOnlyActiveCashUniqueViolation();
        });

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            inactiveCashMoneyAccountId,
            { status: "active" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toBe("This Store already has an active Cash Money Account");
        expect(response.message).not.toContain("duplicate key");
        expect(response.message).not.toContain("money_accounts_one_active_cash_per_store");
    });

    test("rejects moving a Cash Money Account to Organization-wide scope", async () => {
        getMoneyAccountById.mockResolvedValue(adajanCashAccount);

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            cashMoneyAccountId,
            { scope: "organization_wide" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("A Cash Money Account must be Store-scoped");
        expect(updateMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("rejects changing an Organization-wide account to Cash without Store scope", async () => {
        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            { type: "cash" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("A Cash Money Account must be Store-scoped");
        expect(updateMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("changes a Store-scoped non-cash account to Cash for its Store", async () => {
        getMoneyAccountById.mockResolvedValue(adajanUpiAccount);
        updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...adajanUpiAccount,
            ...data,
            createdBy: adajanUpiAccount.createdBy,
            createdAt: adajanUpiAccount.createdAt,
            updatedAt: adajanUpiAccount.updatedAt,
        }));

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            storeScopedMoneyAccountId,
            { type: "cash" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.type).toBe("cash");
        expect(response.data?.moneyAccount.scope).toBe("store_scoped");
        expect(response.data?.moneyAccount.storeId).toBe(storeId);
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
