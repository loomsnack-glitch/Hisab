import { describe, expect, test } from "bun:test";
import {
  mapCloudTemplateAssetFromJoinedRow,
  normalizeCloudTemplateAsset,
} from "./cloud-template.repository";

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

  test("rejects malformed provider components instead of storing an empty template", () => {
    expect(() => normalizeCloudTemplateAsset(organizationId, businessAccountId, {
      id: "meta-template-1",
      name: "bill_ready",
      language: "en_US",
      components: [{ text: "Body without a component type" }],
    })).toThrow("Cloud template component type is invalid");
  });

  test("maps snake_case fields from a joined binding row before validating the asset", () => {
    expect(mapCloudTemplateAssetFromJoinedRow({
      asset_id: "33333333-3333-4333-8333-333333333333",
      asset_organization_id: organizationId,
      asset_whatsapp_business_account_id: businessAccountId,
      meta_template_id: "meta-template-1",
      asset_name: "bill_ready",
      language_code: "en_US",
      asset_category: "utility",
      asset_status: "approved",
      components: [{ type: "BODY", text: "Hello World" }],
      rejection_reason: null,
      provider_updated_at: null,
      last_synced_at: "2026-08-23T10:00:00.000Z",
      version: 1,
    })).toMatchObject({
      id: "33333333-3333-4333-8333-333333333333",
      organizationId,
      whatsappBusinessAccountId: businessAccountId,
      metaTemplateId: "meta-template-1",
      name: "bill_ready",
      languageCode: "en_US",
      category: "utility",
      status: "approved",
    });
  });
});
