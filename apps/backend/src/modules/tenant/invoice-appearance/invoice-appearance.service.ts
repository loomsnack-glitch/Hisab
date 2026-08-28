import {
  STATUS_CODES,
  isInvoiceLogoPathForOrganization,
  mergeInvoiceAppearanceUpdates,
  normalizeInvoiceAppearanceSettings,
  resolveInvoiceAppearance,
  type InvoiceAppearanceSettings,
  type InvoiceAppearanceSettingsResponse,
  type InvoiceAppearancePreviewResponse,
  type ServiceResponse,
  type StoreInvoiceAppearanceSettingsResponse,
  type UpdateInvoiceAppearanceSettings,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import {
  buildSampleInvoiceDocument,
} from "@/modules/tenant/whatsapp/invoice-document";
import {
  loadInvoiceLogoAssets,
} from "@/modules/tenant/whatsapp/invoice-appearance-resolution";
import {
  createInvoicePdfContext,
  renderSalePdf,
} from "@/modules/tenant/whatsapp/invoice-pdf";
import {
  renderPublicInvoiceHtml,
} from "@/modules/tenant/whatsapp/public-invoice-html";
import * as repository from "./invoice-appearance.repository";

const getOrganizationForUser = async (organizationId: string, userId: string) =>
  organizationRepository.getOrganizationByIdForUser(organizationId, userId);

const getStoreForOrganization = async (organizationId: string, storeId: string) =>
  organizationRepository.getStoreById(organizationId, storeId);

const toOrganizationResponse = (
  record: repository.OrganizationInvoiceAppearanceRecord,
): InvoiceAppearanceSettingsResponse => ({
  settings: {
    organizationId: record.organizationId,
    publishedSettings: record.publishedSettings,
    draftSettings: record.draftSettings,
    updatedAt: record.updatedAt,
  },
});

const toStoreResponse = (
  storeRecord: repository.StoreInvoiceAppearanceRecord,
  organizationRecord: repository.OrganizationInvoiceAppearanceRecord,
): StoreInvoiceAppearanceSettingsResponse => ({
  settings: {
    organizationId: storeRecord.organizationId,
    storeId: storeRecord.storeId,
    usesOrganizationDefault: storeRecord.usesOrganizationDefault,
    publishedSettings: storeRecord.publishedSettings,
    draftSettings: storeRecord.draftSettings,
    updatedAt: storeRecord.updatedAt,
  },
  organizationDefaults: toOrganizationResponse(organizationRecord).settings,
});

const effectiveDraftSettings = (
  published: InvoiceAppearanceSettings,
  draft: InvoiceAppearanceSettings | null,
  updates: UpdateInvoiceAppearanceSettings,
): InvoiceAppearanceSettings =>
  mergeInvoiceAppearanceUpdates(draft ?? published, updates);

const assertLogoPathScope = (
  organizationId: string,
  updates: UpdateInvoiceAppearanceSettings,
): ServiceResponse<null> | null => {
  if (updates.logoPath !== undefined && updates.logoPath !== null && updates.logoPath !== ""
    && !isInvoiceLogoPathForOrganization(organizationId, updates.logoPath)) {
    return {
      status: "error",
      message: "Logo path must belong to this organization",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }
  return null;
};

export const getOrganizationInvoiceAppearance = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<InvoiceAppearanceSettingsResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const record = await repository.ensureOrganizationInvoiceAppearance(organizationId);
  return {
    status: "success",
    message: "Invoice appearance settings fetched successfully",
    data: toOrganizationResponse(record),
    code: STATUS_CODES.SUCCESS,
  };
};

export const updateOrganizationInvoiceAppearanceDraft = async (
  userId: string,
  organizationId: string,
  updates: UpdateInvoiceAppearanceSettings,
): Promise<ServiceResponse<InvoiceAppearanceSettingsResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const invalidLogo = assertLogoPathScope(organizationId, updates);
  if (invalidLogo) return invalidLogo;
  const current = await repository.ensureOrganizationInvoiceAppearance(organizationId);
  const draftSettings = effectiveDraftSettings(current.publishedSettings, current.draftSettings, updates);
  const record = await repository.saveOrganizationInvoiceAppearanceDraft(organizationId, draftSettings, userId);
  return {
    status: "success",
    message: "Invoice appearance draft saved",
    data: toOrganizationResponse(record),
    code: STATUS_CODES.SUCCESS,
  };
};

