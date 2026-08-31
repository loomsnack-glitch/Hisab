import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import type { PurchaseFormPreferences } from "./purchase-form-preferences";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
    window: testWindow,
    localStorage: testWindow.localStorage,
});

const {
    readPurchaseFormPreferences,
    writePurchaseFormPreferences,
    clearPurchaseFormPreferences,
} = await import("./purchase-form-preferences");

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const moneyAccountId = "55555555-5555-4555-8555-555555555555";
const storageKey = `hisab_purchase_form_prefs_${organizationId}`;

describe("Purchase form preferences", () => {
    afterEach(() => {
        testWindow.localStorage.clear();
    });

    test("reads and writes remembered Store, settlement, payment method, and Money Account", () => {
        writePurchaseFormPreferences(organizationId, {
            storeId,
            settlementMode: "full",
            paymentMethod: "upi",
            moneyAccountId,
        });

        expect(readPurchaseFormPreferences(organizationId)).toEqual({
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

        expect(readPurchaseFormPreferences(organizationId)).toBeNull();
    });

    test("removes corrupt undefined local storage values", () => {
        window.localStorage.setItem(storageKey, "undefined");

        expect(readPurchaseFormPreferences(organizationId)).toBeNull();
        expect(window.localStorage.getItem(storageKey)).toBeNull();
    });

    test("does not write empty or invalid preferences", () => {
        writePurchaseFormPreferences(organizationId, {});
        writePurchaseFormPreferences(organizationId, undefined as unknown as PurchaseFormPreferences);

        expect(window.localStorage.getItem(storageKey)).toBeNull();
    });

    test("clears all purchase form preferences on logout", () => {
        const otherOrganizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
        const otherStorageKey = `hisab_purchase_form_prefs_${otherOrganizationId}`;

        writePurchaseFormPreferences(organizationId, { storeId, settlementMode: "due" });
        writePurchaseFormPreferences(otherOrganizationId, { settlementMode: "full" });

        clearPurchaseFormPreferences();

        expect(window.localStorage.getItem(storageKey)).toBeNull();
        expect(window.localStorage.getItem(otherStorageKey)).toBeNull();
    });

    test("clears preferences for one organization", () => {
        const otherOrganizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
        const otherStorageKey = `hisab_purchase_form_prefs_${otherOrganizationId}`;

        writePurchaseFormPreferences(organizationId, { storeId, settlementMode: "due" });
        writePurchaseFormPreferences(otherOrganizationId, { settlementMode: "full" });

        clearPurchaseFormPreferences(organizationId);

        expect(window.localStorage.getItem(storageKey)).toBeNull();
        expect(window.localStorage.getItem(otherStorageKey)).not.toBeNull();
    });
});
