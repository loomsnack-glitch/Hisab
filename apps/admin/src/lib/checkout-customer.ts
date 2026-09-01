import {
  getPhoneNumberParts,
  indianMobileNumberRegex,
  normalizePhoneNumber,
} from "@repo/types";

export type CheckoutCustomerMatch = {
  id: string;
  name: string;
  phone?: string | null;
};

export type CheckoutCustomerResolution =
  | { status: "walk_in" }
  | { status: "looking_up" }
  | { status: "existing"; customer: CheckoutCustomerMatch }
  | { status: "create"; name: string; phone: string }
  | { status: "blocked"; reason: string };

export const getCheckoutPhoneDigits = (phone: string) =>
  phone.replace(/\D/g, "").slice(0, 10);

export const getCheckoutPhoneLookupValue = (
  phone: string,
): string | null => {
  const digits = getCheckoutPhoneDigits(phone);
  return indianMobileNumberRegex.test(digits) ? digits : null;
};

export const toCheckoutPhoneInput = (
  phone: string | null | undefined,
): string => {
  const nationalNumber = getPhoneNumberParts(phone)?.nationalNumber;
  if (nationalNumber) {
    return nationalNumber.slice(0, 10);
  }

  return getCheckoutPhoneDigits(phone ?? "");
};

export const findCustomerByExactPhone = <T extends CheckoutCustomerMatch>(
  customers: T[],
  phone: string,
): T | null => {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return null;
  }

  return (
    customers.find(
      (customer) => normalizePhoneNumber(customer.phone) === normalized,
    ) ?? null
  );
};

export const resolveCheckoutCustomer = ({
  phone,
  name,
  selectedCustomer,
  lookupCustomers,
  isLookupLoading,
}: {
  phone: string;
  name: string;
  selectedCustomer: CheckoutCustomerMatch | null;
  lookupCustomers: CheckoutCustomerMatch[] | undefined;
  isLookupLoading: boolean;
}): CheckoutCustomerResolution => {
  const digits = getCheckoutPhoneDigits(phone);
  const lookupPhone = getCheckoutPhoneLookupValue(phone);
  const selectedPhone = selectedCustomer
    ? toCheckoutPhoneInput(selectedCustomer.phone)
    : "";
  const selectedMatchesTypedPhone =
    Boolean(selectedCustomer) &&
    (selectedPhone === digits || (!digits && !selectedPhone));

  if (!lookupPhone) {
    if (digits.length > 0) {
      return {
        status: "blocked",
        reason:
          digits.length === 10
            ? "Enter a valid 10-digit phone number"
            : "Enter a 10-digit phone number",
      };
    }

    if (selectedCustomer) {
      return { status: "existing", customer: selectedCustomer };
    }

    return { status: "walk_in" };
  }

  if (selectedCustomer && selectedMatchesTypedPhone) {
    return { status: "existing", customer: selectedCustomer };
  }

  if (isLookupLoading || lookupCustomers === undefined) {
    return { status: "looking_up" };
  }

  const match = findCustomerByExactPhone(lookupCustomers, lookupPhone);
  if (match) {
    return { status: "existing", customer: match };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return {
      status: "blocked",
      reason: "Enter a name for this new customer",
    };
  }

  const normalizedPhone = normalizePhoneNumber(lookupPhone);
  if (!normalizedPhone) {
    return {
      status: "blocked",
      reason: "Enter a valid 10-digit phone number",
    };
  }

  return {
    status: "create",
    name: trimmedName,
    phone: normalizedPhone,
  };
};
