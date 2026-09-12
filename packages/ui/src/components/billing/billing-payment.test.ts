import { describe, expect, test } from "bun:test";

import { detectBillingPaymentMethods, resolveBillingPaymentBadgeStatus } from "./billing-payment";

describe("resolveBillingPaymentBadgeStatus", () => {
    test("draft and voided take precedence over payment status", () => {
        expect(resolveBillingPaymentBadgeStatus({ status: "draft", paymentStatus: "paid" })).toBe("draft");
        expect(resolveBillingPaymentBadgeStatus({ status: "voided", paymentStatus: "partial" })).toBe("voided");
    });

    test("maps paid, partial, and due for completed sales", () => {
        expect(resolveBillingPaymentBadgeStatus({ status: "completed", paymentStatus: "paid" })).toBe("paid");
        expect(resolveBillingPaymentBadgeStatus({ status: "completed", paymentStatus: "partial" })).toBe("partial");
        expect(resolveBillingPaymentBadgeStatus({ status: "completed", paymentStatus: "pending" })).toBe("due");
    });
});

describe("detectBillingPaymentMethods", () => {
    test("finds known methods in a combined string", () => {
        expect(detectBillingPaymentMethods("cash, upi")).toEqual(["cash", "upi"]);
        expect(detectBillingPaymentMethods("Bank Transfer")).toEqual(["bank_transfer"]);
    });

    test("returns an empty list when nothing is recorded", () => {
        expect(detectBillingPaymentMethods(null)).toEqual([]);
        expect(detectBillingPaymentMethods("")).toEqual([]);
    });
});
