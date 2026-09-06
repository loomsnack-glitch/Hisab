import { describe, expect, it } from "bun:test";
import { getPosPaymentStatusPresentation } from "./pos-payment-status-boundary";

const sale = {
    paymentStatus: "paid" as const,
    grandTotal: 125,
    paidTotal: 125,
    dueTotal: 0,
};

describe("POS Payment status boundary", () => {
    it("presents a server Paid status with the server amounts", () => {
        expect(getPosPaymentStatusPresentation(sale)).toEqual({
            status: "paid",
            labelKey: "paymentStatusPaid",
            descriptionKey: "paymentStatusPaidDescription",
            receiptLabel: "Paid",
            tone: "success",
            grandTotal: 125,
            paidTotal: 125,
            dueTotal: 0,
        });
    });

    it("presents Partial and Due without replacing the API status", () => {
        expect(getPosPaymentStatusPresentation({
            ...sale,
            paymentStatus: "partial",
            paidTotal: 50,
            dueTotal: 75,
        })).toMatchObject({
            status: "partial",
            labelKey: "paymentStatusPartial",
            tone: "warning",
            paidTotal: 50,
            dueTotal: 75,
        });

        expect(getPosPaymentStatusPresentation({
            ...sale,
            paymentStatus: "pending",
            paidTotal: 0,
            dueTotal: 125,
        })).toMatchObject({
            status: "pending",
            labelKey: "paymentStatusDue",
            tone: "warning",
            paidTotal: 0,
            dueTotal: 125,
        });
    });

    it("keeps server status and amounts when local arithmetic would disagree", () => {
        expect(getPosPaymentStatusPresentation({
            ...sale,
            paymentStatus: "paid",
            paidTotal: 90,
            dueTotal: 35,
        })).toEqual({
            status: "paid",
            labelKey: "paymentStatusPaid",
            descriptionKey: "paymentStatusPaidDescription",
            receiptLabel: "Paid",
            tone: "success",
            grandTotal: 125,
            paidTotal: 90,
            dueTotal: 35,
        });
    });
});
