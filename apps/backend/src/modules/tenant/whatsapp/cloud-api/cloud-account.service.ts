import {
  STATUS_CODES,
  type ServiceResponse,
  type WhatsAppCloudAccountSnapshot,
} from "@repo/types";
import {
  completeCloudOnboardingExchange,
  CloudOnboardingExchangeError,
  type CloudOnboardingTokenExchange,
} from "./cloud-onboarding-exchange";
import { cloudOnboardingReplayStore, hashCloudOnboardingNonce } from "./cloud-onboarding.repository";
import { verifyCloudOnboardingResult } from "./cloud-onboarding-result";
import {
  completeCloudProvisioningStep,
  createCloudProvisioningState,
  failCloudProvisioning,
  resumeCloudProvisioning,
} from "./cloud-provisioning";
import {
  createCloudProvisioningAttempt,
  getCloudProvisioningAttempt,
  updateCloudProvisioningAttempt,
  type CloudProvisioningAttemptRecord,
} from "./cloud-provisioning.repository";
import {
  assertCloudAccessToken,
  CloudCredentialError,
  type WhatsAppCloudCredentialVault,
} from "./cloud-credentials";
import { databaseCloudCredentialVault } from "./database-cloud-credentials";
import {
  getCloudAccountSnapshot,
  getCloudCredentialBinding,
  listCloudAccountSnapshots,
  persistProvisionedCloudAccount,
  refreshCloudAccountMetadata,
  recordCloudAccountHealth,
  revokeCloudAccount,
} from "./cloud-account.repository";
import { createCloudAuthorizationCodeExchange, createConfiguredCloudClient } from "./cloud-provider";
import { WhatsAppCloudApiError } from "./cloud-api.client";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";

type CloudPhoneRecord = {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  messaging_limit?: number;
};

type CloudProvisioningClient = {
  getBusinessAccount: (wabaId: string) => Promise<Record<string, unknown>>;
  getPhoneNumbers: (wabaId: string) => Promise<{ data?: Array<Record<string, unknown>> }>;
  subscribeBusinessAccount: (wabaId: string) => Promise<unknown>;
};

type CloudAccountServiceDependencies = {
  organizationAccess: (organizationId: string, userId: string) => Promise<boolean>;
  getSnapshot: typeof getCloudAccountSnapshot;
  exchange: CloudOnboardingTokenExchange;
  createClient: (accessToken: string) => CloudProvisioningClient;
  vault: WhatsAppCloudCredentialVault;
  persist: typeof persistProvisionedCloudAccount;
  consumeReplayStore: typeof cloudOnboardingReplayStore;
  getCredentialBinding: typeof getCloudCredentialBinding;
  refreshMetadata: typeof refreshCloudAccountMetadata;
  revokeAccount: typeof revokeCloudAccount;
  recordHealth: typeof recordCloudAccountHealth;
  getProvisioningAttempt: typeof getCloudProvisioningAttempt;
  createProvisioningAttempt: typeof createCloudProvisioningAttempt;
  updateProvisioningAttempt: typeof updateCloudProvisioningAttempt;
  syncTemplates: (userId: string, organizationId: string, accountId: string, vault: WhatsAppCloudCredentialVault) => Promise<unknown>;
};

const defaultDependencies = (): CloudAccountServiceDependencies => ({
  organizationAccess: async (organizationId, userId) => Boolean(await organizationRepository.getOrganizationByIdForUser(organizationId, userId)),
  getSnapshot: getCloudAccountSnapshot,
  exchange: createCloudAuthorizationCodeExchange(),
  createClient: (accessToken) => createConfiguredCloudClient(accessToken),
  vault: databaseCloudCredentialVault,
  persist: persistProvisionedCloudAccount,
  consumeReplayStore: cloudOnboardingReplayStore,
  getCredentialBinding: getCloudCredentialBinding,
  refreshMetadata: refreshCloudAccountMetadata,
  revokeAccount: revokeCloudAccount,
  recordHealth: recordCloudAccountHealth,
  getProvisioningAttempt: getCloudProvisioningAttempt,
  createProvisioningAttempt: createCloudProvisioningAttempt,
  updateProvisioningAttempt: updateCloudProvisioningAttempt,
  syncTemplates: async (userId, organizationId, accountId, vault) => {
    const { syncCloudTemplatesForAccount } = await import("./cloud-template.service");
    return syncCloudTemplatesForAccount(userId, organizationId, accountId, { vault });
  },
});

