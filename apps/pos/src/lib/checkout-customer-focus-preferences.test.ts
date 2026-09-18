import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
  window: testWindow,
  localStorage: testWindow.localStorage,
});

const {
  readCheckoutCustomerAutoFocus,
  writeCheckoutCustomerAutoFocus,
  CHECKOUT_CUSTOMER_AUTO_FOCUS_STORAGE_KEY,
} = await import("./checkout-customer-focus-preferences");

describe("checkout customer focus preferences", () => {
  afterEach(() => {
    testWindow.localStorage.clear();
  });

  test("defaults to false when nothing is stored", () => {
    expect(readCheckoutCustomerAutoFocus()).toBe(false);
  });

  test("reads and writes the enabled state", () => {
    writeCheckoutCustomerAutoFocus(true);
    expect(readCheckoutCustomerAutoFocus()).toBe(true);

    writeCheckoutCustomerAutoFocus(false);
    expect(readCheckoutCustomerAutoFocus()).toBe(false);
  });

  test("treats corrupt stored values as disabled", () => {
    window.localStorage.setItem(CHECKOUT_CUSTOMER_AUTO_FOCUS_STORAGE_KEY, "maybe");

    expect(readCheckoutCustomerAutoFocus()).toBe(false);
  });
});
