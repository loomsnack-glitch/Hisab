import { describe, expect, test } from "bun:test";
import {
  cloudHealthForProviderPhone,
  legacyAccountStatusForCloudHealth,
  mapCloudAccountSnapshot,
  normalizeCloudPhoneNumber,
  persistProvisionedCloudAccount,
} from "./cloud-account.repository";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("Cloud account persistence boundary", () => {
  test("maps provider phone health to a send-safe Cloud account state", () => {
    expect(cloudHealthForProviderPhone({ status: "CONNECTED", codeVerificationStatus: "VERIFIED", isOnBizApp: false })).toBe("connected");
    expect(cloudHealthForProviderPhone({ status: "DISCONNECTED", codeVerificationStatus: "VERIFIED", isOnBizApp: false })).toBe("disconnected");
    expect(cloudHealthForProviderPhone({ status: "SUSPENDED", codeVerificationStatus: "VERIFIED", isOnBizApp: false })).toBe("suspended");
    expect(cloudHealthForProviderPhone({ status: "CONNECTED", codeVerificationStatus: "VERIFIED", isOnBizApp: true })).toBe("needs_action");
    expect(cloudHealthForProviderPhone({ status: "CONNECTED", codeVerificationStatus: null, isOnBizApp: false })).toBe("needs_action");
  });
  test("projects Cloud health into the compatible legacy account status", () => {
    expect(legacyAccountStatusForCloudHealth("connected")).toBe("connected");
    expect(legacyAccountStatusForCloudHealth("disconnected")).toBe("disconnected");
    expect(legacyAccountStatusForCloudHealth("needs_action")).toBe("failed");
    expect(legacyAccountStatusForCloudHealth("suspended")).toBe("failed");
    expect(legacyAccountStatusForCloudHealth("failed")).toBe("failed");
  });

  test("maps safe account metadata without exposing credential material", () => {
    const snapshot = mapCloudAccountSnapshot({
      id: uuid,
      organization_id: uuid,
      whatsapp_business_account_id: uuid,
      waba_id: "1234567890",
      phone_number_id: "9876543210",
      verified_name: "Ganatri",
      status: "connected",
      quality_rating: "GREEN",
      messaging_limit: 1_000,
      provider_phone_status: "CONNECTED",
      provider_code_verification_status: "VERIFIED",
      provider_platform_type: "CLOUD_API",
      provider_is_on_biz_app: false,
      last_limit_synced_at: new Date("2026-08-22T05:00:00.000Z"),
      last_webhook_at: null,
      last_graph_api_at: new Date("2026-08-22T05:00:00.000Z"),
      last_error_code: null,
      credential_reference: "secret://whatsapp/account-1",
      credential_key_version: "v1",
      access_token: "must-not-escape",
    });

    expect(snapshot).toEqual({
      id: uuid,
      organizationId: uuid,
      whatsappBusinessAccountId: uuid,
      wabaId: "1234567890",
      phoneNumberId: "9876543210",
      verifiedName: "Ganatri",
      status: "connected",
      qualityRating: "GREEN",
      messagingLimit: 1_000,
      providerPhoneStatus: "CONNECTED",
      providerCodeVerificationStatus: "VERIFIED",
      providerPlatformType: "CLOUD_API",
      providerIsOnBizApp: false,
      lastLimitSyncedAt: new Date("2026-08-22T05:00:00.000Z"),
      lastWebhookAt: null,
      lastGraphApiAt: new Date("2026-08-22T05:00:00.000Z"),
      lastErrorCode: null,
    });
    expect("credentialReference" in snapshot).toBe(false);
    expect("accessToken" in snapshot).toBe(false);
  });

  test("rejects untrusted provider identity before opening a database transaction", async () => {
    await expect(
      persistProvisionedCloudAccount({
        organizationId: uuid,
        createdBy: uuid,
        wabaId: "not-a-provider-id",
        displayName: "Ganatri",
        credential: {
          reference: "secret://whatsapp/cloud/account-1",
          keyVersion: "kms-2026-08",
        },
        phoneNumberId: "9876543210",
        phoneNumber: "+919876543210",
        verifiedName: "Ganatri",
        qualityRating: null,
        messagingLimit: null,
        providerPhoneStatus: null,
        providerCodeVerificationStatus: null,
        providerPlatformType: null,
        providerIsOnBizApp: null,
      }),
    ).rejects.toThrow("Invalid WhatsApp Cloud WABA ID");
  });

  test("rejects a phone number that cannot satisfy the account invariant", async () => {
    await expect(
      persistProvisionedCloudAccount({
        organizationId: uuid,
        createdBy: uuid,
        wabaId: "1234567890",
        displayName: "Ganatri",
        credential: {
          reference: "secret://whatsapp/cloud/account-1",
          keyVersion: "kms-2026-08",
        },
        phoneNumberId: "9876543210",
        phoneNumber: "not-a-phone",
        verifiedName: "Ganatri",
        qualityRating: null,
        messagingLimit: null,
        providerPhoneStatus: null,
        providerCodeVerificationStatus: null,
        providerPlatformType: null,
        providerIsOnBizApp: null,
      }),
    ).rejects.toThrow("Invalid WhatsApp Cloud phone number");
  });

  test("normalizes synthetic Meta API test phone numbers without weakening customer validation", () => {
    expect(normalizeCloudPhoneNumber("+1 555-144-2579")).toBe("+15551442579");
  });
});
