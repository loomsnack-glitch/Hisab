import { describe, expect, it, mock } from "bun:test";
import { FALLBACK_INVOICE_APPEARANCE } from "@repo/types";

const samplePdf = Buffer.from("%PDF-1.4 sample");

mock.module("@/modules/tenant/organization/organization.repository", () => ({
  getOrganizationByIdForUser: mock(async () => ({ id: "00000000-0000-4000-8000-000000000001", name: "Ganatri", tagline: "Simple billing" })),
  getStoreById: mock(async () => ({
    id: "00000000-0000-4000-8000-000000000002",
    name: "Central Store",
    address: "Adajan",
    reviewPlatform: null,
    reviewLink: null,
    socialMediaName: null,
    socialMediaLink: null,
    whatsappLinks: [],
  })),
}));

mock.module("./invoice-appearance.repository", () => ({
  ensureOrganizationInvoiceAppearance: mock(async () => ({
    organizationId: "00000000-0000-4000-8000-000000000001",
    publishedSettings: FALLBACK_INVOICE_APPEARANCE,
    draftSettings: null,
    updatedAt: "2026-08-28T00:00:00.000Z",
    updatedBy: null,
  })),
  ensureStoreInvoiceAppearance: mock(async () => ({
    organizationId: "00000000-0000-4000-8000-000000000001",
    storeId: "00000000-0000-4000-8000-000000000002",
    usesOrganizationDefault: true,
    publishedSettings: null,
    draftSettings: null,
    updatedAt: "2026-08-28T00:00:00.000Z",
    updatedBy: null,
  })),
}));

mock.module("@/modules/tenant/whatsapp/invoice-appearance-resolution", () => ({
  loadInvoiceLogoAssets: mock(async () => ({ url: null, buffer: null, dataUrl: null })),
}));

mock.module("@/modules/tenant/whatsapp/invoice-pdf", () => ({
  createInvoicePdfContext: mock((document: unknown, logoBuffer?: Buffer | null) => ({ document, logoBuffer: logoBuffer ?? null })),
  renderSalePdf: mock(async () => samplePdf),
}));

const { previewInvoiceAppearance } = await import("./invoice-appearance.service");

describe("invoice appearance preview", () => {
  it("returns rendered PDF bytes for the PDF viewport", async () => {
    const response = await previewInvoiceAppearance(
      "user-1",
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      { viewport: "pdf", mode: "print" },
    );

    expect(response.status).toBe("success");
    expect(response.data?.viewport).toBe("pdf");
    expect(response.data?.html).toBeNull();
    expect(response.data?.pdfBase64).toBe(samplePdf.toString("base64"));
  });

  it("returns HTML for desktop preview", async () => {
    const response = await previewInvoiceAppearance(
      "user-1",
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      { viewport: "desktop", mode: "screen" },
    );

    expect(response.status).toBe("success");
    expect(response.data?.viewport).toBe("desktop");
    expect(response.data?.pdfBase64).toBeNull();
    expect(response.data?.html).toContain("<!doctype html>");
  });

  it("renders unsaved organization-default changes in the preview", async () => {
    const response = await previewInvoiceAppearance(
      "user-1",
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      { accentColor: "#ff0000", usesOrganizationDefault: true, viewport: "desktop", mode: "screen" },
    );

    expect(response.status).toBe("success");
    expect(response.data?.html).toContain("#ff0000");
  });
});
