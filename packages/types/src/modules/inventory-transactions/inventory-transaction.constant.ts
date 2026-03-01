export const INVENTORY_TRANSACTION_TYPE_OPTIONS = [
  { value: "in", label: "In" },
  { value: "out", label: "Out" },
  { value: "adjustment", label: "Adjustment" },
] as const;

export const INVENTORY_REFERENCE_TYPE_OPTIONS = [
  { value: "purchase", label: "Purchase" },
  { value: "sale", label: "Sale" },
  { value: "manual", label: "Manual" },
  { value: "return", label: "Return" },
] as const;
