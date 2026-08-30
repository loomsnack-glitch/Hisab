import { createHash } from "node:crypto";
import {
    STATUS_CODES,
    validateWhatsAppTemplate,
    type ServiceResponse,
    type WhatsAppAccountDTO,
    type WhatsAppAccountStatusResponseDTO,
    type WhatsAppReminderQueueResponseDTO,
    type WhatsAppPublicInvoiceTemplateConfigDTO,
    type DeviceSessionDTO,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as billingRepository from "@/modules/tenant/billing/billing.repository";
import * as repository from "./whatsapp.repository";
import * as invoiceService from "./invoice";
import * as conversationService from "./conversation";
import * as storage from "@/services/storage";
import { renderBrandedSalePdf } from "./public-invoice.service";
import { renderDueReminderPdf } from "./due-reminder-pdf";
import { getDueReminderTemplateValues } from "./due-reminder";
import { getCloudAccountScope } from "./cloud-api/cloud-account.repository";
import { getCloudTemplateBindingSnapshotForStore } from "./cloud-api/cloud-template.repository";
import { enqueueCloudTemplateSend, enqueueCloudTemplateSendForDevice } from "./cloud-api/cloud-template-send.service";
import { buildDueReminderCloudComponents } from "./due-reminder-cloud-components";
import { cloudMediaUrlTtlSeconds } from "./cloud-api/cloud-media";
import { cloudFeatureCallersEnabled } from "./cloud-api/cloud-feature";
import * as publicInvoiceService from "./public-invoice.service";
import * as promotionService from "./promotion";
import * as messageTemplate from "./message-template";

const MAX_DUE_REMINDER_PDF_BYTES = 10 * 1024 * 1024;
const privateBucket = () => process.env.MINIO_BUCKET_NAME?.trim() || "";
const dueReminderObjectKey = (organizationId: string, storeId: string, accountId: string, customerId: string, saleId?: string) =>
    `whatsapp-due-reminders/${organizationId}/${storeId}/${accountId}/${customerId}/${saleId ?? "statement"}.pdf`;
type StoreScope =
    | { error: string; code: 404 }
    | { organization: Awaited<ReturnType<typeof organizationRepository.getOrganizationByIdForUser>>; store: Awaited<ReturnType<typeof organizationRepository.getStoreById>> };

const accountResponse = (
    account: WhatsAppAccountDTO,
    qrImageDataUrl: string | null,
): WhatsAppAccountStatusResponseDTO => ({
    account,
    qrImageDataUrl,
});

const cloudAccountResponse = (
    account: WhatsAppAccountDTO,
    message = "WhatsApp Cloud account status fetched successfully",
): ServiceResponse<WhatsAppAccountStatusResponseDTO> => ({
    status: "success",
    message,
    data: accountResponse(account, null),
    code: STATUS_CODES.SUCCESS,
});

const scopeStore = async (userId: string, organizationId: string, storeId: string): Promise<StoreScope> => {
    const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
    if (!organization) return { error: "Organization not found", code: STATUS_CODES.NOT_FOUND };

    const store = await organizationRepository.getStoreById(organizationId, storeId);
    if (!store) return { error: "Store not found", code: STATUS_CODES.NOT_FOUND };
    return { organization, store };
};

const getOrganizationAccount = async (
    userId: string,
    organizationId: string,
    accountId: string,
): Promise<{ error: string; code: 404 } | { account: WhatsAppAccountDTO }> => {
    const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
    if (!organization) return { error: "Organization not found", code: STATUS_CODES.NOT_FOUND };

    const account = await repository.getAccountById(accountId);
    if (!account || account.organizationId !== organizationId) return { error: "WhatsApp account not found", code: STATUS_CODES.NOT_FOUND };
    return { account };
};

const postgresCode = (error: unknown): string | undefined => {
    if (typeof error !== "object" || error === null) return undefined;
    if ("code" in error && typeof error.code === "string") return error.code;
    if ("cause" in error) return postgresCode(error.cause);
    return undefined;
};

const postgresConstraint = (error: unknown): string | undefined => {
    if (typeof error !== "object" || error === null) return undefined;
    if ("constraint" in error && typeof error.constraint === "string") return error.constraint;
    if ("constraint_name" in error && typeof error.constraint_name === "string") return error.constraint_name;
    if ("message" in error && typeof error.message === "string") {
        return error.message.match(/constraint "([^"]+)"/)?.[1];
    }
    if ("cause" in error) return postgresConstraint(error.cause);
    return undefined;
};

