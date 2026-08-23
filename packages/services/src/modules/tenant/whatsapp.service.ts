import type {
    WhatsAppAssignAccountJSON,
    WhatsAppAccountsResponseDTO,
    ServiceResponse,
    WhatsAppAccountStatusResponseDTO,
    WhatsAppChangeAccountNumberJSON,
    WhatsAppCreateAccountJSON,
    WhatsAppInvoiceQueueResponseDTO,
    WhatsAppReminderQueueResponseDTO,
    WhatsAppMessageTemplateKind,
    WhatsAppCreateMessageTemplateJSON,
    WhatsAppUpdateMessageTemplateJSON,
    WhatsAppMessageTemplatesResponseDTO,
    WhatsAppMessageTemplateDTO,
    WhatsAppConversationListResponse,
    WhatsAppConversationMessagesResponse,
    WhatsAppConversationDTO,
    WhatsAppAttachmentResponse,
    WhatsAppMessageDTO,
    WhatsAppSendConversationTextJSON,
    WhatsAppAttachConversationCustomerJSON,
    WhatsAppCreatePromotionJSON,
    WhatsAppPromotionDashboardResponseDTO,
    WhatsAppCloudAccountSnapshot,
    WhatsAppCloudOnboardingStateResponseDTO,
    WhatsAppCloudOnboardingResultDTO,
    WhatsAppCloudTemplateAssetDTO,
    WhatsAppCloudTemplateBindingDTO,
    WhatsAppCreateCloudTemplateBindingJSON,
    WhatsAppCustomerConsentEventDTO,
    WhatsAppRecordCustomerConsentJSON,
    WhatsAppSetCustomerSuppressionJSON,
    WhatsAppCloudQuotaPolicy,
    WhatsAppCloudSafety,
    WhatsAppCloudOutboxOperationsResponseDTO,
    WhatsAppCloudOutboxActionResponseDTO,
} from "@repo/types";
import { api, handleApiError } from "../../api";

type WhatsAppResponse = ServiceResponse<WhatsAppAccountStatusResponseDTO | null>;
type WhatsAppAccountsResponse = ServiceResponse<WhatsAppAccountsResponseDTO | null>;
type WhatsAppCloudAccountsResponse = ServiceResponse<{ accounts: WhatsAppCloudAccountSnapshot[] } | null>;
type WhatsAppCloudAccountResponse = ServiceResponse<WhatsAppCloudAccountSnapshot | null>;
type WhatsAppCloudOnboardingResponse = ServiceResponse<WhatsAppCloudOnboardingStateResponseDTO | null>;
type WhatsAppCloudTemplatesResponse = ServiceResponse<{ templates: WhatsAppCloudTemplateAssetDTO[] } | null>;
type WhatsAppCloudBindingsResponse = ServiceResponse<{ bindings: WhatsAppCloudTemplateBindingDTO[] } | null>;
type WhatsAppCloudBindingResponse = ServiceResponse<WhatsAppCloudTemplateBindingDTO | null>;
type WhatsAppCloudSafetyResponse = ServiceResponse<WhatsAppCloudSafety | null>;
type WhatsAppCustomerConsentResponse = ServiceResponse<WhatsAppCustomerConsentEventDTO | null>;
type WhatsAppCustomerConsentHistoryResponse = ServiceResponse<{ events: WhatsAppCustomerConsentEventDTO[] } | null>;
type WhatsAppInvoiceResponse = ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>;
type WhatsAppReminderResponse = ServiceResponse<WhatsAppReminderQueueResponseDTO | null>;
type WhatsAppPromotionDashboardResponse = ServiceResponse<WhatsAppPromotionDashboardResponseDTO | null>;
type WhatsAppConversationListResponseType = ServiceResponse<WhatsAppConversationListResponse | null>;
type WhatsAppConversationResponse = ServiceResponse<WhatsAppConversationMessagesResponse | null>;
const accountPath = (organizationId: string, storeId: string) =>
    "/organizations/" + organizationId + "/stores/" + storeId + "/whatsapp/account";

