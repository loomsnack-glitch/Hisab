import { describe, expect, mock, test } from "bun:test";
import { createCloudOnboardingState } from "./cloud-onboarding";
import { completeCloudAccountProvisioning, manuallyProvisionCloudAccount, refreshCloudAccountForOrganization, registerCloudPhoneForOrganization, revokeCloudAccountForOrganization } from "./cloud-account.service";
import { CloudOnboardingExchangeError } from "./cloud-onboarding-exchange";
import { WhatsAppCloudApiError } from "./cloud-api.client";
import type { CloudProvisioningState } from "./cloud-provisioning";
import type { WhatsAppCloudAccountSnapshot } from "@repo/types";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const secret = "cloud-account-service-test-secret";
const storeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

mock.module("@/modules/tenant/organization/organization.repository", () => ({
  getOrganizationByIdForUser: async () => ({ id: organizationId }),
  getStoresByOrganizationId: async () => [{ id: storeId, organizationId, name: "Adajan" }],
  getStoreById: async () => ({ id: storeId, organizationId, name: "Adajan" }),
}));

await import("@/modules/tenant/commercial-licensing/feature-entitlement.test-harness").then(
  (module) => module.ensureFeatureEntitlementMock(),
);
const {
  completeCloudAccountProvisioning,
  manuallyProvisionCloudAccount,
  refreshCloudAccountForOrganization,
  revokeCloudAccountForOrganization,
} = await import("./cloud-account.service");

const cloudSnapshot = (overrides: Partial<WhatsAppCloudAccountSnapshot> = {}): WhatsAppCloudAccountSnapshot => ({
  id: "33333333-3333-4333-8333-333333333333",
  organizationId,
  whatsappBusinessAccountId: null,
  wabaId: "1234567890",
  phoneNumberId: "9876543210",
  verifiedName: "Ganatri",
  status: "connected",
  qualityRating: null,
  messagingLimit: null,
  providerPhoneStatus: null,
  providerCodeVerificationStatus: null,
  providerPlatformType: null,
  providerIsOnBizApp: null,
  lastLimitSyncedAt: null,
  lastWebhookAt: null,
  lastGraphApiAt: null,
  lastErrorCode: null,
  ...overrides,
});