export const listAccounts = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<{ accounts: WhatsAppAccountDTO[] } | null>> => {
    const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
    if (!organization) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
    return {
        status: "success",
        message: "WhatsApp accounts loaded",
        data: { accounts: await repository.getAccountsForOrganization(organizationId) },
        code: STATUS_CODES.SUCCESS,
    };
};

export const getOrganizationAccountStatus = async (
    userId: string,
    organizationId: string,
    accountId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scoped = await getOrganizationAccount(userId, organizationId, accountId);
    if ("error" in scoped) return { status: "error", message: scoped.error, data: null, code: scoped.code };
    return scoped.account.provider === "cloud_api"
        ? cloudAccountResponse(scoped.account)
        : { status: "success", message: "Historical WhatsApp account loaded", data: accountResponse(scoped.account, null), code: STATUS_CODES.SUCCESS };
};

export const assignAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
    accountId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };
    if (await repository.getAccount(organizationId, storeId)) {
        return {
            status: "error",
            message: "This Store already has a WhatsApp account",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    try {
        const account = await repository.assignAccountToStore(organizationId, accountId, storeId, userId);
        if (!account) {
            return { status: "error", message: "WhatsApp account not found", data: null, code: STATUS_CODES.NOT_FOUND };
        }
        return {
            status: "success",
            message: "WhatsApp account assigned to Store",
            data: accountResponse(account, null),
            code: STATUS_CODES.SUCCESS,
        };
    } catch (error) {
        if (postgresCode(error) === "23505") {
            return {
                status: "error",
                message: "This Store already has a WhatsApp account",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        throw error;
    }
};

export const unassignAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };
    const account = await repository.getAccount(organizationId, storeId);
    if (!account) return { status: "error", message: "WhatsApp account is not assigned to this Store", data: null, code: STATUS_CODES.NOT_FOUND };
    const removed = await repository.unassignAccountFromStore(organizationId, account.id, storeId, userId);
    return removed
        ? { status: "success", message: "WhatsApp account unassigned from Store", data: null, code: STATUS_CODES.SUCCESS }
        : { status: "error", message: "WhatsApp account assignment was not found", data: null, code: STATUS_CODES.NOT_FOUND };
};

export const removeAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };

    const account = await repository.getAccount(organizationId, storeId);
    if (!account) {
        return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    }

    const removed = await repository.unassignAccountFromStore(organizationId, account.id, storeId, userId);
    return removed
        ? { status: "success", message: "WhatsApp number unassigned from Store", data: null, code: STATUS_CODES.SUCCESS }
        : { status: "error", message: "WhatsApp account assignment was not found", data: null, code: STATUS_CODES.NOT_FOUND };
};

const syncAccountForScope = async (account: WhatsAppAccountDTO): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO>> =>
    cloudAccountResponse(account, "WhatsApp Cloud account status is managed by Meta");

export const syncAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };
    const account = await repository.getAccount(organizationId, storeId);
    if (!account) {
        return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    }
    return syncAccountForScope(account);
};

export const syncAccountForDevice = async (
    session: DeviceSessionDTO,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const account = await repository.getAccount(session.organization.id, session.store.id);
    if (!account) return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    return syncAccountForScope(account);
};

export const getAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };
    const account = await repository.getAccount(organizationId, storeId);
    if (!account) return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    return account.provider === "cloud_api"
        ? cloudAccountResponse(account)
        : { status: "success", message: "Historical WhatsApp account loaded", data: accountResponse(account, null), code: STATUS_CODES.SUCCESS };
};

export const getAccountForDevice = async (
    session: DeviceSessionDTO,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const account = await repository.getAccount(session.organization.id, session.store.id);
    if (!account) return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    return account.provider === "cloud_api"
        ? cloudAccountResponse(account)
        : { status: "success", message: "Historical WhatsApp account loaded", data: accountResponse(account, null), code: STATUS_CODES.SUCCESS };
};