export const getWhatsAppAccounts = async (organizationId: string): Promise<WhatsAppAccountsResponse> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/whatsapp/accounts`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const startWhatsAppCloudOnboarding = async (organizationId: string): Promise<WhatsAppCloudOnboardingResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/cloud/onboarding/start`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const completeWhatsAppCloudOnboarding = async (
    organizationId: string,
    data: WhatsAppCloudOnboardingResultDTO,
): Promise<WhatsAppCloudAccountResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/cloud/onboarding/complete`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const manuallyProvisionWhatsAppCloudAccount = async (
    organizationId: string,
    data: { wabaId: string; phoneNumberId: string; accessToken: string },
): Promise<WhatsAppCloudAccountResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/cloud/manual`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppCloudAccounts = async (organizationId: string): Promise<WhatsAppCloudAccountsResponse> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/whatsapp/cloud/accounts`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const refreshWhatsAppCloudAccount = async (organizationId: string, accountId: string): Promise<WhatsAppCloudAccountResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/cloud/accounts/${accountId}/refresh`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const revokeWhatsAppCloudAccount = async (organizationId: string, accountId: string): Promise<ServiceResponse<null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/cloud/accounts/${accountId}/revoke`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const syncWhatsAppCloudTemplates = async (organizationId: string, accountId: string): Promise<WhatsAppCloudTemplatesResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/cloud/accounts/${accountId}/templates/sync`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppCloudTemplates = async (organizationId: string, accountId: string): Promise<WhatsAppCloudTemplatesResponse> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/whatsapp/cloud/accounts/${accountId}/templates`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createWhatsAppCloudTemplateBinding = async (
    organizationId: string,
    storeId: string,
    data: WhatsAppCreateCloudTemplateBindingJSON,
): Promise<WhatsAppCloudBindingResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/whatsapp/cloud/template-bindings`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppCloudTemplateBindings = async (
    organizationId: string,
    storeId: string,
    whatsappBusinessAccountId?: string,
): Promise<WhatsAppCloudBindingsResponse> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/whatsapp/cloud/template-bindings`, { params: whatsappBusinessAccountId ? { whatsappBusinessAccountId } : undefined });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppCloudSafety = async (organizationId: string): Promise<WhatsAppCloudSafetyResponse> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/whatsapp/cloud/safety`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const reconcileWhatsAppCloudOutbox = async (organizationId: string): Promise<ServiceResponse<{ reconciledCount: number } | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/cloud/safety/reconcile`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppCloudOutboxOperations = async (organizationId: string, limit = 50): Promise<ServiceResponse<WhatsAppCloudOutboxOperationsResponseDTO | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/whatsapp/cloud/outbox`, { params: { limit } });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const retryWhatsAppCloudOutbox = async (organizationId: string, outboxId: string): Promise<ServiceResponse<WhatsAppCloudOutboxActionResponseDTO | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/cloud/outbox/${outboxId}/retry`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const deadLetterWhatsAppCloudOutbox = async (organizationId: string, outboxId: string): Promise<ServiceResponse<WhatsAppCloudOutboxActionResponseDTO | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/cloud/outbox/${outboxId}/dead-letter`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const stopWhatsAppCloudCampaign = async (organizationId: string, campaignKey: string): Promise<ServiceResponse<{ cancelledCount: number } | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/cloud/campaigns/${encodeURIComponent(campaignKey)}/stop`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const recordWhatsAppCustomerConsent = async (
    organizationId: string,
    customerId: string,
    data: WhatsAppRecordCustomerConsentJSON,
): Promise<WhatsAppCustomerConsentResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/customers/${customerId}/whatsapp/consent`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const setWhatsAppCustomerSuppression = async (
    organizationId: string,
    customerId: string,
    data: WhatsAppSetCustomerSuppressionJSON,
): Promise<WhatsAppCustomerConsentResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/customers/${customerId}/whatsapp/suppression`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppCustomerConsentHistory = async (
    organizationId: string,
    customerId: string,
): Promise<WhatsAppCustomerConsentHistoryResponse> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/customers/${customerId}/whatsapp/consent`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createWhatsAppOrganizationAccount = async (
    organizationId: string,
    data: WhatsAppCreateAccountJSON,
): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/accounts`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppOrganizationAccount = async (organizationId: string, accountId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/whatsapp/accounts/${accountId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const connectWhatsAppOrganizationAccount = async (organizationId: string, accountId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/accounts/${accountId}/connect`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const disconnectWhatsAppOrganizationAccount = async (organizationId: string, accountId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/accounts/${accountId}/disconnect`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const changeWhatsAppOrganizationAccountNumber = async (
    organizationId: string,
    accountId: string,
    data: WhatsAppChangeAccountNumberJSON,
): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/whatsapp/accounts/${accountId}/change-number`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppAccount = async (organizationId: string, storeId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.get(accountPath(organizationId, storeId));
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createWhatsAppAccount = async (
    organizationId: string,
    storeId: string,
    data: WhatsAppCreateAccountJSON,
): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(accountPath(organizationId, storeId), data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const assignWhatsAppAccount = async (
    organizationId: string,
    storeId: string,
    data: WhatsAppAssignAccountJSON,
): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(accountPath(organizationId, storeId) + "/assign", data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const connectWhatsAppAccount = async (organizationId: string, storeId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(accountPath(organizationId, storeId) + "/connect");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const disconnectWhatsAppAccount = async (organizationId: string, storeId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(accountPath(organizationId, storeId) + "/disconnect");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const changeWhatsAppAccountNumber = async (
    organizationId: string,
    storeId: string,
    data: WhatsAppChangeAccountNumberJSON,
): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(accountPath(organizationId, storeId) + "/change-number", data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const removeWhatsAppAccount = async (organizationId: string, storeId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(accountPath(organizationId, storeId) + "/remove");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const syncWhatsAppAccount = async (organizationId: string, storeId: string): Promise<WhatsAppResponse> => {
    try {
        const response = await api.post(accountPath(organizationId, storeId) + "/sync");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

const invoicePath = (organizationId: string, storeId: string, saleId: string) =>
    "/organizations/" + organizationId + "/stores/" + storeId + "/whatsapp/invoice/" + saleId;
const invoiceQueuePath = (organizationId: string, storeId: string) =>
    "/organizations/" + organizationId + "/stores/" + storeId + "/whatsapp/invoice";

export const queueWhatsAppInvoice = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    customMessage?: string,
    templateId?: string,
): Promise<WhatsAppInvoiceResponse> => {
    try {
        const response = await api.post(invoiceQueuePath(organizationId, storeId), { saleId, customMessage, templateId });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

const templatesPath = (organizationId: string, storeId: string) =>
    `/organizations/${organizationId}/stores/${storeId}/whatsapp/templates`;

type WhatsAppTemplatesResponse = ServiceResponse<WhatsAppMessageTemplatesResponseDTO | null>;
type WhatsAppTemplateResponse = ServiceResponse<{ template: WhatsAppMessageTemplateDTO } | null>;

export const getWhatsAppMessageTemplates = async (
    organizationId: string,
    storeId: string,
    kind?: WhatsAppMessageTemplateKind,
): Promise<WhatsAppTemplatesResponse> => {
    try {
        const response = await api.get(templatesPath(organizationId, storeId), { params: kind ? { kind } : undefined });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createWhatsAppMessageTemplate = async (
    organizationId: string,
    storeId: string,
    data: WhatsAppCreateMessageTemplateJSON,
): Promise<WhatsAppTemplateResponse> => {
    try {
        const response = await api.post(templatesPath(organizationId, storeId), data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateWhatsAppMessageTemplate = async (
    organizationId: string,
    storeId: string,
    templateId: string,
    data: WhatsAppUpdateMessageTemplateJSON,
): Promise<WhatsAppTemplateResponse> => {
    try {
        const response = await api.patch(`${templatesPath(organizationId, storeId)}/${templateId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const deleteWhatsAppMessageTemplate = async (
    organizationId: string,
    storeId: string,
    templateId: string,
): Promise<ServiceResponse<null>> => {
    try {
        const response = await api.delete(`${templatesPath(organizationId, storeId)}/${templateId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppInvoiceStatus = async (
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<WhatsAppInvoiceResponse> => {
    try {
        const response = await api.get(invoicePath(organizationId, storeId, saleId));
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const retryWhatsAppInvoice = async (
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<WhatsAppInvoiceResponse> => {
    try {
        const response = await api.post(invoicePath(organizationId, storeId, saleId) + "/retry");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const queueWhatsAppDueReminder = async (
    organizationId: string,
    storeId: string,
    customerId: string,
    customMessage?: string,
    saleId?: string,
): Promise<WhatsAppReminderResponse> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/whatsapp/customers/${customerId}/due-reminder`, { customMessage, saleId });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppDueReminderStatus = async (
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<WhatsAppReminderResponse> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/whatsapp/due-reminder/${saleId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createWhatsAppPromotion = async (
    organizationId: string,
    storeId: string,
    data: WhatsAppCreatePromotionJSON,
) => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/whatsapp/promotions`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppPromotionDashboard = async (
    organizationId: string,
    storeId: string,
    days = 30,
    limit = 20,
    page = 1,
): Promise<WhatsAppPromotionDashboardResponse> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/whatsapp/promotions`, { params: { days, limit, page } });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

const conversationsPath = (organizationId: string, storeId: string) =>
    "/organizations/" + organizationId + "/stores/" + storeId + "/whatsapp/conversations";

export const getWhatsAppConversations = async (
    organizationId: string,
    storeId: string,
): Promise<WhatsAppConversationListResponseType> => {
    try {
        const response = await api.get(conversationsPath(organizationId, storeId));
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppConversation = async (
    organizationId: string,
    storeId: string,
    conversationId: string,
): Promise<WhatsAppConversationResponse> => {
    try {
        const response = await api.get(conversationsPath(organizationId, storeId) + "/" + conversationId);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const sendWhatsAppConversationText = async (
    organizationId: string,
    storeId: string,
    conversationId: string,
    data: WhatsAppSendConversationTextJSON,
): Promise<ServiceResponse<WhatsAppMessageDTO | null>> => {
    try {
        const response = await api.post(conversationsPath(organizationId, storeId) + "/" + conversationId + "/messages", data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const attachWhatsAppConversationCustomer = async (
    organizationId: string,
    storeId: string,
    conversationId: string,
    data: WhatsAppAttachConversationCustomerJSON,
): Promise<ServiceResponse<WhatsAppConversationDTO | null>> => {
    try {
        const response = await api.post(conversationsPath(organizationId, storeId) + "/" + conversationId + "/customer", data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getWhatsAppAttachment = async (
    organizationId: string,
    storeId: string,
    conversationId: string,
    messageId: string,
): Promise<ServiceResponse<WhatsAppAttachmentResponse | null>> => {
    try {
        const response = await api.get(
            conversationsPath(organizationId, storeId) + "/" + conversationId + "/messages/" + messageId + "/attachment",
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
