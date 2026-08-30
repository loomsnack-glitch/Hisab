import { beforeEach, describe, expect, test } from "bun:test";
import {
    createMoneyAccountRepo,
    getMoneyAccountById,
    getMoneyAccountsByOrganizationId,
    getOrganizationByIdForUser,
    hdfcBankAccount,
    inactiveMoneyAccountId,
    inactivePettyCashAccount,
    moneyAccountId,
    moneyAccountsService,
    organization,
    organizationId,
    otherOrganizationId,
    updateMoneyAccountRepo,
    userId,
} from "./money-accounts.service.test-harness";

describe("Organization Money Account service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getMoneyAccountsByOrganizationId.mockClear();
        getMoneyAccountById.mockClear();
        createMoneyAccountRepo.mockClear();
        updateMoneyAccountRepo.mockClear();

        getOrganizationByIdForUser.mockResolvedValue(organization);
        getMoneyAccountsByOrganizationId.mockResolvedValue([
            hdfcBankAccount,
            inactivePettyCashAccount,
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

    test("lists Organization-wide Money Accounts for a member", async () => {
        const response = await moneyAccountsService.getMoneyAccounts(userId, organizationId);

        expect(response.status).toBe("success");
        expect(response.data?.moneyAccounts).toHaveLength(2);
        expect(
            response.data?.moneyAccounts.every((account) => account.scope === "organization_wide"),
        ).toBe(true);
        expect(
            response.data?.moneyAccounts.some(
                (account) => account.name === "HDFC Current" && account.type === "bank" && account.status === "active",
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
        expect(getMoneyAccountById).toHaveBeenCalledWith(organizationId, moneyAccountId);
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
        expect(response.data?.moneyAccount.organizationId).toBe(organizationId);
        expect(createMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId,
                name: "HDFC Current",
                type: "bank",
                scope: "organization_wide",
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
                }),
            );
        }
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
        expect(updateMoneyAccountRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: moneyAccountId,
                organizationId,
                name: "HDFC Current Co",
                type: "upi",
                scope: "organization_wide",
                notes: "Updated notes",
                status: "inactive",
                updatedBy: userId,
            }),
        );
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
