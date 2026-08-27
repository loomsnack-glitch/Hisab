import { describe, expect, mock, test } from "bun:test";
import { FALLBACK_INVOICE_APPEARANCE } from "@repo/types";

const query = mock(async () => [
  {
    organization_id: "00000000-0000-4000-8000-000000000001",
    published_settings: JSON.stringify({
      ...FALLBACK_INVOICE_APPEARANCE,
      accentColor: "#facc15",
    }),
    draft_settings: JSON.stringify({
      ...FALLBACK_INVOICE_APPEARANCE,
      accentColor: "#fde047",
    }),
    updated_at: "2026-08-28T00:00:00.000Z",
    updated_by: null,
  },
]);

mock.module("@/config/db", () => ({ pg: query }));

const { getOrganizationInvoiceAppearanceRecord } = await import("./invoice-appearance.repository?jsonb-test");

describe("invoice appearance repository", () => {
  test("parses JSONB settings when the database driver returns JSON strings", async () => {
    const record = await getOrganizationInvoiceAppearanceRecord(
      "00000000-0000-4000-8000-000000000001",
    );

    expect(record?.publishedSettings.accentColor).toBe("#facc15");
    expect(record?.draftSettings?.accentColor).toBe("#fde047");
  });
});
