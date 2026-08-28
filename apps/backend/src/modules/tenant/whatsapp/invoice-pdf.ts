import PDFDocument from "pdfkit";
import type { InvoiceFontPreset } from "@repo/types";
import {
  formatInvoiceAmount,
  formatInvoiceDate,
  formatInvoicePayments,
  type InvoiceDocument,
  type InvoiceDocumentLink,
  type InvoiceDocumentLine,
} from "./invoice-document";

export type InvoicePdfContext = {
  document: InvoiceDocument;
  logoBuffer?: Buffer | null;
};

const PAGE_MARGIN = 48;
const CONTENT_WIDTH = 499;
const ITEM_WIDTH = 250;
const QTY_X = 310;
const RATE_X = 370;
const AMOUNT_X = 440;
const VALUE_WIDTH = 107;
const LINE_GAP = 3;
const TABLE_HEADER_HEIGHT = 24;
const LOGO_SIZE = 48;
const LOGO_GAP = 10;
const HEADER_COLUMN_GAP = 16;
const PDF_CURRENCY_PREFIX = "Rs.";
const SUMMARY_X = PAGE_MARGIN + 220;
const SUMMARY_WIDTH = CONTENT_WIDTH - 220;
const INVOICE_META_X = PAGE_MARGIN + 320;
const INVOICE_META_WIDTH = CONTENT_WIDTH - 320;

const PDF_FONTS: Record<InvoiceFontPreset, { regular: string; bold: string }> = {
  system: { regular: "Helvetica", bold: "Helvetica-Bold" },
  serif: { regular: "Times-Roman", bold: "Times-Bold" },
  rounded: { regular: "Helvetica", bold: "Helvetica-Bold" },
};

const getPdfFonts = (preset: InvoiceFontPreset) => PDF_FONTS[preset] ?? PDF_FONTS.system;

export type InvoicePdfHeaderLayout = {
  top: number;
  logoX: number;
  logoY: number;
  textX: number;
  textY: number;
  textWidth: number;
  dividerY: number;
};

export const calculateInvoicePdfHeaderLayout = (input: {
  top: number;
  hasLogo: boolean;
  brandTextHeight: number;
  invoiceMetaHeight: number;
}): InvoicePdfHeaderLayout => {
  const textX = input.hasLogo ? PAGE_MARGIN + LOGO_SIZE + LOGO_GAP : PAGE_MARGIN;
  const textWidth = INVOICE_META_X - HEADER_COLUMN_GAP - textX;
  const contentHeight = Math.max(
    input.hasLogo ? LOGO_SIZE : 0,
    input.brandTextHeight,
    input.invoiceMetaHeight,
  );

  return {
    top: input.top,
    logoX: PAGE_MARGIN,
    logoY: input.top,
    textX,
    textY: input.top,
    textWidth,
    dividerY: input.top + contentHeight + 10,
  };
};

const toPdfText = (value: string | null | undefined): string =>
  value?.replaceAll("₹", PDF_CURRENCY_PREFIX) ?? "";

const formatPdfAmount = (value: number | string | null | undefined): string =>
  toPdfText(formatInvoiceAmount(value));

type LayoutState = { inTable: boolean };

const pageBottom = (document: PDFKit.PDFDocument) =>
  document.page.height - document.page.margins.bottom;

const drawTableHeader = (document: PDFKit.PDFDocument, fonts: { regular: string; bold: string }) => {
  const y = document.y;
  document.save();
  document.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, TABLE_HEADER_HEIGHT, 3)
    .fillAndStroke("#f8fafc", "#e5e7eb");
  document.fillColor("#475569").font(fonts.bold).fontSize(8.5);
  document.text("ITEM", PAGE_MARGIN + 8, y + 7, { width: ITEM_WIDTH - 8 });
  document.text("QTY", PAGE_MARGIN + QTY_X, y + 7, { width: 42, align: "right" });
  document.text("RATE", PAGE_MARGIN + RATE_X, y + 7, { width: 52, align: "right" });
  document.text("AMOUNT", PAGE_MARGIN + AMOUNT_X, y + 7, { width: 59, align: "right" });
  document.restore();
  document.y = y + TABLE_HEADER_HEIGHT + 8;
};

