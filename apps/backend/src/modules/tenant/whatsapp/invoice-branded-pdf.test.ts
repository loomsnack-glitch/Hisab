import { describe, expect, it, mock } from "bun:test";
import type { SaleDetailDTO } from "@repo/types";
import { FALLBACK_INVOICE_APPEARANCE, mergeInvoiceAppearanceUpdates } from "@repo/types";
import { buildInvoiceDocument } from "./invoice-document";
import { createInvoicePdfContext, renderSalePdf } from "./invoice-pdf";

const storeAppearance = mergeInvoiceAppearanceUpdates(FALLBACK_INVOICE_APPEARANCE, {
  accentColor: "#7c3aed",
  footerText: "Branded footer",
});

mock.module("./invoice-appearance-resolution", () => ({
  loadInvoiceRenderAssets: mock(async () => ({
    appearance: {
      source: "store" as const,
      settings: storeAppearance,
      tokens: {
        accentColor: "#7c3aed",
        accentContrastColor: "#ffffff",
        pageBackground: "#f8fafc",
        cardBackground: "#ffffff",
        borderColor: "#e5e7eb",
        mutedText: "#6b7280",
        bodyText: "#111827",
        headerBackground: "#7c3aed",
        headerText: "#ffffff",
        statusPaidBackground: "#dcfce7",
        statusPaidText: "#166534",
        statusPartialBackground: "#fef3c7",
        statusPartialText: "#92400e",
        statusDueBackground: "#fee2e2",
        statusDueText: "#991b1b",
        statusCancelledBackground: "#f3f4f6",
        statusCancelledText: "#374151",
        borderRadius: "12px",
        shadow: "0 10px 30px rgba(15,23,42,0.08)",
        contentPadding: "24px",
        itemGap: "12px",
        fontFamily: "system-ui, sans-serif",
      },
    },
    logoUrl: null,
    logoBuffer: null,
    logoDataUrl: null,
  })),
}));

const { buildInvoiceDocumentForStore } = await import("./public-invoice.service");

const sale = {
  id: "00000000-0000-4000-8000-000000000001",
  saleNumber: "INV-99",
  customerNameSnapshot: "Customer",
  customerPhoneSnapshot: null,
  status: "completed",
  serviceMode: "dine_in",
  paymentStatus: "paid",
  subtotal: 100,
  discountTotal: 0,
  grandTotal: 100,
  paidTotal: 100,
  dueTotal: 0,
  committedAt: "2026-08-11T10:00:00.000Z",
  createdAt: "2026-08-11T09:59:00.000Z",
  notes: null,
  items: [],
  payments: [],
} as unknown as SaleDetailDTO;

describe("branded invoice PDF paths", () => {
  it("uses saved store appearance when building WhatsApp PDF documents", async () => {
    const { document } = await buildInvoiceDocumentForStore({
      organizationId: "org-with-default",
      storeId: "store-override",
      sale,
      branding: {
        organizationName: "Ganatri",
        organizationTagline: null,
        storeName: "Central",
        storeAddress: null,
        storePhone: null,
        reviewPlatform: null,
        reviewLink: null,
        socialMediaName: null,
        socialMediaLink: null,
        whatsappLinks: [],
      },
      showDownloadAction: false,
    });
    expect(document.appearance.settings.accentColor).toBe("#7c3aed");
    expect(document.footerText).toBe("Branded footer");

    const pdf = await renderSalePdf(createInvoicePdfContext(document));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
