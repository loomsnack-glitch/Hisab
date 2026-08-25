import { describe, expect, it } from "bun:test";
import type { CustomerDTO, SaleSummaryDTO } from "@repo/types";
import { formatDueReminderText } from "./due-reminder";

const customer = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Asha",
    phone: "+919876543210",
} as unknown as CustomerDTO;

const sale = {
    id: "00000000-0000-4000-8000-000000000002",
    saleNumber: "5",
    dueTotal: 125,
} as unknown as SaleSummaryDTO;

describe("due reminder text", () => {
    it("labels the sale number as an invoice instead of showing an unexplained number", () => {
        const text = formatDueReminderText(customer, [sale], "Central Store");

        expect(text).toContain("• Invoice #5: ₹125.00 due");
        expect(text).not.toContain(`• ${sale.id}`);
    });

    it("includes the public invoice URL in template values", () => {
        const text = formatDueReminderText(
            customer,
            [sale],
            "Central Store",
            "Hello {{customer_name}}: {{invoice_url}}",
            [],
            "https://example.test/invoices/token",
        );

        expect(text).toBe("Hello Asha: https://example.test/invoices/token");
    });
});