const ensureBlockSpace = (document: PDFKit.PDFDocument, height: number) => {
  if (document.y + height > pageBottom(document)) document.addPage();
};

const measureItemRowHeight = (
  document: PDFKit.PDFDocument,
  name: string,
  indent: number,
): number => Math.max(
  document.heightOfString(name, { width: ITEM_WIDTH - indent, lineGap: LINE_GAP }),
  15,
) + 5;

const ensureTableRowSpace = (
  document: PDFKit.PDFDocument,
  rowHeight: number,
  state: LayoutState,
  fonts: { regular: string; bold: string },
) => {
  if (document.y + rowHeight > pageBottom(document)) {
    document.addPage();
    if (state.inTable) drawTableHeader(document, fonts);
  }
};

const writeItemRow = (
  document: PDFKit.PDFDocument,
  line: InvoiceDocumentLine,
  fonts: { regular: string; bold: string },
  state: LayoutState,
) => {
  const indent = line.indent * 14;
  const rowHeight = measureItemRowHeight(document, line.name, indent);
  ensureTableRowSpace(document, rowHeight, state, fonts);
  const y = document.y;
  document.fontSize(9.5).font(fonts.regular).fillColor("#111827");
  document.text(line.name, PAGE_MARGIN + indent, y, {
    width: ITEM_WIDTH - indent,
    lineGap: LINE_GAP,
  });
  document.text(line.quantity, PAGE_MARGIN + QTY_X, y, { width: 42, align: "right" });
  document.text(toPdfText(line.rate), PAGE_MARGIN + RATE_X, y, { width: 52, align: "right" });
  document.text(toPdfText(line.amount), PAGE_MARGIN + AMOUNT_X, y, { width: 59, align: "right" });
  document.moveTo(PAGE_MARGIN, y + rowHeight - 2)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, y + rowHeight - 2)
    .strokeColor("#f1f5f9")
    .stroke();
  document.y = y + rowHeight;
};

const drawDetailCard = (
  document: PDFKit.PDFDocument,
  fonts: { regular: string; bold: string },
  title: string,
  values: Array<string | null>,
  x: number,
  y: number,
  width: number,
  height: number,
  tokens: InvoiceDocument["appearance"]["tokens"],
) => {
  document.save();
  document.roundedRect(x, y, width, height, 6)
    .fillAndStroke(tokens.cardBackground, tokens.borderColor);
  document.roundedRect(x, y, 4, height, 2).fill(tokens.accentColor);
  document.fillColor(tokens.mutedText).font(fonts.bold).fontSize(8.5)
    .text(title, x + 14, y + 10, { width: width - 24 });
  let valueY = y + 28;
  for (const value of values) {
    if (!value) continue;
    document.fillColor(tokens.bodyText).font(fonts.regular).fontSize(9.5)
      .text(value, x + 14, valueY, { width: width - 24, lineGap: LINE_GAP });
    valueY += 17;
  }
  document.restore();
};

const writeSummaryRow = (
  document: PDFKit.PDFDocument,
  fonts: { regular: string; bold: string },
  label: string,
  value: string,
  emphasis = false,
  textColor = "#111827",
  x = PAGE_MARGIN,
  width = CONTENT_WIDTH,
) => {
  const y = document.y;
  const valueWidth = Math.min(VALUE_WIDTH, Math.max(92, width * 0.42));
  document
    .fontSize(emphasis ? 13 : 10)
    .font(emphasis ? fonts.bold : fonts.regular)
    .fillColor(textColor)
    .text(label, x, y, { width: width - valueWidth });
  document.text(value, x + width - valueWidth, y, {
    width: valueWidth,
    align: "right",
  });
  document.y = y + (emphasis ? 20 : 15);
  document.x = PAGE_MARGIN;
};

