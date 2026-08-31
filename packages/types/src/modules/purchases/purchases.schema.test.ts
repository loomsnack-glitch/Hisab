import { describe, expect, test } from "bun:test";
import {
  CreateDraftPurchaseSchema,
  PayableStatusSchema,
  PurchaseDTOSchema,
  PurchaseLifecycleSchema,
  UpdateDraftPurchaseSchema,
  calculatePurchaseLineTotal,
  calculatePurchaseTotals,
  calculateVendorOutstanding,
  calendarDateInTimeZone,
  canAcceptOutgoingPayment,
  derivePurchasePayableState,
  isPurchaseEffectiveDateAllowed,
  isVendorItemSelectableForDraftPurchase,
  isVendorSelectableForDraftPurchase,
} from "./purchases.schema";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const vendorId = "11111111-1111-4111-8111-111111111111";
const vendorItemId = "44444444-4444-4444-8444-444444444444";
const unitId = "33333333-3333-4333-8333-333333333333";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const purchaseId = "88888888-8888-4888-8888-888888888888";
const lineId = "99999999-9999-4999-8999-999999999999";

const validCreate = {
  storeId,
  vendorId,
  effectiveDate: "2026-08-30",
  invoiceReference: "INV-104",
  notes: "Weekly produce",
  adjustment: 25.5,
  lines: [{ vendorItemId, quantity: 2, agreedUnitPrice: 40.5 }],
};

describe("Draft Purchase contracts", () => {
  test("create Draft Purchase accepts Store, Vendor, date, optional reference, notes, lines, and signed adjustment", () => {
    const result = CreateDraftPurchaseSchema.safeParse(validCreate);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.storeId).toBe(storeId);
      expect(result.data.vendorId).toBe(vendorId);
      expect(result.data.effectiveDate).toBe("2026-08-30");
      expect(result.data.invoiceReference).toBe("INV-104");
      expect(result.data.adjustment).toBe(25.5);
      expect(result.data.lines?.[0]?.quantity).toBe(2);
    }
  });

  test("create Draft Purchase allows omitted lines, date, reference, notes, and adjustment", () => {
    const result = CreateDraftPurchaseSchema.safeParse({
      storeId,
      vendorId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lines).toBeUndefined();
      expect(result.data.effectiveDate).toBeUndefined();
      expect(result.data.adjustment).toBeUndefined();
    }
  });

  test("create Draft Purchase trims invoice/reference and notes", () => {
    const result = CreateDraftPurchaseSchema.safeParse({
      storeId,
      vendorId,
      invoiceReference: "  INV-104  ",
      notes: "  Weekly produce  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceReference).toBe("INV-104");
      expect(result.data.notes).toBe("Weekly produce");
    }
  });

  test("create Draft Purchase accepts a negative Purchase Adjustment", () => {
    const result = CreateDraftPurchaseSchema.safeParse({
      storeId,
      vendorId,
      adjustment: -12.25,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.adjustment).toBe(-12.25);
    }
  });

  test("rejects a Draft Purchase without Store or Vendor", () => {
    expect(CreateDraftPurchaseSchema.safeParse({ vendorId }).success).toBe(false);
    expect(CreateDraftPurchaseSchema.safeParse({ storeId }).success).toBe(false);
  });

  test("rejects invalid Store, Vendor, and Vendor Item ids", () => {
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId: "not-a-uuid",
        vendorId,
      }).success,
    ).toBe(false);
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId,
        vendorId: "not-a-uuid",
      }).success,
    ).toBe(false);
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId,
        vendorId,
        lines: [{ vendorItemId: "bad", quantity: 1 }],
      }).success,
    ).toBe(false);
  });

  test("rejects a future effective date", () => {
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId,
        vendorId,
        effectiveDate: "2099-01-01",
      }).success,
    ).toBe(false);
  });

  test("rejects a malformed effective date", () => {
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId,
        vendorId,
        effectiveDate: "31-08-2026",
      }).success,
    ).toBe(false);
  });

  test("rejects zero or negative quantity and more than three decimal places", () => {
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId,
        vendorId,
        lines: [{ vendorItemId, quantity: 0 }],
      }).success,
    ).toBe(false);
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId,
        vendorId,
        lines: [{ vendorItemId, quantity: -1 }],
      }).success,
    ).toBe(false);
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId,
        vendorId,
        lines: [{ vendorItemId, quantity: 1.2345 }],
      }).success,
    ).toBe(false);
  });

  test("rejects a negative agreed unit price and more than two decimal places", () => {
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId,
        vendorId,
        lines: [{ vendorItemId, quantity: 1, agreedUnitPrice: -1 }],
      }).success,
    ).toBe(false);
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId,
        vendorId,
        lines: [{ vendorItemId, quantity: 1, agreedUnitPrice: 40.555 }],
      }).success,
    ).toBe(false);
  });

  test("rejects a Purchase Adjustment with more than two decimal places", () => {
    expect(
      CreateDraftPurchaseSchema.safeParse({
        storeId,
        vendorId,
        adjustment: 1.234,
      }).success,
    ).toBe(false);
  });

  test("rejects payment, payable status, and snapshot fields on create", () => {
    expect(
      CreateDraftPurchaseSchema.safeParse({
        ...validCreate,
        paidTotal: 10,
      }).success,
    ).toBe(false);
    expect(
      CreateDraftPurchaseSchema.safeParse({
        ...validCreate,
        payableStatus: "due",
      }).success,
    ).toBe(false);
    expect(
      CreateDraftPurchaseSchema.safeParse({
        ...validCreate,
        vendorName: "Fresh Farms",
      }).success,
    ).toBe(false);
  });

  test("update Draft Purchase requires at least one field", () => {
    expect(UpdateDraftPurchaseSchema.safeParse({}).success).toBe(false);
  });

  test("update Draft Purchase accepts lines-only and adjustment-only changes", () => {
    expect(
      UpdateDraftPurchaseSchema.safeParse({
        lines: [{ vendorItemId, quantity: 3, agreedUnitPrice: 41 }],
      }).success,
    ).toBe(true);
    expect(UpdateDraftPurchaseSchema.safeParse({ adjustment: -4 }).success).toBe(true);
  });
});

