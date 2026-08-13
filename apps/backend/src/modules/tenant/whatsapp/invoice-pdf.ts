import PDFDocument from "pdfkit";
import type { SaleDetailDTO } from "@repo/types";

export type InvoicePdfContext = {
  organizationName?: string | null;
  organizationTagline?: string | null;
  storeName?: string | null;
  storeAddress?: string | null;
  storePhone?: string | null;
};

const PAGE_MARGIN = 48;
const CONTENT_WIDTH = 499;
const ITEM_WIDTH = 270;
const QTY_X = 330;
const RATE_X = 380;
const AMOUNT_X = 440;
const VALUE_WIDTH = 107;
const LINE_GAP = 3;
const formatAmount = (amount: number | string | null | undefined): string => {
  const value = Number(amount ?? 0);
  const safeValue = Number.isFinite(value) ? value : 0;
  return `Rs. ${safeValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }).format(date).replace(/\b(am|pm)\b/gi, value => value.toUpperCase());
};

const clean = (value: string | null | undefined): string => value?.trim() ?? "";

const ensureSpace = (document: PDFKit.PDFDocument, height: number): void => {
  const bottom = document.page.height - document.page.margins.bottom;
  if (document.y + height > bottom) {
    document.addPage();
  }
};

const paymentLabel = (status: SaleDetailDTO["paymentStatus"]): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

const addRule = (document: PDFKit.PDFDocument, color = "#d1d5db") => {
  document
    .moveTo(PAGE_MARGIN, document.y)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, document.y)
    .strokeColor(color)
    .stroke();
  document.moveDown(0.65);
};

const writeSummaryRow = (
  document: PDFKit.PDFDocument,
  label: string,
  value: string,
  emphasis = false,
) => {
  const y = document.y;
  document
    .fontSize(emphasis ? 13 : 10)
    .font(emphasis ? "Helvetica-Bold" : "Helvetica")
    .text(label, PAGE_MARGIN, y, { width: CONTENT_WIDTH - VALUE_WIDTH });
  document.text(value, PAGE_MARGIN + CONTENT_WIDTH - VALUE_WIDTH, y, {
    width: VALUE_WIDTH,
    align: "right",
  });
  document.y = y + (emphasis ? 20 : 15);
};

const writeItemRow = (
  document: PDFKit.PDFDocument,
  name: string,
  quantity: string,
  rate: string,
  amount: string,
  indent = 0,
) => {
  const y = document.y;
  const nameWidth = ITEM_WIDTH - indent;
  const rowHeight = Math.max(
    document.heightOfString(name, { width: nameWidth, lineGap: LINE_GAP }),
    15,
  );
  document.fontSize(9.5).font("Helvetica").fillColor("#111827");
  document.text(name, PAGE_MARGIN + indent, y, {
    width: nameWidth,
    lineGap: LINE_GAP,
  });
  document.text(quantity, PAGE_MARGIN + QTY_X, y, { width: 42, align: "right" });
  document.text(rate, PAGE_MARGIN + RATE_X, y, { width: 52, align: "right" });
  document.text(amount, PAGE_MARGIN + AMOUNT_X, y, {
    width: 59,
    align: "right",
  });
  document.y = y + rowHeight + 5;
};

export const getInvoiceCustomerSnapshot = (sale: SaleDetailDTO) => ({
  name: sale.customerNameSnapshot ?? sale.customer?.name ?? "Walk-in customer",
  phone: sale.customerPhoneSnapshot ?? sale.customer?.phone ?? null,
});

export const renderSalePdf = (
  sale: SaleDetailDTO,
  context: InvoicePdfContext = {},
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      compress: true,
      info: {
        Title: `Sale ${sale.saleNumber ?? sale.id}`,
        Subject: "Sale invoice",
        Creator: "Ganatri",
      },
    });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const organizationName = clean(context.organizationName) || "Ganatri";
    const tagline = clean(context.organizationTagline);
    const storeName = clean(context.storeName);
    const storeAddress = clean(context.storeAddress);
    const storePhone = clean(context.storePhone);
    const customer = getInvoiceCustomerSnapshot(sale);

    document.fillColor("#111827").font("Helvetica-Bold").fontSize(22).text(organizationName, {
      align: "center",
    });
    if (tagline) document.font("Helvetica").fontSize(10).fillColor("#4b5563").text(tagline, { align: "center" });
    if (storeName) document.fontSize(10).text(storeName, { align: "center" });
    if (storeAddress) document.fontSize(9).text(storeAddress, { align: "center" });
    if (storePhone) document.fontSize(9).text(`Phone: ${storePhone}`, { align: "center" });
    document.moveDown(0.7);
    document.font("Helvetica-Bold").fontSize(13).fillColor("#111827").text("SALE INVOICE", { align: "center" });
    document.moveDown(0.8);
    addRule(document, "#374151");

    const detailsY = document.y;
    document.roundedRect(PAGE_MARGIN, detailsY, CONTENT_WIDTH, 64, 4).fillColor("#f3f4f6").fill();
    document.fillColor("#111827").font("Helvetica-Bold").fontSize(8.5).text("BILL DETAILS", PAGE_MARGIN + 10, detailsY + 8);
    document.font("Helvetica").fontSize(9.5);
    document.text(`Bill No: ${sale.saleNumber ?? sale.id}`, PAGE_MARGIN + 10, detailsY + 23, { width: 230 });
    document.text(`Date: ${formatDate(sale.committedAt ?? sale.createdAt)}`, PAGE_MARGIN + 10, detailsY + 39, { width: 230 });
    document.font("Helvetica-Bold").fontSize(8.5).text("CUSTOMER", PAGE_MARGIN + 260, detailsY + 8);
    document.font("Helvetica").fontSize(9.5).text(customer.name, PAGE_MARGIN + 260, detailsY + 23, { width: 225 });
    if (customer.phone) document.text(customer.phone, PAGE_MARGIN + 260, detailsY + 39, { width: 225 });
    document.y = detailsY + 80;

    const tableHeaderY = document.y;
    document.roundedRect(PAGE_MARGIN, tableHeaderY, CONTENT_WIDTH, 24, 3).fillColor("#1f2937").fill();
    document.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8.5);
    document.text("ITEM", PAGE_MARGIN + 8, tableHeaderY + 7, { width: ITEM_WIDTH - 8 });
    document.text("QTY", PAGE_MARGIN + QTY_X, tableHeaderY + 7, { width: 42, align: "right" });
    document.text("RATE", PAGE_MARGIN + RATE_X, tableHeaderY + 7, { width: 52, align: "right" });
    document.text("AMOUNT", PAGE_MARGIN + AMOUNT_X, tableHeaderY + 7, { width: 59, align: "right" });
    document.y = tableHeaderY + 32;

    for (const item of sale.items) {
      ensureSpace(document, 30);
      writeItemRow(
        document,
        item.productNameSnapshot,
        String(Number(item.quantity)),
        formatAmount(item.unitPriceSnapshot),
        formatAmount(item.lineTotal),
      );
      for (const addOn of item.addOns ?? []) {
        ensureSpace(document, 30);
        writeItemRow(
          document,
          `+ ${addOn.addOnNameSnapshot}`,
          String(Number(addOn.totalQuantity)),
          formatAmount(Number(addOn.unitPriceSnapshot) - Number(addOn.unitDiscountSnapshot)),
          formatAmount(addOn.lineTotal),
          14,
        );
      }
      for (const component of item.bundleComponents ?? []) {
        ensureSpace(document, 30);
        writeItemRow(
          document,
          `• ${component.productNameSnapshot}`,
          String(Number(component.totalQuantity)),
          "Included",
          "",
          14,
        );
        for (const addOn of component.addOns ?? []) {
          ensureSpace(document, 30);
          writeItemRow(
            document,
            `+ ${addOn.addOnNameSnapshot}`,
            String(Number(addOn.totalQuantity)),
            "Included",
            "",
            28,
          );
        }
      }
    }

    ensureSpace(document, 175);
    addRule(document);
    const summaryY = document.y;
    document.roundedRect(PAGE_MARGIN, summaryY, CONTENT_WIDTH, 126, 4).fillColor("#f9fafb").fill();
    document.fillColor("#111827").font("Helvetica-Bold").fontSize(8.5).text("PAYMENT SUMMARY", PAGE_MARGIN + 10, summaryY + 9);
    document.y = summaryY + 27;
    writeSummaryRow(document, "Subtotal", formatAmount(sale.subtotal));
    if (Number(sale.discountTotal) > 0) writeSummaryRow(document, "Discount", `-${formatAmount(sale.discountTotal)}`);
    writeSummaryRow(document, "Invoice Total", formatAmount(sale.grandTotal), true);
    writeSummaryRow(document, "Paid", formatAmount(sale.paidTotal));
    writeSummaryRow(document, "Balance Due", formatAmount(sale.dueTotal));
    writeSummaryRow(document, "Payment Status", paymentLabel(sale.paymentStatus));
    document.y = summaryY + 136;

    if (sale.notes) {
      ensureSpace(document, 50);
      document.moveDown(0.5);
      document.font("Helvetica-Bold").fontSize(10).text("Notes");
      document.font("Helvetica").fontSize(9.5).text(sale.notes, {
        width: CONTENT_WIDTH,
        lineGap: LINE_GAP,
      });
    }

    document.moveDown(1.2);
    addRule(document, "#374151");
    document.font("Helvetica-Bold").fontSize(10).text("Thank you for doing business with us.", PAGE_MARGIN, document.y, {
      width: CONTENT_WIDTH,
      align: "center",
    });
    document.font("Helvetica").fontSize(9).fillColor("#4b5563").text(`Regards, ${organizationName}`, PAGE_MARGIN, document.y, {
      width: CONTENT_WIDTH,
      align: "center",
    });
    document.end();
  });
