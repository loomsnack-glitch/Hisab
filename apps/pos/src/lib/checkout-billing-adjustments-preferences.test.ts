import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
  window: testWindow,
  localStorage: testWindow.localStorage,
});

const {
  readCheckoutBillingAdjustmentsOpen,
  writeCheckoutBillingAdjustmentsOpen,
  CHECKOUT_BILLING_ADJUSTMENTS_OPEN_STORAGE_PREFIX,
} = await import("./checkout-billing-adjustments-preferences");

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storageKey = `${CHECKOUT_BILLING_ADJUSTMENTS_OPEN_STORAGE_PREFIX}${organizationId}`;

describe("checkout billing adjustments preferences", () => {
  afterEach(() => {
    testWindow.localStorage.clear();
  });

  test("reads and writes the open state", () => {
    writeCheckoutBillingAdjustmentsOpen(organizationId, true);
    expect(readCheckoutBillingAdjustmentsOpen(organizationId)).toBe(true);

    writeCheckoutBillingAdjustmentsOpen(organizationId, false);
    expect(readCheckoutBillingAdjustmentsOpen(organizationId)).toBe(false);
  });

  test("returns null when nothing is stored", () => {
    expect(readCheckoutBillingAdjustmentsOpen(organizationId)).toBeNull();
  });

  test("removes corrupt stored values", () => {
    window.localStorage.setItem(storageKey, "maybe");

    expect(readCheckoutBillingAdjustmentsOpen(organizationId)).toBeNull();
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });
});
