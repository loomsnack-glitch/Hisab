import { describe, expect, it } from "bun:test";
import type { SaleDetailDTO } from "@repo/types";
import { FALLBACK_INVOICE_APPEARANCE, mergeInvoiceAppearanceUpdates, resolveInvoiceAppearance } from "@repo/types";
import { buildInvoiceDocument, buildSampleInvoiceDocument } from "./invoice-document";
import {
  calculateInvoicePdfHeaderLayout,
  createInvoicePdfContext,
  getInvoiceCustomerSnapshot,
  renderSalePdf,
} from "./invoice-pdf";

const sale = {
  id: "00000000-0000-4000-8000-000000000001",
  saleNumber: "INV-42",
  customerNameSnapshot: "Original customer",
  customerPhoneSnapshot: "+919876543210",
  customer: {
    name: "Renamed customer",
    phone: "+919999999999",
  },
  committedAt: "2026-08-11T10:00:00.000Z",
  createdAt: "2026-08-11T09:59:00.000Z",
  status: "completed",
  serviceMode: "dine_in",
  paymentStatus: "paid",
  subtotal: 100,
  discountTotal: 10,
  grandTotal: 90,
  paidTotal: 90,
  dueTotal: 0,
  notes: "Thank you",
  paymentMethods: "cash",
  items: [
    {
      productNameSnapshot: "Snapshot product",
      quantity: 2,
      unitPriceSnapshot: 45,
      lineTotal: 90,
      addOns: [],
      bundleComponents: [],
    },
  ],
  payments: [],
} as unknown as SaleDetailDTO;

const branding = {
  organizationName: "Ganatri",
  organizationTagline: "Simple billing",
  storeName: "Central Store",
  storeAddress: "Adajan",
  storePhone: null,
  reviewPlatform: null,
  reviewLink: null,
  socialMediaName: null,
  socialMediaLink: null,
  whatsappLinks: [],
};

const buildContext = (fontPreset: "system" | "serif" | "rounded", logoBuffer?: Buffer | null) => {
  const appearance = resolveInvoiceAppearance({
    organizationSettings: {
      ...FALLBACK_INVOICE_APPEARANCE,
      fontPreset,
    },
  });
  const document = buildInvoiceDocument({
    sale,
    branding,
    appearance,
    showDownloadAction: false,
  });
  return createInvoicePdfContext(document, logoBuffer);
};

// Minimal valid 1x1 PNG
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const extractPdfText = (pdf: Buffer): string => {
  const result = Bun.spawnSync(["pdftotext", "-", "-"], { stdin: pdf });
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr));
  return new TextDecoder().decode(result.stdout);
};

