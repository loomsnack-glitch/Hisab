import {
  phoneSchema,
  STATUS_CODES,
  type DeviceSessionDTO,
  type SaleDetailDTO,
  type ServiceResponse,
  type WhatsAppInvoiceQueueResponseDTO,
  type WhatsAppMessageTemplateDTO,
  type StoreMessageLink,
} from "@repo/types";
import * as storage from "@/services/storage";
import * as billingRepository from "@/modules/tenant/billing/billing.repository";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as repository from "./whatsapp.repository";
import { getInvoiceTemplateValues } from "./invoice-text";
import * as messageTemplate from "./message-template";
import { getCloudAccountScope } from "./cloud-api/cloud-account.repository";
import { getCloudTemplateBindingSnapshotForStore } from "./cloud-api/cloud-template.repository";
import {
  enqueueCloudTemplateSend,
  enqueueCloudTemplateSendForDevice,
} from "./cloud-api/cloud-template-send.service";
import {
  buildInvoiceCloudComponents,
  cloudInvoiceTemplateHasDocumentHeader,
  cloudInvoiceTemplateHasDynamicUrlButton,
} from "./invoice-cloud-components";
import { cloudMediaUrlTtlSeconds } from "./cloud-api/cloud-media";
import { cloudFeatureCallersEnabled } from "./cloud-api/cloud-feature";
import { createPublicInvoiceUrl, renderBrandedSalePdf } from "./public-invoice.service";

const privateBucket = () => process.env.MINIO_BUCKET_NAME?.trim() || "";
const MAX_INVOICE_BYTES = 10 * 1024 * 1024;
const invoiceObjectKey = (organizationId: string, storeId: string, accountId: string, saleId: string) =>
  `whatsapp-invoices/${organizationId}/${storeId}/${accountId}/${saleId}.pdf`;

export type InvoiceQueueOptions = {
  resend?: boolean;
  requestId?: string;
};

export const invoiceIdempotencyKey = (saleId: string, options: InvoiceQueueOptions): string => {
  if (!options.resend) return `invoice:${saleId}`;
  const requestId = options.requestId?.trim() || crypto.randomUUID();
  return `invoice:${saleId}:resend:${requestId}`;
};

