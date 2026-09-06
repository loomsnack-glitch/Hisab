import { describe, expect, it } from "bun:test";
import {
  FALLBACK_INVOICE_APPEARANCE,
  mergeInvoiceAppearanceUpdates,
  resolveInvoiceAppearance,
} from "@repo/types";
import { buildInvoiceDocument, flattenInvoiceLines } from "./invoice-document";
import { renderInvoiceHtml } from "./public-invoice-html";
import { getPublicInvoiceTemplateUrl } from "./public-invoice.service";
import { renderInvalidInvoiceLinkHtml } from "./public-invoice-states";
import { buildSampleInvoiceDocument } from "./invoice-document";

const appearance = resolveInvoiceAppearance({
  organizationSettings: FALLBACK_INVOICE_APPEARANCE,
});

const sampleDocument = buildSampleInvoiceDocument(appearance, {
  branding: {
    organizationName: "Ganatri & Co.",
    organizationTagline: "Simple billing",
    storeName: "Central <Store>",
    storeAddress: "Adajan",
    storePhone: "+919999999999",
    reviewPlatform: "Google review",
    reviewLink: "https://example.com/review",
    socialMediaName: "Instagram",
    socialMediaLink: "https://instagram.com/example",
    whatsappLinks: [{ key: "install", type: "app_install", label: "Install App", url: "https://example.com/app", isActive: true }],
  },
  token: "safe-token",
  publicBaseUrl: "https://api.example.test/invoices",
  logoUrl: "https://cdn.example.test/logo.png",
});

