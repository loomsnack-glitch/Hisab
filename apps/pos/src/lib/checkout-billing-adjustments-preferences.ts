export const CHECKOUT_BILLING_ADJUSTMENTS_OPEN_STORAGE_PREFIX =
  "hisab_checkout_billing_adjustments_open_";

const storageKey = (organizationId: string) =>
  `${CHECKOUT_BILLING_ADJUSTMENTS_OPEN_STORAGE_PREFIX}${organizationId}`;

export const readCheckoutBillingAdjustmentsOpen = (
  organizationId: string,
): boolean | null => {
  if (typeof window === "undefined" || !organizationId) {
    return null;
  }

  const key = storageKey(organizationId);

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    if (raw === "true") {
      return true;
    }
    if (raw === "false") {
      return false;
    }
    window.localStorage.removeItem(key);
    return null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

export const writeCheckoutBillingAdjustmentsOpen = (
  organizationId: string,
  open: boolean,
) => {
  if (typeof window === "undefined" || !organizationId) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(organizationId), String(open));
  } catch {
    // Local storage may be unavailable; the current form state still works.
  }
};