const stringField = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is missing`);
  return value.trim();
};

const phoneFromProvider = (value: Record<string, unknown>): CloudPhoneRecord => ({
  id: stringField(value.id, "Phone Number ID"),
  display_phone_number: stringField(value.display_phone_number, "Display phone number"),
  verified_name: typeof value.verified_name === "string" ? value.verified_name.trim() : undefined,
  quality_rating: typeof value.quality_rating === "string" ? value.quality_rating.trim() : undefined,
  messaging_limit: typeof value.messaging_limit === "number" && Number.isInteger(value.messaging_limit) && value.messaging_limit >= 0
    ? value.messaging_limit
    : undefined,
});

const providerError = (error: unknown): string =>
  error instanceof CloudOnboardingExchangeError
    ? error.code
    : error instanceof CloudCredentialError
      ? error.code
      : "cloud_provisioning_failed";

type ManualCloudAccountInput = {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
};

const manualCloudSetupEnabled = (): boolean =>
  process.env.WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED?.trim() === "true";

const providerIdInput = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!/^\d{1,64}$/.test(normalized)) throw new Error(`Invalid WhatsApp Cloud ${label}`);
  return normalized;
};

/**
 * Provisions a Meta API Setup test number without Embedded Signup.
 * Gated by WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED so production builds can
 * enable it at runtime. Customer onboarding should still use the signed
 * Embedded Signup exchange above.
 */
export const manuallyProvisionCloudAccount = async (
  userId: string,
  organizationId: string,
  input: ManualCloudAccountInput,
  injected: Partial<CloudAccountServiceDependencies> = {},
): Promise<ServiceResponse<WhatsAppCloudAccountSnapshot | null>> => {
  if (!manualCloudSetupEnabled()) {
    return { status: "error", message: "WhatsApp Cloud manual setup is unavailable", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const deps = { ...defaultDependencies(), ...injected };
  let storedCredential: { reference: string; keyVersion: string } | null = null;
  try {
    if (!await deps.organizationAccess(organizationId, userId)) {
      return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
    }
    const wabaId = providerIdInput(input.wabaId, "WABA ID");
    const phoneNumberId = providerIdInput(input.phoneNumberId, "Phone Number ID");
    const accessToken = assertCloudAccessToken(input.accessToken);
    const client = deps.createClient(accessToken);
    const business = await client.getBusinessAccount(wabaId);
    if (String(business.id ?? "") !== wabaId) throw new Error("Cloud WABA identity did not match the supplied WABA ID");
    const phones = await client.getPhoneNumbers(wabaId);
    const phone = (phones.data ?? []).map(phoneFromProvider).find(candidate => candidate.id === phoneNumberId);
    if (!phone) throw new Error("Cloud phone identity was not found in the supplied WABA");
    await client.subscribeBusinessAccount(wabaId);
    storedCredential = await deps.vault.store({ organizationId, ownerKey: `waba:${wabaId}`, accessToken });
    let account: WhatsAppCloudAccountSnapshot;
    try {
      account = await deps.persist({
        organizationId,
        createdBy: userId,
        wabaId,
        displayName: typeof business.name === "string" ? business.name : null,
        credential: storedCredential,
        phoneNumberId: phone.id,
        phoneNumber: phone.display_phone_number,
        verifiedName: phone.verified_name ?? null,
        qualityRating: phone.quality_rating ?? null,
        messagingLimit: phone.messaging_limit ?? null,
      });
    } catch (error) {
      await deps.vault.revoke(storedCredential).catch(() => undefined);
      throw error;
    }
    const sync = await deps.syncTemplates(userId, organizationId, account.id, deps.vault);
    if (sync && typeof sync === "object" && "status" in sync && sync.status === "error") {
      throw new Error("Cloud templates could not be synchronized");
    }
    return { status: "success", message: "WhatsApp Cloud test account connected", data: account, code: STATUS_CODES.CREATED };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof CloudCredentialError && error.code === "vault_unavailable"
        ? "WhatsApp Cloud credential storage is not configured"
        : "WhatsApp Cloud test account could not be connected",
      data: null,
      code: error instanceof CloudCredentialError && error.code === "vault_unavailable"
        ? STATUS_CODES.SERVICE_UNAVAILABLE
        : STATUS_CODES.BAD_REQUEST,
    };
  }
};

export const completeCloudAccountProvisioning = async (
  userId: string,
  organizationId: string,
  result: unknown,
  injected: Partial<CloudAccountServiceDependencies> = {},
): Promise<ServiceResponse<WhatsAppCloudAccountSnapshot | null>> => {
  const deps = { ...defaultDependencies(), ...injected };
  let attempt: CloudProvisioningAttemptRecord | null = null;
  let state = createCloudProvisioningState();
  try {
    const secret = process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET?.trim() ?? "";
    const verified = verifyCloudOnboardingResult({
      result,
      organizationId,
      userId,
      secret,
    });

    const idempotencyKey = hashCloudOnboardingNonce(verified.claims.nonce);
    attempt = await deps.getProvisioningAttempt(organizationId, idempotencyKey);
    if (attempt?.state.status === "completed" && attempt.whatsappAccountId) {
      const existing = await deps.getSnapshot(organizationId, attempt.whatsappAccountId);
      if (existing) {
        return { status: "success", message: "WhatsApp Cloud account already connected", data: existing, code: STATUS_CODES.SUCCESS };
      }
    }

    let accessToken: string;
    let credential: { reference: string; keyVersion: string };
    let wabaId = attempt?.providerWabaId ?? verified.wabaId;
    let phoneNumberId = attempt?.providerPhoneNumberId ?? verified.phoneNumberId;
    if (attempt?.credentialReference && attempt.credentialKeyVersion) {
      credential = { reference: attempt.credentialReference, keyVersion: attempt.credentialKeyVersion };
      accessToken = await deps.vault.resolve(credential);
      state = attempt.state.status === "failed" ? resumeCloudProvisioning(attempt.state) : attempt.state;
    } else {
      const exchanged = await completeCloudOnboardingExchange({
        result,
        organizationId,
        userId,
        secret,
        exchange: deps.exchange,
        replayStore: deps.consumeReplayStore,
      });
      accessToken = exchanged.accessToken;
      wabaId = exchanged.wabaId;
      phoneNumberId = exchanged.phoneNumberId;
      credential = await deps.vault.store({
        organizationId,
        ownerKey: `waba:${wabaId}`,
        accessToken,
      });
      state = completeCloudProvisioningStep(state, "authorization_received");
      try {
        attempt = await deps.createProvisioningAttempt({
          organizationId,
          createdBy: userId,
          idempotencyKey,
          providerWabaId: wabaId,
          providerPhoneNumberId: phoneNumberId,
          credentialReference: credential.reference,
          credentialKeyVersion: credential.keyVersion,
          state,
        });
      } catch (error) {
        await deps.vault.revoke(credential).catch(() => undefined);
        throw error;
      }
    }

    if (!attempt) throw new Error("Cloud provisioning attempt is unavailable");
    const activeAttempt: CloudProvisioningAttemptRecord = attempt;
    const client = deps.createClient(accessToken);
    const business = await client.getBusinessAccount(wabaId);
    if (String(business.id ?? "") !== wabaId) {
      throw new Error("Cloud WABA identity did not match onboarding result");
    }
    if (!state.completedSteps.includes("waba_resolved")) {
      state = completeCloudProvisioningStep(state, "waba_resolved");
      state = completeCloudProvisioningStep(state, "system_user_assigned");
      await deps.updateProvisioningAttempt({ organizationId, attemptId: activeAttempt.id, state });
    }
    const phones = await client.getPhoneNumbers(wabaId);
    const phone = (phones.data ?? [])
      .map(phoneFromProvider)
      .find((candidate) => candidate.id === phoneNumberId);
    if (!phone) throw new Error("Cloud phone identity was not found in the WABA");
    if (!state.completedSteps.includes("phone_registered")) {
      state = completeCloudProvisioningStep(state, "phone_registered");
      await deps.updateProvisioningAttempt({ organizationId, attemptId: activeAttempt.id, state });
    }
    if (!state.completedSteps.includes("webhook_subscribed")) {
      await client.subscribeBusinessAccount(wabaId);
      state = completeCloudProvisioningStep(state, "webhook_subscribed");
      await deps.updateProvisioningAttempt({ organizationId, attemptId: activeAttempt.id, state });
    }

    const account = await deps.persist({
      organizationId,
      createdBy: userId,
      wabaId,
      displayName: typeof business.name === "string" ? business.name : null,
      credential,
      phoneNumberId: phone.id,
      phoneNumber: phone.display_phone_number,
      verifiedName: phone.verified_name ?? null,
      qualityRating: phone.quality_rating ?? null,
      messagingLimit: phone.messaging_limit ?? null,
    });
    if (!state.completedSteps.includes("templates_synced")) {
      const sync = await deps.syncTemplates(userId, organizationId, account.id, deps.vault);
      if (sync && typeof sync === "object" && "status" in sync && sync.status === "error") {
        throw new Error("Cloud templates could not be synchronized");
      }
      state = completeCloudProvisioningStep(state, "templates_synced");
    }
    state = completeCloudProvisioningStep(state, "completed");
    await deps.updateProvisioningAttempt({
      organizationId,
      attemptId: activeAttempt.id,
      state,
      whatsappAccountId: account.id,
      whatsappBusinessAccountId: activeAttempt.whatsappBusinessAccountId,
    });
    return {
      status: "success",
      message: "WhatsApp Cloud account connected",
      data: account,
      code: STATUS_CODES.CREATED,
    };
  } catch (error) {
    if (attempt && state.status !== "completed" && state.status !== "cancelled") {
      const failed = failCloudProvisioning(state, providerError(error), "Cloud account provisioning could not be completed");
      await deps.updateProvisioningAttempt({ organizationId, attemptId: attempt.id, state: failed }).catch(() => undefined);
    }
    const code = providerError(error);
    const serviceCode =
      code === "vault_unavailable" ? STATUS_CODES.SERVICE_UNAVAILABLE : STATUS_CODES.BAD_REQUEST;
    return {
      status: "error",
      message:
        code === "vault_unavailable"
          ? "WhatsApp Cloud credential storage is not configured"
          : "WhatsApp Cloud account could not be connected",
      data: null,
      code: serviceCode,
    };
  }
};

export const listCloudAccountsForOrganization = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<{ accounts: WhatsAppCloudAccountSnapshot[] }>> => {
  if (!await organizationRepository.getOrganizationByIdForUser(organizationId, userId)) {
    return { status: "error", message: "Organization not found", data: { accounts: [] }, code: STATUS_CODES.NOT_FOUND };
  }
  return {
    status: "success",
    message: "WhatsApp Cloud accounts fetched successfully",
    data: { accounts: await listCloudAccountSnapshots(organizationId) },
    code: STATUS_CODES.SUCCESS,
  };
};

export const getCloudAccountForOrganization = async (
  userId: string,
  organizationId: string,
  accountId: string,
): Promise<ServiceResponse<WhatsAppCloudAccountSnapshot | null>> => {
  if (!await organizationRepository.getOrganizationByIdForUser(organizationId, userId)) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const account = await getCloudAccountSnapshot(organizationId, accountId);
  return account
    ? { status: "success", message: "WhatsApp Cloud account fetched successfully", data: account, code: STATUS_CODES.SUCCESS }
    : { status: "error", message: "WhatsApp Cloud account not found", data: null, code: STATUS_CODES.NOT_FOUND };
};

export const refreshCloudAccountForOrganization = async (
  userId: string,
  organizationId: string,
  accountId: string,
  injected: Partial<CloudAccountServiceDependencies> = {},
): Promise<ServiceResponse<WhatsAppCloudAccountSnapshot | null>> => {
  const deps = { ...defaultDependencies(), ...injected };
  let snapshotForError: WhatsAppCloudAccountSnapshot | null = null;
  try {
    if (!await deps.organizationAccess(organizationId, userId)) {
      return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
    }
    const snapshot = await deps.getSnapshot(organizationId, accountId);
    snapshotForError = snapshot;
    if (!snapshot) {
      return { status: "error", message: "WhatsApp Cloud account not found", data: null, code: STATUS_CODES.NOT_FOUND };
    }
    if (!snapshot.wabaId || !snapshot.phoneNumberId) {
      return { status: "error", message: "WhatsApp Cloud account is not fully provisioned", data: snapshot, code: STATUS_CODES.CONFLICT };
    }
    const binding = await deps.getCredentialBinding(organizationId, accountId);
    if (!binding) {
      return { status: "error", message: "WhatsApp Cloud account credential is unavailable", data: snapshot, code: STATUS_CODES.CONFLICT };
    }
    const accessToken = await deps.vault.resolve(binding);
    const client = deps.createClient(accessToken);
    const [business, phones] = await Promise.all([
      client.getBusinessAccount(snapshot.wabaId),
      client.getPhoneNumbers(snapshot.wabaId),
    ]);
    if (String(business.id ?? "") !== snapshot.wabaId) throw new Error("Cloud WABA identity did not match the account");
    const phone = (phones.data ?? []).map(phoneFromProvider).find(candidate => candidate.id === snapshot.phoneNumberId);
    if (!phone) throw new Error("Cloud phone identity was not found in the WABA");
    const refreshed = await deps.refreshMetadata({
      organizationId,
      accountId,
      wabaId: snapshot.wabaId,
      displayName: typeof business.name === "string" ? business.name : null,
      phoneNumberId: phone.id,
      phoneNumber: phone.display_phone_number,
      verifiedName: phone.verified_name ?? null,
      qualityRating: phone.quality_rating ?? null,
      messagingLimit: phone.messaging_limit ?? null,
      updatedBy: userId,
    });
    return refreshed
      ? { status: "success", message: "WhatsApp Cloud account refreshed", data: refreshed, code: STATUS_CODES.SUCCESS }
      : { status: "error", message: "WhatsApp Cloud account not found", data: null, code: STATUS_CODES.NOT_FOUND };
  } catch (error) {
    const code = providerError(error);
    if (snapshotForError) {
      const status = error instanceof CloudCredentialError
        ? "needs_action"
        : error instanceof WhatsAppCloudApiError && [401, 403].includes(error.status ?? 0)
          ? "disconnected"
          : undefined;
      await deps.recordHealth({
        organizationId,
        accountId,
        status,
        errorCode: code,
        errorMessage: "Cloud account refresh failed; reconnect or retry the account",
      }).catch(() => undefined);
    }
    return {
      status: "error",
      message: code === "vault_unavailable" ? "WhatsApp Cloud credential storage is not configured" : "WhatsApp Cloud account could not be refreshed",
      data: null,
      code: code === "vault_unavailable" ? STATUS_CODES.SERVICE_UNAVAILABLE : STATUS_CODES.BAD_REQUEST,
    };
  }
};

export const revokeCloudAccountForOrganization = async (
  userId: string,
  organizationId: string,
  accountId: string,
  injected: Partial<CloudAccountServiceDependencies> = {},
): Promise<ServiceResponse<null>> => {
  const deps = { ...defaultDependencies(), ...injected };
  try {
    if (!await deps.organizationAccess(organizationId, userId)) {
      return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
    }
    const snapshot = await deps.getSnapshot(organizationId, accountId);
    if (!snapshot) return { status: "error", message: "WhatsApp Cloud account not found", data: null, code: STATUS_CODES.NOT_FOUND };
    const binding = await deps.getCredentialBinding(organizationId, accountId);
    if (binding) await deps.vault.revoke(binding);
    const revoked = await deps.revokeAccount({ organizationId, accountId, updatedBy: userId });
    return revoked
      ? { status: "success", message: "WhatsApp Cloud account revoked", data: null, code: STATUS_CODES.SUCCESS }
      : { status: "error", message: "WhatsApp Cloud account not found", data: null, code: STATUS_CODES.NOT_FOUND };
  } catch (error) {
    const code = providerError(error);
    return {
      status: "error",
      message: code === "vault_unavailable" ? "WhatsApp Cloud credential storage is not configured" : "WhatsApp Cloud account could not be revoked",
      data: null,
      code: code === "vault_unavailable" ? STATUS_CODES.SERVICE_UNAVAILABLE : STATUS_CODES.BAD_REQUEST,
    };
  }
};
