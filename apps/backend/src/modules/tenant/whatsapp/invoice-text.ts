import {
  renderWhatsAppMessage,
  type SaleDetailDTO,
  type StoreMessageLink,
} from "@repo/types";

export type InvoiceMessageContext = {
  organizationName?: string | null;
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

export const formatInvoiceText = (
  sale: SaleDetailDTO,
  context: InvoiceMessageContext = {},
): string => {
  const businessName = clean(context.organizationName) || "Ganatri";
  const customerName =
    clean(sale.customerNameSnapshot ?? sale.customer?.name) ||
    "valued customer";
  const invoiceNumber = sale.saleNumber ?? sale.id;
  const links = context.links ?? [];
  const values = {
    customer_name: customerName,
    bill_number: invoiceNumber,
    total: formatAmount(sale.grandTotal),
    paid: formatAmount(sale.paidTotal),
    balance_due: formatAmount(sale.dueTotal),
    store_name: clean(context.storeName),
    organization_name: businessName,
  };

  return renderWhatsAppMessage({ kind: "bill", template: context.template, values, links });
};
