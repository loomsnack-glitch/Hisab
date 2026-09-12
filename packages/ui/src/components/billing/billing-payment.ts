export type BillingPaymentBadgeStatus = "draft" | "voided" | "paid" | "partial" | "due";

export type BillingDetectedPaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "other";

export function resolveBillingPaymentBadgeStatus(input: {
    status?: string | null;
    paymentStatus?: string | null;
}): BillingPaymentBadgeStatus {
    if (input.status === "draft") {
        return "draft";
    }

    if (input.status === "voided") {
        return "voided";
    }

    if (input.paymentStatus === "paid") {
        return "paid";
    }

    if (input.paymentStatus === "partial") {
        return "partial";
    }

    return "due";
}

export function detectBillingPaymentMethods(
    paymentMethods: string | null | undefined,
): BillingDetectedPaymentMethod[] {
    const methods = (paymentMethods || "").toLowerCase();
    const detected: BillingDetectedPaymentMethod[] = [];

    if (methods.includes("cash")) {
        detected.push("cash");
    }
    if (methods.includes("upi")) {
        detected.push("upi");
    }
    if (methods.includes("card")) {
        detected.push("card");
    }
    if (methods.includes("bank_transfer") || methods.includes("bank transfer")) {
        detected.push("bank_transfer");
    }
    if (methods.includes("other")) {
        detected.push("other");
    }

    return detected;
}

export const BILLING_PAYMENT_STATUS_LABELS: Record<BillingPaymentBadgeStatus, string> = {
    draft: "Draft",
    voided: "Voided",
    paid: "Paid",
    partial: "Partial",
    due: "Due",
};

export const BILLING_PAYMENT_METHOD_LABELS: Record<BillingDetectedPaymentMethod, string> = {
    cash: "Cash",
    upi: "UPI",
    card: "Card",
    bank_transfer: "Bank",
    other: "Other",
};
