import { describe, expect, test } from "bun:test";
import { buildPlatformTemplateComponents, resolvePlatformTemplate, validatePlatformTemplate } from "./platform-template-health";

const rawTemplate = (overrides: Record<string, unknown> = {}) => ({
  name: "ganatri_bill",
  language: "en_US",
  category: "UTILITY",
  status: "APPROVED",
  components: [{ type: "BODY", text: "Hello {{1}}, bill {{2}}, total {{3}}, paid {{4}}, due {{5}}, store {{6}}, org {{7}}, link {{8}}" }],
  ...overrides,
});

describe("Ganatri fixed template health", () => {
  test("requires approved utility templates with the exact positional contract", () => {
    expect(validatePlatformTemplate("bill", "ganatri_bill", "en_US", rawTemplate())).not.toBeNull();
    expect(validatePlatformTemplate("bill", "ganatri_bill", "en_US", rawTemplate({ components: [{ type: "BODY", text: "Hello {{1}}, bill {{2}}" }] }))).not.toBeNull();
    expect(validatePlatformTemplate("bill", "ganatri_bill", "en_US", rawTemplate({ status: "PENDING" }))).toBeNull();
    expect(validatePlatformTemplate("bill", "ganatri_bill", "en_US", rawTemplate({ category: "MARKETING" }))).toBeNull();
    expect(validatePlatformTemplate("bill", "ganatri_bill", "en_US", rawTemplate({ components: [{ type: "BODY", text: "Hello {{9}}" }] }))).toBeNull();
  });

  test("builds immutable provider parameters from the fixed variable contract", () => {
    const template = validatePlatformTemplate("bill", "ganatri_bill", "en_US", rawTemplate());
    if (!template) throw new Error("expected valid template");
    expect(buildPlatformTemplateComponents("bill", template, {
      customer_name: "Asha", bill_number: "INV-1", total: "₹100.00", paid: "₹20.00",
      balance_due: "₹80.00", store_name: "Store", organization_name: "Ganatri", invoice_url: "https://example.test/i/1",
    })).toHaveLength(1);
  });

  test("resolves the exact configured template without exposing credentials", async () => {
    const template = await resolvePlatformTemplate("bill", {
      phoneNumberId: "123456789012345", accessToken: "secret-token", wabaId: "987654321098765",
      graphBaseUrl: "https://graph.facebook.com", graphVersion: "v26.0",
      apiUrl: "https://graph.facebook.com/v26.0/123456789012345/messages",
      templateLanguage: "en_US", billTemplateName: "ganatri_bill", dueTemplateName: "ganatri_due",
    }, { getTemplates: async () => ({ data: [rawTemplate()] }) });
    expect(template.name).toBe("ganatri_bill");
    expect(JSON.stringify(template)).not.toContain("secret-token");
  });
});
