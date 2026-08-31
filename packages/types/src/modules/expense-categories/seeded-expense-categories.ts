export type PredefinedExpenseCategoryDefinition = {
  key: string;
  name: string;
};

export const SEEDED_EXPENSE_CATEGORIES = [
  { key: "rent", name: "Rent" },
  { key: "electricity", name: "Electricity" },
  { key: "water", name: "Water" },
  { key: "internet-phone", name: "Internet & Phone" },
  { key: "salaries-wages", name: "Salaries & Wages" },
  { key: "maintenance-repairs", name: "Maintenance & Repairs" },
  { key: "transport", name: "Transport" },
  { key: "supplies", name: "Supplies" },
  { key: "marketing", name: "Marketing" },
  { key: "taxes-fees", name: "Taxes & Fees" },
  { key: "other", name: "Other" },
] as const satisfies readonly PredefinedExpenseCategoryDefinition[];

export const PREDEFINED_EXPENSE_CATEGORIES = SEEDED_EXPENSE_CATEGORIES;
