import { describe, expect, test } from "bun:test";
import { admitGanatriUtilityIntent, admitStoreWhatsAppIntent } from "./platform-admission";

describe("Ganatri Utility admission", () => {
  test.each([
    "promotion",
    "text",
    "reply",
    "custom_template",
    "template_management",
  ] as const)("rejects %s intent", intent => {
    expect(admitGanatriUtilityIntent({ intent })).toMatchObject({
      admitted: false,
      reason: "utility_kind_not_allowed",
    });
  });

  test("allows only bill and due reminder without caller-selected content", () => {
    expect(admitGanatriUtilityIntent({ intent: "bill" })).toEqual({
      admitted: true,
      sender: "ganatri_utility",
    });
    expect(admitGanatriUtilityIntent({ intent: "due_reminder" })).toEqual({
      admitted: true,
      sender: "ganatri_utility",
    });
    expect(admitGanatriUtilityIntent({ intent: "bill", customMessage: "hello" })).toMatchObject({
      admitted: false,
      reason: "custom_message_not_allowed",
    });
    expect(admitGanatriUtilityIntent({ intent: "due_reminder", templateId: "template-id" })).toMatchObject({
      admitted: false,
      reason: "template_selection_not_allowed",
    });
  });

  test("blocks disabled Stores and preserves Organization Cloud admission", () => {
    expect(admitStoreWhatsAppIntent({ mode: "disabled", intent: "bill" })).toMatchObject({
      admitted: false,
      reason: "store_disabled",
    });
    expect(admitStoreWhatsAppIntent({ mode: "organization_cloud", intent: "promotion" })).toEqual({
      admitted: true,
      sender: "organization_cloud",
    });
  });
});
