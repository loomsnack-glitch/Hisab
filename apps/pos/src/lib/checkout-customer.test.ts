import { describe, expect, test } from "bun:test";

import {
  findCustomerByExactPhone,
  getCheckoutPhoneLookupValue,
  resolveCheckoutCustomer,
  toCheckoutPhoneInput,
} from "./checkout-customer";

const mohit = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Mohit Man",
  phone: "+919876543210",
};

describe("checkout customer phone lookup", () => {
  test("looks up only a complete Indian 10-digit mobile number", () => {
    expect(getCheckoutPhoneLookupValue("98765")).toBeNull();
    expect(getCheckoutPhoneLookupValue("1234567890")).toBeNull();
    expect(getCheckoutPhoneLookupValue("9876543210")).toBe("9876543210");
    expect(getCheckoutPhoneLookupValue("98765 43210")).toBe("9876543210");
  });

  test("shows stored international numbers as 10-digit checkout input", () => {
    expect(toCheckoutPhoneInput("+919876543210")).toBe("9876543210");
  });

  test("matches a customer by the exact normalized phone number", () => {
    expect(
      findCustomerByExactPhone(
        [mohit, { ...mohit, id: "22222222-2222-2222-2222-222222222222", phone: "+919800000101" }],
        "9876543210",
      )?.id,
    ).toBe(mohit.id);
  });
});

describe("checkout customer resolution", () => {
  test("treats empty phone and name as a walk-in", () => {
    expect(
      resolveCheckoutCustomer({
        phone: "",
        name: "",
        selectedCustomer: null,
        lookupCustomers: undefined,
        isLookupLoading: false,
      }),
    ).toEqual({ status: "walk_in" });
  });

  test("blocks a partial phone number until 10 digits are entered", () => {
    expect(
      resolveCheckoutCustomer({
        phone: "98765",
        name: "",
        selectedCustomer: null,
        lookupCustomers: undefined,
        isLookupLoading: false,
      }),
    ).toEqual({
      status: "blocked",
      reason: "Enter a 10-digit phone number",
    });
  });

  test("shows looking up while a complete number is being fetched", () => {
    expect(
      resolveCheckoutCustomer({
        phone: "9876543210",
        name: "",
        selectedCustomer: null,
        lookupCustomers: undefined,
        isLookupLoading: true,
      }),
    ).toEqual({ status: "looking_up" });
  });

  test("auto-selects an existing customer when the phone matches", () => {
    expect(
      resolveCheckoutCustomer({
        phone: "9876543210",
        name: "",
        selectedCustomer: null,
        lookupCustomers: [mohit],
        isLookupLoading: false,
      }),
    ).toEqual({ status: "existing", customer: mohit });
  });

  test("requires a name when the phone is new", () => {
    expect(
      resolveCheckoutCustomer({
        phone: "9876543210",
        name: "",
        selectedCustomer: null,
        lookupCustomers: [],
        isLookupLoading: false,
      }),
    ).toEqual({
      status: "blocked",
      reason: "Enter a name for this new customer",
    });
  });

  test("creates a customer when a new 10-digit phone has a name", () => {
    expect(
      resolveCheckoutCustomer({
        phone: "9876543210",
        name: "New Guest",
        selectedCustomer: null,
        lookupCustomers: [],
        isLookupLoading: false,
      }),
    ).toEqual({
      status: "create",
      name: "New Guest",
      phone: "+919876543210",
    });
  });

  test("keeps a selected customer when checkout fields are still empty", () => {
    expect(
      resolveCheckoutCustomer({
        phone: "",
        name: "",
        selectedCustomer: mohit,
        lookupCustomers: undefined,
        isLookupLoading: false,
      }),
    ).toEqual({ status: "existing", customer: mohit });
  });

  test("keeps a customer chosen from the picker without waiting for lookup", () => {
    expect(
      resolveCheckoutCustomer({
        phone: "9876543210",
        name: "Mohit Man",
        selectedCustomer: mohit,
        lookupCustomers: undefined,
        isLookupLoading: true,
      }),
    ).toEqual({ status: "existing", customer: mohit });
  });
});