export const queueInvoice = invoiceService.queueInvoice;
export const queueInvoiceForDevice = invoiceService.queueInvoiceForDevice;
export const resendInvoice = invoiceService.resendInvoice;
export const resendInvoiceForDevice = invoiceService.resendInvoiceForDevice;

export const listMessageTemplatesForDevice = async (
    session: DeviceSessionDTO,
    kind?: import("@repo/types").WhatsAppMessageTemplateKind,
) => ({
    status: "success" as const,
    message: "WhatsApp message templates fetched successfully",
    data: { templates: await messageTemplate.listTemplates(session.organization.id, session.store.id, kind) },
    code: STATUS_CODES.SUCCESS,
});

export const listMessageTemplates = async (
    userId: string,
    organizationId: string,
    storeId: string,
    kind?: import("@repo/types").WhatsAppMessageTemplateKind,
) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    return { status: "success" as const, message: "WhatsApp message templates fetched successfully", data: { templates: await messageTemplate.listTemplates(organizationId, storeId, kind) }, code: STATUS_CODES.SUCCESS };
};

export const createMessageTemplate = async (
    userId: string,
    organizationId: string,
    storeId: string,
    data: import("@repo/types").WhatsAppCreateMessageTemplateJSON,
) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    const validation = validateWhatsAppTemplate(data.kind, data.body, scope.store?.whatsappLinks ?? []);
    if (validation.unknownTokens.length > 0) return { status: "error" as const, message: `Unknown template tokens: ${validation.unknownTokens.join(", ")}`, data: null, code: STATUS_CODES.BAD_REQUEST };
    try {
        const template = await messageTemplate.createTemplate(organizationId, storeId, userId, data);
        return { status: "success" as const, message: "WhatsApp message template created", data: { template }, code: STATUS_CODES.CREATED };
    } catch (error) {
        if (postgresCode(error) === "23505") return { status: "error" as const, message: "A template with this name already exists", data: null, code: STATUS_CODES.CONFLICT };
        throw error;
    }
};

export const updateMessageTemplate = async (
    userId: string,
    organizationId: string,
    storeId: string,
    templateId: string,
    data: import("@repo/types").WhatsAppUpdateMessageTemplateJSON,
) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    if (data.body !== undefined) {
        const existing = await messageTemplate.getTemplate(organizationId, storeId, templateId);
        if (!existing) return { status: "error" as const, message: "Template not found", data: null, code: STATUS_CODES.NOT_FOUND };
        const validation = validateWhatsAppTemplate(existing.kind, data.body, scope.store?.whatsappLinks ?? []);
        if (validation.unknownTokens.length > 0) return { status: "error" as const, message: `Unknown template tokens: ${validation.unknownTokens.join(", ")}`, data: null, code: STATUS_CODES.BAD_REQUEST };
    }
    try {
        const template = await messageTemplate.updateTemplate(organizationId, storeId, templateId, userId, data);
        return template
            ? { status: "success" as const, message: "WhatsApp message template updated", data: { template }, code: STATUS_CODES.SUCCESS }
            : { status: "error" as const, message: "Template not found", data: null, code: STATUS_CODES.NOT_FOUND };
    } catch (error) {
        if (postgresCode(error) === "23505") return { status: "error" as const, message: "A template with this name already exists", data: null, code: STATUS_CODES.CONFLICT };
        throw error;
    }
};

export const deleteMessageTemplate = async (userId: string, organizationId: string, storeId: string, templateId: string) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    const deleted = await messageTemplate.deleteTemplate(organizationId, storeId, templateId);
    return deleted
        ? { status: "success" as const, message: "WhatsApp message template deleted", data: null, code: STATUS_CODES.SUCCESS }
        : { status: "error" as const, message: "Template not found", data: null, code: STATUS_CODES.NOT_FOUND };
};

