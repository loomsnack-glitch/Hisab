import { describe, expect, it } from "bun:test";
import {
  FALLBACK_INVOICE_APPEARANCE,
  buildInvoiceAppearanceTokens,
  getContrastRatio,
  hasLowContrastAccent,
  isInvoiceLogoPathForOrganization,
  mergeInvoiceAppearanceUpdates,
  normalizeInvoiceAppearanceSettings,
  resolveInvoiceAppearance,
  sanitizeInvoiceText,
} from "./invoice-appearance";

describe("invoice appearance", () => {
  it("uses the safe fallback when no settings exist", () => {
    const resolved = resolveInvoiceAppearance({});

    expect(resolved.source).toBe("fallback");
    expect(resolved.settings.preset).toBe(FALLBACK_INVOICE_APPEARANCE.preset);
    expect(resolved.tokens.accentColor).toBe("#111827");
  });

  it("prefers store overrides over organization defaults", () => {
    const resolved = resolveInvoiceAppearance({
      organizationSettings: {
        ...FALLBACK_INVOICE_APPEARANCE,
        accentColor: "#111827",
      },
      storeSettings: {
        ...FALLBACK_INVOICE_APPEARANCE,
        accentColor: "#2563eb",
        preset: "modern",
      },
      usesOrganizationDefault: false,
    });

    expect(resolved.source).toBe("store");
    expect(resolved.settings.accentColor).toBe("#2563eb");
    expect(resolved.settings.preset).toBe("modern");
  });

  it("falls back to organization defaults when the store uses them", () => {
    const resolved = resolveInvoiceAppearance({
      organizationSettings: {
        ...FALLBACK_INVOICE_APPEARANCE,
        preset: "minimal",
      },
      storeSettings: {
        ...FALLBACK_INVOICE_APPEARANCE,
        preset: "modern",
      },
      usesOrganizationDefault: true,
    });

    expect(resolved.source).toBe("organization");
    expect(resolved.settings.preset).toBe("minimal");
  });

  it("sanitizes unsafe footer text and strips markup", () => {
    expect(sanitizeInvoiceText("<script>alert(1)</script>Thanks", 500)).toBe("alert(1)Thanks");
    expect(normalizeInvoiceAppearanceSettings({
      ...FALLBACK_INVOICE_APPEARANCE,
      footerText: "<b>Hello</b>",
    }).footerText).toBe("Hello");
  });

  it("merges partial updates without dropping visibility flags", () => {
    const merged = mergeInvoiceAppearanceUpdates(FALLBACK_INVOICE_APPEARANCE, {
      accentColor: "#ff0000",
      visibility: { showTagline: false },
    });

    expect(merged.accentColor).toBe("#ff0000");
    expect(merged.visibility.showTagline).toBe(false);
    expect(merged.visibility.showAddress).toBe(true);
  });

  it("builds readable contrast tokens for modern presets", () => {
    const tokens = buildInvoiceAppearanceTokens({
      ...FALLBACK_INVOICE_APPEARANCE,
      accentColor: "#2563eb",
      preset: "modern",
    });

    expect(tokens.headerBackground).toBe("#2563eb");
    expect(getContrastRatio(tokens.headerText, tokens.headerBackground)).toBeGreaterThan(4.5);
  });

  it("flags low-contrast accent colors", () => {
    expect(hasLowContrastAccent("#f5f5f5")).toBe(true);
    expect(hasLowContrastAccent("#111827")).toBe(false);
  });

  it("accepts only organization-scoped invoice logo paths", () => {
    const organizationId = "00000000-0000-4000-8000-000000000001";
    expect(isInvoiceLogoPathForOrganization(
      organizationId,
      `organizations/${organizationId}/invoice-appearance/00000000-0000-4000-8000-000000000099.png`,
    )).toBe(true);
    expect(isInvoiceLogoPathForOrganization(
      organizationId,
      "organizations/00000000-0000-4000-8000-000000000002/invoice-appearance/logo.png",
    )).toBe(false);
  });
});
