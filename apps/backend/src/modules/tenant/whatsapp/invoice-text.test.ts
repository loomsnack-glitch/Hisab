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
    it("creates a professional invoice caption from sale snapshots", () => {
        const text = formatInvoiceText(sale, {
            organizationName: "Dev VadaPav",
        });

        expect(text).toContain("Hello Original customer,");
        expect(text).toContain("Thank you for shopping with Dev VadaPav.");
        expect(text).toContain("Bill number: INV-42");
        expect(text).toContain("Total amount: ₹90.00");
        expect(text).toContain("Paid: ₹50.00");
        expect(text).toContain("Balance due: ₹40.00");
        expect(text).toContain("Regards,\nDev VadaPav");
    });

    it("falls back to the product name when no organization name is provided", () => {
        expect(formatInvoiceText(sale)).toContain(
            "Thank you for shopping with Ganatri.",
        );
    });

    it("invites feedback when the Store has a review destination", () => {
        const text = formatInvoiceText(sale, {
            organizationName: "Panini House",
            reviewPlatform: "Google",
            reviewLink: "https://g.page/r/panini-house/review",
        });

        expect(text).toContain(
            "Happy with your experience? Pls share your feedback with us on Google.\n" +
                "Link: https://g.page/r/panini-house/review",
        );
    });

    it("invites the customer to follow the configured social account", () => {
        const text = formatInvoiceText(sale, {
            organizationName: "Panini House",
            socialMediaName: "Instagram",
            socialMediaLink: "https://instagram.com/paninihouse",
        });

        expect(text).toContain(
            "Follow us on Instagram:\n" +
                "New launches - Offers - Reel - Behind the scenes.\n" +
                "👉 Instagram Link - https://instagram.com/paninihouse",
        );
    });
});
