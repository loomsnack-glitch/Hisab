import { describe, expect, it, mock } from "bun:test";
import { FALLBACK_INVOICE_APPEARANCE, mergeInvoiceAppearanceUpdates } from "@repo/types";

mock.module("@/modules/tenant/invoice-appearance/invoice-appearance.repository", () => ({
  getOrganizationPublishedSettings: mock(async (organizationId: string) => {
    if (organizationId === "org-with-default") {
      return mergeInvoiceAppearanceUpdates(FALLBACK_INVOICE_APPEARANCE, { accentColor: "#111827" });
    }
    return null;
  }),
  getStoreAppearanceRecord: mock(async (organizationId: string, storeId: string) => {
    if (organizationId === "org-with-default" && storeId === "store-override") {
      return {
        organizationId,
        storeId,
        usesOrganizationDefault: false,
        publishedSettings: mergeInvoiceAppearanceUpdates(FALLBACK_INVOICE_APPEARANCE, { accentColor: "#2563eb" }),
        draftSettings: null,
        updatedAt: "2026-08-28T00:00:00.000Z",
        updatedBy: null,
      };
    }
    if (organizationId === "org-with-default" && storeId === "store-default") {
      return {
        organizationId,
        storeId,
        usesOrganizationDefault: true,
        publishedSettings: null,
        draftSettings: null,
        updatedAt: "2026-08-28T00:00:00.000Z",
        updatedBy: null,
      };
    }
    return null;
  }),
}));

const { resolveStoreInvoiceAppearance } = await import("./invoice-appearance-resolution");

describe("invoice appearance resolution", () => {
  it("uses organization defaults when the store has no override", async () => {
    const result = await resolveStoreInvoiceAppearance("org-with-default", "store-default");
    expect(result.status).toBe("resolved");
    expect(result.appearance.source).toBe("organization");
    expect(result.appearance.settings.accentColor).toBe("#111827");
  });

  it("prefers store overrides when configured", async () => {
    const result = await resolveStoreInvoiceAppearance("org-with-default", "store-override");
    expect(result.status).toBe("resolved");
    expect(result.appearance.source).toBe("store");
    expect(result.appearance.settings.accentColor).toBe("#2563eb");
  });

  it("falls back when no configuration exists", async () => {
    const result = await resolveStoreInvoiceAppearance("missing-org", "missing-store");
    expect(result.status).toBe("fallback");
    expect(result.appearance.source).toBe("fallback");
  });
});