describe("invoice PDF", () => {
  it("uses committed customer snapshots instead of current customer data", () => {
    expect(getInvoiceCustomerSnapshot(sale)).toEqual({
      name: "Original customer",
      phone: "+919876543210",
    });
  });

  it("renders a PDF document from committed sale data", async () => {
    const pdf = await renderSalePdf(buildContext("system"));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1_000);
  });

  it("does not render a payment summary card", async () => {
    const pdf = await renderSalePdf(buildContext("system"));
    expect(extractPdfText(pdf).replace(/\s+/g, "")).not.toContain("PAYMENTSUMMARY");
  });

  it("renders trusted payment entries when sale payments exist", async () => {
    const paymentSale = {
      ...sale,
      payments: [{
        amount: 90,
        method: "cash",
        paidAt: "2026-08-11T10:00:00.000Z",
        reference: null,
      }],
    } as unknown as SaleDetailDTO;
    const appearance = resolveInvoiceAppearance({ organizationSettings: FALLBACK_INVOICE_APPEARANCE });
    const document = buildInvoiceDocument({ sale: paymentSale, branding, appearance, showDownloadAction: false });
    const pdf = await renderSalePdf(createInvoicePdfContext(document));
    expect(extractPdfText(pdf)).toContain("Payments");
    expect(extractPdfText(pdf)).toContain("CASH");
  });

  it("uses readable currency and renders concise links", async () => {
    const appearance = resolveInvoiceAppearance({ organizationSettings: FALLBACK_INVOICE_APPEARANCE });
    const pdf = await renderSalePdf(createInvoicePdfContext(buildSampleInvoiceDocument(appearance)));
    const text = extractPdfText(pdf);
    expect(text).toContain("Rs.90.00");
    expect(text).toContain("Google review");
    expect(text).toContain("Instagram");
    expect(text).not.toContain("https://instagram.com/example");
    expect(text).not.toContain("¹");
  });

  it("renders payment status text and clarifies order-level discounts", async () => {
    const pdf = await renderSalePdf(createInvoicePdfContext(buildSampleInvoiceDocument(resolveInvoiceAppearance({
      organizationSettings: FALLBACK_INVOICE_APPEARANCE,
    }))));
    const text = extractPdfText(pdf);
    expect(text).toContain("Payment Status");
    expect(text).toContain("Partially Paid");
    expect(text).not.toContain("PARTIALLY PAID");
    expect(text).toContain("Order discount");
  });

  it("renders link labels without exposing raw URLs", async () => {
    const pdf = await renderSalePdf(createInvoicePdfContext(buildSampleInvoiceDocument(resolveInvoiceAppearance({
      organizationSettings: FALLBACK_INVOICE_APPEARANCE,
    }))));
    const text = extractPdfText(pdf);
    expect(text).toContain("Google review");
    expect(text).toContain("Instagram");
    expect(text).not.toContain("https://example.com/review");
    expect(text).not.toContain("https://instagram.com/example");
  });

  it("separates customer and order details from invoice metadata", async () => {
    const pdf = await renderSalePdf(createInvoicePdfContext(buildSampleInvoiceDocument(resolveInvoiceAppearance({
      organizationSettings: FALLBACK_INVOICE_APPEARANCE,
    }))));
    const text = extractPdfText(pdf);
    expect(text).toContain("BILL TO");
    expect(text).toContain("ORDER DETAILS");
    expect(text).toContain("Invoice No");
  });

  it("renders serif and rounded font presets without invalid font names", async () => {
    const serifPdf = await renderSalePdf(buildContext("serif"));
    const roundedPdf = await renderSalePdf(buildContext("rounded"));
    expect(serifPdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(roundedPdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders configured logo bytes in the PDF", async () => {
    const withoutLogo = await renderSalePdf(buildContext("system"));
    const withLogo = await renderSalePdf(buildContext("system", PNG_1X1));
    expect(withLogo.length).toBeGreaterThan(withoutLogo.length);
    expect(withLogo.toString("latin1")).toContain("/Subtype /Image");
  });

  it("reserves a separate logo column and grows the header for wrapped brand text", () => {
    const layout = calculateInvoicePdfHeaderLayout({
      top: 48,
      hasLogo: true,
      brandTextHeight: 86,
      invoiceMetaHeight: 52,
    });

    expect(layout.textX).toBe(106);
    expect(layout.textWidth).toBe(246);
    expect(layout.dividerY).toBe(144);
    expect(layout.dividerY).toBeGreaterThan(48 + 48);
  });

  it("renders long notes and terms without crashing", async () => {
    const longText = "Please settle dues within seven days. ".repeat(80);
    const longSale = {
      ...sale,
      notes: longText,
    } as unknown as SaleDetailDTO;
    const appearance = resolveInvoiceAppearance({
      organizationSettings: mergeInvoiceAppearanceUpdates(FALLBACK_INVOICE_APPEARANCE, {
        termsText: longText,
        visibility: {
          ...FALLBACK_INVOICE_APPEARANCE.visibility,
          showNotes: true,
          showTerms: true,
        },
      }),
    });
    const document = buildInvoiceDocument({ sale: longSale, branding, appearance, showDownloadAction: false });
    const pdf = await renderSalePdf(createInvoicePdfContext(document));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2_500);
  });
});
