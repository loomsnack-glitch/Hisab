import { describe, expect, it } from "bun:test";
import type { SaleDetailDTO } from "@repo/types";
import { getInvoiceCustomerSnapshot, renderSalePdf } from "./invoice-pdf";

const sale = {
  id: "00000000-0000-4000-8000-000000000001",
  saleNumber: "INV-42",
  customerNameSnapshot: "Original customer",
  customerPhoneSnapshot: "+919876543210",
  customer: {
    name: "Renamed customer",
    phone: "+919999999999",
  },
  committedAt: "2026-08-11T10:00:00.000Z",
  createdAt: "2026-08-11T09:59:00.000Z",
  paymentStatus: "paid",
  subtotal: 100,
  discountTotal: 10,
  grandTotal: 90,
  notes: null,
  items: [
    {
      productNameSnapshot: "Snapshot product",
      quantity: 2,
      lineTotal: 90,
    },
  ],
} as unknown as SaleDetailDTO;

describe("invoice PDF", () => {
  it("uses committed customer snapshots instead of current customer data", () => {
    expect(getInvoiceCustomerSnapshot(sale)).toEqual({
      name: "Original customer",
      phone: "+919876543210",
    });
  });

  it("renders a PDF document from committed sale data", async () => {
    const pdf = await renderSalePdf(sale);

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1_000);
  });
});
