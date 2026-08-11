import { describe, expect, it } from "bun:test";
import type { SaleDetailDTO } from "@repo/types";
import { formatInvoiceText } from "./invoice-text";

const sale = {
    id: "00000000-0000-4000-8000-000000000001",
    saleNumber: "INV-42",
    customerNameSnapshot: "Original customer",
    customerPhoneSnapshot: "+919876543210",
    customer: { name: "Current customer", phone: "+919999999999" },
    committedAt: "2026-08-11T10:00:00.000Z",
    createdAt: "2026-08-11T09:59:00.000Z",
    paymentStatus: "partial",
    subtotal: 100,
    discountTotal: 10,
    grandTotal: 90,
    paidTotal: 50,
    dueTotal: 40,
    notes: "Keep the long customer note intact.",
    items: [
        {
            productNameSnapshot:
                "A very long product name that must wrap without losing any content",
            quantity: 2,
            lineTotal: 90,
            addOns: [
                {
                    addOnNameSnapshot: "Gift wrap",
                    totalQuantity: 2,
                    lineTotal: 4,
                },
            ],
            bundleComponents: [],
        },
    ],
} as unknown as SaleDetailDTO;

describe("invoice text", () => {
    it("uses sale snapshots and includes the complete bill summary", () => {
        const text = formatInvoiceText(sale);

        expect(text).toContain("Bill: INV-42");
        expect(text).toContain("Customer: Original customer");
        expect(text).toContain("Phone: +919876543210");
        expect(text).toContain(
            "A very long product name that must wrap without losing any",
        );
        expect(text).toContain("content x 2: ₹90.00");
        expect(text).toContain("Gift wrap x 2: ₹4.00");
        expect(text).toContain("Total: ₹90.00");
        expect(text).toContain("Paid: ₹50.00");
        expect(text).toContain("Due: ₹40.00");
        expect(text).toContain("Payment: Partial");
    });

    it("wraps long lines without truncating them", () => {
        const text = formatInvoiceText(sale);
        expect(text.split("\n").every((line) => line.length <= 60)).toBe(true);
    });
});
