import type { SaleDetailDTO } from "@repo/types";

export type InvoiceMessageContext = {
    organizationName?: string | null;
    reviewPlatform?: string | null;
    reviewLink?: string | null;
    socialMediaName?: string | null;
    socialMediaLink?: string | null;
};

const formatAmount = (amount: number | string | null | undefined): string => {
    const value = Number(amount ?? 0);
    const safeValue = Number.isFinite(value) ? value : 0;
    return `₹${safeValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const clean = (value: string | null | undefined): string => value?.trim() ?? "";

export const formatInvoiceText = (
    sale: SaleDetailDTO,
    context: InvoiceMessageContext = {},
): string => {
    const businessName = clean(context.organizationName) || "Ganatri";
    const customerName =
        clean(sale.customerNameSnapshot ?? sale.customer?.name) ||
        "valued customer";
    const invoiceNumber = sale.saleNumber ?? sale.id;
    const reviewPlatform = clean(context.reviewPlatform);
    const reviewLink = clean(context.reviewLink);
    const socialMediaName = clean(context.socialMediaName);
    const socialMediaLink = clean(context.socialMediaLink);

    const lines = [
        `Hello ${customerName},`,
        "",
        `Thank you for shopping with ${businessName}.`,
        "",
        "Your bill is attached for your reference.",
        "",
        `Bill number: ${invoiceNumber}`,
        `Total amount: ${formatAmount(sale.grandTotal)}`,
        `Paid: ${formatAmount(sale.paidTotal)}`,
        `Balance due: ${formatAmount(sale.dueTotal)}`,
    ];

    if (reviewPlatform && reviewLink) {
        lines.push(
            "",
            `Happy with your experience? Pls share your feedback with us on ${reviewPlatform}.`,
            `Link: ${reviewLink}`,
        );
    }

    if (socialMediaName && socialMediaLink) {
        lines.push(
            "",
            `Follow us on ${socialMediaName}:`,
            "New launches - Offers - Reel - Behind the scenes.",
            `👉 ${socialMediaName} Link - ${socialMediaLink}`,
        );
    }

    lines.push("", "Thank you.", `Regards,\n${businessName}`);

    return lines.join("\n");
};
