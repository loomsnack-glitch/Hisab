import { describe, expect, test } from "bun:test";
import type { SaleDetailDTO } from "@repo/types";

import { build80mmEscPosPayload } from "./pos-printer";

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
      0x1b,
      0x64,
      0x04,
      0x1d,
      0x56,
      0x00,
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
            productNameSnapshot: "Extra Long Masala Dosa With Cheese And Vegetables",
          },
        ],
      }),
    );

    expect(output).toContain("ITEM");
    expect(output).toContain("QTY");
    expect(output).toContain("RATE");
    expect(output).toContain("PRICE");
    expect(output).toContain("Extra Long Masala Dosa With");
    expect(output).toContain("Cheese And Vegetables");
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
    expect(output).toContain("\u001d!\u0011");
  });

  test("wraps a long organization tagline to the printer width", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload(sale, {
        organizationName: "Hisab Foods",
        organizationTagline: "A".repeat(80),
      }),
    );

    expect(output).toContain("A".repeat(48));
    expect(output).toContain("A".repeat(32));
  });
});
