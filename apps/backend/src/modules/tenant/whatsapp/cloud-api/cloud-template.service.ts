import {
  STATUS_CODES,
  type ServiceResponse,
  type WhatsAppCloudTemplateAssetDTO,
  type WhatsAppCloudTemplateBindingDTO,
  type WhatsAppCreateCloudTemplateBindingJSON,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import {
  getCloudAccountSnapshot,
  getCloudCredentialBinding,
} from "./cloud-account.repository";
import { CloudCredentialError, type WhatsAppCloudCredentialVault } from "./cloud-credentials";
import { databaseCloudCredentialVault } from "./database-cloud-credentials";
import { createConfiguredCloudClient } from "./cloud-provider";
import {
  listCloudTemplateAssets,
  createCloudTemplateBinding,
  listCloudTemplateBindings,
  normalizeCloudTemplateAsset,
  upsertCloudTemplateAssets,
} from "./cloud-template.repository";

type CloudTemplateClient = {
  getTemplates: (wabaId: string) => Promise<{ data?: Array<Record<string, unknown>> }>;
};

type CloudTemplateServiceDependencies = {
  vault: WhatsAppCloudCredentialVault;
  createClient: (accessToken: string) => CloudTemplateClient;
  getAccount: typeof getCloudAccountSnapshot;
  getCredential: typeof getCloudCredentialBinding;
  upsert: typeof upsertCloudTemplateAssets;
  list: typeof listCloudTemplateAssets;
  createBinding: typeof createCloudTemplateBinding;
  listBindings: typeof listCloudTemplateBindings;
  organizationAccess: (organizationId: string, userId: string) => Promise<boolean>;
};

const dependencies = (): CloudTemplateServiceDependencies => ({
  vault: databaseCloudCredentialVault,
  createClient: accessToken => createConfiguredCloudClient(accessToken),
  getAccount: getCloudAccountSnapshot,
  getCredential: getCloudCredentialBinding,
  upsert: upsertCloudTemplateAssets,
  list: listCloudTemplateAssets,
  createBinding: createCloudTemplateBinding,
  listBindings: listCloudTemplateBindings,
  organizationAccess: async (organizationId, userId) => Boolean(await organizationRepository.getOrganizationByIdForUser(organizationId, userId)),
});

const accountNotFound = (): ServiceResponse<{ templates: WhatsAppCloudTemplateAssetDTO[] } | null> => ({
  status: "error",
  message: "WhatsApp Cloud account not found",
  data: null,
  code: STATUS_CODES.NOT_FOUND,
});

export const syncCloudTemplatesForAccount = async (
  userId: string,
  organizationId: string,
  accountId: string,
  injected: Partial<CloudTemplateServiceDependencies> = {},
): Promise<ServiceResponse<{ templates: WhatsAppCloudTemplateAssetDTO[] } | null>> => {
  const deps = { ...dependencies(), ...injected };
  try {
    if (!await deps.organizationAccess(organizationId, userId)) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
    const account = await deps.getAccount(organizationId, accountId);
    if (!account || !account.wabaId) return accountNotFound();
    const credential = await deps.getCredential(organizationId, accountId);
    if (!credential) return { status: "error", message: "WhatsApp Cloud account credential is unavailable", data: null, code: STATUS_CODES.CONFLICT };
    const accessToken = await deps.vault.resolve(credential);
    const providerTemplates = await deps.createClient(accessToken).getTemplates(account.wabaId);
    const assets = (providerTemplates.data ?? []).map(template => normalizeCloudTemplateAsset(organizationId, credential.businessAccountId, template));
    const templates = await deps.upsert(assets);
    return { status: "success", message: "WhatsApp Cloud templates synchronized", data: { templates }, code: STATUS_CODES.SUCCESS };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof CloudCredentialError && error.code === "vault_unavailable"
        ? "WhatsApp Cloud credential storage is not configured"
        : "WhatsApp Cloud templates could not be synchronized",
      data: null,
      code: error instanceof CloudCredentialError && error.code === "vault_unavailable" ? STATUS_CODES.SERVICE_UNAVAILABLE : STATUS_CODES.BAD_REQUEST,
    };
  }
};

export const listCloudTemplatesForAccount = async (
  userId: string,
  organizationId: string,
  accountId: string,
  injected: Partial<CloudTemplateServiceDependencies> = {},
): Promise<ServiceResponse<{ templates: WhatsAppCloudTemplateAssetDTO[] } | null>> => {
  const deps = { ...dependencies(), ...injected };
  if (!await deps.organizationAccess(organizationId, userId)) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  const account = await deps.getAccount(organizationId, accountId);
  if (!account?.wabaId) return accountNotFound();
  const templates = await deps.list(organizationId, account.wabaId);
  return { status: "success", message: "WhatsApp Cloud templates fetched successfully", data: { templates }, code: STATUS_CODES.SUCCESS };
};

export const createCloudTemplateBindingForStore = async (
  userId: string,
  organizationId: string,
  storeId: string,
  data: WhatsAppCreateCloudTemplateBindingJSON,
  injected: Partial<CloudTemplateServiceDependencies> = {},
): Promise<ServiceResponse<WhatsAppCloudTemplateBindingDTO | null>> => {
  const deps = { ...dependencies(), ...injected };
  if (!await deps.organizationAccess(organizationId, userId)) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  if (!await organizationRepository.getStoreById(organizationId, storeId)) return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  try {
    const binding = await deps.createBinding({ ...data, organizationId, storeId, createdBy: userId, isDefault: data.isDefault ?? false });
    return { status: "success", message: "Cloud template binding saved", data: binding, code: STATUS_CODES.CREATED };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Cloud template binding could not be saved", data: null, code: STATUS_CODES.BAD_REQUEST };
  }
};

export const listCloudTemplateBindingsForStore = async (
  userId: string,
  organizationId: string,
  storeId: string,
  whatsappBusinessAccountId?: string,
  injected: Partial<CloudTemplateServiceDependencies> = {},
): Promise<ServiceResponse<{ bindings: WhatsAppCloudTemplateBindingDTO[] } | null>> => {
  const deps = { ...dependencies(), ...injected };
  if (!await deps.organizationAccess(organizationId, userId)) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  if (!await organizationRepository.getStoreById(organizationId, storeId)) return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  return { status: "success", message: "Cloud template bindings fetched successfully", data: { bindings: await deps.listBindings(organizationId, storeId, whatsappBusinessAccountId) }, code: STATUS_CODES.SUCCESS };
};
