import { describe, expect, test } from "bun:test";
import {
  CreateDraftExpenseSchema,
  ExpenseDTOSchema,
  ExpenseLifecycleSchema,
  ExpensePayableStatusSchema,
  UpdateDraftExpenseSchema,
  expenseCalendarDateInTimeZone,
  deriveExpensePayableState,
  isExpenseCategorySelectableForDraftExpense,
  isExpenseEffectiveDateAllowed,
} from "./expenses.schema";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const expenseCategoryId = "11111111-1111-4111-8111-111111111111";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const expenseId = "88888888-8888-4888-8888-888888888888";

const validCreate = {
  storeId,
  expenseCategoryId,
  effectiveDate: "2026-08-30",
  invoiceReference: "RENT-AUG",
  notes: "Shop rent for August",
  total: 25000,
};

describe("Draft Expense contracts", () => {
  test("create Draft Expense accepts Store, Expense Category, date, payable total, and optional reference and notes", () => {
    const result = CreateDraftExpenseSchema.safeParse(validCreate);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.storeId).toBe(storeId);
      expect(result.data.expenseCategoryId).toBe(expenseCategoryId);
      expect(result.data.effectiveDate).toBe("2026-08-30");
      expect(result.data.invoiceReference).toBe("RENT-AUG");
      expect(result.data.notes).toBe("Shop rent for August");
      expect(result.data.total).toBe(25000);
    }
  });

  test("create Draft Expense allows omitted date, reference, and notes", () => {
    const result = CreateDraftExpenseSchema.safeParse({
      storeId,
      expenseCategoryId,
      total: 25000,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effectiveDate).toBeUndefined();
      expect(result.data.invoiceReference).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  test("create Draft Expense trims invoice/reference and notes", () => {
    const result = CreateDraftExpenseSchema.safeParse({
      storeId,
      expenseCategoryId,
      total: 25000,
      invoiceReference: "  RENT-AUG  ",
      notes: "  Shop rent for August  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceReference).toBe("RENT-AUG");
      expect(result.data.notes).toBe("Shop rent for August");
    }
  });

  test("rejects a Draft Expense without Store, Expense Category, or payable total", () => {
    expect(CreateDraftExpenseSchema.safeParse({ expenseCategoryId, total: 25000 }).success).toBe(
      false,
    );
    expect(CreateDraftExpenseSchema.safeParse({ storeId, total: 25000 }).success).toBe(false);
    expect(CreateDraftExpenseSchema.safeParse({ storeId, expenseCategoryId }).success).toBe(false);
  });

  test("rejects invalid Store and Expense Category ids", () => {
    expect(
      CreateDraftExpenseSchema.safeParse({
        storeId: "not-a-uuid",
        expenseCategoryId,
        total: 25000,
      }).success,
    ).toBe(false);
    expect(
      CreateDraftExpenseSchema.safeParse({
        storeId,
        expenseCategoryId: "not-a-uuid",
        total: 25000,
      }).success,
    ).toBe(false);
  });

  test("rejects a future effective date", () => {
    expect(
      CreateDraftExpenseSchema.safeParse({
        storeId,
        expenseCategoryId,
        total: 25000,
        effectiveDate: "2099-01-01",
      }).success,
    ).toBe(false);
  });

  test("rejects a malformed effective date", () => {
    expect(
      CreateDraftExpenseSchema.safeParse({
        storeId,
        expenseCategoryId,
        total: 25000,
        effectiveDate: "31-08-2026",
      }).success,
    ).toBe(false);
  });

  test("rejects a zero or negative payable total and more than two decimal places", () => {
    expect(
      CreateDraftExpenseSchema.safeParse({
        storeId,
        expenseCategoryId,
        total: 0,
      }).success,
    ).toBe(false);
    expect(
      CreateDraftExpenseSchema.safeParse({
        storeId,
        expenseCategoryId,
        total: -10,
      }).success,
    ).toBe(false);
    expect(
      CreateDraftExpenseSchema.safeParse({
        storeId,
        expenseCategoryId,
        total: 25.555,
      }).success,
    ).toBe(false);
  });

  test("rejects payment, payable status, and snapshot fields on create", () => {
    expect(
      CreateDraftExpenseSchema.safeParse({
        ...validCreate,
        paidTotal: 10,
      }).success,
    ).toBe(false);
    expect(
      CreateDraftExpenseSchema.safeParse({
        ...validCreate,
        payableStatus: "due",
      }).success,
    ).toBe(false);
    expect(
      CreateDraftExpenseSchema.safeParse({
        ...validCreate,
        expenseCategoryName: "Rent",
      }).success,
    ).toBe(false);
  });

  test("update Draft Expense requires at least one field", () => {
    expect(UpdateDraftExpenseSchema.safeParse({}).success).toBe(false);
  });

  test("update Draft Expense accepts total-only and notes-only changes", () => {
    expect(UpdateDraftExpenseSchema.safeParse({ total: 26000 }).success).toBe(true);
    expect(UpdateDraftExpenseSchema.safeParse({ notes: "Updated notes" }).success).toBe(true);
  });
});

describe("Expense effective date", () => {
  test("allows today and earlier calendar dates in Asia/Kolkata", () => {
    const today = expenseCalendarDateInTimeZone(new Date("2026-08-31T06:00:00.000Z"));

    expect(today).toBe("2026-08-31");
    expect(isExpenseEffectiveDateAllowed("2026-08-31", today)).toBe(true);
    expect(isExpenseEffectiveDateAllowed("2026-08-30", today)).toBe(true);
    expect(isExpenseEffectiveDateAllowed("2026-09-01", today)).toBe(false);
  });
});

describe("Expense totals and Payable Status", () => {
  test("a Draft Expense has no Payable Status or due amount", () => {
    expect(deriveExpensePayableState({ lifecycle: "draft", total: 25000, paidTotal: 0 })).toEqual({
      payableStatus: null,
      dueAmount: null,
    });
  });

  test("a recorded unpaid Expense is due with paid total of zero", () => {
    expect(
      deriveExpensePayableState({ lifecycle: "recorded", total: 25000, paidTotal: 0 }),
    ).toEqual({ payableStatus: "due", dueAmount: 25000 });
  });

  test("Payable Status covers due, partial, and paid", () => {
    expect(ExpensePayableStatusSchema.options).toEqual(["due", "partial", "paid"]);
    expect(
      deriveExpensePayableState({ lifecycle: "recorded", total: 100, paidTotal: 40 }),
    ).toEqual({ payableStatus: "partial", dueAmount: 60 });
    expect(
      deriveExpensePayableState({ lifecycle: "recorded", total: 100, paidTotal: 100 }),
    ).toEqual({ payableStatus: "paid", dueAmount: 0 });
  });
});

describe("Draft Expense category selection", () => {
  test("only an active Expense Category is selectable for a new or edited Draft Expense", () => {
    expect(isExpenseCategorySelectableForDraftExpense({ status: "active" })).toBe(true);
    expect(isExpenseCategorySelectableForDraftExpense({ status: "inactive" })).toBe(false);
  });
});

describe("Expense DTO", () => {
  test("includes lifecycle, Expense Category snapshot, totals, and due-only payable fields", () => {
    const result = ExpenseDTOSchema.safeParse({
      id: expenseId,
      organizationId,
      storeId,
      storeName: "Adajan",
      expenseCategoryId,
      expenseCategoryName: "Rent",
      lifecycle: "recorded",
      payableStatus: "due",
      effectiveDate: "2026-08-30",
      invoiceReference: "RENT-AUG",
      notes: "Shop rent for August",
      total: 25000,
      paidTotal: 0,
      dueAmount: 25000,
      recordedAt: "2026-08-31T12:00:00.000Z",
      createdBy: userId,
      updatedBy: null,
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lifecycle).toBe("recorded");
      expect(result.data.payableStatus).toBe("due");
      expect(result.data.expenseCategoryName).toBe("Rent");
      expect(result.data.paidTotal).toBe(0);
      expect(result.data.dueAmount).toBe(25000);
    }
  });

  test("a Draft Expense DTO has null Payable Status and due amount", () => {
    const result = ExpenseDTOSchema.safeParse({
      id: expenseId,
      organizationId,
      storeId,
      storeName: "Adajan",
      expenseCategoryId,
      expenseCategoryName: "Rent",
      lifecycle: "draft",
      payableStatus: null,
      effectiveDate: "2026-08-30",
      invoiceReference: null,
      notes: null,
      total: 25000,
      paidTotal: 0,
      dueAmount: null,
      recordedAt: null,
      createdBy: userId,
      updatedBy: null,
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lifecycle).toBe("draft");
      expect(result.data.payableStatus).toBeNull();
      expect(result.data.dueAmount).toBeNull();
    }
  });

  test("rejects an invalid organization id on an Expense DTO", () => {
    const result = ExpenseDTOSchema.safeParse({
      id: expenseId,
      organizationId: "not-a-uuid",
      storeId,
      storeName: "Adajan",
      expenseCategoryId,
      expenseCategoryName: "Rent",
      lifecycle: "draft",
      payableStatus: null,
      effectiveDate: "2026-08-30",
      invoiceReference: null,
      notes: null,
      total: 25000,
      paidTotal: 0,
      dueAmount: null,
      recordedAt: null,
      createdBy: userId,
      updatedBy: null,
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  test("Expense lifecycle includes draft, recorded, and voided", () => {
    expect(ExpenseLifecycleSchema.options).toEqual(["draft", "recorded", "voided"]);
  });
});