const wrapPdfLines = (
  document: PDFKit.PDFDocument,
  value: string,
  width: number,
): string => value.split("\n").flatMap((line) => {
  if (!line.trim()) return [""];
  const chunks: string[] = [];
  let current = "";
  for (const word of line.trim().split(/\s+/)) {
    if (document.widthOfString(word) > width) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      let remaining = word;
      while (remaining) {
        let low = 1;
        let high = remaining.length;
        let splitAt = 1;
        while (low <= high) {
          const middle = Math.ceil((low + high) / 2);
          if (document.widthOfString(remaining.slice(0, middle)) <= width) {
            splitAt = middle;
            low = middle + 1;
          } else {
            high = middle - 1;
          }
        }
        chunks.push(remaining.slice(0, splitAt));
        remaining = remaining.slice(splitAt);
      }
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (current && document.widthOfString(candidate) > width) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}).join("\n");

const writeWrappedBlock = (
  document: PDFKit.PDFDocument,
  fonts: { regular: string; bold: string },
  title: string,
  body: string,
) => {
  const titleHeight = 18;
  document.font(fonts.regular).fontSize(9.5);
  const wrappedBody = wrapPdfLines(document, body, CONTENT_WIDTH);
  const bodyHeight = document.heightOfString(wrappedBody, { width: CONTENT_WIDTH, lineGap: LINE_GAP });
  ensureBlockSpace(document, titleHeight + bodyHeight + 8);
  document.x = PAGE_MARGIN;
  document.font(fonts.bold).fontSize(10).text(title);
  document.x = PAGE_MARGIN;
  document.font(fonts.regular).fontSize(9.5).text(wrappedBody, { width: CONTENT_WIDTH, lineGap: LINE_GAP });
};

const writePdfLinks = (
  document: PDFKit.PDFDocument,
  fonts: { regular: string; bold: string },
  links: InvoiceDocumentLink[],
) => {
  const textX = PAGE_MARGIN;
  const textWidth = CONTENT_WIDTH;
  document.font(fonts.regular).fontSize(9.5);
  const rows = links.map((link) => {
    const text = link.label;
    const wrapped = wrapPdfLines(document, text, textWidth);
    const height = document.heightOfString(wrapped, { width: textWidth, lineGap: LINE_GAP });
    return { link, wrapped, height };
  });
  ensureBlockSpace(document, 18 + rows.reduce((total, row) => total + row.height + 7, 0) + 8);
  document.x = PAGE_MARGIN;
  document.font(fonts.bold).fontSize(10).text("Links");
  document.y += 5;
  for (const row of rows) {
    const y = document.y;
    document.font(fonts.regular).fontSize(9.5).fillColor("#2563eb").text(row.wrapped, textX, y, {
      width: textWidth,
      lineGap: LINE_GAP,
      link: row.link.url,
      underline: false,
    });
    document.y = y + row.height + 7;
    document.x = PAGE_MARGIN;
  }
};

export const renderSalePdf = (
  context: InvoicePdfContext,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const { document: invoice, logoBuffer } = context;
    const { sale, branding, appearance } = invoice;
    const { settings, tokens } = appearance;
    const visibility = settings.visibility;
    const fonts = getPdfFonts(settings.fontPreset);
    const pdf = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      compress: true,
      info: {
        Title: `Sale ${sale.saleNumber ?? "invoice"}`,
        Subject: "Sale invoice",
        Creator: "Ganatri",
      },
    });
    const chunks: Buffer[] = [];
    pdf.on("data", (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    const headerTop = pdf.y;
    const hasLogo = Boolean(logoBuffer);

    const initialHeaderLayout = calculateInvoicePdfHeaderLayout({
      top: headerTop,
      hasLogo,
      brandTextHeight: 0,
      invoiceMetaHeight: 0,
    });
    pdf.font(fonts.bold).fontSize(18);
    const organizationNameHeight = pdf.heightOfString(branding.organizationName, {
      width: initialHeaderLayout.textWidth,
    });
    pdf.font(fonts.regular).fontSize(9);
    const tagline = visibility.showTagline ? branding.organizationTagline : null;
    const taglineHeight = tagline
      ? pdf.heightOfString(tagline, { width: initialHeaderLayout.textWidth })
      : 0;
    const storeLine = [
      branding.storeName,
      visibility.showAddress && branding.storeAddress ? branding.storeAddress : null,
      visibility.showStorePhone && branding.storePhone ? branding.storePhone : null,
    ].filter(Boolean).join(" · ");
    const storeLineHeight = storeLine
      ? pdf.heightOfString(storeLine, { width: initialHeaderLayout.textWidth })
      : 0;
    const brandTextHeight = organizationNameHeight
      + (tagline ? taglineHeight + 4 : 0)
      + (storeLine ? storeLineHeight + 4 : 0);
    const invoiceMetaHeight = 39 + pdf.heightOfString(
      `Date: ${formatInvoiceDate(sale.committedAt ?? sale.createdAt)}`,
      { width: INVOICE_META_WIDTH },
    );
    const headerLayout = calculateInvoicePdfHeaderLayout({
      top: headerTop,
      hasLogo,
      brandTextHeight,
      invoiceMetaHeight,
    });

    if (hasLogo && logoBuffer) {
      pdf.save();
      pdf.roundedRect(headerLayout.logoX, headerLayout.logoY, LOGO_SIZE, LOGO_SIZE, 6)
        .fillAndStroke(tokens.cardBackground, tokens.borderColor);
      pdf.restore();
      try {
        pdf.image(logoBuffer, headerLayout.logoX, headerLayout.logoY, { fit: [LOGO_SIZE, LOGO_SIZE] });
      } catch {
        // Ignore invalid logo buffers and continue without the image.
      }
    }

    let brandTextY = headerLayout.textY;
    pdf.fillColor(tokens.accentColor).font(fonts.bold).fontSize(18)
      .text(branding.organizationName, headerLayout.textX, brandTextY, { width: headerLayout.textWidth });
    brandTextY += organizationNameHeight;
    if (tagline) {
      brandTextY += 4;
      pdf.fillColor(tokens.bodyText).font(fonts.regular).fontSize(9)
        .text(tagline, headerLayout.textX, brandTextY, { width: headerLayout.textWidth });
      brandTextY += taglineHeight;
    }
    if (storeLine) {
      brandTextY += 4;
      pdf.text(storeLine, headerLayout.textX, brandTextY, { width: headerLayout.textWidth });
    }

    const invoiceMetaX = INVOICE_META_X;
    pdf.fillColor(tokens.bodyText).font(fonts.bold).fontSize(12)
      .text("INVOICE", invoiceMetaX, headerTop + 2, { width: INVOICE_META_WIDTH, align: "right" });
    pdf.font(fonts.regular).fontSize(9).fillColor(tokens.mutedText)
      .text(`Invoice No: ${sale.saleNumber ?? "-"}`, invoiceMetaX, headerTop + 23, { width: INVOICE_META_WIDTH, align: "right" })
      .text(`Date: ${formatInvoiceDate(sale.committedAt ?? sale.createdAt)}`, invoiceMetaX, headerTop + 39, { width: INVOICE_META_WIDTH, align: "right" });

    pdf.moveTo(PAGE_MARGIN, headerLayout.dividerY).lineTo(PAGE_MARGIN + CONTENT_WIDTH, headerLayout.dividerY).strokeColor(tokens.borderColor).stroke();
    pdf.y = headerLayout.dividerY + 14;

    const metaHeight = 76;
    ensureBlockSpace(pdf, metaHeight + 12);
    const metaY = pdf.y;
    const cardGap = 12;
    const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
    drawDetailCard(
      pdf,
      fonts,
      "BILL TO",
      [invoice.customerName, visibility.showCustomerPhone ? invoice.customerPhone : null],
      PAGE_MARGIN,
      metaY,
      cardWidth,
      metaHeight,
      tokens,
    );
    drawDetailCard(
      pdf,
      fonts,
      "ORDER DETAILS",
      [
        branding.storeName,
        visibility.showServiceMode ? `Service: ${invoice.serviceModeLabel}` : null,
      ],
      PAGE_MARGIN + cardWidth + cardGap,
      metaY,
      cardWidth,
      metaHeight,
      tokens,
    );
    pdf.y = metaY + metaHeight + 10;

    const tableState: LayoutState = { inTable: true };
    pdf.fillColor(tokens.bodyText).font(fonts.bold).fontSize(10).text("ITEMS", PAGE_MARGIN, pdf.y);
    pdf.y += 6;
    drawTableHeader(pdf, fonts);
    for (const line of invoice.lines) {
      writeItemRow(pdf, line, fonts, tableState);
    }
    tableState.inTable = false;

    const summaryHeight = 44
      + (Number(sale.discountTotal) > 0 ? 15 : 0)
      + 20
      + 15
      + 20
      + 15;
    const summaryCardHeight = summaryHeight + 20;
    ensureBlockSpace(pdf, summaryCardHeight + 8);
    const summaryY = pdf.y;
    pdf.roundedRect(SUMMARY_X, summaryY, SUMMARY_WIDTH, summaryCardHeight, 6)
      .fillAndStroke("#f8fafc", tokens.borderColor);
    pdf.fillColor(tokens.mutedText).font(fonts.bold).fontSize(8.5)
      .text("TOTALS", SUMMARY_X + 12, summaryY + 11, { width: SUMMARY_WIDTH - 24 });
    const summaryContentX = SUMMARY_X + 12;
    const summaryContentWidth = SUMMARY_WIDTH - 24;
    pdf.y = summaryY + 31;
    writeSummaryRow(pdf, fonts, "Subtotal", formatPdfAmount(sale.subtotal), false, tokens.bodyText, summaryContentX, summaryContentWidth);
    if (Number(sale.discountTotal) > 0) {
      writeSummaryRow(pdf, fonts, "Order discount", `-${formatPdfAmount(sale.discountTotal)}`, false, tokens.bodyText, summaryContentX, summaryContentWidth);
    }
    writeSummaryRow(pdf, fonts, "Invoice Total", formatPdfAmount(sale.grandTotal), true, tokens.accentColor, summaryContentX, summaryContentWidth);
    writeSummaryRow(pdf, fonts, "Paid", formatPdfAmount(sale.paidTotal), false, tokens.bodyText, summaryContentX, summaryContentWidth);
    writeSummaryRow(
      pdf,
      fonts,
      "Balance Due",
      formatPdfAmount(sale.dueTotal),
      true,
      Number(sale.dueTotal) > 0 ? tokens.statusDueText : tokens.statusPaidText,
      summaryContentX,
      summaryContentWidth,
    );
    writeSummaryRow(pdf, fonts, "Payment Status", invoice.paymentStatus, false, tokens.bodyText, summaryContentX, summaryContentWidth);
    pdf.y = summaryY + summaryCardHeight + 14;

    if (visibility.showNotes && sale.notes) {
      writeWrappedBlock(pdf, fonts, "Notes", sale.notes);
    }
    if (sale.payments.length > 0) {
      writeWrappedBlock(pdf, fonts, "Payments", formatInvoicePayments(sale.payments).join("\n"));
    }
    if (visibility.showTerms && settings.termsText) {
      writeWrappedBlock(pdf, fonts, "Terms", settings.termsText);
    }
    if (invoice.links.length > 0) {
      writePdfLinks(pdf, fonts, invoice.links);
    }
    if (visibility.showPdfFooter) {
      ensureBlockSpace(pdf, 40);
      pdf.moveDown(0.6);
      pdf.moveTo(PAGE_MARGIN, pdf.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, pdf.y).strokeColor(tokens.borderColor).stroke();
      pdf.moveDown(0.6);
      pdf.font(fonts.bold).fontSize(10).text(invoice.footerText, PAGE_MARGIN, pdf.y, {
        width: CONTENT_WIDTH,
        align: "center",
      });
    }

    pdf.end();
  });

export const renderSalePdfFromDocument = renderSalePdf;

export const createInvoicePdfContext = (document: InvoiceDocument, logoBuffer?: Buffer | null): InvoicePdfContext => ({
  document,
  logoBuffer: logoBuffer ?? null,
});

export const getInvoiceCustomerSnapshot = (sale: InvoiceDocument["sale"]) => ({
  name: sale.customerNameSnapshot ?? sale.customer?.name ?? "Walk-in customer",
  phone: sale.customerPhoneSnapshot ?? sale.customer?.phone ?? null,
});
