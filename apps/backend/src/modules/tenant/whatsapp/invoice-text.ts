import type { SaleDetailDTO } from "@repo/types";

export type InvoiceMessageContext = {
    organizationName?: string | null;
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
    const customerName = clean(sale.customerNameSnapshot ?? sale.customer?.name) || "valued customer";
    const invoiceNumber = sale.saleNumber ?? sale.id;

    return [
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
        "",
        "Thank you.",
        `Regards,\n${businessName}`,
    ].join("\n");
};