const queueCloudInvoiceForStore = async (
  userId: string | null,
  organizationId: string,
  storeId: string,
  sale: SaleDetailDTO,
  store: { name: string; address: string | null; whatsappLinks: StoreMessageLink[] },
  organization: { name: string; tagline: string | null },
  accountId: string,
  customMessage: string | undefined,
  selectedTemplate: WhatsAppMessageTemplateDTO | null,
  templateId?: string,
  idempotencyKey = `invoice:${sale.id}`,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  if (customMessage?.trim()) {
    return { status: "error", message: "Cloud WhatsApp bills must use the approved template", data: null, code: STATUS_CODES.CONFLICT };
  }
  const scope = await getCloudAccountScope(organizationId, accountId);
  if (!scope?.businessAccountId) {
    return { status: "error", message: "Cloud WhatsApp account is not ready for template sends", data: null, code: STATUS_CODES.CONFLICT };
  }
  const binding = await getCloudTemplateBindingSnapshotForStore(
    organizationId,
    storeId,
    scope.businessAccountId,
    "bill",
    templateId ? selectedTemplate?.id : undefined,
  );
  if (!binding) {
    return { status: "error", message: "No approved Cloud bill template is linked to this Store", data: null, code: STATUS_CODES.CONFLICT };
  }
  const localTemplateBody = binding.binding.localTemplateBody ?? selectedTemplate?.body;
  if (!localTemplateBody) {
    return { status: "error", message: "The approved Cloud bill template has no local variable mapping", data: null, code: STATUS_CODES.CONFLICT };
  }
  const requiresDocument = cloudInvoiceTemplateHasDocumentHeader(binding.asset.components);
  const bucket = requiresDocument ? privateBucket() : "";
  if (requiresDocument && !bucket) {
    return { status: "error", message: "Private media storage is not configured for WhatsApp invoices", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
  }
  const attachmentStorageKey = requiresDocument
    ? invoiceObjectKey(organizationId, storeId, accountId, sale.id)
    : null;
  let uploadedInvoice = false;
  try {
    const invoiceUrl = cloudInvoiceTemplateHasDynamicUrlButton(binding.asset.components)
      ? await createPublicInvoiceUrl(organizationId, storeId, sale.id)
      : null;
    let documentLink: string | null = null;
    if (requiresDocument && bucket && attachmentStorageKey) {
      const pdf = await renderBrandedSalePdf(organizationId, storeId, sale);
      if (pdf.byteLength > MAX_INVOICE_BYTES) {
        return { status: "error", message: "Generated invoice PDF is too large to send", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
      }
      await storage.uploadBuffer(bucket, attachmentStorageKey, pdf, "application/pdf");
      uploadedInvoice = true;
      documentLink = await storage.generateSignedUrl(bucket, attachmentStorageKey, cloudMediaUrlTtlSeconds());
    }
    const componentParameters = buildInvoiceCloudComponents(
      binding.asset.components,
      localTemplateBody,
      getInvoiceTemplateValues(sale, {
        organizationName: organization.name,
        storeName: store.name,
        links: store.whatsappLinks,
        invoiceUrl,
      }),
      documentLink,
      binding.binding.variableMapping,
    );
    const enqueue = userId
      ? enqueueCloudTemplateSend(userId, organizationId, {
          storeId, accountId, customerId: sale.customerId!, saleId: sale.id,
          bindingId: binding.binding.id, idempotencyKey, intent: "bill", componentParameters,
        })
      : enqueueCloudTemplateSendForDevice(organizationId, storeId, {
          storeId, accountId, customerId: sale.customerId!, saleId: sale.id,
          bindingId: binding.binding.id, idempotencyKey, intent: "bill", componentParameters,
        });
    const queued = await enqueue;
    if (queued.status === "error" || !queued.data) return queued as ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>;
    return response(sale.id, queued.data, false);
  } catch (error) {
    if (uploadedInvoice && bucket && attachmentStorageKey) {
      try { await storage.deleteObject(bucket, attachmentStorageKey); } catch { /* preserve the queue failure */ }
    }
    console.error("[whatsapp] Cloud invoice preparation failed", error instanceof Error ? error.message : "unknown");
    return { status: "error", message: error instanceof Error ? error.message : "Cloud invoice could not be queued", data: null, code: STATUS_CODES.CONFLICT };
  }
};

export const loadSaleDetail = async (
  organizationId: string,
  storeId: string,
  saleId: string,
): Promise<SaleDetailDTO | null> => {
  const sale = await billingRepository.getSaleById(
    organizationId,
    storeId,
    saleId,
  );
  if (!sale) return null;

  const [items, payments] = await Promise.all([
    billingRepository.getSaleItemsBySaleId(saleId),
    billingRepository.getPaymentsBySaleId(saleId),
  ]);
  return {
    ...sale,
    items,
    payments,
    orderDiscountAmount: Number(sale.discountTotal),
  };
};

const response = (
  saleId: string,
  request: { messageId: string; outboxId: string; messageStatus: string; outboxStatus: string },
  alreadyQueued: boolean,
): ServiceResponse<WhatsAppInvoiceQueueResponseDTO> => ({
  status: "success",
  message: alreadyQueued
    ? "Invoice is already queued for WhatsApp"
    : "Invoice queued for WhatsApp",
  data: {
    saleId,
    messageId: request.messageId,
    outboxId: request.outboxId,
    messageStatus: request.messageStatus as repository.InvoiceOutboxRecord["messageStatus"],
    outboxStatus: request.outboxStatus as repository.InvoiceOutboxRecord["outboxStatus"],
    alreadyQueued,
  },
  code: alreadyQueued ? STATUS_CODES.SUCCESS : STATUS_CODES.CREATED,
});

export const queueInvoiceForStore = async (
  organizationId: string,
  storeId: string,
  saleId: string,
  customMessage?: string,
  templateId?: string,
  userId?: string,
  options: InvoiceQueueOptions = {},
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  const store = await organizationRepository.getStoreById(
    organizationId,
    storeId,
  );
  if (!store) {
    return {
      status: "error",
      message: "Store not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const sale = await loadSaleDetail(organizationId, storeId, saleId);
  if (!sale) {
    return {
      status: "error",
      message: "Sale not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  if (sale.status !== "completed") {
    return {
      status: "error",
      message: "Only completed sales can be sent by WhatsApp",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const customerPhone =
    sale.customerPhoneSnapshot ?? sale.customer?.phone ?? null;
  const parsedPhone = phoneSchema.safeParse(customerPhone);
  if (!sale.customerId || !parsedPhone.success) {
    return {
      status: "error",
      message:
        "A customer with a valid international phone number is required for WhatsApp invoices",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  const account = await repository.getAccount(organizationId, storeId);
  if (!account) {
    return {
      status: "error",
      message: "Link the Store WhatsApp account before sending invoices",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }
  if (account.provider !== "cloud_api") {
    return {
      status: "error",
      message: "This WhatsApp account uses a retired provider; connect a Cloud API account before sending invoices",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }
  if (!options.resend) {
    const existing = await repository.getInvoiceOutbox(
      organizationId,
      storeId,
      account.id,
      saleId,
    );
    if (existing) return response(saleId, existing, true);
  }

  if (account.status !== "connected") {
    return {
      status: "error",
      message: "Connect the Store WhatsApp account before sending invoices",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const organization = await organizationRepository.getOrganizationById(organizationId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  try {
    const selectedTemplate = templateId
      ? await messageTemplate.getTemplate(organizationId, storeId, templateId)
      : await messageTemplate.getDefaultTemplate(organizationId, storeId, "bill");
    if (templateId && (!selectedTemplate || selectedTemplate.kind !== "bill" || !selectedTemplate.isActive)) {
      return {
        status: "error",
        message: "The selected bill template is unavailable",
        data: null,
        code: STATUS_CODES.NOT_FOUND,
      };
    }
    if (!cloudFeatureCallersEnabled()) return { status: "error", message: "WhatsApp Cloud feature callers are disabled", data: null, code: STATUS_CODES.CONFLICT };
    if (templateId && (!selectedTemplate || !selectedTemplate.isActive)) {
      return {
        status: "error",
        message: "No active bill template is available for this Store",
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
    return queueCloudInvoiceForStore(
      userId ?? null,
      organizationId,
      storeId,
      sale,
      { name: store.name, address: store.address ?? null, whatsappLinks: store.whatsappLinks },
      { name: organization.name, tagline: organization.tagline ?? null },
      account.id,
      customMessage,
      selectedTemplate,
      templateId,
      invoiceIdempotencyKey(saleId, options),
    );
  } catch (error) {
    try {
      if (!options.resend) {
        const existingAfterFailure = await repository.getInvoiceOutbox(
          organizationId,
          storeId,
          account.id,
          saleId,
        );
        if (existingAfterFailure)
          return response(saleId, existingAfterFailure, true);
      }
    } catch {
      // Preserve the original preparation failure when the race check cannot run.
    }

    if (error instanceof repository.WhatsAppOutboxLimitError) {
      return {
        status: "error",
        message: "WhatsApp account queue is full; retry shortly",
        data: null,
        code: STATUS_CODES.TOO_MANY_REQUESTS,
      };
    }
    console.error(
      "[whatsapp] invoice preparation failed",
      error instanceof Error ? error.message : "unknown",
    );
    return {
      status: "error",
      message: "Invoice PDF could not be queued. The Sale remains completed.",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }
};

export const queueInvoice = async (
  userId: string,
  organizationId: string,
  storeId: string,
  saleId: string,
  customMessage?: string,
  templateId?: string,
  options: InvoiceQueueOptions = {},
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  return queueInvoiceForStore(organizationId, storeId, saleId, customMessage, templateId, userId, options);
};

export const resendInvoice = async (
  userId: string,
  organizationId: string,
  storeId: string,
  saleId: string,
  requestId?: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  return queueInvoiceForStore(
    organizationId,
    storeId,
    saleId,
    undefined,
    undefined,
    userId,
    { resend: true, requestId },
  );
};

const getExistingInvoice = async (
  organizationId: string,
  storeId: string,
  saleId: string,
): Promise<repository.InvoiceOutboxRecord | null> => {
  const account = await repository.getAccount(organizationId, storeId);
  return account ? repository.getInvoiceOutbox(organizationId, storeId, account.id, saleId) : null;
};

export const getInvoiceStatus = async (
  userId: string,
  organizationId: string,
  storeId: string,
  saleId: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
  if (!organization) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  const store = await organizationRepository.getStoreById(organizationId, storeId);
  if (!store) return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  const existing = await getExistingInvoice(organizationId, storeId, saleId);
  return existing
    ? response(saleId, existing, true)
    : { status: "success", message: "Invoice has not been queued for WhatsApp", data: null, code: STATUS_CODES.SUCCESS };
};

export const retryInvoice = async (
  userId: string,
  organizationId: string,
  storeId: string,
  saleId: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
  if (!organization) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  const store = await organizationRepository.getStoreById(organizationId, storeId);
  if (!store) return { status: "error", message: "Store not found", data: null, code: STATUS_CODES.NOT_FOUND };
  const account = await repository.getAccount(organizationId, storeId);
  if (!account) return { status: "error", message: "Link the Store WhatsApp account before retrying", data: null, code: STATUS_CODES.CONFLICT };
  const retried = await repository.retryInvoiceOutbox(organizationId, storeId, account.id, saleId);
  return retried
    ? response(saleId, retried, true)
    : { status: "error", message: "This invoice is not waiting for retry", data: null, code: STATUS_CODES.CONFLICT };
};

export const queueInvoiceForDevice = async (
  session: DeviceSessionDTO,
  saleId: string,
  customMessage?: string,
  templateId?: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> =>
  queueInvoiceForStore(session.organization.id, session.store.id, saleId, customMessage, templateId);

export const resendInvoiceForDevice = async (
  session: DeviceSessionDTO,
  saleId: string,
  requestId?: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> =>
  queueInvoiceForStore(
    session.organization.id,
    session.store.id,
    saleId,
    undefined,
    undefined,
    undefined,
    { resend: true, requestId },
  );

export const getInvoiceStatusForDevice = async (
  session: DeviceSessionDTO,
  saleId: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  const existing = await getExistingInvoice(session.organization.id, session.store.id, saleId);
  return existing
    ? response(saleId, existing, true)
    : { status: "success", message: "Invoice has not been queued for WhatsApp", data: null, code: STATUS_CODES.SUCCESS };
};

export const retryInvoiceForDevice = async (
  session: DeviceSessionDTO,
  saleId: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  const account = await repository.getAccount(session.organization.id, session.store.id);
  if (!account) return { status: "error", message: "Link the Store WhatsApp account before retrying", data: null, code: STATUS_CODES.CONFLICT };
  const retried = await repository.retryInvoiceOutbox(session.organization.id, session.store.id, account.id, saleId);
  return retried
    ? response(saleId, retried, true)
    : { status: "error", message: "This invoice is not waiting for retry", data: null, code: STATUS_CODES.CONFLICT };
};