const queueDueReminderForStore = async (
  organizationId: string,
  storeId: string,
  customerId: string,
  customMessage?: string,
  saleId?: string,
  userId?: string,
): Promise<ServiceResponse<WhatsAppReminderQueueResponseDTO | null>> => {
    const store = await organizationRepository.getStoreById(organizationId, storeId);
    const customer = await billingRepository.getCustomerById(organizationId, customerId);
    if (!store || !customer) return { status: "error", message: "Store or customer not found", data: null, code: STATUS_CODES.NOT_FOUND };
    const sales = await billingRepository.getDueSalesByCustomerStore(organizationId, storeId, customerId);
    if (sales.length === 0) return { status: "error", message: "This customer has no due bills in this Store", data: null, code: STATUS_CODES.CONFLICT };
    const reminderSales = saleId ? sales.filter(sale => sale.id === saleId) : sales;
    if (reminderSales.length === 0) return { status: "error", message: "This bill has no remaining due amount", data: null, code: STATUS_CODES.CONFLICT };
    const account = await repository.getAccount(organizationId, storeId);
    if (!account) return { status: "error", message: "Link the Store WhatsApp account before sending reminders", data: null, code: STATUS_CODES.CONFLICT };
    if (account.status !== "connected") return { status: "error", message: "Connect the Store WhatsApp account before sending reminders", data: null, code: STATUS_CODES.CONFLICT };
    if (account.provider !== "cloud_api") return { status: "error", message: "This WhatsApp account uses a retired provider; connect a Cloud API account before sending reminders", data: null, code: STATUS_CODES.CONFLICT };
    const defaultTemplate = await messageTemplate.getDefaultTemplate(organizationId, storeId, "due_reminder");
    if (!cloudFeatureCallersEnabled()) return { status: "error", message: "WhatsApp Cloud feature callers are disabled", data: null, code: STATUS_CODES.CONFLICT };
    if (customMessage?.trim()) return { status: "error", message: "Cloud WhatsApp reminders must use the approved template", data: null, code: STATUS_CODES.CONFLICT };
    const scope = await getCloudAccountScope(organizationId, account.id);
    if (!scope?.businessAccountId) return { status: "error", message: "Cloud WhatsApp account is not ready for template sends", data: null, code: STATUS_CODES.CONFLICT };
    const binding = await getCloudTemplateBindingSnapshotForStore(organizationId, storeId, scope.businessAccountId, "due_reminder");
    if (!binding) return { status: "error", message: "No approved Cloud due-reminder template is linked to this Store", data: null, code: STATUS_CODES.CONFLICT };
    const localTemplateBody = binding.binding.localTemplateBody ?? defaultTemplate?.body;
    if (!localTemplateBody) return { status: "error", message: "The approved Cloud due-reminder template has no local variable mapping", data: null, code: STATUS_CODES.CONFLICT };
    const hasDynamicInvoiceButton = binding.asset.components.some(component => {
            if (!component || typeof component !== "object" || Array.isArray(component)) return false;
            const value = component as Record<string, unknown>;
            const type = String(value.type ?? "").toLowerCase();
            if (type !== "buttons" && type !== "button") return false;
            const buttons = Array.isArray(value.buttons) ? value.buttons : [];
            return buttons.some(button => button && typeof button === "object" && !Array.isArray(button) && /\{\{\d+\}\}/.test(String((button as Record<string, unknown>).url ?? "")));
    });
    if (hasDynamicInvoiceButton && !saleId) {
            return { status: "error", message: "Select a bill to include its invoice link", data: null, code: STATUS_CODES.CONFLICT };
    }
    const hasDocumentHeader = binding.asset.components.some(component => {
            if (!component || typeof component !== "object" || Array.isArray(component)) return false;
            const value = component as Record<string, unknown>;
            return String(value.type ?? "").toLowerCase() === "header" && String(value.format ?? "").toLowerCase() === "document";
    });
    let attachmentStorageKey: string | null = null;
    let documentLink: string | null = null;
    let values: ReturnType<typeof getDueReminderTemplateValues>;
    try {
            const invoiceUrl = hasDynamicInvoiceButton && saleId
                ? await publicInvoiceService.createPublicInvoiceUrl(organizationId, storeId, saleId)
                : null;
            values = getDueReminderTemplateValues(customer, reminderSales, store.name, store.whatsappLinks, invoiceUrl);
            if (hasDocumentHeader) {
                const bucket = privateBucket();
                if (!bucket) return { status: "error", message: "Private media storage is not configured for due reminder PDFs", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
                const organization = await organizationRepository.getOrganizationById(organizationId);
                if (!organization) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
                const sale = saleId ? await invoiceService.loadSaleDetail(organizationId, storeId, saleId) : null;
                if (saleId && !sale) return { status: "error", message: "Bill not found", data: null, code: STATUS_CODES.NOT_FOUND };
                const pdf = sale
                    ? await renderBrandedSalePdf(organizationId, storeId, sale)
                    : await renderDueReminderPdf(customer, reminderSales, {
                        organizationName: organization.name,
                        storeName: store.name,
                        storeAddress: store.address,
                    });
                if (pdf.byteLength > MAX_DUE_REMINDER_PDF_BYTES) return { status: "error", message: "Due reminder PDF is too large to send", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
                attachmentStorageKey = dueReminderObjectKey(organizationId, storeId, account.id, customerId, saleId);
                await storage.uploadBuffer(bucket, attachmentStorageKey, pdf, "application/pdf");
                documentLink = await storage.generateSignedUrl(bucket, attachmentStorageKey, cloudMediaUrlTtlSeconds());
            }
            const componentParameters = buildDueReminderCloudComponents(binding.asset.components, localTemplateBody, values, binding.binding.variableMapping, documentLink);
            const window = new Date().toISOString().slice(0, 10);
            const fingerprint = createHash("sha256").update(JSON.stringify({
                organizationId,
                storeId,
                customerId,
                sales: reminderSales.map(sale => ({ id: sale.id, dueTotal: String(sale.dueTotal ?? "0") })).sort((a, b) => a.id.localeCompare(b.id)),
                window,
            })).digest("hex");
            const idempotencyKey = saleId ? `due-reminder:${saleId}:${window}` : `due-reminder:${fingerprint}`;
            const enqueue = userId
                ? enqueueCloudTemplateSend(userId, organizationId, {
                    storeId, accountId: account.id, customerId, saleId: saleId ?? null,
                    bindingId: binding.binding.id, idempotencyKey, intent: "due_reminder", componentParameters,
                })
                : enqueueCloudTemplateSendForDevice(organizationId, storeId, {
                    storeId, accountId: account.id, customerId, saleId: saleId ?? null,
                    bindingId: binding.binding.id, idempotencyKey, intent: "due_reminder", componentParameters,
                });
            const queued = await enqueue;
            if (queued.status === "error" || !queued.data) {
                if (attachmentStorageKey) await storage.deleteObject(privateBucket(), attachmentStorageKey).catch(() => undefined);
                return queued as ServiceResponse<WhatsAppReminderQueueResponseDTO | null>;
            }
            return {
                status: "success",
                message: "Due reminder queued for WhatsApp",
                data: { customerId, saleId: saleId ?? null, ...queued.data } as WhatsAppReminderQueueResponseDTO,
                code: STATUS_CODES.CREATED,
            };
    } catch (error) {
            if (attachmentStorageKey) await storage.deleteObject(privateBucket(), attachmentStorageKey).catch(() => undefined);
            return { status: "error", message: error instanceof Error ? error.message : "Cloud due-reminder template variables are invalid", data: null, code: STATUS_CODES.BAD_REQUEST };
    }
};

export const queueDueReminder = async (userId: string, organizationId: string, storeId: string, customerId: string, customMessage?: string, saleId?: string) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    return queueDueReminderForStore(organizationId, storeId, customerId, customMessage, saleId, userId);
};

export const queueDueReminderForDevice = (session: DeviceSessionDTO, customerId: string, customMessage?: string, saleId?: string) =>
    queueDueReminderForStore(session.organization.id, session.store.id, customerId, customMessage, saleId);

export const revokePublicInvoiceLink = async (userId: string, organizationId: string, storeId: string, saleId: string) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    const revoked = await publicInvoiceService.revokePublicInvoiceLink(organizationId, storeId, saleId);
    return {
        status: "success" as const,
        message: revoked ? "Public invoice link revoked" : "No public invoice link found for this bill",
        data: { revoked },
        code: STATUS_CODES.SUCCESS,
    };
};

