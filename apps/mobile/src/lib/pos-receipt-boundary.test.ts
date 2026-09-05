import { describe, expect, it } from "bun:test";
import {
    buildPosDigitalReceiptText,
    sharePosDigitalReceipt,
} from "./pos-receipt-boundary";

const sale = {
    id: "sale-1",
    saleNumber: "INV-1042",
    createdAt: "2026-09-05T10:00:00.000Z",
    customer: { name: "Asha" },
    items: [{
        productNameSnapshot: "Masala Tea",
        quantity: 2,
        lineTotal: 80,
        addOns: [{ addOnNameSnapshot: "Extra Sugar", totalQuantity: 1, lineTotal: 5 }],
    }],
    paymentStatus: "partial" as const,
    grandTotal: 85,
    paidTotal: 50,
    dueTotal: 35,
} as unknown as Parameters<typeof buildPosDigitalReceiptText>[0];

describe("POS digital receipt boundary", () => {
    it("builds stable English receipt text from server Sale fields", () => {
        const receipt = buildPosDigitalReceiptText(sale);

        expect(receipt).toContain("Bill No: INV-1042");
        expect(receipt).toContain("Customer: Asha");
        expect(receipt).toContain("Masala Tea x2 80");
        expect(receipt).toContain("  + Extra Sugar x1 5");
        expect(receipt).toContain("TOTAL: 85");
        expect(receipt).toContain("COLLECTED: 50");
        expect(receipt).toContain("DUE: 35");
        expect(receipt).toContain("PAYMENT STATUS: Partial");
    });

    it("reports share success and dismissal without changing Sale data", async () => {
        const shared = await sharePosDigitalReceipt(sale, async (content) => {
            expect(content.title).toBe("Sale INV-1042");
            expect(content.message).toContain("TOTAL: 85");
            return { action: "sharedAction" };
        });
        const dismissed = await sharePosDigitalReceipt(sale, async () => ({ action: "dismissedAction" }));

        expect(shared).toBe("shared");
        expect(dismissed).toBe("dismissed");
        expect(sale.grandTotal).toBe(85);
    });

    it("converts share rejection to failure feedback only", async () => {
        const result = await sharePosDigitalReceipt(sale, async () => {
            throw new Error("Share unavailable");
        });

        expect(result).toBe("failed");
        expect(sale.paymentStatus).toBe("partial");
    });
});
