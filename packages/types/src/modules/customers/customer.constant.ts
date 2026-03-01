export const CUSTOMER_CONSTANTS = {
  MAX_NAME_LENGTH: 255,
  MAX_PHONE_LENGTH: 20,
} as const;

export const LEDGER_ENTRY_TYPE_OPTIONS = [
  { value: "sale", label: "Sale" },
  { value: "payment", label: "Payment" },
  { value: "adjustment", label: "Adjustment" },
  { value: "refund", label: "Refund" },
] as const;
