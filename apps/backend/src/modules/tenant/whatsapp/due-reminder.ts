import {
  renderWhatsAppMessage,
  type CustomerDTO,
  type SaleSummaryDTO,
  type StoreMessageLink,
} from "@repo/types";

const amount = (value: number | string | null | undefined) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDueReminderText = (
  customer: CustomerDTO,
  sales: SaleSummaryDTO[],
  storeName: string,
  template?: string | null,
  links: StoreMessageLink[] = [],
) => {
  const totalDue = sales.reduce(
    (sum, sale) => sum + Number(sale.dueTotal ?? 0),
    0,
  );
  if (template?.trim()) {
    return renderWhatsAppMessage({
      kind: "due_reminder",
      template,
      values: {
        customer_name: customer.name,
        total_due: amount(totalDue),
        bill_count: String(sales.length),
        store_name: storeName,
      },
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