describe("Cloud account provisioning service", () => {
  test("does not complete onboarding after organization access is lost", async () => {
    const response = await completeCloudAccountProvisioning(userId, organizationId, {}, {
      organizationAccess: async () => false,
    });

    expect(response).toMatchObject({
      status: "error",
      code: 404,
      message: "Organization not found",
      data: null,
    });
  });

  test("exchanges, validates, subscribes, stores credentials, and persists a safe account", async () => {
    const state = createCloudOnboardingState({
      organizationId,
      userId,
      secret,
    });
    const previousSecret = process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET;
    process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET = secret;
    const calls: string[] = [];
    const response = await completeCloudAccountProvisioning(
      userId,
      organizationId,
      {
        state: state.token,
        code: "authorization-code",
        wabaId: "1234567890",
        phoneNumberId: "9876543210",
      },
      {
        exchange: { exchange: async () => "provider-token" },
        consumeReplayStore: { consume: async () => true },
        createClient: () => ({
          async getBusinessAccount(wabaId: string) {
            calls.push(`business:${wabaId}`);
            return { id: wabaId, name: "Ganatri" };
          },
          async getPhoneNumbers() {
            calls.push("phones");
            return {
              data: [
                {
                  id: "9876543210",
                  display_phone_number: "+919876543210",
                  verified_name: "Ganatri",
                  quality_rating: "GREEN",
                  messaging_limit: 1_000,
                  status: "DISCONNECTED",
                  code_verification_status: "VERIFIED",
                  platform_type: "CLOUD_API",
                  is_on_biz_app: false,
                },
              ],
            };
          },
          async subscribeBusinessAccount(wabaId: string) {
            calls.push(`subscribe:${wabaId}`);
            return { success: true };
          },
        }),
        vault: {
          async store(input) {
            calls.push(`store:${input.ownerKey}:${input.accessToken}`);
            return { reference: "secret://cloud/1", keyVersion: "kms-v1" };
          },
          async resolve() {
            return "provider-token";
          },
          async rotate() {
            return { reference: "secret://cloud/2", keyVersion: "kms-v2" };
          },
          async revoke() {},
        },
        persist: async (input) => {
          calls.push(`persist:${input.phoneNumberId}:${input.providerPhoneStatus ?? "none"}`);
          expect(input.providerPhoneStatus).toBe("DISCONNECTED");
          expect(input.providerIsOnBizApp).toBe(false);
          return cloudSnapshot({
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
            verifiedName: input.verifiedName,
            providerPhoneStatus: input.providerPhoneStatus,
            providerCodeVerificationStatus: input.providerCodeVerificationStatus,
            providerPlatformType: input.providerPlatformType,
            providerIsOnBizApp: input.providerIsOnBizApp,
          });
        },
        createProvisioningAttempt: async input => ({
          id: "attempt-1",
          organizationId,
          whatsappAccountId: null,
          whatsappBusinessAccountId: null,
          idempotencyKey: "attempt-key",
          providerWabaId: input.providerWabaId,
          providerPhoneNumberId: input.providerPhoneNumberId,
          credentialReference: input.credentialReference,
          credentialKeyVersion: input.credentialKeyVersion,
          state: input.state,
        }),
        getProvisioningAttempt: async () => null,
        updateProvisioningAttempt: async input => ({
          id: "attempt-1",
          organizationId,
          whatsappAccountId: input.whatsappAccountId ?? null,
          whatsappBusinessAccountId: input.whatsappBusinessAccountId ?? null,
          idempotencyKey: "attempt-key",
          providerWabaId: "1234567890",
          providerPhoneNumberId: "9876543210",
          credentialReference: "secret://cloud/1",
          credentialKeyVersion: "kms-v1",
          state: input.state,
        }),
        syncTemplates: async () => { calls.push("templates"); return { status: "success" }; },
      },
    );

    try {
      expect(response.status).toBe("success");
      expect(response.data?.phoneNumberId).toBe("9876543210");
      expect(calls).toEqual([
        "store:waba:1234567890:provider-token",
        "business:1234567890",
        "phones",
        "subscribe:1234567890",
        "persist:9876543210:DISCONNECTED",
        "templates",
      ]);
    } finally {
      if (previousSecret === undefined) delete process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET;
      else process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET = previousSecret;
    }
  });

  test("refreshes provider metadata without exposing the access token", async () => {
    const snapshot = cloudSnapshot({
      verifiedName: "Old name",
      status: "needs_action",
    });
    let resolved = "";
    const refreshed = cloudSnapshot({ verifiedName: "New name", status: "connected", providerPhoneStatus: "CONNECTED" });
    const response = await refreshCloudAccountForOrganization(userId, organizationId, snapshot.id, {
      getSnapshot: async () => snapshot,
      organizationAccess: async () => true,
      getCredentialBinding: async () => ({ businessAccountId: "44444444-4444-4444-8444-444444444444", reference: "secret://cloud/1", keyVersion: "kms-v1" }),
      vault: {
        async store() { return { reference: "unused", keyVersion: "unused" }; },
        async resolve() { resolved = "resolved-in-memory"; return resolved; },
        async rotate() { return { reference: "unused", keyVersion: "unused" }; },
        async revoke() {},
      },
      createClient: () => ({
        async getBusinessAccount() { return { id: snapshot.wabaId!, name: "Ganatri" }; },
        async getPhoneNumbers() { return { data: [{ id: snapshot.phoneNumberId!, display_phone_number: "+919876543210", verified_name: "New name", quality_rating: "GREEN", messaging_limit: 1_000, status: "CONNECTED", code_verification_status: "VERIFIED", platform_type: "CLOUD_API", is_on_biz_app: false }] }; },
        async subscribeBusinessAccount() {},
      }),
      refreshMetadata: async input => {
        expect(input.updatedBy).toBe(userId);
        expect(input.phoneNumber).toBe("+919876543210");
        expect(input.qualityRating).toBe("GREEN");
        expect(input.messagingLimit).toBe(1_000);
        expect(input.providerPhoneStatus).toBe("CONNECTED");
        expect(input.providerCodeVerificationStatus).toBe("VERIFIED");
        expect(input.providerPlatformType).toBe("CLOUD_API");
        expect(input.providerIsOnBizApp).toBe(false);
        return refreshed;
      },
    });
    expect(response.status).toBe("success");
    expect(response.data?.verifiedName).toBe("New name");
    expect(response.data?.providerPhoneStatus).toBe("CONNECTED");
    expect(resolved).toBe("resolved-in-memory");
  });

  test("resumes a failed attempt from the vault without exchanging the authorization code again", async () => {
    const state = createCloudOnboardingState({ organizationId, userId, secret });
    const failedState: CloudProvisioningState = {
      status: "failed",
      currentStep: "waba_resolved",
      completedSteps: ["authorization_received"],
      safeErrorCode: "provider_timeout",
      safeErrorMessage: "Provider step failed",
    };
    const accountId = "33333333-3333-4333-8333-333333333333";
    const updates: string[] = [];
    const previousSecret = process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET;
    process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET = secret;
    try {
      const response = await completeCloudAccountProvisioning(userId, organizationId, {
        state: state.token,
        code: "already-exchanged-code",
        wabaId: "1234567890",
        phoneNumberId: "9876543210",
      }, {
        exchange: { exchange: async () => { throw new Error("must not exchange a resumed attempt"); } },
        getProvisioningAttempt: async () => ({
          id: "attempt-1",
          organizationId,
          whatsappAccountId: null,
          whatsappBusinessAccountId: null,
          idempotencyKey: "attempt-key",
          providerWabaId: "1234567890",
          providerPhoneNumberId: "9876543210",
          credentialReference: "secret://cloud/1",
          credentialKeyVersion: "kms-v1",
          state: failedState,
        }),
        vault: {
          async store() { throw new Error("must not store on resume"); },
          async resolve(binding) { expect(binding.reference).toBe("secret://cloud/1"); return "provider-token"; },
          async rotate() { return { reference: "unused", keyVersion: "unused" }; },
          async revoke() {},
        },
        createClient: () => ({
          async getBusinessAccount() { return { id: "1234567890", name: "Ganatri" }; },
          async getPhoneNumbers() { return { data: [{ id: "9876543210", display_phone_number: "+919876543210", verified_name: "Ganatri" }] }; },
          async subscribeBusinessAccount() {},
        }),
        persist: async input => cloudSnapshot({
          id: accountId,
          wabaId: input.wabaId,
          phoneNumberId: input.phoneNumberId,
          verifiedName: input.verifiedName,
          providerPhoneStatus: input.providerPhoneStatus,
        }),
        updateProvisioningAttempt: async input => {
          updates.push(input.state.currentStep);
          return null;
        },
        syncTemplates: async () => ({ status: "success" }),
      });

      expect(response.status).toBe("success");
      expect(response.data?.id).toBe(accountId);
      expect(updates).toContain("completed");
    } finally {
      if (previousSecret === undefined) delete process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET;
      else process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET = previousSecret;
    }
  });

  test("revokes the vault binding before marking the account revoked", async () => {
    const snapshot = cloudSnapshot();
    const calls: string[] = [];
    const response = await revokeCloudAccountForOrganization(userId, organizationId, snapshot.id, {
      getSnapshot: async () => snapshot,
      organizationAccess: async () => true,
      getCredentialBinding: async () => ({ businessAccountId: "44444444-4444-4444-8444-444444444444", reference: "secret://cloud/1", keyVersion: "kms-v1" }),
      vault: {
        async store() { return { reference: "unused", keyVersion: "unused" }; },
        async resolve() { return "unused"; },
        async rotate() { return { reference: "unused", keyVersion: "unused" }; },
        async revoke() { calls.push("revoke-secret"); },
      },
      revokeAccount: async input => {
        calls.push(`revoke-db:${input.updatedBy}`);
        return true;
      },
    });
    expect(response.status).toBe("success");
    expect(calls).toEqual(["revoke-secret", `revoke-db:${userId}`]);
  });

  test("manually provisions an API Setup account when the flag is enabled, including in production", async () => {
    const previousFlag = process.env.WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED;
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED = "true";
    process.env.NODE_ENV = "production";
    const calls: string[] = [];
    try {
      const response = await manuallyProvisionCloudAccount(userId, organizationId, {
        wabaId: "1234567890",
        phoneNumberId: "9876543210",
        accessToken: "test-provider-token",
      }, {
        organizationAccess: async () => true,
        createClient: token => {
          expect(token).toBe("test-provider-token");
          return {
            async getBusinessAccount(wabaId: string) {
              calls.push(`business:${wabaId}`);
              return { id: wabaId, name: "Ganatri" };
            },
            async getPhoneNumbers() {
              calls.push("phones");
              return { data: [{ id: "9876543210", display_phone_number: "+919876543210" }] };
            },
            async subscribeBusinessAccount(wabaId: string) {
              calls.push(`subscribe:${wabaId}`);
            },
          };
        },
        vault: {
          async store(input) {
            expect(input.accessToken).toBe("test-provider-token");
            calls.push("store");
            return { reference: "db-secret:test", keyVersion: "v1" };
          },
          async resolve() { return "unused"; },
          async rotate() { return { reference: "unused", keyVersion: "unused" }; },
          async revoke() { calls.push("revoke"); },
        },
        persist: async input => cloudSnapshot({
          wabaId: input.wabaId,
          phoneNumberId: input.phoneNumberId,
          verifiedName: input.verifiedName,
          providerPhoneStatus: input.providerPhoneStatus,
        }),
        syncTemplates: async () => ({ status: "success" }),
      });

      expect(response.status).toBe("success");
      expect(calls).toEqual(["business:1234567890", "phones", "subscribe:1234567890", "store"]);
    } finally {
      if (previousFlag === undefined) delete process.env.WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED;
      else process.env.WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED = previousFlag;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  test("returns the provider exchange failure instead of a generic connected-account error", async () => {
    const state = createCloudOnboardingState({ organizationId, userId, secret });
    const previousSecret = process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET;
    process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET = secret;
    try {
      const response = await completeCloudAccountProvisioning(
        userId,
        organizationId,
        {
          state: state.token,
          code: "authorization-code",
          wabaId: "1234567890",
          phoneNumberId: "9876543210",
        },
        {
          exchange: {
            exchange: async () => {
              throw new CloudOnboardingExchangeError(
                "exchange_failed",
                "WhatsApp Cloud authorization exchange was rejected",
              );
            },
          },
          consumeReplayStore: { consume: async () => true },
          getProvisioningAttempt: async () => null,
        },
      );
      expect(response).toMatchObject({
        status: "error",
        message: "WhatsApp Cloud authorization exchange was rejected",
        data: null,
        code: 400,
      });
    } finally {
      if (previousSecret === undefined) delete process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET;
      else process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET = previousSecret;
    }
  });

  test("rejects manual Cloud setup when the runtime flag is disabled", async () => {
    const previousFlag = process.env.WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED;
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED = "false";
    process.env.NODE_ENV = "development";
    try {
      const response = await manuallyProvisionCloudAccount(userId, organizationId, {
        wabaId: "1234567890",
        phoneNumberId: "9876543210",
        accessToken: "test-provider-token",
      });
      expect(response).toEqual({
        status: "error",
        message: "WhatsApp Cloud manual setup is unavailable",
        data: null,
        code: 404,
      });
    } finally {
      if (previousFlag === undefined) delete process.env.WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED;
      else process.env.WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED = previousFlag;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  test("refreshes an unregistered Meta phone without treating Ganatri connected as registered", async () => {
    const snapshot = cloudSnapshot({ status: "connected", providerPhoneStatus: null });
    const response = await refreshCloudAccountForOrganization(userId, organizationId, snapshot.id, {
      getSnapshot: async () => snapshot,
      organizationAccess: async () => true,
      getCredentialBinding: async () => ({ businessAccountId: "44444444-4444-4444-8444-444444444444", reference: "secret://cloud/1", keyVersion: "kms-v1" }),
      vault: {
        async store() { return { reference: "unused", keyVersion: "unused" }; },
        async resolve() { return "resolved-in-memory"; },
        async rotate() { return { reference: "unused", keyVersion: "unused" }; },
        async revoke() {},
      },
      createClient: () => ({
        async getBusinessAccount() { return { id: snapshot.wabaId!, name: "Ganatri" }; },
        async getPhoneNumbers() {
          return {
            data: [{
              id: snapshot.phoneNumberId!,
              display_phone_number: "+919876543210",
              verified_name: "Ganatri",
              status: "DISCONNECTED",
              code_verification_status: "VERIFIED",
              platform_type: "CLOUD_API",
              is_on_biz_app: false,
            }],
          };
        },
        async subscribeBusinessAccount() {},
      }),
      refreshMetadata: async input => {
        expect(input.providerPhoneStatus).toBe("DISCONNECTED");
        return cloudSnapshot({ status: "connected", providerPhoneStatus: input.providerPhoneStatus });
      },
    });
    expect(response.status).toBe("success");
    expect(response.data?.status).toBe("connected");
    expect(response.data?.providerPhoneStatus).toBe("DISCONNECTED");
  });

  test("registers an unregistered Cloud phone and stores Meta CONNECTED without keeping the PIN", async () => {
    const snapshot = cloudSnapshot({ providerPhoneStatus: "DISCONNECTED" });
    const calls: string[] = [];
    const logged: string[] = [];
    const previousError = console.error;
    console.error = (...args: unknown[]) => {
      logged.push(args.map(value => String(value)).join(" "));
    };
    try {
      const response = await registerCloudPhoneForOrganization(userId, organizationId, snapshot.id, "123456", {
        getSnapshot: async () => snapshot,
        organizationAccess: async () => true,
        getCredentialBinding: async () => ({ businessAccountId: "44444444-4444-4444-8444-444444444444", reference: "secret://cloud/1", keyVersion: "kms-v1" }),
        vault: {
          async store() { return { reference: "unused", keyVersion: "unused" }; },
          async resolve() { return "resolved-in-memory"; },
          async rotate() { return { reference: "unused", keyVersion: "unused" }; },
          async revoke() {},
        },
        createClient: () => ({
          async getBusinessAccount() { return { id: snapshot.wabaId!, name: "Ganatri" }; },
          async getPhoneNumbers() {
            calls.push("phones");
            return {
              data: [{
                id: snapshot.phoneNumberId!,
                display_phone_number: "+919876543210",
                verified_name: "Ganatri",
                status: calls.filter(call => call === "phones").length > 1 ? "CONNECTED" : "DISCONNECTED",
                is_on_biz_app: false,
              }],
            };
          },
          async subscribeBusinessAccount() {},
          async registerPhoneNumber(phoneNumberId: string, pin: string) {
            expect(phoneNumberId).toBe(snapshot.phoneNumberId);
            expect(pin).toBe("123456");
            calls.push("register");
            return { success: true };
          },
        }),
        refreshMetadata: async input => {
          expect(input.providerPhoneStatus).toBe("CONNECTED");
          return cloudSnapshot({ providerPhoneStatus: "CONNECTED" });
        },
      });
      expect(response.status).toBe("success");
      expect(response.data?.providerPhoneStatus).toBe("CONNECTED");
      expect(calls).toEqual(["phones", "register", "phones"]);
      expect(logged.join(" ")).not.toContain("123456");
    } finally {
      console.error = previousError;
    }
  });

  test("re-registers a Meta CONNECTED Cloud phone with the two-step PIN", async () => {
    const snapshot = cloudSnapshot({ providerPhoneStatus: "CONNECTED" });
    const calls: string[] = [];
    const response = await registerCloudPhoneForOrganization(userId, organizationId, snapshot.id, "123456", {
      getSnapshot: async () => snapshot,
      organizationAccess: async () => true,
      getCredentialBinding: async () => ({ businessAccountId: "44444444-4444-4444-8444-444444444444", reference: "secret://cloud/1", keyVersion: "kms-v1" }),
      vault: {
        async store() { return { reference: "unused", keyVersion: "unused" }; },
        async resolve() { return "resolved-in-memory"; },
        async rotate() { return { reference: "unused", keyVersion: "unused" }; },
        async revoke() {},
      },
      createClient: () => ({
        async getBusinessAccount() { return { id: snapshot.wabaId!, name: "Ganatri" }; },
        async getPhoneNumbers() {
          calls.push("phones");
          return {
            data: [{
              id: snapshot.phoneNumberId!,
              display_phone_number: "+919876543210",
              verified_name: "Ganatri",
              status: "CONNECTED",
              is_on_biz_app: false,
            }],
          };
        },
        async subscribeBusinessAccount() {},
        async registerPhoneNumber(phoneNumberId: string, pin: string) {
          expect(phoneNumberId).toBe(snapshot.phoneNumberId);
          expect(pin).toBe("123456");
          calls.push("register");
          return { success: true };
        },
      }),
      refreshMetadata: async input => {
        expect(input.providerPhoneStatus).toBe("CONNECTED");
        return cloudSnapshot({ providerPhoneStatus: "CONNECTED" });
      },
    });
    expect(response.status).toBe("success");
    expect(response.message).toBe("WhatsApp Cloud phone registered");
    expect(calls).toEqual(["phones", "register", "phones"]);
  });

  test("rejects a wrong PIN without calling register again after Meta 133005", async () => {
    const snapshot = cloudSnapshot({ providerPhoneStatus: "DISCONNECTED" });
    const logged: string[] = [];
    const previousError = console.error;
    console.error = (...args: unknown[]) => {
      logged.push(args.map(value => String(value)).join(" "));
    };
    try {
      const response = await registerCloudPhoneForOrganization(userId, organizationId, snapshot.id, "654321", {
        getSnapshot: async () => snapshot,
        organizationAccess: async () => true,
        getCredentialBinding: async () => ({ businessAccountId: "44444444-4444-4444-8444-444444444444", reference: "secret://cloud/1", keyVersion: "kms-v1" }),
        vault: {
          async store() { return { reference: "unused", keyVersion: "unused" }; },
          async resolve() { return "resolved-in-memory"; },
          async rotate() { return { reference: "unused", keyVersion: "unused" }; },
          async revoke() {},
        },
        createClient: () => ({
          async getBusinessAccount() { return { id: snapshot.wabaId!, name: "Ganatri" }; },
          async getPhoneNumbers() {
            return {
              data: [{
                id: snapshot.phoneNumberId!,
                display_phone_number: "+919876543210",
                status: "DISCONNECTED",
                is_on_biz_app: false,
              }],
            };
          },
          async subscribeBusinessAccount() {},
          async registerPhoneNumber() {
            throw new WhatsAppCloudApiError({
              message: "Pin mismatch",
              status: 400,
              providerCode: "133005",
            });
          },
        }),
      });
      expect(response).toMatchObject({
        status: "error",
        message: "That PIN does not match two-step verification.",
        code: 400,
      });
      expect(logged.join(" ")).not.toContain("654321");
    } finally {
      console.error = previousError;
    }
  });

  test("does not register a WhatsApp Business app coexistence number", async () => {
    const snapshot = cloudSnapshot({ providerPhoneStatus: "DISCONNECTED" });
    let registered = false;
    const response = await registerCloudPhoneForOrganization(userId, organizationId, snapshot.id, "123456", {
      getSnapshot: async () => snapshot,
      organizationAccess: async () => true,
      getCredentialBinding: async () => ({ businessAccountId: "44444444-4444-4444-8444-444444444444", reference: "secret://cloud/1", keyVersion: "kms-v1" }),
      vault: {
        async store() { return { reference: "unused", keyVersion: "unused" }; },
        async resolve() { return "resolved-in-memory"; },
        async rotate() { return { reference: "unused", keyVersion: "unused" }; },
        async revoke() {},
      },
      createClient: () => ({
        async getBusinessAccount() { return { id: snapshot.wabaId!, name: "Ganatri" }; },
        async getPhoneNumbers() {
          return {
            data: [{
              id: snapshot.phoneNumberId!,
              display_phone_number: "+919876543210",
              status: "DISCONNECTED",
              is_on_biz_app: true,
            }],
          };
        },
        async subscribeBusinessAccount() {},
        async registerPhoneNumber() {
          registered = true;
          return { success: true };
        },
      }),
      refreshMetadata: async input => cloudSnapshot({
        providerPhoneStatus: input.providerPhoneStatus,
        providerIsOnBizApp: input.providerIsOnBizApp,
      }),
    });
    expect(registered).toBe(false);
    expect(response.status).toBe("error");
    expect(response.code).toBe(409);
    expect(response.message).toContain("WhatsApp Business app");
  });

  test("rejects a registration PIN that is not six digits before Graph", async () => {
    const response = await registerCloudPhoneForOrganization(
      userId,
      organizationId,
      "33333333-3333-4333-8333-333333333333",
      "12a456",
    );
    expect(response).toEqual({
      status: "error",
      message: "PIN must be 6 digits",
      data: null,
      code: 400,
    });
  });
});