export const getPublicInvoiceTemplateConfig = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<WhatsAppPublicInvoiceTemplateConfigDTO | null>> => {
    const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }
    return {
        status: "success",
        message: "Public invoice template configuration fetched successfully",
        data: { invoiceTemplateUrl: publicInvoiceService.getPublicInvoiceTemplateUrl() },
        code: STATUS_CODES.SUCCESS,
    };
};

const getDueReminderStatusForStore = async (
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<ServiceResponse<WhatsAppReminderQueueResponseDTO | null>> => {
    const sale = await billingRepository.getSaleById(organizationId, storeId, saleId);
    const customerId = sale?.customerId ?? null;
    if (!customerId) return { status: "success", message: "Due reminder has not been sent for this bill", data: null, code: STATUS_CODES.SUCCESS };
    const account = await repository.getAccount(organizationId, storeId);
    const existing = account ? await repository.getCustomerReminderOutbox(organizationId, storeId, account.id, saleId) : null;
    return existing
        ? {
            status: "success",
            message: "Due reminder status fetched successfully",
            data: { customerId, saleId, ...existing },
            code: STATUS_CODES.SUCCESS,
        }
        : { status: "success", message: "Due reminder has not been sent for this bill", data: null, code: STATUS_CODES.SUCCESS };
};

export const getDueReminderStatus = async (userId: string, organizationId: string, storeId: string, saleId: string) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    return getDueReminderStatusForStore(organizationId, storeId, saleId);
};

