import { describe, expect, test } from "bun:test";
import { admitCloudTemplateSend } from "./cloud-template-admission";

const base = {
  intent: "promotion" as const,
  mode: "template" as const,
  binding: { id: "binding-1", isActive: true, isDefault: true },
  asset: {
    id: "asset-1",
    version: 3,
    name: "offer",
    languageCode: "en_US",
    category: "marketing" as const,
    status: "approved" as const,
    components: [{ type: "BODY", text: "Hello {{1}}" }],
  },
  customer: {
    marketingOptedIn: true,
    utilityOptedIn: true,
    marketingOptedOut: false,
    whatsappSuppressed: false,
  },
};

describe("Cloud template send admission", () => {
  test("admits approved consented sends and retains a versioned snapshot", () => {
    const result = admitCloudTemplateSend({
      ...base,
      outboundComponents: [{ type: "body", parameters: [{ type: "text", text: "Asha" }] }],
    });
    expect(result.admitted).toBe(true);
    if (result.admitted) {
      expect(result.snapshot).toMatchObject({ bindingId: "binding-1", assetId: "asset-1", version: 3 });
      expect(result.snapshot.templateComponents).toEqual(base.asset.components);
    }
  });

  test("blocks unapproved, mismatched, and suppressed sends", () => {
    expect(admitCloudTemplateSend({ ...base, asset: { ...base.asset, status: "pending" } })).toMatchObject({ admitted: false, reason: "template_not_approved" });
    expect(admitCloudTemplateSend({ ...base, asset: { ...base.asset, category: "utility" } })).toMatchObject({ admitted: false, reason: "template_category_mismatch" });
    expect(admitCloudTemplateSend({ ...base, customer: { ...base.customer, whatsappSuppressed: true } })).toMatchObject({ admitted: false, reason: "customer_suppressed" });
  });

  test("requires positive marketing consent and required variables", () => {
    expect(admitCloudTemplateSend({ ...base, customer: { ...base.customer, marketingOptedIn: false } })).toMatchObject({ admitted: false, reason: "marketing_consent_required" });
    expect(admitCloudTemplateSend(base)).toMatchObject({ admitted: false, reason: "template_variables_missing" });
  });

  test("counts repeated provider placeholders once", () => {
    const result = admitCloudTemplateSend({
      ...base,
      asset: { ...base.asset, components: [{ type: "BODY", text: "Hello {{1}}, store {{2}}, again {{2}}" }] },
      outboundComponents: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Asha" },
            { type: "text", text: "Central Store" },
          ],
        },
      ],
    });
    expect(result.admitted).toBe(true);
  });

  test("allows free-form messages only inside the rolling 24-hour window", () => {
    const now = new Date("2026-08-22T12:00:00.000Z");
    expect(admitCloudTemplateSend({ ...base, mode: "freeform", lastInboundAt: "2026-08-22T01:00:00.000Z", now }).admitted).toBe(true);
    expect(admitCloudTemplateSend({ ...base, mode: "freeform", lastInboundAt: "2026-08-20T12:00:00.000Z", now })).toMatchObject({ admitted: false, reason: "freeform_window_expired" });
  });
});
