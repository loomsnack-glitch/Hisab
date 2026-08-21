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
import { cloudOnboardingReplayStore } from "./cloud-onboarding.repository";
import {
  CloudCredentialError,
  type WhatsAppCloudCredentialVault,
} from "./cloud-credentials";
import {
  getCloudAccountSnapshot,
  getCloudCredentialBinding,
  listCloudAccountSnapshots,
  persistProvisionedCloudAccount,
  refreshCloudAccountMetadata,
  revokeCloudAccount,
} from "./cloud-account.repository";
import { createCloudAuthorizationCodeExchange, createConfiguredCloudClient } from "./cloud-provider";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";

type CloudPhoneRecord = {
  id: string;
  display_phone_number: string;
  verified_name?: string;
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
};

const unavailableVault: WhatsAppCloudCredentialVault = {
  async store() {
    throw new CloudCredentialError(
      "vault_unavailable",
      "WhatsApp Cloud credential vault is not configured",
    );
  },
  async resolve() {
    throw new CloudCredentialError(
      "vault_unavailable",
      "WhatsApp Cloud credential vault is not configured",
    );
  },
  async rotate() {
    throw new CloudCredentialError(
      "vault_unavailable",
      "WhatsApp Cloud credential vault is not configured",
    );
  },
  async revoke() {},
};

const defaultDependencies = (): CloudAccountServiceDependencies => ({
  organizationAccess: async (organizationId, userId) => Boolean(await organizationRepository.getOrganizationByIdForUser(organizationId, userId)),
  getSnapshot: getCloudAccountSnapshot,
  exchange: createCloudAuthorizationCodeExchange(),
  createClient: (accessToken) => createConfiguredCloudClient(accessToken),
  vault: unavailableVault,
  persist: persistProvisionedCloudAccount,
  consumeReplayStore: cloudOnboardingReplayStore,
  getCredentialBinding: getCloudCredentialBinding,
  refreshMetadata: refreshCloudAccountMetadata,
  revokeAccount: revokeCloudAccount,
});

const stringField = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is missing`);
  return value.trim();
};

const phoneFromProvider = (value: Record<string, unknown>): CloudPhoneRecord => ({
  id: stringField(value.id, "Phone Number ID"),
  display_phone_number: stringField(value.display_phone_number, "Display phone number"),
  verified_name: typeof value.verified_name === "string" ? value.verified_name.trim() : undefined,
});

const providerError = (error: unknown): string =>
  error instanceof CloudOnboardingExchangeError
    ? error.code
    : error instanceof CloudCredentialError
      ? error.code
      : "cloud_provisioning_failed";

export const completeCloudAccountProvisioning = async (
  userId: string,
  organizationId: string,
  result: unknown,
  injected: Partial<CloudAccountServiceDependencies> = {},
): Promise<ServiceResponse<WhatsAppCloudAccountSnapshot | null>> => {
  const deps = { ...defaultDependencies(), ...injected };
  try {
    const exchanged = await completeCloudOnboardingExchange({
      result,
      organizationId,
      userId,
      secret: process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET?.trim() ?? "",
      exchange: deps.exchange,
      replayStore: deps.consumeReplayStore,
    });
    const client = deps.createClient(exchanged.accessToken);
    const business = await client.getBusinessAccount(exchanged.wabaId);
    if (String(business.id ?? "") !== exchanged.wabaId) {
      throw new Error("Cloud WABA identity did not match onboarding result");
    }
    const phones = await client.getPhoneNumbers(exchanged.wabaId);
    const phone = (phones.data ?? [])
      .map(phoneFromProvider)
      .find((candidate) => candidate.id === exchanged.phoneNumberId);
    if (!phone) throw new Error("Cloud phone identity was not found in the WABA");
    await client.subscribeBusinessAccount(exchanged.wabaId);

    const credential = await deps.vault.store({
      organizationId,
      ownerKey: `waba:${exchanged.wabaId}`,
      accessToken: exchanged.accessToken,
    });
    try {
      const account = await deps.persist({
        organizationId,
        createdBy: userId,
        wabaId: exchanged.wabaId,
        displayName: typeof business.name === "string" ? business.name : null,
        credential,
        phoneNumberId: phone.id,
        phoneNumber: phone.display_phone_number,
        verifiedName: phone.verified_name ?? null,
      });
      return {
        status: "success",
        message: "WhatsApp Cloud account connected",
        data: account,
        code: STATUS_CODES.CREATED,
      };
    } catch (error) {
      await deps.vault.revoke(credential).catch(() => undefined);
      throw error;
    }
  } catch (error) {
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
  try {
    if (!await deps.organizationAccess(organizationId, userId)) {
      return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
    }
    const snapshot = await deps.getSnapshot(organizationId, accountId);
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
    const business = await client.getBusinessAccount(snapshot.wabaId);
    if (String(business.id ?? "") !== snapshot.wabaId) throw new Error("Cloud WABA identity did not match the account");
    const phones = await client.getPhoneNumbers(snapshot.wabaId);
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
      updatedBy: userId,
    });
    return refreshed
      ? { status: "success", message: "WhatsApp Cloud account refreshed", data: refreshed, code: STATUS_CODES.SUCCESS }
      : { status: "error", message: "WhatsApp Cloud account not found", data: null, code: STATUS_CODES.NOT_FOUND };
  } catch (error) {
    const code = providerError(error);
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
