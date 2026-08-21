import { describe, expect, test } from "bun:test";
import { normalizeCloudTemplateAsset } from "./cloud-template.repository";

const organizationId = "11111111-1111-4111-8111-111111111111";
const businessAccountId = "22222222-2222-4222-8222-222222222222";

describe("Cloud template normalization", () => {
  test("normalizes provider status, category, language objects, and components", () => {
    expect(normalizeCloudTemplateAsset(organizationId, businessAccountId, {
      id: "meta-template-1",
      name: "bill_ready",
      language: { code: "en_US" },
      category: "UTILITY",
      status: "APPROVED",
      components: [{ type: "BODY", text: "Bill {{1}}" }],
      updated_at: "2026-08-22T10:00:00.000Z",
    })).toEqual({
      organizationId,
      whatsappBusinessAccountId: businessAccountId,
      metaTemplateId: "meta-template-1",
      name: "bill_ready",
      languageCode: "en_US",
      category: "utility",
      status: "approved",
      components: [{ type: "BODY", text: "Bill {{1}}" }],
      rejectionReason: null,
      providerUpdatedAt: "2026-08-22T10:00:00.000Z",
    });
  });

  test("does not silently accept malformed identity or language data", () => {
    expect(() => normalizeCloudTemplateAsset(organizationId, businessAccountId, {
      id: "meta-template-1",
      name: "bill_ready",
      language: {},
    })).toThrow("Cloud template language is invalid");
  });
});
