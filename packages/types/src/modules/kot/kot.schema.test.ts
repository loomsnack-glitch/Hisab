import { describe, expect, test } from "bun:test";
import {
  CheckoutTableOrderSchema,
  CreateTableKotSchema,
  KotDTOSchema,
  KotFulfillmentTypeSchema,
  KotTypeSchema,
  TableOrderDTOSchema,
  UpdateTableKotSchema,
} from "./kot.schema";

const now = new Date("2026-08-21T12:00:00.000Z");
const organizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "11111111-1111-4111-8111-111111111111";
const addOnId = "22222222-2222-4222-8222-222222222222";
const saleId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const kotId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const kotItemId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

describe("Parcel KOT contracts", () => {
  test("accepts table and parcel KOT types", () => {
    expect(KotTypeSchema.safeParse("parcel").success).toBe(true);
    expect(KotTypeSchema.safeParse("table").success).toBe(true);
    expect(KotTypeSchema.safeParse("takeaway").success).toBe(false);
  });

  test("accepts dine-in and pick-up fulfillment types", () => {
    expect(KotFulfillmentTypeSchema.safeParse("dine_in").success).toBe(true);
    expect(KotFulfillmentTypeSchema.safeParse("pick_up").success).toBe(true);
    expect(KotFulfillmentTypeSchema.safeParse("parcel").success).toBe(false);
  });

  test("Parcel KOT records retain a Store-local KOT Number and tableless sale link", () => {
    const result = KotDTOSchema.safeParse({
      id: kotId,
      organizationId,
      storeId,
      saleId,
      kotType: "parcel",
      fulfillmentType: "pick_up",
      saleBatchSequence: 1,
      kotNumber: "KOT-001",
      kotSequenceNumber: 1,
      kotPeriodKey: "20260821",
      createdByDeviceId: "17171717-1717-4171-8171-171717171717",
      updatedByDeviceId: "17171717-1717-4171-8171-171717171717",
      createdAt: now,
      updatedAt: now,
      items: [
        {
          id: kotItemId,
          organizationId,
          storeId,
          kotId,
          productId,
          quantity: 1,
          configurationSignature: "",
          productNameSnapshot: "Burger",
          unitPriceSnapshot: 100,
          discountAmount: 10,
          lineSubtotal: 100,
          lineTotal: 90,
          createdAt: now,
          updatedAt: now,
          addOns: [],
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kotType).toBe("parcel");
      expect(result.data.fulfillmentType).toBe("pick_up");
      expect(result.data.saleBatchSequence).toBe(1);
      expect(result.data.kotNumber).toBe("KOT-001");
      expect(result.data.saleId).toBe(saleId);
      expect(result.data.items[0]?.unitPriceSnapshot).toBe(100);
    }
  });

  test("standalone KOT batches on one Sale keep ordered batch sequence values", () => {
    const secondKotId = "f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1";
    const first = KotDTOSchema.safeParse({
      id: kotId,
      organizationId,
      storeId,
      saleId,
      kotType: "parcel",
      fulfillmentType: "pick_up",
      saleBatchSequence: 1,
      kotNumber: "KOT-001",
      kotSequenceNumber: 1,
      kotPeriodKey: "20260821",
      createdAt: now,
      updatedAt: now,
      items: [],
    });
    const second = KotDTOSchema.safeParse({
      id: secondKotId,
      organizationId,
      storeId,
      saleId,
      kotType: "parcel",
      fulfillmentType: "dine_in",
      saleBatchSequence: 2,
      kotNumber: "KOT-002",
      kotSequenceNumber: 2,
      kotPeriodKey: "20260821",
      createdAt: now,
      updatedAt: now,
      items: [],
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (first.success && second.success) {
      expect(first.data.saleBatchSequence).toBeLessThan(
        second.data.saleBatchSequence!,
      );
      expect(first.data.saleId).toBe(second.data.saleId);
    }
  });
});

describe("Table Order and Table KOT contracts", () => {
  const tableOrderId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
  const serviceTableId = "99999999-9999-4999-8999-999999999999";

  test("Table KOT creation defaults fulfillment to dine-in and accepts pick-up", () => {
    const dineIn = CreateTableKotSchema.safeParse({
      requestId: "11111111-1111-4111-8111-111111111111",
      items: [{ productId, quantity: 1 }],
    });
    const pickUp = CreateTableKotSchema.safeParse({
      requestId: "22222222-2222-4222-8222-222222222222",
      items: [{ productId, quantity: 1 }],
      fulfillmentType: "pick_up",
    });

    expect(dineIn.success).toBe(true);
    expect(pickUp.success).toBe(true);
    expect(
      CreateTableKotSchema.safeParse({
        items: [{ productId, quantity: 1 }],
      }).success,
    ).toBe(false);
    if (dineIn.success && pickUp.success) {
      expect(dineIn.data.fulfillmentType).toBe("dine_in");
      expect(pickUp.data.fulfillmentType).toBe("pick_up");
    }
  });

  test("Table KOT creation accepts selection-only items and rejects client prices", () => {
    const result = CreateTableKotSchema.safeParse({
      requestId: "33333333-3333-4333-8333-333333333333",
      items: [
        {
          productId,
          quantity: 1,
          addOns: [{ addOnId, quantity: 1 }],
          unitPrice: 99,
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect("unitPrice" in result.data.items[0]!).toBe(false);
    }
  });

  test("Table KOT updates may clear remaining items", () => {
    expect(UpdateTableKotSchema.safeParse({ items: [] }).success).toBe(true);
    expect(UpdateTableKotSchema.safeParse({}).success).toBe(false);
  });

  test("checkout accepts payments and does not require a Customer", () => {
    const result = CheckoutTableOrderSchema.safeParse({
      requestId: "77777777-7777-4777-8777-777777777777",
      payments: [{ amount: 90, method: "cash" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerId).toBeUndefined();
      expect(result.data.payments).toHaveLength(1);
    }
  });

  test("an Active Table Order can group multiple table KOTs before a Sale exists", () => {
    const result = TableOrderDTOSchema.safeParse({
      id: tableOrderId,
      organizationId,
      storeId,
      serviceTableId,
      customerId: null,
      saleId: null,
      status: "active",
      remainingSubtotal: 180,
      remainingDiscountTotal: 10,
      remainingGrandTotal: 170,
      createdAt: now,
      updatedAt: now,
      kots: [
        {
          id: kotId,
          organizationId,
          storeId,
          saleId: null,
          tableOrderId,
          kotType: "table",
          fulfillmentType: "dine_in",
          saleBatchSequence: null,
          kotNumber: "KOT-001",
          kotSequenceNumber: 1,
          kotPeriodKey: "20260821",
          createdAt: now,
          updatedAt: now,
          items: [],
        },
        {
          id: "f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1",
          organizationId,
          storeId,
          saleId: null,
          tableOrderId,
          kotType: "table",
          fulfillmentType: "pick_up",
          saleBatchSequence: null,
          kotNumber: "KOT-002",
          kotSequenceNumber: 2,
          kotPeriodKey: "20260821",
          createdAt: now,
          updatedAt: now,
          items: [],
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kots).toHaveLength(2);
      expect(result.data.saleId).toBe(null);
    }
  });
});
