import {
  STATUS_CODES,
  type ServiceResponse,
  type WhatsAppCloudTemplateAssetDTO,
  type WhatsAppCloudTemplateBindingDTO,
  type WhatsAppCloudTemplateSubmissionDTO,
  type WhatsAppCreateCloudTemplateSubmissionJSON,
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
  isCloudAccountAssignedToStore,
} from "./cloud-template.repository";
import {
  createCloudTemplateSubmission,
  getCloudTemplateSubmission,
  updateCloudTemplateSubmission,
  type CloudTemplateSubmissionInput,
} from "./cloud-template-submission.repository";

type CloudTemplateClient = {
  getTemplates: (wabaId: string) => Promise<{ data?: Array<Record<string, unknown>> }>;
  createMessageTemplate?: (wabaId: string, definition: {
    name: string;
    language: string;
    category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
    components: Array<Record<string, unknown>>;
  }) => Promise<{ id?: string; status?: string; category?: string }>;
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
  createSubmission: typeof createCloudTemplateSubmission;
  getSubmission: typeof getCloudTemplateSubmission;
  updateSubmission: typeof updateCloudTemplateSubmission;
  isAccountAssignedToStore: typeof isCloudAccountAssignedToStore;
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
  createSubmission: createCloudTemplateSubmission,
  getSubmission: getCloudTemplateSubmission,
  updateSubmission: updateCloudTemplateSubmission,
  isAccountAssignedToStore: isCloudAccountAssignedToStore,
  organizationAccess: async (organizationId, userId) => Boolean(await organizationRepository.getOrganizationByIdForUser(organizationId, userId)),
});

