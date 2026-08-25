import { describe, expect, it } from "bun:test";
import { renderPublicInvoiceHtml, type PublicInvoiceData } from "./public-invoice.service";

const data = {
  token: "safe-token",
  organization: { name: "Ganatri & Co.", tagline: "Simple billing" },
  store: {
    name: "Central <Store>",
    address: "Adajan",
    reviewPlatform: "Google review",
    reviewLink: "https://example.com/review",
    socialMediaName: "Instagram",
    socialMediaLink: "https://instagram.com/example",
    whatsappLinks: [],
  },
  sale: {
    id: "sale-id",
    saleNumber: "INV-42",
    status: "completed",
    customerNameSnapshot: "Asha <Customer>",
    customerPhoneSnapshot: "+919876543210",
    paymentStatus: "partial",
    subtotal: 100,
    discountTotal: 10,
    grandTotal: 90,
    paidTotal: 50,
    dueTotal: 40,
    createdAt: "2026-08-26T10:00:00.000Z",
    committedAt: "2026-08-26T10:01:00.000Z",
    items: [{ productNameSnapshot: "Panini", quantity: 1, lineTotal: 90 }],
    payments: [],
  },
} as unknown as PublicInvoiceData;

describe("public invoice page", () => {
  it("renders a branded, escaped page without exposing the full phone number", () => {
    const html = renderPublicInvoiceHtml(data);

    expect(html).toContain("Ganatri &amp; Co.");
    expect(html).toContain("Central &lt;Store&gt;");
    expect(html).toContain("Asha &lt;Customer&gt;");
    expect(html).toContain("Download PDF");
    expect(html).toContain("https://example.com/review");
    expect(html).toContain("+91••••••••10");
    expect(html).not.toContain("+919876543210");
  });
});