describe("Purchase effective date", () => {
  test("allows today and earlier calendar dates in Asia/Kolkata", () => {
    const today = calendarDateInTimeZone(new Date("2026-08-31T06:00:00.000Z"));

    expect(today).toBe("2026-08-31");
    expect(isPurchaseEffectiveDateAllowed("2026-08-31", today)).toBe(true);
    expect(isPurchaseEffectiveDateAllowed("2026-08-30", today)).toBe(true);
    expect(isPurchaseEffectiveDateAllowed("2026-09-01", today)).toBe(false);
  });
});

describe("Purchase totals and Payable Status", () => {
  test("line total is quantity multiplied by agreed unit price", () => {
    expect(calculatePurchaseLineTotal(2, 40.5)).toBe(81);
    expect(calculatePurchaseLineTotal(1.5, 20)).toBe(30);
  });

  test("final total visibly adds a signed Purchase Adjustment to line totals", () => {
    expect(calculatePurchaseTotals([{ quantity: 2, agreedUnitPrice: 40.5 }], 25.5)).toEqual({
      linesTotal: 81,
      total: 106.5,
    });
    expect(calculatePurchaseTotals([{ quantity: 2, agreedUnitPrice: 40.5 }], -1.5)).toEqual({
      linesTotal: 81,
      total: 79.5,
    });
  });

  test("a Draft Purchase has no Payable Status or due amount", () => {
    expect(
      derivePurchasePayableState({ lifecycle: "draft", total: 106.5, paidTotal: 0 }),
    ).toEqual({ payableStatus: null, dueAmount: null });
  });

  test("a recorded unpaid Purchase is due with paid total of zero", () => {
    expect(
      derivePurchasePayableState({ lifecycle: "recorded", total: 106.5, paidTotal: 0 }),
    ).toEqual({ payableStatus: "due", dueAmount: 106.5 });
  });

  test("Payable Status covers due, partial, and paid", () => {
    expect(PayableStatusSchema.options).toEqual(["due", "partial", "paid"]);
    expect(
      derivePurchasePayableState({ lifecycle: "recorded", total: 100, paidTotal: 40 }),
    ).toEqual({ payableStatus: "partial", dueAmount: 60 });
    expect(
      derivePurchasePayableState({ lifecycle: "recorded", total: 100, paidTotal: 100 }),
    ).toEqual({ payableStatus: "paid", dueAmount: 0 });
  });

  test("a payable cannot be overpaid relative to remaining due", () => {
    expect(
      canAcceptOutgoingPayment({
        lifecycle: "recorded",
        total: 100,
        outgoingPayments: [{ amount: 40, reversedAt: null }],
        amount: 60,
      }),
    ).toBe(true);
    expect(
      canAcceptOutgoingPayment({
        lifecycle: "recorded",
        total: 100,
        outgoingPayments: [{ amount: 40, reversedAt: null }],
        amount: 60.01,
      }),
    ).toBe(false);
    expect(
      canAcceptOutgoingPayment({
        lifecycle: "draft",
        total: 100,
        outgoingPayments: [],
        amount: 10,
      }),
    ).toBe(false);
  });

  test("Vendor Outstanding sums remaining due from recorded Purchases only", () => {
    expect(
      calculateVendorOutstanding([
        {
          vendorId,
          vendorName: "Fresh Farms",
          lifecycle: "draft",
          dueAmount: null,
        },
        {
          vendorId,
          vendorName: "Fresh Farms",
          lifecycle: "recorded",
          dueAmount: 106.5,
        },
        {
          vendorId,
          vendorName: "Fresh Farms",
          lifecycle: "recorded",
          dueAmount: 0,
        },
        {
          vendorId: "22222222-2222-4222-8222-222222222222",
          vendorName: "Miller Spices",
          lifecycle: "recorded",
          dueAmount: 20,
        },
      ]),
    ).toEqual([
      { vendorId, vendorName: "Fresh Farms", outstandingAmount: 106.5 },
      {
        vendorId: "22222222-2222-4222-8222-222222222222",
        vendorName: "Miller Spices",
        outstandingAmount: 20,
      },
    ]);
  });
});

