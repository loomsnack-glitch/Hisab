import type { SaleDetailDTO, StoreMessageLink } from "@repo/types";

export type InvoiceMessageContext = {
    organizationName?: string | null;
    reviewPlatform?: string | null;
    reviewLink?: string | null;
    socialMediaName?: string | null;
    socialMediaLink?: string | null;
    storeName?: string | null;
    template?: string | null;
    links?: StoreMessageLink[];
};

const formatAmount = (amount: number | string | null | undefined): string => {
    const value = Number(amount ?? 0);
    const safeValue = Number.isFinite(value) ? value : 0;
    return `₹${safeValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const clean = (value: string | null | undefined): string => value?.trim() ?? "";

const replaceTokens = (template: string, values: Record<string, string>): string =>
    template.replace(/{{\s*([a-z_]+)\s*}}/gi, (_, token: string) => values[token.toLowerCase()] ?? "");

const linkLines = (links: StoreMessageLink[] | undefined): string[] => {
    const selected = (links ?? []).filter(link => link.includeInBill);
    return selected.length === 0
        ? []
        : ["", ...selected.map(link => `${link.label}: ${link.url}`)];
};

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
    const links = context.links ?? [];

    if (clean(context.template)) {
        const custom = replaceTokens(context.template!.trim(), {
            customer_name: customerName,
            bill_number: invoiceNumber,
            total: formatAmount(sale.grandTotal),
            paid: formatAmount(sale.paidTotal),
            balance_due: formatAmount(sale.dueTotal),
            store_name: clean(context.storeName),
            organization_name: businessName,
        }).trim();
        return [custom, ...linkLines(links)].filter(Boolean).join("\n");
    }

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

    if (links.length === 0 && reviewPlatform && reviewLink) {
        lines.push(
            "",
            `Happy with your experience? Pls share your feedback with us on ${reviewPlatform}.`,
            `Link: ${reviewLink}`,
        );
    }

    if (links.length === 0 && socialMediaName && socialMediaLink) {
        lines.push(
            "",
            `Follow us on ${socialMediaName}:`,
            "New launches - Offers - Reel - Behind the scenes.",
            `👉 ${socialMediaName} Link - ${socialMediaLink}`,
        );
    }

    lines.push("", "Thank you.", `Regards,\n${businessName}`);
    lines.push(...linkLines(links));

    return lines.join("\n");
};