export const getDueReminderStatusForDevice = (session: DeviceSessionDTO, saleId: string) =>
    getDueReminderStatusForStore(session.organization.id, session.store.id, saleId);
export const replayPendingMessageEvents = conversationService.replayPendingMessageEvents;
export const createPromotion = promotionService.createPromotion;
export const getPromotionDashboard = async (userId: string, organizationId: string, storeId: string, days = 30, limit = 20, page = 1) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    return {
        status: "success" as const,
        message: "Promotion dashboard fetched successfully",
        data: await promotionService.getPromotionDashboard(organizationId, storeId, days, limit, page),
        code: STATUS_CODES.SUCCESS,
    };
};
export const getPromotionRecipients = async (userId: string, organizationId: string, storeId: string, campaignId: string, status: "all" | "failed" | "retryable" = "all") => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    return { status: "success" as const, message: "Promotion recipients fetched successfully", data: await promotionService.getPromotionRecipients(organizationId, storeId, campaignId, status), code: STATUS_CODES.SUCCESS };
};
export const retryPromotionRecipient = async (userId: string, organizationId: string, storeId: string, campaignId: string, recipientId: string) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    return promotionService.retryPromotionRecipient(userId, organizationId, storeId, campaignId, recipientId);
};
export const resendPromotionRecipient = async (userId: string, organizationId: string, storeId: string, campaignId: string, recipientId: string) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    return promotionService.resendPromotionRecipient(userId, organizationId, storeId, campaignId, recipientId);
};
export const getInvoiceStatusForDevice = invoiceService.getInvoiceStatusForDevice;
export const retryInvoiceForDevice = invoiceService.retryInvoiceForDevice;
export const getInvoiceStatus = invoiceService.getInvoiceStatus;
export const retryInvoice = invoiceService.retryInvoice;
export const listConversations = conversationService.listConversations;
export const listConversationsForDevice = conversationService.listConversationsForDevice;
export const getConversation = conversationService.getConversation;
export const getConversationForDevice = conversationService.getConversationForDevice;
export const sendText = conversationService.sendText;
export const sendTextForDevice = conversationService.sendTextForDevice;
export const attachCustomer = conversationService.attachCustomer;
export const attachCustomerForDevice = conversationService.attachCustomerForDevice;
export const getAttachment = conversationService.getAttachment;
export const getAttachmentForDevice = conversationService.getAttachmentForDevice;
export const ingestInboundMessage = conversationService.ingestInboundMessage;
export const ingestMessageEvent = conversationService.ingestMessageEvent;