describe("public invoice page", () => {
  it("builds the Meta URL pattern from the configured public invoice base", () => {
    const previousSecret = process.env.WHATSAPP_PUBLIC_INVOICE_LINK_SECRET;
    const previousBaseUrl = process.env.WHATSAPP_PUBLIC_INVOICE_BASE_URL;
    process.env.WHATSAPP_PUBLIC_INVOICE_LINK_SECRET = "a".repeat(32);
    process.env.WHATSAPP_PUBLIC_INVOICE_BASE_URL =
      "https://api.example.test/api/public/whatsapp/invoices";

    try {
      expect(getPublicInvoiceTemplateUrl()).toBe(
        "https://api.example.test/api/public/whatsapp/invoices/{{1}}",
      );
    } finally {
      if (previousSecret === undefined) delete process.env.WHATSAPP_PUBLIC_INVOICE_LINK_SECRET;
      else process.env.WHATSAPP_PUBLIC_INVOICE_LINK_SECRET = previousSecret;
      if (previousBaseUrl === undefined) delete process.env.WHATSAPP_PUBLIC_INVOICE_BASE_URL;
      else process.env.WHATSAPP_PUBLIC_INVOICE_BASE_URL = previousBaseUrl;
    }
  });

  it("renders payment status as a badge without description text", () => {
    const html = renderInvoiceHtml(sampleDocument);
    expect(html).toContain('class="status-badge"');
    expect(html).toContain("Partially Paid");
    expect(html).not.toContain("A balance remains on this invoice");
    expect(html).not.toContain("Copy link");
    expect(html).not.toContain("Share");
    expect(html).not.toContain('aria-label="Payments"');
    expect(html).toContain('aria-label="Invoice totals"');
    expect(html).not.toContain(">Payments<");
    expect(html).toContain("Download PDF");
  });

  it("renders allowlisted link icons and escapes unsafe content", () => {
    const html = renderInvoiceHtml(sampleDocument);
    expect(html).toContain("Ganatri &amp; Co.");
    expect(html).toContain("Central &lt;Store&gt;");
    expect(html).toContain('class="link-icon"');
    expect(html).toContain("Google review");
    expect(html).toContain("Install App");
    expect(html).not.toContain("+919876543210");
  });

  it("renders logo markup when configured", () => {
    const html = renderInvoiceHtml({
      ...sampleDocument,
      appearance: resolveInvoiceAppearance({
        organizationSettings: mergeInvoiceAppearanceUpdates(FALLBACK_INVOICE_APPEARANCE, {
          logoPath: "organizations/00000000-0000-4000-8000-000000000001/invoice-appearance/00000000-0000-4000-8000-000000000099.png",
        }),
      }),
      logoUrl: "https://cdn.example.test/logo.png",
    });
    expect(html).toContain('class="logo"');
    expect(html).toContain('class="logo-frame"');
    expect(html).toContain('class="brand-copy"');
    expect(html).toContain("https://cdn.example.test/logo.png");
  });

  it("includes add-ons and bundle components in flattened lines", () => {
    const lines = flattenInvoiceLines({
      ...sampleDocument.sale,
      items: [{
        productNameSnapshot: "Combo",
        quantity: 1,
        unitPriceSnapshot: 100,
        lineTotal: 100,
        addOns: [{ addOnNameSnapshot: "Cheese", totalQuantity: 1, unitPriceSnapshot: 10, unitDiscountSnapshot: 0, lineTotal: 10 }],
        bundleComponents: [{ productNameSnapshot: "Fries", totalQuantity: 1, addOns: [] }],
      }],
    } as never);
    expect(lines.some((line) => line.name.includes("Cheese"))).toBe(true);
    expect(lines.some((line) => line.name.includes("Fries"))).toBe(true);
  });

  it("renders the Sold Product Name amount suffix from the sale snapshot", () => {
    const lines = flattenInvoiceLines({
      ...sampleDocument.sale,
      items: [{
        productNameSnapshot: "Cake (250g)",
        quantity: 2,
        unitPriceSnapshot: 250,
        lineTotal: 500,
        addOns: [],
        bundleComponents: [],
      }],
    } as never);

    expect(lines[0]).toMatchObject({
      name: "Cake (250g)",
      quantity: "2",
    });
  });

  it("keeps a custom Cake (500g) parent line and add-on snapshot in invoice output", () => {
    const lines = flattenInvoiceLines({
      ...sampleDocument.sale,
      items: [{
        productNameSnapshot: "Cake (500g)",
        quantity: 1,
        unitPriceSnapshot: 500,
        lineTotal: 500,
        addOns: [{
          addOnNameSnapshot: "Extra Cheese",
          totalQuantity: 1,
          unitPriceSnapshot: 20,
          unitDiscountSnapshot: 2,
          lineTotal: 18,
        }],
        bundleComponents: [],
      }],
    } as never);

    expect(lines[0]).toMatchObject({
      name: "Cake (500g)",
      quantity: "1",
      rate: "₹500.00",
      amount: "₹500.00",
    });
    expect(lines[1]).toMatchObject({
      name: "+ Extra Cheese",
      quantity: "1",
      amount: "₹18.00",
    });
  });

  it("uses print mode without interactive actions for PDF preview", () => {
    const html = renderInvoiceHtml(sampleDocument, { mode: "print", viewport: "pdf" });
    expect(html).not.toContain("Download PDF");
    expect(html).not.toContain("<script");
  });

  it("renders an accessible invalid-link page", () => {
    const html = renderInvalidInvoiceLinkHtml();
    expect(html).toContain('role="alert"');
    expect(html).toContain("Invoice unavailable");
  });

  it("does not allow arbitrary HTML injection in footer or terms", () => {
    const malicious = resolveInvoiceAppearance({
      organizationSettings: mergeInvoiceAppearanceUpdates(FALLBACK_INVOICE_APPEARANCE, {
        footerText: '<script>alert("x")</script>',
        termsText: '<img src=x onerror=alert(1)>',
      }),
    });
    const html = renderInvoiceHtml(buildSampleInvoiceDocument(malicious));
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror=");
    expect(html).toContain("alert(&quot;x&quot;)");
    expect(html).not.toMatch(/<img[^>]*onerror/i);
  });

  it("honors preview viewport widths in generated HTML", () => {
    const desktop = renderInvoiceHtml(sampleDocument, { mode: "preview", viewport: "desktop" });
    const mobile = renderInvoiceHtml(sampleDocument, { mode: "preview", viewport: "mobile" });
    expect(desktop).toContain("max-width:860px");
    expect(mobile).toContain("max-width:390px");
    expect(mobile).toContain("body class=\"preview-mobile\"");
    expect(mobile).toContain("body.preview-mobile .items-table{display:none!important}");
    expect(mobile).toContain("body.preview-mobile .items-cards{display:grid!important}");
    expect(desktop).not.toContain("body.preview-mobile .items-table");
  });
});

describe("invoice appearance precedence", () => {
  it("prefers store settings over organization defaults", () => {
    const resolved = resolveInvoiceAppearance({
      organizationSettings: mergeInvoiceAppearanceUpdates(FALLBACK_INVOICE_APPEARANCE, { accentColor: "#111827" }),
      storeSettings: mergeInvoiceAppearanceUpdates(FALLBACK_INVOICE_APPEARANCE, { accentColor: "#2563eb" }),
      usesOrganizationDefault: false,
    });
    expect(resolved.source).toBe("store");
    expect(resolved.settings.accentColor).toBe("#2563eb");
  });
});