describe("Draft Purchase vendor selection", () => {
  test("only an active Vendor is selectable for a new or edited Draft Purchase", () => {
    expect(isVendorSelectableForDraftPurchase({ status: "active" })).toBe(true);
    expect(isVendorSelectableForDraftPurchase({ status: "inactive" })).toBe(false);
  });

  test("only the selected Vendor's active Vendor Items are selectable", () => {
    expect(
      isVendorItemSelectableForDraftPurchase({
        vendorStatus: "active",
        itemStatus: "active",
        vendorId,
        selectedVendorId: vendorId,
      }),
    ).toBe(true);
    expect(
      isVendorItemSelectableForDraftPurchase({
        vendorStatus: "inactive",
        itemStatus: "active",
        vendorId,
        selectedVendorId: vendorId,
      }),
    ).toBe(false);
    expect(
      isVendorItemSelectableForDraftPurchase({
        vendorStatus: "active",
        itemStatus: "inactive",
        vendorId,
        selectedVendorId: vendorId,
      }),
    ).toBe(false);
    expect(
      isVendorItemSelectableForDraftPurchase({
        vendorStatus: "active",
        itemStatus: "active",
        vendorId: "22222222-2222-4222-8222-222222222222",
        selectedVendorId: vendorId,
      }),
    ).toBe(false);
  });
});

describe("Purchase DTO", () => {
  test("includes lifecycle, Vendor snapshots, lines, adjustment, and due-only payable fields", () => {
    const result = PurchaseDTOSchema.safeParse({
      id: purchaseId,
      organizationId,
      storeId,
      storeName: "Main Store",
      vendorId,
      vendorName: "Fresh Farms",
      lifecycle: "recorded",
      payableStatus: "due",
      effectiveDate: "2026-08-30",
      invoiceReference: "INV-104",
      notes: "Weekly produce",
      adjustment: 25.5,
      linesTotal: 81,
      total: 106.5,
      paidTotal: 0,
      dueAmount: 106.5,
      recordedAt: "2026-08-31T12:00:00.000Z",
      lines: [
        {
          id: lineId,
          organizationId,
          purchaseId,
          vendorItemId,
          vendorItemName: "Tomato",
          unitId,
          unitLabel: "kg",
          quantity: 2,
          agreedUnitPrice: 40.5,
          lineTotal: 81,
        },
      ],
      outgoingPayments: [],
      createdBy: userId,
      updatedBy: null,
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lifecycle).toBe("recorded");
      expect(result.data.payableStatus).toBe("due");
      expect(result.data.vendorName).toBe("Fresh Farms");
      expect(result.data.lines[0]?.vendorItemName).toBe("Tomato");
      expect(result.data.paidTotal).toBe(0);
      expect(result.data.dueAmount).toBe(106.5);
    }
  });

  test("a Draft Purchase DTO has null Payable Status and due amount", () => {
    const result = PurchaseDTOSchema.safeParse({
      id: purchaseId,
      organizationId,
      storeId,
      storeName: "Main Store",
      vendorId,
      vendorName: "Fresh Farms",
      lifecycle: "draft",
      payableStatus: null,
      effectiveDate: "2026-08-30",
      invoiceReference: null,
      notes: null,
      adjustment: 0,
      linesTotal: 0,
      total: 0,
      paidTotal: 0,
      dueAmount: null,
      recordedAt: null,
      lines: [],
      outgoingPayments: [],
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

  test("rejects an invalid organization id on a Purchase DTO", () => {
    const result = PurchaseDTOSchema.safeParse({
      id: purchaseId,
      organizationId: "not-a-uuid",
      storeId,
      storeName: "Main Store",
      vendorId,
      vendorName: "Fresh Farms",
      lifecycle: "draft",
      payableStatus: null,
      effectiveDate: "2026-08-30",
      invoiceReference: null,
      notes: null,
      adjustment: 0,
      linesTotal: 0,
      total: 0,
      paidTotal: 0,
      dueAmount: null,
      recordedAt: null,
      lines: [],
      outgoingPayments: [],
      createdBy: userId,
      updatedBy: null,
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  test("Purchase lifecycle includes draft, recorded, and voided", () => {
    expect(PurchaseLifecycleSchema.options).toEqual(["draft", "recorded", "voided"]);
  });
});
