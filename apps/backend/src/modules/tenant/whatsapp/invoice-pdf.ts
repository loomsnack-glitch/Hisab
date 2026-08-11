import PDFDocument from "pdfkit";
import type { SaleDetailDTO } from "@repo/types";

const formatAmount = (amount: number) => amount.toFixed(2);

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toISOString().replace("T", " ").replace(".000Z", " UTC");
};

const addRule = (document: PDFKit.PDFDocument, y: number) => {
  document.moveTo(50, y).lineTo(545, y).strokeColor("#d1d5db").stroke();
};

export const getInvoiceCustomerSnapshot = (sale: SaleDetailDTO) => ({
  name: sale.customerNameSnapshot ?? sale.customer?.name ?? "Walk-in customer",
  phone: sale.customerPhoneSnapshot ?? sale.customer?.phone ?? null,
});

export const renderSalePdf = (sale: SaleDetailDTO): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 50,
      compress: true,
    });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.info.Title = `Sale ${sale.saleNumber ?? sale.id}`;
    document.info.Subject = "Ganatri sale receipt";
    document.info.Creator = "Ganatri";

    document.fontSize(20).fillColor("#111827").text("Ganatri");
    document.fontSize(12).fillColor("#4b5563").text("Sale receipt");
    document.moveDown();

    document.fontSize(10).fillColor("#111827");
    document.text(`Sale number: ${sale.saleNumber ?? sale.id}`);
    document.text(
      `Committed: ${formatDate(sale.committedAt ?? sale.createdAt)}`,
    );
    document.text(`Payment status: ${sale.paymentStatus}`);

    const customer = getInvoiceCustomerSnapshot(sale);
    document.moveDown();
    document.fontSize(11).text("Customer");
    document.fontSize(10).text(customer.name);
    if (customer.phone) document.text(customer.phone);

    document.moveDown();
    addRule(document, document.y);
    document.moveDown(0.7);
    document.fontSize(10).fillColor("#111827");
    document.text("Item", 50, document.y, { continued: true, width: 275 });
    document.text("Qty", 325, document.y, {
      continued: true,
      width: 45,
      align: "right",
    });
    document.text("Amount", 390, document.y, { width: 155, align: "right" });
    document.moveDown(0.5);
    addRule(document, document.y);
    document.moveDown(0.7);

    for (const item of sale.items) {
      const itemY = document.y;
      document
        .fontSize(10)
        .text(item.productNameSnapshot, 50, itemY, { width: 275 });
      document.text(String(item.quantity), 325, itemY, {
        width: 45,
        align: "right",
      });
      document.text(formatAmount(Number(item.lineTotal)), 390, itemY, {
        width: 155,
        align: "right",
      });
      document.moveDown(0.25);
    }

    document.moveDown(0.5);
    addRule(document, document.y);
    document.moveDown(0.7);
    document.text(`Subtotal: ${formatAmount(Number(sale.subtotal))}`, {
      align: "right",
    });
    document.text(`Discount: ${formatAmount(Number(sale.discountTotal))}`, {
      align: "right",
    });
    document
      .fontSize(12)
      .text(`Total: ${formatAmount(Number(sale.grandTotal))}`, {
        align: "right",
      });
    if (sale.notes) {
      document.moveDown();
      document.fontSize(10).text(`Notes: ${sale.notes}`, { width: 495 });
    }

    document.end();
  });
