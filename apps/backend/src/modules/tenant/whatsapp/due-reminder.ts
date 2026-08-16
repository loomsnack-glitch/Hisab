import type { CustomerDTO, SaleSummaryDTO, StoreMessageLink } from "@repo/types";

const amount = (value: number | string | null | undefined) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const replaceTokens = (template: string, values: Record<string, string>) =>
  template.replace(/{{\s*([a-z_]+)\s*}}/gi, (_, token: string) => values[token.toLowerCase()] ?? "");

export const formatDueReminderText = (
  customer: CustomerDTO,
  sales: SaleSummaryDTO[],
  storeName: string,
  template?: string | null,
  links: StoreMessageLink[] = [],
) => {
  const totalDue = sales.reduce((sum, sale) => sum + Number(sale.dueTotal ?? 0), 0);
  const linkLines = links.filter(link => link.includeInReminder).flatMap(link => ["", `${link.label}: ${link.url}`]);
  if (template?.trim()) {
    return [
      replaceTokens(template.trim(), {
        customer_name: customer.name,
        total_due: amount(totalDue),
        bill_count: String(sales.length),
        store_name: storeName,
      }),
      ...linkLines,
    ].join("\n").trim();
  }

  const bills = sales.map(sale => {
    const invoiceLabel = sale.saleNumber ? `Invoice #${sale.saleNumber}` : "Invoice";
    return `• ${invoiceLabel}: ${amount(sale.dueTotal)} due`;
  });
  return [
    `Hello ${customer.name},`,
    "",
    `This is a friendly reminder from ${storeName}.`,
    `Your total outstanding balance is ${amount(totalDue)}.`,
    "",
    ...bills,
    ...linkLines,
    "",
    "Please contact us if you have already made the payment.",
  ].join("\n");
};
