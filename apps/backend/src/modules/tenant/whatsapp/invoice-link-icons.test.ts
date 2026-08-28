import { describe, expect, it } from "bun:test";
import { renderInvoiceLinkIcon, resolveInvoiceLinkIconKind } from "./invoice-link-icons";

describe("invoice link icons", () => {
  it("maps known link kinds to allowlisted icons", () => {
    expect(resolveInvoiceLinkIconKind({ type: "google_review", label: "Google review" })).toBe("google_review");
    expect(resolveInvoiceLinkIconKind({ label: "Instagram" })).toBe("instagram");
    expect(resolveInvoiceLinkIconKind({ label: "Facebook" })).toBe("facebook");
    expect(resolveInvoiceLinkIconKind({ type: "app_install", label: "Install App" })).toBe("app_install");
    expect(resolveInvoiceLinkIconKind({ type: "website", label: "Website" })).toBe("website");
    expect(resolveInvoiceLinkIconKind({ label: "Custom" })).toBe("external");
  });

  it("renders safe inline SVG without script or external HTML", () => {
    const icon = renderInvoiceLinkIcon("google_review");
    expect(icon).toContain("<svg");
    expect(icon).not.toContain("<script");
    expect(icon).not.toContain("onload=");
    expect(icon).not.toContain("javascript:");
  });
});
