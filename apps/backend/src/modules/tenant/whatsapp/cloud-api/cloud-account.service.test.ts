import { describe, expect, test } from "bun:test";
import { createCloudOnboardingState } from "./cloud-onboarding";
import { completeCloudAccountProvisioning, refreshCloudAccountForOrganization, revokeCloudAccountForOrganization } from "./cloud-account.service";
import type { CloudProvisioningState } from "./cloud-provisioning";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const secret = "cloud-account-service-test-secret";

describe("Cloud account provisioning service", () => {
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
          calls.push(`persist:${input.phoneNumberId}`);
          return {
            id: "33333333-3333-4333-8333-333333333333",
            organizationId,
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
            verifiedName: input.verifiedName,
            status: "connected",
            qualityRating: null,
            messagingLimit: null,
            lastLimitSyncedAt: null,
            lastWebhookAt: null,
            lastGraphApiAt: null,
            lastErrorCode: null,
          };
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
        "persist:9876543210",
        "templates",
      ]);
    } finally {
      if (previousSecret === undefined) delete process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET;
      else process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET = previousSecret;
    }
  });

  test("refreshes provider metadata without exposing the access token", async () => {
    const snapshot = {
      id: "33333333-3333-4333-8333-333333333333",
      organizationId,
      wabaId: "1234567890",
      phoneNumberId: "9876543210",
      verifiedName: "Old name",
      status: "needs_action" as const,
      qualityRating: null,
      messagingLimit: null,
      lastLimitSyncedAt: null,
      lastWebhookAt: null,
      lastGraphApiAt: null,
      lastErrorCode: null,
    };
    let resolved = "";
    const refreshed = { ...snapshot, verifiedName: "New name", status: "connected" as const };
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
        async getPhoneNumbers() { return { data: [{ id: snapshot.phoneNumberId!, display_phone_number: "+919876543210", verified_name: "New name", quality_rating: "GREEN", messaging_limit: 1_000 }] }; },
        async subscribeBusinessAccount() {},
      }),
      refreshMetadata: async input => {
        expect(input.updatedBy).toBe(userId);
        expect(input.phoneNumber).toBe("+919876543210");
        expect(input.qualityRating).toBe("GREEN");
        expect(input.messagingLimit).toBe(1_000);
        return refreshed;
      },
    });
    expect(response.status).toBe("success");
    expect(response.data?.verifiedName).toBe("New name");
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
        persist: async input => ({
          id: accountId,
          organizationId,
          wabaId: input.wabaId,
          phoneNumberId: input.phoneNumberId,
          verifiedName: input.verifiedName,
          status: "connected",
          qualityRating: null,
          messagingLimit: null,
          lastLimitSyncedAt: null,
          lastWebhookAt: null,
          lastGraphApiAt: null,
          lastErrorCode: null,
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
    const snapshot = {
      id: "33333333-3333-4333-8333-333333333333",
      organizationId,
      wabaId: "1234567890",
      phoneNumberId: "9876543210",
      verifiedName: "Ganatri",
      status: "connected" as const,
      qualityRating: null,
      messagingLimit: null,
      lastLimitSyncedAt: null,
      lastWebhookAt: null,
      lastGraphApiAt: null,
      lastErrorCode: null,
    };
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
});
