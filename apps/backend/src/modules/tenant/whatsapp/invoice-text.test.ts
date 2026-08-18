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

    it("renders a Store template and explicitly referenced links", () => {
        const text = formatInvoiceText(sale, {
            organizationName: "Panini House",
            storeName: "Central Store",
            template: "Hi {{customer_name}}, bill {{bill_number}} total {{total}}, due {{balance_due}}.\nInstall: {{link_app_install}}",
            links: [
                {
                    key: "app_install",
                    type: "app_install",
                    label: "Install our app",
                    url: "https://example.com/app",
                    isActive: true,
                },
            ],
        });

        expect(text).toContain("Hi Original customer, bill INV-42 total ₹90.00, due ₹40.00.");
        expect(text).toContain("Install: https://example.com/app");
    });
});
