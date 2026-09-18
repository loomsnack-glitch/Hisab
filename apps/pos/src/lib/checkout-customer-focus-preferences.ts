export const CHECKOUT_CUSTOMER_AUTO_FOCUS_STORAGE_KEY =
  "hisab_pos_checkout_customer_auto_focus";

export const readCheckoutCustomerAutoFocus = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(CHECKOUT_CUSTOMER_AUTO_FOCUS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const writeCheckoutCustomerAutoFocus = (enabled: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      CHECKOUT_CUSTOMER_AUTO_FOCUS_STORAGE_KEY,
      String(enabled),
    );
  } catch {
    // Local storage may be unavailable; the current form state still works.
  }
};
