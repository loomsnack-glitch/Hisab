import { describe, expect, test } from "bun:test";
import {
  CreateExpenseCategorySchema,
  ExpenseCategoryDTOSchema,
  UpdateExpenseCategorySchema,
  isExpenseCategoryAvailableForAssignment,
  normalizeExpenseCategoryName,
} from "./expense-categories.schema";
import {
  PREDEFINED_EXPENSE_CATEGORIES,
  SEEDED_EXPENSE_CATEGORIES,
} from "./seeded-expense-categories";

describe("Expense Category contracts", () => {
  test("create Expense Category accepts a name and optional status", () => {
    const result = CreateExpenseCategorySchema.safeParse({
      name: "Packaging",
      status: "active",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Packaging");
      expect(result.data.status).toBe("active");
    }
  });

  test("create Expense Category trims name", () => {
    const result = CreateExpenseCategorySchema.safeParse({
      name: "  Packaging  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Packaging");
    }
  });

  test("create Expense Category defaults status as optional", () => {
    const result = CreateExpenseCategorySchema.safeParse({
      name: "Packaging",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
    }
  });

  test("rejects an Expense Category without a name", () => {
    const result = CreateExpenseCategorySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  test("rejects a blank Expense Category name after trim", () => {
    expect(CreateExpenseCategorySchema.safeParse({ name: "   " }).success).toBe(false);
  });

  test("rejects chart-of-account and deletion fields on create", () => {
    expect(
      CreateExpenseCategorySchema.safeParse({
        name: "Packaging",
        accountCode: "5000",
      }).success,
    ).toBe(false);
    expect(
      CreateExpenseCategorySchema.safeParse({
        name: "Packaging",
        deleted: true,
      }).success,
    ).toBe(false);
  });

  test("update Expense Category accepts status-only availability changes", () => {
    const result = UpdateExpenseCategorySchema.safeParse({ status: "inactive" });

    expect(result.success).toBe(true);
  });

  test("update Expense Category accepts name changes", () => {
    const result = UpdateExpenseCategorySchema.safeParse({
      name: "Packaging materials",
    });

    expect(result.success).toBe(true);
  });

  test("update Expense Category requires at least one field", () => {
    const result = UpdateExpenseCategorySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  test("Expense Category DTO includes source kind, availability, and name only", () => {
    const result = ExpenseCategoryDTOSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Rent",
      kind: "predefined",
      predefinedKey: "rent",
      status: "active",
      createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      updatedBy: null,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("predefined");
      expect(result.data.name).toBe("Rent");
      expect("accountCode" in result.data).toBe(false);
      expect("label" in result.data).toBe(false);
    }
  });

  test("rejects an Expense Category DTO with an invalid organization id", () => {
    const result = ExpenseCategoryDTOSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: "not-a-uuid",
      name: "Packaging",
      kind: "custom",
      predefinedKey: null,
      status: "active",
      createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      updatedBy: null,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

describe("Expense Category name normalization", () => {
  test("normalizes Expense Category names by trim and case", () => {
    expect(normalizeExpenseCategoryName(" Rent ")).toBe("rent");
    expect(normalizeExpenseCategoryName("Taxes & Fees")).toBe("taxes & fees");
  });

  test("collapses internal whitespace in Expense Category names", () => {
    expect(normalizeExpenseCategoryName("Internet   &   Phone")).toBe("internet & phone");
  });
});

describe("Expense Category assignment availability", () => {
  test("active Expense Categories are available for new or edited records", () => {
    expect(isExpenseCategoryAvailableForAssignment({ status: "active" })).toBe(true);
  });

  test("inactive Expense Categories cannot be assigned to new or edited records", () => {
    expect(isExpenseCategoryAvailableForAssignment({ status: "inactive" })).toBe(false);
  });
});

describe("Predefined Expense Categories", () => {
  test("seeds the agreed predefined Expense Category names", () => {
    expect(SEEDED_EXPENSE_CATEGORIES).toEqual([
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
    ]);
    expect(PREDEFINED_EXPENSE_CATEGORIES).toBe(SEEDED_EXPENSE_CATEGORIES);
  });

  test("predefined Expense Category names are unique after normalization", () => {
    const names = SEEDED_EXPENSE_CATEGORIES.map((category) =>
      normalizeExpenseCategoryName(category.name),
    );
    const keys = SEEDED_EXPENSE_CATEGORIES.map((category) => category.key);

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
