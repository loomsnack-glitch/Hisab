import {
  renderWhatsAppMessage,
  type CustomerDTO,
  type SaleSummaryDTO,
  type StoreMessageLink,
} from "@repo/types";

const amount = (value: number | string | null | undefined) =>
  `₹${(Number.isFinite(Number(value ?? 0)) ? Number(value ?? 0) : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const getDueReminderTemplateValues = (
  customer: CustomerDTO,
  sales: SaleSummaryDTO[],
  storeName: string,
  links: StoreMessageLink[] = [],
  invoiceUrl?: string | null,
): Record<string, string> => ({
  customer_name: customer.name,
  total_due: amount(sales.reduce((sum, sale) => sum + Number(sale.dueTotal ?? 0), 0)),
  bill_count: String(sales.length),
  store_name: storeName,
  invoice_url: invoiceUrl?.trim() ?? "",
  ...Object.fromEntries(
    links.filter(link => link.isActive).map(link => [`link_${link.key}`, link.url]),
  ),
});

export const formatDueReminderText = (
  customer: CustomerDTO,
  sales: SaleSummaryDTO[],
  storeName: string,
  template?: string | null,
  links: StoreMessageLink[] = [],
  invoiceUrl?: string | null,
) => {
  const totalDue = sales.reduce(
    (sum, sale) => sum + Number(sale.dueTotal ?? 0),
    0,
  );
  if (template?.trim()) {
    return renderWhatsAppMessage({
      kind: "due_reminder",
      template,
      values: getDueReminderTemplateValues(customer, sales, storeName, links, invoiceUrl),
      links,
    });
  }

  const bills = sales.map((sale) => {
    const invoiceLabel = sale.saleNumber
      ? `Invoice #${sale.saleNumber}`
      : "Invoice";
    return `• ${invoiceLabel}: ${amount(sale.dueTotal)} due`;
  });
  const body = [
    `Hello ${customer.name},`,
    "",
    `This is a friendly reminder from ${storeName}.`,
    `Your total outstanding balance is ${amount(totalDue)}.`,
    "",
    ...bills,
  ].join("\n");
  return `${body}\n\nPlease contact us if you have already made the payment.`;
};