const accountNotFound = <T>(): ServiceResponse<T | null> => ({
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

const categoryForKind = (kind: WhatsAppCreateCloudTemplateSubmissionJSON["kind"]): "marketing" | "utility" =>
  kind === "promotion" ? "marketing" : "utility";

const providerCategoryFor = (category: "marketing" | "utility"): "MARKETING" | "UTILITY" =>
  category === "marketing" ? "MARKETING" : "UTILITY";

const providerStatusFor = (value: unknown): WhatsAppCloudTemplateSubmissionDTO["status"] => {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (status === "approved" || status === "rejected" || status === "paused" || status === "disabled" || status === "pending") return status;
  return "pending";
};

const safeSubmissionError = (error: unknown): { code: string; message: string } => {
  const message = error instanceof Error ? error.message : "Cloud template submission failed";
  const code = typeof (error as { providerCode?: unknown })?.providerCode === "string"
    ? String((error as { providerCode: string }).providerCode)
    : "cloud_template_submission_failed";
  return { code: code.slice(0, 100), message: message.slice(0, 1_000) };
};

const validateSubmissionComponents = (components: unknown[]): Array<Record<string, unknown>> => {
  if (!Array.isArray(components) || components.length === 0 || components.length > 20) {
    throw new Error("Cloud template components are invalid");
  }
  const normalized = components.map(component => {
    if (!component || typeof component !== "object" || Array.isArray(component)) throw new Error("Cloud template component is invalid");
    const value = { ...(component as Record<string, unknown>) };
    const type = typeof value.type === "string" ? value.type.trim().toUpperCase() : "";
    if (!["HEADER", "BODY", "FOOTER", "BUTTONS"].includes(type)) throw new Error("Cloud template component type is unsupported");
    value.type = type;
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > 64 * 1024) throw new Error("Cloud template component is too large");
    return value;
  });
  return normalized;
};

const findProviderTemplate = (
  templates: Array<Record<string, unknown>>,
  name: string,
  languageCode: string,
): Record<string, unknown> | null => templates.find(template =>
  String(template.name ?? "") === name && String(
    typeof template.language === "object" && template.language !== null
      ? (template.language as { code?: unknown }).code
      : template.language ?? "",
  ) === languageCode,
) ?? null;

export const submitCloudTemplateForAccount = async (
  userId: string,
  organizationId: string,
  accountId: string,
  data: WhatsAppCreateCloudTemplateSubmissionJSON,
  injected: Partial<CloudTemplateServiceDependencies> = {},
): Promise<ServiceResponse<{ submission: WhatsAppCloudTemplateSubmissionDTO; template: WhatsAppCloudTemplateAssetDTO | null } | null>> => {
  const deps = { ...dependencies(), ...injected };
  let pendingSubmission: WhatsAppCloudTemplateSubmissionDTO | null = null;
  try {
    if (!await deps.organizationAccess(organizationId, userId)) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
    const account = await deps.getAccount(organizationId, accountId);
    if (!account?.wabaId || account.whatsappBusinessAccountId !== data.whatsappBusinessAccountId) return accountNotFound();
    if (data.storeId) {
      if (!await organizationRepository.getStoreById(organizationId, data.storeId)) return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
      if (!await deps.isAccountAssignedToStore(organizationId, data.storeId, data.whatsappBusinessAccountId)) {
        return { status: "error", message: "WhatsApp Cloud account is not assigned to this Store", data: null, code: STATUS_CODES.CONFLICT };
      }
    }
    const credential = await deps.getCredential(organizationId, accountId);
    if (!credential) return { status: "error", message: "WhatsApp Cloud account credential is unavailable", data: null, code: STATUS_CODES.CONFLICT };
    const components = validateSubmissionComponents(data.components);
    const category = categoryForKind(data.kind);
    const submissionInput: CloudTemplateSubmissionInput = {
      organizationId,
      whatsappBusinessAccountId: data.whatsappBusinessAccountId,
      originatingStoreId: data.storeId ?? null,
      localTemplateId: data.localTemplateId ?? null,
      kind: data.kind,
      friendlyName: data.friendlyName,
      metaTemplateName: data.metaTemplateName,
      languageCode: data.languageCode,
      category,
      requestedComponents: components,
      sampleValues: data.sampleValues,
      idempotencyKey: data.idempotencyKey,
      createdBy: userId,
    };
    let submission = await deps.createSubmission(submissionInput);
    pendingSubmission = submission;
    if (["pending", "approved", "rejected", "paused", "disabled"].includes(submission.status) && submission.metaTemplateId) {
      return { status: "success", message: "Cloud template submission already exists", data: { submission, template: null }, code: STATUS_CODES.SUCCESS };
    }
    const accessToken = await deps.vault.resolve(credential);
    const client = deps.createClient(accessToken);
    submission = await deps.updateSubmission(organizationId, submission.id, { status: "submitting", updatedBy: userId }) ?? submission;
    pendingSubmission = submission;
    let providerTemplate = findProviderTemplate((await client.getTemplates(account.wabaId)).data ?? [], data.metaTemplateName, data.languageCode);
    let providerResponse: { id?: string; status?: string; category?: string } | null = null;
    if (!providerTemplate) {
      if (!client.createMessageTemplate) throw new Error("Cloud template creation is unavailable");
      providerResponse = await client.createMessageTemplate(account.wabaId, {
        name: data.metaTemplateName,
        language: data.languageCode,
        category: providerCategoryFor(category),
        components,
      });
      providerTemplate = findProviderTemplate((await client.getTemplates(account.wabaId)).data ?? [], data.metaTemplateName, data.languageCode);
    }
    const providerTemplateId = String(providerTemplate?.id ?? providerResponse?.id ?? "").trim() || null;
    const status = providerStatusFor(providerTemplate?.status ?? providerResponse?.status);
    if (!providerTemplateId) throw new Error("Meta did not return a template identifier");
    const assets = providerTemplate ? [normalizeCloudTemplateAsset(organizationId, credential.businessAccountId, providerTemplate)] : [];
    const [template] = assets.length ? await deps.upsert(assets) : [];
    submission = await deps.updateSubmission(organizationId, submission.id, {
      status,
      metaTemplateId: providerTemplateId,
      submittedAt: typeof submission.submittedAt === "string" ? submission.submittedAt : submission.submittedAt?.toISOString() ?? new Date().toISOString(),
      providerUpdatedAt: providerTemplate ? (typeof providerTemplate.updated_at === "string" ? providerTemplate.updated_at : new Date().toISOString()) : null,
      updatedBy: userId,
    }) ?? submission;
    pendingSubmission = submission;
    return { status: "success", message: status === "approved" ? "Cloud template is approved" : "Cloud template submitted to Meta for approval", data: { submission, template: template ?? null }, code: STATUS_CODES.SUCCESS };
  } catch (error) {
    const safe = safeSubmissionError(error);
    if (pendingSubmission) {
      await deps.updateSubmission(organizationId, pendingSubmission.id, {
        status: "failed",
        lastErrorCode: safe.code,
        lastErrorMessage: safe.message,
        updatedBy: userId,
      }).catch(() => undefined);
    }
    return { status: "error", message: safe.message, data: null, code: STATUS_CODES.BAD_REQUEST };
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
  if (!account?.whatsappBusinessAccountId) return accountNotFound();
  const templates = await deps.list(organizationId, account.whatsappBusinessAccountId);
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
