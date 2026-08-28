import { describe, expect, it } from "bun:test";
import {
  WHATSAPP_DEFAULT_TEMPLATE_BODIES,
  WHATSAPP_TEMPLATE_TOKENS,
  renderWhatsAppMessage,
  validateWhatsAppTemplate,
} from "./whatsapp-content";

const links = [
  {
    key: "google_review",
    type: "google_review" as const,
    label: "Google review",
    url: "https://example.com/review",
    isActive: true,
  },
];

describe("WhatsApp content contract", () => {
  it("keeps one token registry for every message kind", () => {
    expect(WHATSAPP_TEMPLATE_TOKENS.bill.map((token) => token.name)).toEqual([
      "customer_name",
      "bill_number",
      "total",
      "paid",
      "balance_due",
      "store_name",
      "organization_name",
      "invoice_url",
    ]);
    expect(
      WHATSAPP_TEMPLATE_TOKENS.due_reminder.map((token) => token.name),
    ).toEqual(["customer_name", "total_due", "bill_count", "store_name", "invoice_url"]);
  });

  it("reports unknown tokens before a template is saved", () => {
    expect(
      validateWhatsAppTemplate(
        "bill",
        "Hi {{customer_name}} {{unknown_token}}.",
      ),
    ).toEqual({
      tokens: ["customer_name", "unknown_token"],
      unknownTokens: ["unknown_token"],
    });
  });

  it("renders the default bill body through the same contract", () => {
    const defaultBill = WHATSAPP_DEFAULT_TEMPLATE_BODIES.bill ?? "";
    expect(
      renderWhatsAppMessage({
        kind: "bill",
        values: {
          customer_name: "Asha",
          organization_name: "Ganatri",
          bill_number: "B-42",
          total: "₹90.00",
          paid: "₹50.00",
          balance_due: "₹40.00",
          invoice_url: "https://example.com/invoice",
        },
      }),
    ).toBe(
      defaultBill
        .replaceAll("{{customer_name}}", "Asha")
        .replaceAll("{{organization_name}}", "Ganatri")
        .replaceAll("{{bill_number}}", "B-42")
        .replaceAll("{{total}}", "₹90.00")
        .replaceAll("{{paid}}", "₹50.00")
        .replaceAll("{{balance_due}}", "₹40.00")
        .replaceAll("{{invoice_url}}", "https://example.com/invoice"),
    );
  });

  it("keeps every default body safe for Meta variable boundaries", () => {
    for (const body of Object.values(WHATSAPP_DEFAULT_TEMPLATE_BODIES)) {
      const source = body ?? "";
      expect(source).not.toMatch(/^\s*{{\s*[^{}]+\s*}}/);
      expect(source).not.toMatch(/{{\s*[^{}]+\s*}}\s*[^\w{}]*$/);
    }
  });

  it("renders only links explicitly referenced by the template", () => {
    expect(renderWhatsAppMessage({
      kind: "bill",
      template: "Hello\n{{link_google_review}}",
      values: {},
      links,
    })).toBe("Hello\nhttps://example.com/review");
    expect(renderWhatsAppMessage({
      kind: "bill",
      template: "Hello",
      values: {},
      links,
    })).toBe("Hello");
  });

  it("validates Store-scoped link tokens", () => {
    expect(validateWhatsAppTemplate("promotion", "{{link_google_review}}", links).unknownTokens).toEqual([]);
    expect(validateWhatsAppTemplate("promotion", "{{link_missing}}", links).unknownTokens).toEqual(["link_missing"]);
  });
});
