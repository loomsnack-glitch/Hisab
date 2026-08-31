import { afterEach, describe, expect, test } from "bun:test";
import { api } from "../../api";
import * as moneyAccountsService from "./money-accounts.service";

describe("Money Accounts client service", () => {
    const originalGet = api.get;
    const originalPost = api.post;
    const originalPatch = api.patch;
    const originalPut = api.put;
    const originalDelete = api.delete;

    afterEach(() => {
        api.get = originalGet;
        api.post = originalPost;
        api.patch = originalPatch;
        api.put = originalPut;
        api.delete = originalDelete;
    });

    test("reads Money Accounts, history, and Payment Routing through administrator endpoints", async () => {
        const requests: string[] = [];
        api.get = (async (url: string) => {
            requests.push(url);
            return { data: { status: "success", data: null } };
        }) as typeof api.get;

        await moneyAccountsService.getMoneyAccounts("org-id");
        await moneyAccountsService.getMoneyAccountHistory("org-id", "account-id");
        await moneyAccountsService.getMoneyAccountPaymentRoutes("org-id", "store-id");

        expect(requests).toEqual([
            "/organizations/org-id/money-accounts",
            "/organizations/org-id/money-accounts/account-id/history",
            "/organizations/org-id/stores/store-id/money-account-payment-routes",
        ]);
    });

    test("records Deposit and Withdrawal through administrator endpoints", async () => {
        const requests: Array<{ method: string; url: string }> = [];
        api.post = (async (url: string) => {
            requests.push({ method: "POST", url });
            return { data: { status: "success", data: null } };
        }) as typeof api.post;

        await moneyAccountsService.recordMoneyAccountDeposit("org-id", "account-id", { amount: 10 });
        await moneyAccountsService.recordMoneyAccountWithdrawal("org-id", "account-id", { amount: 5, note: "Till skim" });

        expect(requests).toEqual([
            { method: "POST", url: "/organizations/org-id/money-accounts/account-id/deposits" },
            { method: "POST", url: "/organizations/org-id/money-accounts/account-id/withdrawals" },
        ]);
    });

    test("records a Balance Adjustment through the administrator endpoint", async () => {
        const requests: Array<{ method: string; url: string }> = [];
        api.post = (async (url: string) => {
            requests.push({ method: "POST", url });
            return { data: { status: "success", data: null } };
        }) as typeof api.post;

        await moneyAccountsService.recordMoneyAccountBalanceAdjustment("org-id", "account-id", {
            actualBalance: 320,
            reason: "Missed cash purchase",
        });

        expect(requests).toEqual([
            { method: "POST", url: "/organizations/org-id/money-accounts/account-id/balance-adjustments" },
        ]);
    });

    test("records a Money Account Transfer through the administrator endpoint", async () => {
        const requests: Array<{ method: string; url: string }> = [];
        api.post = (async (url: string) => {
            requests.push({ method: "POST", url });
            return { data: { status: "success", data: null } };
        }) as typeof api.post;

        await moneyAccountsService.recordMoneyAccountTransfer("org-id", "account-id", {
            destinationMoneyAccountId: "destination-id",
            amount: 40,
            note: "Cash to bank",
        });

        expect(requests).toEqual([
            { method: "POST", url: "/organizations/org-id/money-accounts/account-id/transfers" },
        ]);
    });

    test("does not expose a direct balance write or generic Movement client", () => {
        expect("createMoneyAccountMovement" in moneyAccountsService).toBe(false);
        expect("updateMoneyAccountMovement" in moneyAccountsService).toBe(false);
        expect("updateMoneyAccountBalance" in moneyAccountsService).toBe(false);
        expect("backfillMoneyAccountMovements" in moneyAccountsService).toBe(false);
    });
});
