import {
  STATUS_CODES,
  type ServiceResponse,
  type WhatsAppCloudTemplateAssetDTO,
  type WhatsAppCloudTemplateBindingDTO,
  type WhatsAppCloudTemplateSubmissionDTO,
  type WhatsAppCreateCloudTemplateSubmissionJSON,
  type WhatsAppUseCloudTemplateForStoreJSON,
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
import { WhatsAppCloudApiError } from "./cloud-api.client";
import {
  listCloudTemplateAssets,
  createCloudTemplateBinding,
  listCloudTemplateBindings,
  normalizeCloudTemplateAsset,
  upsertCloudTemplateAssets,
  isCloudAccountAssignedToStore,
  createCloudTemplateDefaultBinding,
} from "./cloud-template.repository";
import {
  createCloudTemplateSubmission,
  claimCloudTemplateSubmission,
  getCloudTemplateSubmission,
  updateCloudTemplateSubmission,
  listCloudTemplateSubmissions,
  type CloudTemplateSubmissionInput,
} from "./cloud-template-submission.repository";

type CloudTemplateClient = {
  getTemplates: (wabaId: string) => Promise<{ data?: Array<Record<string, unknown>> }>;
  uploadTemplateSample?: (media: { body: Uint8Array; mimeType: string; fileName: string }) => Promise<{ handle: string }>;
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
  createDefaultBinding: typeof createCloudTemplateDefaultBinding;
  createSubmission: typeof createCloudTemplateSubmission;
  claimSubmission: typeof claimCloudTemplateSubmission;
  getSubmission: typeof getCloudTemplateSubmission;
  updateSubmission: typeof updateCloudTemplateSubmission;
  listSubmissions: typeof listCloudTemplateSubmissions;
  isAccountAssignedToStore: typeof isCloudAccountAssignedToStore;
  organizationAccess: (organizationId: string, userId: string) => Promise<boolean>;
};

const debugProviderComponents = (template: Record<string, unknown>) =>
  Array.isArray(template.components)
    ? template.components.map(component => {
      if (!component || typeof component !== "object" || Array.isArray(component)) return { valueType: typeof component };
      const value = component as Record<string, unknown>;
      return {
        type: typeof value.type === "string" ? value.type : null,
        format: typeof value.format === "string" ? value.format : null,
        textType: value.text === null ? "null" : typeof value.text,
        textLength: typeof value.text === "string" ? value.text.length : null,
        keys: Object.keys(value),
        exampleKeys: value.example && typeof value.example === "object" && !Array.isArray(value.example)
          ? Object.keys(value.example as Record<string, unknown>)
          : [],
      };
    })
    : [];

const dependencies = (): CloudTemplateServiceDependencies => ({
  vault: databaseCloudCredentialVault,
  createClient: accessToken => createConfiguredCloudClient(accessToken),
  getAccount: getCloudAccountSnapshot,
  getCredential: getCloudCredentialBinding,
  upsert: upsertCloudTemplateAssets,
  list: listCloudTemplateAssets,
  createBinding: createCloudTemplateBinding,
  listBindings: listCloudTemplateBindings,
  createDefaultBinding: createCloudTemplateDefaultBinding,
  createSubmission: createCloudTemplateSubmission,
  claimSubmission: claimCloudTemplateSubmission,
  getSubmission: getCloudTemplateSubmission,
  updateSubmission: updateCloudTemplateSubmission,
  listSubmissions: listCloudTemplateSubmissions,
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
    const rawProviderTemplates = providerTemplates.data ?? [];
    const providerIdentityCounts = new Map<string, number>();
    for (const template of rawProviderTemplates) {
      const name = typeof template.name === "string" ? template.name : "<missing-name>";
      const language = typeof template.language === "string" ? template.language : "<missing-language>";
      const key = `${name}:${language}`;
      providerIdentityCounts.set(key, (providerIdentityCounts.get(key) ?? 0) + 1);
    }
    console.info("[DEBUG-whatsapp-template-sync]", {
      providerCount: rawProviderTemplates.length,
      providerDuplicates: [...providerIdentityCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([identity, count]) => ({ identity, count })),
      providerTemplates: rawProviderTemplates.map(template => ({
        id: typeof template.id === "string" ? template.id : null,
        name: typeof template.name === "string" ? template.name : null,
        language: typeof template.language === "string" ? template.language : null,
        status: typeof template.status === "string" ? template.status : null,
        components: debugProviderComponents(template),
      })),
    });
    const assets = rawProviderTemplates.map(template => normalizeCloudTemplateAsset(organizationId, credential.businessAccountId, template));
    const templates = await deps.upsert(assets);
    console.info("[DEBUG-whatsapp-template-sync]", {
      storedAssetCount: templates.length,
      storedAssets: templates.map(template => ({
        id: template.id,
        metaTemplateId: template.metaTemplateId,
        name: template.name,
        language: template.languageCode,
      })),
    });
    return { status: "success", message: "WhatsApp Cloud templates synchronized", data: { templates }, code: STATUS_CODES.SUCCESS };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof CloudCredentialError && error.code === "vault_unavailable"
        ? "WhatsApp Cloud credential storage is not configured"
        : error instanceof WhatsAppCloudApiError
          ? `Meta templates could not be refreshed${error.providerCode ? ` (provider code ${error.providerCode})` : ""}`
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

const cloudTemplateNamePattern = /^[a-z0-9_]+$/;
const cloudTemplateLanguagePattern = /^[A-Za-z]{2,10}(?:[_-][A-Za-z0-9]{2,10})*$/;

const validateSubmissionMetadata = (data: WhatsAppCreateCloudTemplateSubmissionJSON): void => {
  if (data.metaTemplateName.length > 512 || !cloudTemplateNamePattern.test(data.metaTemplateName)) {
    throw new Error("Cloud template name is invalid");
  }
  if (!cloudTemplateLanguagePattern.test(data.languageCode)) {
    throw new Error("Cloud template language is invalid");
  }
};

const safeSubmissionError = (error: unknown): { code: string; message: string } => {
  const validationMessage = error instanceof Error && [
    "Cloud template components are invalid",
    "Cloud template component is invalid",
    "Cloud template component type is unsupported",
    "Cloud template body text is invalid",
    "Cloud template body placeholders cannot be at the start or end",
    "Cloud template placeholders must use positive numbers",
    "Cloud template footer text is invalid",
    "Cloud template buttons are invalid",
    "Cloud template button is invalid",
    "Cloud template button URL is invalid",
    "Cloud template button URL must use HTTPS",
    "Cloud template header is invalid",
    "Cloud template header sample is required",
    "Cloud template header sample must be",
    "Cloud template must contain exactly one body",
    "Cloud template name is invalid",
    "Cloud template language is invalid",
  ].some(prefix => error.message.startsWith(prefix))
    ? error.message
    : null;
  const providerMessage = error instanceof WhatsAppCloudApiError
    ? error.providerSubcode === "2388299"
      ? "Meta rejected this template because a variable is at the beginning or end of the message body. Add text before the first variable and after the last variable."
      : `Meta template submission failed${error.providerCode ? ` (provider code ${error.providerCode})` : ""}`
    : null;
  const message = error instanceof CloudCredentialError
    ? "WhatsApp Cloud credential storage is unavailable"
    : providerMessage
      ? providerMessage
      : validationMessage
        ? validationMessage
      : "Cloud template submission failed";
  const code = typeof (error as { providerCode?: unknown })?.providerCode === "string"
    ? String((error as { providerCode: string }).providerCode)
    : "cloud_template_submission_failed";
  return { code: code.slice(0, 100), message: message.slice(0, 1_000) };
};

const validateSubmissionComponents = (components: unknown[], sampleValues: Record<string, unknown>): Array<Record<string, unknown>> => {
  if (!Array.isArray(components) || components.length === 0 || components.length > 20) {
    throw new Error("Cloud template components are invalid");
  }
  let bodyCount = 0;
  const placeholders = new Set<string>();
  const normalized = components.map(component => {
    if (!component || typeof component !== "object" || Array.isArray(component)) throw new Error("Cloud template component is invalid");
    const value = { ...(component as Record<string, unknown>) };
    const type = typeof value.type === "string" ? value.type.trim().toUpperCase() : "";
    if (!["HEADER", "BODY", "FOOTER", "BUTTONS"].includes(type)) throw new Error("Cloud template component type is unsupported");
    if (type === "BODY") {
      bodyCount += 1;
      if (typeof value.text !== "string" || !value.text.trim() || value.text.length > 4_096) throw new Error("Cloud template body text is invalid");
      const bodyText = value.text.trim();
      if (/^\{\{\d+\}\}/.test(bodyText) || /(?:^|\n)\s*\{\{\d+\}\}\s*[^\w{}]*$/.test(bodyText)) {
        throw new Error("Cloud template body placeholders cannot be at the start or end");
      }
      for (const match of value.text.matchAll(/\{\{([^{}]+)\}\}/g)) {
        if (!/^\d+$/.test(match[1]!) || Number(match[1]) < 1) throw new Error("Cloud template placeholders must use positive numbers");
        placeholders.add(match[1]!);
      }
    }
    if (type === "HEADER") {
      const format = typeof value.format === "string" ? value.format.trim().toUpperCase() : "";
      if (!["TEXT", "IMAGE", "DOCUMENT"].includes(format)) throw new Error("Cloud template header is invalid");
      if (format === "TEXT" && (typeof value.text !== "string" || !value.text.trim() || value.text.length > 60)) {
        throw new Error("Cloud template header is invalid");
      }
      if (format !== "TEXT" && value.text !== undefined) throw new Error("Cloud template header is invalid");
    }
    if (type === "FOOTER" && (typeof value.text !== "string" || !value.text.trim() || value.text.length > 60)) throw new Error("Cloud template footer text is invalid");
    if (type === "BUTTONS") {
      if (!Array.isArray(value.buttons) || value.buttons.length < 1 || value.buttons.length > 3) throw new Error("Cloud template buttons are invalid");
      for (const button of value.buttons) {
        if (!button || typeof button !== "object" || Array.isArray(button)) throw new Error("Cloud template button is invalid");
        const buttonValue = button as Record<string, unknown>;
        const buttonType = typeof buttonValue.type === "string" ? buttonValue.type.trim().toUpperCase() : "";
        if (!["URL", "QUICK_REPLY"].includes(buttonType) || typeof buttonValue.text !== "string" || !String(buttonValue.text).trim()) throw new Error("Cloud template button is invalid");
        if (buttonType === "URL") {
          if (typeof buttonValue.url !== "string") throw new Error("Cloud template button URL is invalid");
          try { if (new URL(buttonValue.url).protocol !== "https:") throw new Error(); } catch { throw new Error("Cloud template button URL must use HTTPS"); }
        }
      }
    }
    value.type = type;
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > 64 * 1024) throw new Error("Cloud template component is too large");
    return value;
  });
  if (bodyCount !== 1) throw new Error("Cloud template must contain exactly one body");
  for (const placeholder of placeholders) {
    if (typeof sampleValues[placeholder] !== "string" || !String(sampleValues[placeholder]).trim()) throw new Error(`Missing sample value for {{${placeholder}}}`);
  }
  return normalized;
};

const providerPlaceholderIndexes = (text: string): string[] => [...new Set(
  [...text.matchAll(/\{\{(\d+)\}\}/g)].map(match => match[1]!),
)].sort((left, right) => Number(left) - Number(right));

const providerComponents = (components: Array<Record<string, unknown>>, sampleValues: Record<string, unknown>): Array<Record<string, unknown>> => components.map(component => {
  const type = String(component.type).toUpperCase();
  if (type === "BODY" && typeof component.text === "string" && /\{\{\d+\}\}/.test(component.text)) {
    const indexes = providerPlaceholderIndexes(component.text);
    return { ...component, example: { body_text: [indexes.map(index => String(sampleValues[index]))] } };
  }
  return component;
});

const providerComponentsWithHeaderSample = async (
  client: CloudTemplateClient,
  components: Array<Record<string, unknown>>,
  sample: { base64?: string; fileName?: string; mimeType?: string },
): Promise<Array<Record<string, unknown>>> => {
  const header = components.find(component => String(component.type).toUpperCase() === "HEADER");
  const format = typeof header?.format === "string" ? header.format.toUpperCase() : "";
  if (format !== "IMAGE" && format !== "DOCUMENT") return components;
  if (!client.uploadTemplateSample) throw new Error("Cloud template header media upload is unavailable");
  if (!sample.base64 || !sample.fileName || !sample.mimeType) throw new Error("Cloud template header sample is required");
  const mimeType = sample.mimeType.trim().toLowerCase();
  if (format === "IMAGE" && !mimeType.startsWith("image/")) throw new Error("Cloud template header sample must be an image");
  if (format === "DOCUMENT" && mimeType !== "application/pdf") throw new Error("Cloud template header sample must be a PDF");
  const body = Buffer.from(sample.base64, "base64");
  if (body.byteLength === 0 || body.byteLength > 10 * 1024 * 1024) throw new Error("Cloud template header sample must be 10 MB or smaller");
  const uploaded = await client.uploadTemplateSample({ body, mimeType, fileName: sample.fileName });
  return components.map(component => String(component.type).toUpperCase() === "HEADER"
    ? { ...component, example: { header_handle: [uploaded.handle] } }
    : component);
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

const localBodyFromProviderComponents = (components: unknown[], kind: WhatsAppCreateCloudTemplateSubmissionJSON["kind"]): string => {
  const names = kind === "bill"
    ? ["customer_name", "bill_number", "total", "paid", "balance_due", "organization_name", "store_name"]
    : kind === "due_reminder"
      ? ["customer_name", "total_due", "bill_count", "store_name"]
      : ["customer_name", "store_name"];
  const body = components.find(component => component && typeof component === "object" && !Array.isArray(component) && String((component as Record<string, unknown>).type).toUpperCase() === "BODY") as Record<string, unknown> | undefined;
  if (!body || typeof body.text !== "string") throw new Error("Approved Cloud template does not contain a body");
  return body.text.replace(/\{\{(\d+)\}\}/g, (_, index: string) => {
    const name = names[Number(index) - 1];
    if (!name) throw new Error(`Cloud template placeholder {{${index}}} is not supported for ${kind}`);
    return `{{${name}}}`;
  });
};

export const submitCloudTemplateForAccount = async (
  userId: string,
  organizationId: string,
  accountId: string,
  data: WhatsAppCreateCloudTemplateSubmissionJSON,
  injected: Partial<CloudTemplateServiceDependencies> = {},
): Promise<ServiceResponse<{ submission: WhatsAppCloudTemplateSubmissionDTO; template: WhatsAppCloudTemplateAssetDTO | null } | null>> => {
  const deps = { ...dependencies(), ...injected };
  let pendingSubmission: WhatsAppCloudTemplateSubmissionDTO | null = null;
  let providerPhase = "load_provider_templates";
  try {
    validateSubmissionMetadata(data);
    if (!await deps.organizationAccess(organizationId, userId)) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
    const account = await deps.getAccount(organizationId, accountId);
    if (!account?.wabaId || account.whatsappBusinessAccountId !== data.whatsappBusinessAccountId) return accountNotFound();
    if (data.storeId) {
      if (!await organizationRepository.getStoreById(organizationId, data.storeId)) return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
      if (!await deps.isAccountAssignedToStore(organizationId, data.storeId, data.whatsappBusinessAccountId)) {
        return { status: "error", message: "WhatsApp Cloud account is not assigned to this Store", data: null, code: STATUS_CODES.CONFLICT };
      }
    }
    const components = validateSubmissionComponents(data.components, data.sampleValues);
    const credential = await deps.getCredential(organizationId, accountId);
    if (!credential) return { status: "error", message: "WhatsApp Cloud account credential is unavailable", data: null, code: STATUS_CODES.CONFLICT };
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
    const existingSubmission = await deps.createSubmission(submissionInput);
    if (["pending", "approved", "rejected", "paused", "disabled"].includes(existingSubmission.status) && existingSubmission.metaTemplateId) {
      return { status: "success", message: "Cloud template submission already exists", data: { submission: existingSubmission, template: null }, code: STATUS_CODES.SUCCESS };
    }
    const submissionClaim = await deps.claimSubmission(organizationId, existingSubmission.id, userId);
    if (!submissionClaim) {
      return { status: "success", message: "Cloud template submission is already being processed", data: { submission: existingSubmission, template: null }, code: STATUS_CODES.SUCCESS };
    }
    let submission = submissionClaim;
    pendingSubmission = submission;
    const accessToken = await deps.vault.resolve(credential);
    const client = deps.createClient(accessToken);
    let providerTemplate = findProviderTemplate((await client.getTemplates(account.wabaId)).data ?? [], data.metaTemplateName, data.languageCode);
    let providerResponse: { id?: string; status?: string; category?: string } | null = null;
    if (!providerTemplate) {
      if (!client.createMessageTemplate) throw new Error("Cloud template creation is unavailable");
      providerPhase = "upload_template_sample";
      const componentsWithHeaderSample = await providerComponentsWithHeaderSample(
        client,
        components,
        { base64: data.headerSampleBase64, fileName: data.headerSampleFileName, mimeType: data.headerSampleMimeType },
      );
      providerPhase = "create_message_template";
      providerResponse = await client.createMessageTemplate(account.wabaId, {
        name: data.metaTemplateName,
        language: data.languageCode,
        category: providerCategoryFor(category),
        components: providerComponents(componentsWithHeaderSample, data.sampleValues),
      });
      providerPhase = "refresh_provider_templates";
      providerTemplate = findProviderTemplate((await client.getTemplates(account.wabaId)).data ?? [], data.metaTemplateName, data.languageCode);
      console.info("[DEBUG-whatsapp-template-submit]", {
        phase: "refresh_provider_templates_response",
        providerTemplateId: typeof providerTemplate?.id === "string" ? providerTemplate.id : null,
        providerTemplateName: typeof providerTemplate?.name === "string" ? providerTemplate.name : null,
        components: providerTemplate ? debugProviderComponents(providerTemplate) : [],
      });
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
      expectedStatus: "submitting",
    }) ?? submission;
    pendingSubmission = submission;
    return { status: "success", message: status === "approved" ? "Cloud template is approved" : "Cloud template submitted to Meta for approval", data: { submission, template: template ?? null }, code: STATUS_CODES.SUCCESS };
  } catch (error) {
    if (error instanceof WhatsAppCloudApiError) {
      console.error("[DEBUG-whatsapp-template-submit]", {
        phase: providerPhase,
        status: error.status ?? null,
        providerCode: error.providerCode ?? null,
        providerSubcode: error.providerSubcode ?? null,
        fbtraceId: error.fbtraceId ?? null,
        message: error.message,
      });
    } else {
      console.error("[DEBUG-whatsapp-template-submit]", {
        phase: providerPhase,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    const safe = safeSubmissionError(error);
    if (pendingSubmission) {
      await deps.updateSubmission(organizationId, pendingSubmission.id, {
        status: "failed",
        lastErrorCode: safe.code,
        lastErrorMessage: safe.message,
        updatedBy: userId,
        expectedStatus: "submitting",
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

export const listCloudTemplateSubmissionsForAccount = async (
  userId: string,
  organizationId: string,
  accountId: string,
  originatingStoreId?: string,
  injected: Partial<CloudTemplateServiceDependencies> = {},
): Promise<ServiceResponse<{ submissions: WhatsAppCloudTemplateSubmissionDTO[] } | null>> => {
  const deps = { ...dependencies(), ...injected };
  if (!await deps.organizationAccess(organizationId, userId)) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  const account = await deps.getAccount(organizationId, accountId);
  if (!account?.whatsappBusinessAccountId) return accountNotFound();
  if (originatingStoreId && !await organizationRepository.getStoreById(organizationId, originatingStoreId)) {
    return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const submissions = await deps.listSubmissions(organizationId, account.whatsappBusinessAccountId, originatingStoreId);
  console.info("[DEBUG-whatsapp-template-submissions]", {
    count: submissions.length,
    submissions: submissions.map(submission => ({
      id: submission.id,
      friendlyName: submission.friendlyName,
      languageCode: submission.languageCode,
      kind: submission.kind,
      status: submission.status,
      metaTemplateId: submission.metaTemplateId,
      idempotencyKey: submission.idempotencyKey,
    })),
  });
  return {
    status: "success",
    message: "Cloud template submissions fetched successfully",
    data: { submissions },
    code: STATUS_CODES.SUCCESS,
  };
};

export const setCloudTemplateDefaultForSubmission = async (
  userId: string,
  organizationId: string,
  submissionId: string,
  injected: Partial<CloudTemplateServiceDependencies> = {},
): Promise<ServiceResponse<WhatsAppCloudTemplateBindingDTO | null>> => {
  const deps = { ...dependencies(), ...injected };
  if (!await deps.organizationAccess(organizationId, userId)) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  const submission = await deps.getSubmission(organizationId, submissionId);
  if (!submission || submission.organizationId !== organizationId) return { status: "error", message: "Cloud template submission not found", data: null, code: STATUS_CODES.NOT_FOUND };
  if (!submission.originatingStoreId) return { status: "error", message: "Select a Store before assigning a default", data: null, code: STATUS_CODES.CONFLICT };
  if (submission.status !== "approved" || !submission.metaTemplateId) return { status: "error", message: "Only an approved Cloud template can become a Store default", data: null, code: STATUS_CODES.CONFLICT };
  const assets = await deps.list(organizationId, submission.whatsappBusinessAccountId);
  const asset = assets.find(item => item.metaTemplateId === submission.metaTemplateId);
  if (!asset) return { status: "error", message: "Refresh Cloud templates before assigning this default", data: null, code: STATUS_CODES.CONFLICT };
  const expectedCategory = submission.kind === "promotion" ? "marketing" : "utility";
  if (asset.status !== "approved" || asset.category !== expectedCategory) return { status: "error", message: "Cloud template is no longer approved for this message type", data: null, code: STATUS_CODES.CONFLICT };
  try {
    const binding = await deps.createDefaultBinding({
      organizationId,
      storeId: submission.originatingStoreId,
      cloudTemplateId: asset.id,
      whatsappBusinessAccountId: submission.whatsappBusinessAccountId,
      kind: submission.kind,
      localTemplateName: `${submission.friendlyName} (Cloud)`,
      localTemplateBody: localBodyFromProviderComponents(submission.requestedComponents, submission.kind),
      createdBy: userId,
    });
    return { status: "success", message: "Approved Cloud template is now the Store default", data: binding, code: STATUS_CODES.SUCCESS };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Cloud template could not become the Store default", data: null, code: STATUS_CODES.CONFLICT };
  }
};

export const setCloudTemplateAssetDefaultForStore = async (
  userId: string,
  organizationId: string,
  storeId: string,
  data: WhatsAppUseCloudTemplateForStoreJSON,
  injected: Partial<CloudTemplateServiceDependencies> = {},
): Promise<ServiceResponse<WhatsAppCloudTemplateBindingDTO | null>> => {
  const deps = { ...dependencies(), ...injected };
  if (!await deps.organizationAccess(organizationId, userId)) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  if (!await organizationRepository.getStoreById(organizationId, storeId)) return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  const asset = (await deps.list(organizationId, data.whatsappBusinessAccountId)).find(item => item.id === data.cloudTemplateId);
  const expectedCategory = data.kind === "promotion" ? "marketing" : "utility";
  if (!asset || asset.status !== "approved" || asset.category !== expectedCategory) {
    return { status: "error", message: "Cloud WhatsApp template must be approved and match the message category", data: null, code: STATUS_CODES.CONFLICT };
  }
  try {
    const binding = await deps.createDefaultBinding({
      organizationId,
      storeId,
      cloudTemplateId: asset.id,
      whatsappBusinessAccountId: data.whatsappBusinessAccountId,
      kind: data.kind,
      localTemplateName: `${asset.name} (Imported)`,
      localTemplateBody: localBodyFromProviderComponents(asset.components, data.kind),
      createdBy: userId,
    });
    return { status: "success", message: "Existing Cloud template is now the Store default", data: binding, code: STATUS_CODES.SUCCESS };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Cloud template could not become the Store default", data: null, code: STATUS_CODES.CONFLICT };
  }
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
