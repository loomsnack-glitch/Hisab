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
});
