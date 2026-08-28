import { describe, expect, it } from "bun:test";
import {
  FALLBACK_INVOICE_APPEARANCE,
  mergeInvoiceAppearanceUpdates,
  resolveInvoiceAppearance,
} from "@repo/types";

describe("invoice appearance resolution", () => {
  it("keeps financial presentation separate from theme settings", () => {
    const resolved = resolveInvoiceAppearance({
      organizationSettings: mergeInvoiceAppearanceUpdates(FALLBACK_INVOICE_APPEARANCE, {
        accentColor: "#2563eb",
        footerText: "Custom footer",
      }),
    });

    expect(resolved.settings.footerText).toBe("Custom footer");
    expect(resolved.tokens.accentColor).toBe("#2563eb");
    expect(resolved.settings).not.toHaveProperty("grandTotal");
  });
});