export const publishOrganizationInvoiceAppearance = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<InvoiceAppearanceSettingsResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const record = await repository.publishOrganizationInvoiceAppearance(organizationId, userId);
  return {
    status: "success",
    message: "Invoice appearance published",
    data: toOrganizationResponse(record),
    code: STATUS_CODES.SUCCESS,
  };
};

export const resetOrganizationInvoiceAppearance = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<InvoiceAppearanceSettingsResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const record = await repository.resetOrganizationInvoiceAppearance(organizationId, userId);
  return {
    status: "success",
    message: "Invoice appearance reset to default",
    data: toOrganizationResponse(record),
    code: STATUS_CODES.SUCCESS,
  };
};

export const getStoreInvoiceAppearance = async (
  userId: string,
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<StoreInvoiceAppearanceSettingsResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const store = await getStoreForOrganization(organizationId, storeId);
  if (!store) {
    return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const [organizationRecord, storeRecord] = await Promise.all([
    repository.ensureOrganizationInvoiceAppearance(organizationId),
    repository.ensureStoreInvoiceAppearance(organizationId, storeId),
  ]);
  return {
    status: "success",
    message: "Store invoice appearance settings fetched successfully",
    data: toStoreResponse(storeRecord, organizationRecord),
    code: STATUS_CODES.SUCCESS,
  };
};

export const updateStoreInvoiceAppearanceDraft = async (
  userId: string,
  organizationId: string,
  storeId: string,
  input: UpdateInvoiceAppearanceSettings & { usesOrganizationDefault?: boolean },
): Promise<ServiceResponse<StoreInvoiceAppearanceSettingsResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const store = await getStoreForOrganization(organizationId, storeId);
  if (!store) {
    return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const invalidLogo = assertLogoPathScope(organizationId, input);
  if (invalidLogo) return invalidLogo;
  const [organizationRecord, current] = await Promise.all([
    repository.ensureOrganizationInvoiceAppearance(organizationId),
    repository.ensureStoreInvoiceAppearance(organizationId, storeId),
  ]);
  const usesOrganizationDefault = input.usesOrganizationDefault ?? current.usesOrganizationDefault;
  const basePublished = current.publishedSettings ?? organizationRecord.publishedSettings;
  const draftSettings = usesOrganizationDefault
    ? null
    : effectiveDraftSettings(basePublished, current.draftSettings, input);
  const record = await repository.saveStoreInvoiceAppearanceDraft(
    organizationId,
    storeId,
    { usesOrganizationDefault, draftSettings },
    userId,
  );
  return {
    status: "success",
    message: "Store invoice appearance draft saved",
    data: toStoreResponse(record, organizationRecord),
    code: STATUS_CODES.SUCCESS,
  };
};

export const publishStoreInvoiceAppearance = async (
  userId: string,
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<StoreInvoiceAppearanceSettingsResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const store = await getStoreForOrganization(organizationId, storeId);
  if (!store) {
    return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const [organizationRecord, record] = await Promise.all([
    repository.ensureOrganizationInvoiceAppearance(organizationId),
    repository.publishStoreInvoiceAppearance(organizationId, storeId, userId),
  ]);
  return {
    status: "success",
    message: "Store invoice appearance published",
    data: toStoreResponse(record, organizationRecord),
    code: STATUS_CODES.SUCCESS,
  };
};

export const resetStoreInvoiceAppearance = async (
  userId: string,
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<StoreInvoiceAppearanceSettingsResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const store = await getStoreForOrganization(organizationId, storeId);
  if (!store) {
    return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const [organizationRecord, record] = await Promise.all([
    repository.ensureOrganizationInvoiceAppearance(organizationId),
    repository.resetStoreInvoiceAppearance(organizationId, storeId, userId),
  ]);
  return {
    status: "success",
    message: "Store invoice appearance reset to organization default",
    data: toStoreResponse(record, organizationRecord),
    code: STATUS_CODES.SUCCESS,
  };
};

export const previewInvoiceAppearance = async (
  userId: string,
  organizationId: string,
  storeId: string,
  input: UpdateInvoiceAppearanceSettings & {
    usesOrganizationDefault?: boolean;
    viewport?: "desktop" | "mobile" | "pdf";
    mode?: "screen" | "print" | "preview";
  },
): Promise<ServiceResponse<InvoiceAppearancePreviewResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const store = await getStoreForOrganization(organizationId, storeId);
  if (!store) {
    return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }
  const [organizationRecord, storeRecord] = await Promise.all([
    repository.ensureOrganizationInvoiceAppearance(organizationId),
    repository.ensureStoreInvoiceAppearance(organizationId, storeId),
  ]);
  const usesOrganizationDefault = input.usesOrganizationDefault ?? storeRecord.usesOrganizationDefault;
  const organizationSettings = usesOrganizationDefault
    ? mergeInvoiceAppearanceUpdates(organizationRecord.publishedSettings, input)
    : organizationRecord.publishedSettings;
  const storeSettings = usesOrganizationDefault
    ? null
    : mergeInvoiceAppearanceUpdates(
      storeRecord.publishedSettings ?? organizationSettings,
      input,
    );
  const appearance = resolveInvoiceAppearance({
    organizationSettings,
    storeSettings,
    usesOrganizationDefault,
  });
  const viewport = input.viewport ?? "desktop";
  const mode = input.mode ?? (viewport === "pdf" ? "print" : "screen");
  const document = buildSampleInvoiceDocument(appearance, {
    branding: {
      organizationName: organization.name,
      organizationTagline: organization.tagline ?? null,
      storeName: store.name,
      storeAddress: store.address ?? null,
      storePhone: null,
      reviewPlatform: store.reviewPlatform ?? null,
      reviewLink: store.reviewLink ?? null,
      socialMediaName: store.socialMediaName ?? null,
      socialMediaLink: store.socialMediaLink ?? null,
      whatsappLinks: store.whatsappLinks,
    },
    showDownloadAction: mode === "screen",
  });

  if (viewport === "pdf") {
    try {
      const logoAssets = await loadInvoiceLogoAssets(organizationId, appearance.settings.logoPath);
      const pdf = await renderSalePdf(createInvoicePdfContext({
        ...document,
        logoUrl: logoAssets.url,
        logoDataUrl: logoAssets.dataUrl,
        showDownloadAction: false,
      }, logoAssets.buffer));
      return {
        status: "success",
        message: "Invoice PDF preview generated",
        data: {
          html: null,
          pdfBase64: pdf.toString("base64"),
          viewport,
          mode,
        },
        code: STATUS_CODES.SUCCESS,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to render PDF preview";
      console.error("[invoice-appearance] PDF preview failed", { organizationId, storeId, message });
      return {
        status: "error",
        message: "Failed to render PDF preview",
        data: null,
        code: STATUS_CODES.INTERNAL_SERVER_ERROR,
      };
    }
  }

  const html = renderPublicInvoiceHtml(document, { mode, viewport });
  return {
    status: "success",
    message: "Invoice appearance preview generated",
    data: { html, pdfBase64: null, viewport, mode },
    code: STATUS_CODES.SUCCESS,
  };
};

export const normalizeAppearanceInput = (input: UpdateInvoiceAppearanceSettings): InvoiceAppearanceSettings =>
  normalizeInvoiceAppearanceSettings(mergeInvoiceAppearanceUpdates(
    normalizeInvoiceAppearanceSettings(null),
    input,
  ));
