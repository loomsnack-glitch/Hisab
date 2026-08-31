import { beforeEach, describe, expect, test } from "bun:test";
import {
    adajanCardRoute,
    adajanCashAccount,
    adajanUpiAccount,
    adajanUpiRoute,
    cashMoneyAccountId,
    createMoneyAccountMovementRepo,
    createMoneyAccountRepo,
    deletePaymentRouteRepo,
    getMoneyAccountById,
    getMoneyAccountsByOrganizationId,
    getMovementsByMoneyAccountId,
    getOrganizationByIdForUser,
    getPaymentRouteByStoreAndMethod,
    getPaymentRoutesByStoreId,
    getStoreById,
    hdfcBankAccount,
    hdfcCardMovement,
    hdfcUpiMovement,
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
    upsertPaymentRouteRepo,
    userId,
    vesuStore,
    vesuStoreId,
    vesuUpiAccount,
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
        getPaymentRoutesByStoreId.mockClear();
        getPaymentRouteByStoreAndMethod.mockClear();
        upsertPaymentRouteRepo.mockClear();
        deletePaymentRouteRepo.mockClear();
        getMovementsByMoneyAccountId.mockClear();
        createMoneyAccountMovementRepo.mockClear();

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
            openingBalance: data.openingBalance,
            balance: data.openingBalance,
            hasMovements: false,
            updatedBy: data.updatedBy ?? null,
            createdAt: hdfcBankAccount.createdAt,
            updatedAt: hdfcBankAccount.updatedAt,
        }));
        updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...hdfcBankAccount,
            ...data,
            openingBalance: data.openingBalance,
            balance: data.openingBalance,
            hasMovements: hdfcBankAccount.hasMovements,
            createdBy: hdfcBankAccount.createdBy,
            createdAt: hdfcBankAccount.createdAt,
            updatedAt: hdfcBankAccount.updatedAt,
        }));
        getPaymentRoutesByStoreId.mockResolvedValue([]);
        getPaymentRouteByStoreAndMethod.mockResolvedValue(null);
        getMovementsByMoneyAccountId.mockResolvedValue([]);
        upsertPaymentRouteRepo.mockImplementation(async (data) => ({
            ...adajanUpiRoute,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: adajanUpiRoute.createdAt,
            updatedAt: adajanUpiRoute.updatedAt,
        }));
        deletePaymentRouteRepo.mockResolvedValue(true);
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
        expect(response.data?.moneyAccount.openingBalance).toBe(0);
        expect(response.data?.moneyAccount.balance).toBe(0);
        expect(response.data?.moneyAccount.hasMovements).toBe(false);
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
                openingBalance: 0,
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

    test("creates a Money Account with an omitted Opening Balance as zero and equal calculated Balance", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "HDFC Current",
            type: "bank",
        });

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.openingBalance).toBe(0);
        expect(response.data?.moneyAccount.balance).toBe(0);
        expect(createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                openingBalance: 0,
            }),
        );
    });

    test("creates a Money Account with a recorded Opening Balance and equal calculated Balance", async () => {
        const response = await moneyAccountsService.createMoneyAccount(userId, organizationId, {
            name: "HDFC Current",
            type: "bank",
            openingBalance: 1250.5,
        });

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.openingBalance).toBe(1250.5);
        expect(response.data?.moneyAccount.balance).toBe(1250.5);
        expect(createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                openingBalance: 1250.5,
            }),
        );
    });

    test("updates Opening Balance while the Money Account has no Movements", async () => {
        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            { openingBalance: 80 },
        );

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.openingBalance).toBe(80);
        expect(response.data?.moneyAccount.balance).toBe(80);
        expect(updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                openingBalance: 80,
            }),
        );
    });

    test("rejects Type, scope, Store assignment, and Opening Balance edits after the first Movement", async () => {
        getMoneyAccountById.mockResolvedValue({
            ...hdfcBankAccount,
            hasMovements: true,
            openingBalance: 100,
            balance: 250,
        });

        const typeResponse = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            { type: "upi" },
        );
        const openingResponse = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            { openingBalance: 50 },
        );
        const scopeResponse = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            { scope: "store_scoped", storeId },
        );

        expect(typeResponse.status).toBe("error");
        expect(typeResponse.code).toBe(400);
        expect(typeResponse.message).toContain("cannot be changed after this Money Account has Movements");
        expect(openingResponse.status).toBe("error");
        expect(scopeResponse.status).toBe("error");
        expect(updateMoneyAccountRepo).not.toHaveBeenCalled();
    });

    test("still allows name, notes, and status changes after the first Movement", async () => {
        getMoneyAccountById.mockResolvedValue({
            ...hdfcBankAccount,
            hasMovements: true,
            openingBalance: 100,
            balance: 250,
        });
        updateMoneyAccountRepo.mockImplementation(async (data) => ({
            ...hdfcBankAccount,
            ...data,
            hasMovements: true,
            balance: data.openingBalance,
            createdBy: hdfcBankAccount.createdBy,
            createdAt: hdfcBankAccount.createdAt,
            updatedAt: hdfcBankAccount.updatedAt,
        }));

        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            {
                name: "HDFC Current Co",
                notes: "Updated notes",
                status: "inactive",
            },
        );

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccount.name).toBe("HDFC Current Co");
        expect(response.data?.moneyAccount.notes).toBe("Updated notes");
        expect(response.data?.moneyAccount.status).toBe("inactive");
        expect(response.data?.moneyAccount.type).toBe("bank");
        expect(response.data?.moneyAccount.openingBalance).toBe(100);
        expect(updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "HDFC Current Co",
                type: "bank",
                scope: "organization_wide",
                storeId: null,
                openingBalance: 100,
                status: "inactive",
            }),
        );
    });

    test("does not expose a direct current-balance write", async () => {
        const response = await moneyAccountsService.updateMoneyAccount(
            userId,
            organizationId,
            moneyAccountId,
            { notes: "Keep Opening Balance" },
        );

        expect(response.status).toBe("success");
        expect(updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                openingBalance: 0,
            }),
        );
        expect(updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.not.objectContaining({
                balance: expect.anything(),
            }),
        );
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

    test("creates a UPI Payment Routing Rule to an Organization-wide Money Account", async () => {
        const response = await moneyAccountsService.upsertMoneyAccountPaymentRoute(
            userId,
            organizationId,
            storeId,
            { paymentMethod: "upi", moneyAccountId },
        );

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.route.paymentMethod).toBe("upi");
        expect(response.data?.route.moneyAccountId).toBe(moneyAccountId);
        expect(response.data?.route.storeId).toBe(storeId);
        expect(upsertPaymentRouteRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId,
                storeId,
                paymentMethod: "upi",
                moneyAccountId,
            }),
        );
    });

    test("creates a Card Payment Routing Rule to the same Money Account as UPI", async () => {
        getPaymentRoutesByStoreId.mockResolvedValue([adajanUpiRoute]);

        const response = await moneyAccountsService.upsertMoneyAccountPaymentRoute(
            userId,
            organizationId,
            storeId,
            { paymentMethod: "card", moneyAccountId },
        );

        expect(response.status).toBe("success");
        expect(response.data?.route.paymentMethod).toBe("card");
        expect(response.data?.route.moneyAccountId).toBe(moneyAccountId);
        expect(upsertPaymentRouteRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                paymentMethod: "card",
                moneyAccountId,
            }),
        );
    });

    test("creates a Payment Routing Rule to a Store-scoped Money Account for that Store", async () => {
        getMoneyAccountById.mockResolvedValue(adajanUpiAccount);

        const response = await moneyAccountsService.upsertMoneyAccountPaymentRoute(
            userId,
            organizationId,
            storeId,
            { paymentMethod: "upi", moneyAccountId: storeScopedMoneyAccountId },
        );

        expect(response.status).toBe("success");
        expect(response.data?.route.moneyAccountId).toBe(storeScopedMoneyAccountId);
    });

    test("replaces a Store's UPI route without changing existing Movements", async () => {
        getPaymentRouteByStoreAndMethod.mockResolvedValue(adajanUpiRoute);
        getMoneyAccountById.mockResolvedValue(adajanUpiAccount);
        getMovementsByMoneyAccountId.mockResolvedValue([hdfcUpiMovement]);
        getMoneyAccountById.mockImplementation(async (_orgId: string, accountId: string) =>
            accountId === storeScopedMoneyAccountId
                ? adajanUpiAccount
                : { ...hdfcBankAccount, openingBalance: 100, balance: 350.5, hasMovements: true },
        );

        const updateResponse = await moneyAccountsService.upsertMoneyAccountPaymentRoute(
            userId,
            organizationId,
            storeId,
            { paymentMethod: "upi", moneyAccountId: storeScopedMoneyAccountId },
        );
        const history = await moneyAccountsService.getMoneyAccountHistory(
            userId,
            organizationId,
            moneyAccountId,
        );

        expect(updateResponse.status).toBe("success");
        expect(updateResponse.code).toBe(200);
        expect(updateResponse.data?.route.moneyAccountId).toBe(storeScopedMoneyAccountId);
        expect(history.data?.entries).toEqual([
            {
                kind: "opening_balance",
                amount: 100,
                occurredAt: hdfcBankAccount.createdAt,
            },
            {
                kind: "pos_payment",
                id: hdfcUpiMovement.id,
                amount: 250.5,
                occurredAt: hdfcUpiMovement.occurredAt,
                storeId,
                paymentId: hdfcUpiMovement.paymentId,
                saleId: hdfcUpiMovement.saleId,
                saleNumber: "12",
                paymentMethod: "upi",
            },
        ]);
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
    });

    test("lists one UPI and one Card route for a Store", async () => {
        getPaymentRoutesByStoreId.mockResolvedValue([adajanUpiRoute, adajanCardRoute]);

        const response = await moneyAccountsService.getMoneyAccountPaymentRoutes(
            userId,
            organizationId,
            storeId,
        );

        expect(response.status).toBe("success");
        expect(response.data?.routes).toHaveLength(2);
        expect(response.data?.routes.map((route) => route.paymentMethod).sort()).toEqual(["card", "upi"]);
        expect(getPaymentRoutesByStoreId).toHaveBeenCalledWith(organizationId, storeId);
    });

    test("clears a Store's Card route and leaves its UPI route", async () => {
        deletePaymentRouteRepo.mockResolvedValue(true);
        getPaymentRoutesByStoreId.mockResolvedValue([adajanUpiRoute]);

        const response = await moneyAccountsService.clearMoneyAccountPaymentRoute(
            userId,
            organizationId,
            storeId,
            "card",
        );

        expect(response.status).toBe("success");
        expect(deletePaymentRouteRepo).toHaveBeenCalledWith(organizationId, storeId, "card");
        expect(response.data?.routes).toEqual([adajanUpiRoute]);
        expect(response.data?.routes.some((route) => route.paymentMethod === "card")).toBe(false);
    });

    test("rejects an inactive Money Account as a Payment Routing destination", async () => {
        getMoneyAccountById.mockResolvedValue(inactivePettyCashAccount);

        const response = await moneyAccountsService.upsertMoneyAccountPaymentRoute(
            userId,
            organizationId,
            storeId,
            { paymentMethod: "upi", moneyAccountId: inactiveMoneyAccountId },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Select an active Money Account");
        expect(upsertPaymentRouteRepo).not.toHaveBeenCalled();
    });

    test("rejects another Store's Money Account as a Payment Routing destination", async () => {
        getMoneyAccountById.mockResolvedValue(vesuUpiAccount);

        const response = await moneyAccountsService.upsertMoneyAccountPaymentRoute(
            userId,
            organizationId,
            storeId,
            { paymentMethod: "upi", moneyAccountId: vesuUpiAccount.id },
        );

        expect(response.status).toBe("error");
        expect(response.message).toBe("This Money Account is not available to this Store");
        expect(upsertPaymentRouteRepo).not.toHaveBeenCalled();
    });

    test("rejects a Money Account from another Organization as a Payment Routing destination", async () => {
        getMoneyAccountById.mockResolvedValue(null);

        const response = await moneyAccountsService.upsertMoneyAccountPaymentRoute(
            userId,
            organizationId,
            storeId,
            { paymentMethod: "upi", moneyAccountId },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(upsertPaymentRouteRepo).not.toHaveBeenCalled();
    });

    test("rejects Payment Routing configuration for a Store from another Organization", async () => {
        getStoreById.mockResolvedValue(null);

        const response = await moneyAccountsService.upsertMoneyAccountPaymentRoute(
            userId,
            organizationId,
            otherOrganizationStoreId,
            { paymentMethod: "upi", moneyAccountId },
        );

        expect(response.status).toBe("error");
        expect(response.message).toBe("Store not found");
        expect(upsertPaymentRouteRepo).not.toHaveBeenCalled();
    });

    test("denies Payment Routing Rules when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await moneyAccountsService.getMoneyAccountPaymentRoutes(
            userId,
            otherOrganizationId,
            storeId,
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(getPaymentRoutesByStoreId).not.toHaveBeenCalled();
    });

    test("returns Opening Balance plus payment-linked Movements and a calculated Balance", async () => {
        getMoneyAccountById.mockResolvedValue({
            ...hdfcBankAccount,
            openingBalance: 100,
            balance: 100,
            hasMovements: false,
        });
        getMovementsByMoneyAccountId.mockResolvedValue([hdfcUpiMovement, hdfcCardMovement]);

        const response = await moneyAccountsService.getMoneyAccountHistory(
            userId,
            organizationId,
            moneyAccountId,
        );

        expect(response.status).toBe("success");
        expect(response.data?.openingBalance).toBe(100);
        expect(response.data?.balance).toBe(450.5);
        expect(response.data?.moneyAccount.balance).toBe(450.5);
        expect(response.data?.moneyAccount.hasMovements).toBe(true);
        expect(response.data?.entries[0]).toEqual({
            kind: "opening_balance",
            amount: 100,
            occurredAt: hdfcBankAccount.createdAt,
        });
        expect(response.data?.entries[1]).toMatchObject({
            kind: "pos_payment",
            amount: 250.5,
            paymentId: hdfcUpiMovement.paymentId,
            saleId: hdfcUpiMovement.saleId,
            saleNumber: "12",
            paymentMethod: "upi",
        });
        expect(response.data?.entries[2]).toMatchObject({
            kind: "pos_payment",
            amount: 100,
            paymentMethod: "card",
            saleNumber: "13",
        });
    });

    test("returns only the Opening Balance entry when a Money Account has no Movements", async () => {
        getMoneyAccountById.mockResolvedValue({
            ...hdfcBankAccount,
            openingBalance: 80,
            balance: 80,
            hasMovements: false,
        });

        const response = await moneyAccountsService.getMoneyAccountHistory(
            userId,
            organizationId,
            moneyAccountId,
        );

        expect(response.status).toBe("success");
        expect(response.data?.balance).toBe(80);
        expect(response.data?.entries).toHaveLength(1);
        expect(response.data?.entries[0]?.kind).toBe("opening_balance");
        expect(response.data?.entries[0]?.amount).toBe(80);
    });

    test("does not expose create, update, or delete Movement commands", () => {
        expect("createMoneyAccountMovement" in moneyAccountsService).toBe(false);
        expect("updateMoneyAccountMovement" in moneyAccountsService).toBe(false);
        expect("deleteMoneyAccountMovement" in moneyAccountsService).toBe(false);
    });
});
