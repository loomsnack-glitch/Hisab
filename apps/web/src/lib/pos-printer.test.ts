import { describe, expect, test } from "bun:test";
import type { SaleDetailDTO } from "@repo/types";

import { build80mmEscPosPayload } from "./pos-printer";
import { buildReceiptText, RECEIPT_WIDTH } from "./receipt-text";

const sale = {
  saleNumber: "INV-1042",
  createdAt: "2026-08-04T12:00:00.000Z",
  status: "completed",
  paymentStatus: "paid",
  customer: null,
  items: [
    {
      productNameSnapshot: "Masala Dosa",
      quantity: 2,
      unitPriceSnapshot: 90,
      lineTotal: 180,
      discountAmount: 0,
      addOns: [],
      bundleComponents: [],
    },
  ],
  payments: [],
  subtotal: 180,
  orderDiscountAmount: 0,
  grandTotal: 180,
  paidTotal: 180,
  dueTotal: 0,
} as unknown as SaleDetailDTO;

describe("80mm ESC/POS receipt payload", () => {
  test("initializes, prints the sale, feeds, and cuts", () => {
    const payload = build80mmEscPosPayload(sale);
    const output = new TextDecoder().decode(payload);

    expect(Array.from(payload.slice(0, 2))).toEqual([0x1b, 0x40]);
    expect(output).toContain("INVOICE / RECEIPT");
    expect(output).toContain("Bill #: INV-1042");
    expect(Array.from(payload.slice(-6))).toEqual([
      0x1b, 0x64, 0x04, 0x1d, 0x56, 0x00,
    ]);
  });

  test("uses an ASCII-safe fallback for unsupported printer characters", () => {
    const localizedSale = {
      ...sale,
      items: [{ ...sale.items[0], productNameSnapshot: "चाय" }],
    };
    const output = new TextDecoder().decode(
      build80mmEscPosPayload(localizedSale),
    );

    expect(output).toContain("??");
  });

  test("keeps item columns and wraps long names without paid or due rows", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload({
        ...sale,
        items: [
          {
            ...sale.items[0],
            productNameSnapshot:
              "Extra Long Masala Dosa With Cheese And Vegetables",
          },
        ],
      }),
    );

    expect(output).toContain("ITEM");
    expect(output).toContain("QTY");
    expect(output).toContain("RATE");
    expect(output).toContain("PRICE");
    expect(output).toContain("Extra Long Masala");
    expect(output).toContain("Dosa With Cheese And");
    expect(output).toContain("Vegetables");
    expect(output).not.toContain("Collected:");
    expect(output).not.toContain("Due:");
    expect(output).toContain("FINAL AMOUNT: 180");
    expect(output).not.toContain("Payable:");
    expect(output).toContain("Thank you! Visit again");
  });

  test("prints organization and store context above the bill", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload(sale, {
        organizationName: "Hisab Foods",
        organizationTagline: "Fresh taste, every day",
        storeName: "Main Store",
        storeAddress: "12 Market Road",
      }),
    );

    expect(output).toContain("Hisab Foods");
    expect(output).toContain("Fresh taste, every day");
    expect(output).toContain("Main Store");
    expect(output).toContain("12 Market Road");
    expect(output).toContain("INVOICE / RECEIPT");
    expect(output).toContain("\u001bM\u0000");
    expect(output).toContain("\u001d!\u0011");
  });

  test("keeps every wrapped brand line emphasized", () => {
    const organizationName = "A".repeat(50);
    const output = new TextDecoder().decode(
      build80mmEscPosPayload(sale, { organizationName }),
    );
    const doubleSizeStarts = output.match(/\u001d!\u0011/g) ?? [];

    expect(doubleSizeStarts).toHaveLength(4);
  });

  test("indents add-ons and combo components under their parent item", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload({
        ...sale,
        items: [
          {
            ...sale.items[0],
            productNameSnapshot: "Combo Meal",
            addOns: [
              {
                addOnNameSnapshot: "Extra Cheese",
                totalQuantity: 1,
                unitPriceSnapshot: 20,
                lineTotal: 20,
                discountAmount: 0,
              },
            ],
            bundleComponents: [
              {
                productNameSnapshot: "Side Salad",
                totalQuantity: 1,
                unitPriceSnapshot: 0,
                priceAdjustmentSnapshot: 0,
                addOns: [],
              },
            ],
          },
        ],
      }),
    );

    expect(output).toContain("  + Extra Cheese");
    expect(output).toContain("  * Side Salad");
  });

  test("wraps a long organization tagline to the printer width", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload(sale, {
        organizationName: "Hisab Foods",
        organizationTagline: "A".repeat(80),
      }),
    );

    expect(output).toContain("A".repeat(42));
    expect(output).toContain("A".repeat(38));
  });

  test("wraps long organization names and final amounts without dropping text", () => {
    const organizationName =
      "A Very Long Organization Name That Must Stay Fully Printed";
    const grandTotal = "123456789012345678901234567890";
    const customerName = "A Customer With A Name That Must Wrap Safely";
    const customerPhone = "12345678901234567890";
    const output = buildReceiptText(
      {
        ...sale,
        grandTotal,
        customer: { name: customerName, phone: customerPhone },
      },
      { organizationName },
      { width: RECEIPT_WIDTH },
    );
    const compactOutput = output.replace(/\s/g, "");

    expect(compactOutput).toContain(organizationName.replace(/\s/g, ""));
    expect(compactOutput).toContain(grandTotal);
    expect(compactOutput).toContain(customerName.replace(/\s/g, ""));
    expect(compactOutput).toContain(customerPhone);
    expect(output.split("\n").every((line) => line.length <= 42)).toBe(true);
  });

  test("wraps item values when a table column is too narrow", () => {
    const output = buildReceiptText(
      {
        ...sale,
        items: [
          {
            ...sale.items[0],
            quantity: 123456789,
            unitPriceSnapshot: "1234567890",
            lineTotal: "987654321012345",
          },
        ],
      },
      {},
      { width: RECEIPT_WIDTH },
    );
    const compactOutput = output.replace(/\s/g, "");

    expect(compactOutput).toContain("123456789");
    expect(output).toContain("12345678");
    expect(output).toContain("98765432");
    expect(output).toContain("1012345");
    expect(output.split("\n").every((line) => line.length <= 42)).toBe(true);
  });

  test("rejects an invalid receipt width before wrapping", () => {
    expect(() => buildReceiptText(sale, {}, { width: 22 })).toThrow(
      "Receipt width must be an integer",
    );
  });
});
