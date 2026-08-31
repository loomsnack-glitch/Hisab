import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import type { ExpenseFormPreferences } from "./expense-form-preferences";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
    window: testWindow,
    localStorage: testWindow.localStorage,
});

const {
    readExpenseFormPreferences,
    writeExpenseFormPreferences,
    clearExpenseFormPreferences,
} = await import("./expense-form-preferences");

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const moneyAccountId = "55555555-5555-4555-8555-555555555555";
const storageKey = `hisab_expense_form_prefs_${organizationId}`;

describe("Expense form preferences", () => {
    afterEach(() => {
        testWindow.localStorage.clear();
    });

    test("reads and writes remembered Store, settlement, payment method, and Money Account", () => {
        writeExpenseFormPreferences(organizationId, {
            storeId,
            settlementMode: "full",
            paymentMethod: "upi",
            moneyAccountId,
        });

        expect(readExpenseFormPreferences(organizationId)).toEqual({
            storeId,
            settlementMode: "full",
            paymentMethod: "upi",
            moneyAccountId,
        });
    });

    test("ignores invalid stored values", () => {
        window.localStorage.setItem(
            storageKey,
            JSON.stringify({
                storeId: "not-a-uuid",
                settlementMode: "prepaid",
                paymentMethod: "cheque",
                moneyAccountId: "bad",
            }),
        );

        expect(readExpenseFormPreferences(organizationId)).toBeNull();
    });

    test("removes corrupt undefined local storage values", () => {
        window.localStorage.setItem(storageKey, "undefined");

        expect(readExpenseFormPreferences(organizationId)).toBeNull();
        expect(window.localStorage.getItem(storageKey)).toBeNull();
    });

    test("does not write empty or invalid preferences", () => {
        writeExpenseFormPreferences(organizationId, {});
        writeExpenseFormPreferences(organizationId, undefined as unknown as ExpenseFormPreferences);

        expect(window.localStorage.getItem(storageKey)).toBeNull();
    });

    test("clears all expense form preferences on logout", () => {
        const otherOrganizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
        const otherStorageKey = `hisab_expense_form_prefs_${otherOrganizationId}`;

        writeExpenseFormPreferences(organizationId, { storeId, settlementMode: "due" });
        writeExpenseFormPreferences(otherOrganizationId, { settlementMode: "full" });

        clearExpenseFormPreferences();

        expect(window.localStorage.getItem(storageKey)).toBeNull();
        expect(window.localStorage.getItem(otherStorageKey)).toBeNull();
    });

    test("clears preferences for one organization", () => {
        const otherOrganizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
        const otherStorageKey = `hisab_expense_form_prefs_${otherOrganizationId}`;

        writeExpenseFormPreferences(organizationId, { storeId, settlementMode: "due" });
        writeExpenseFormPreferences(otherOrganizationId, { settlementMode: "full" });

        clearExpenseFormPreferences(organizationId);

        expect(window.localStorage.getItem(storageKey)).toBeNull();
        expect(window.localStorage.getItem(otherStorageKey)).not.toBeNull();
    });
});
