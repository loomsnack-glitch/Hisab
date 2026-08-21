import { describe, expect, test } from "bun:test";
import { mapCloudAccountSnapshot } from "./cloud-account.repository";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("Cloud account persistence boundary", () => {
  test("maps safe account metadata without exposing credential material", () => {
    const snapshot = mapCloudAccountSnapshot({
      id: uuid,
      organization_id: uuid,
      waba_id: "1234567890",
      phone_number_id: "9876543210",
      verified_name: "Ganatri",
      status: "connected",
      quality_rating: "GREEN",
      messaging_limit: 1_000,
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
      wabaId: "1234567890",
      phoneNumberId: "9876543210",
      verifiedName: "Ganatri",
      status: "connected",
      qualityRating: "GREEN",
      messagingLimit: 1_000,
      lastLimitSyncedAt: new Date("2026-08-22T05:00:00.000Z"),
      lastWebhookAt: null,
      lastGraphApiAt: new Date("2026-08-22T05:00:00.000Z"),
      lastErrorCode: null,
    });
    expect("credentialReference" in snapshot).toBe(false);
    expect("accessToken" in snapshot).toBe(false);
  });
});
