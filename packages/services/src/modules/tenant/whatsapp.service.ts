import type {
    WhatsAppAssignAccountJSON,
    WhatsAppAccountsResponseDTO,
    ServiceResponse,
    WhatsAppAccountStatusResponseDTO,
    WhatsAppChangeAccountNumberJSON,
    WhatsAppCreateAccountJSON,
    WhatsAppInvoiceQueueResponseDTO,
    WhatsAppReminderQueueResponseDTO,
    WhatsAppConversationListResponse,
    WhatsAppConversationMessagesResponse,
    WhatsAppConversationDTO,
    WhatsAppAttachmentResponse,
    WhatsAppMessageDTO,
    WhatsAppSendConversationTextJSON,
    WhatsAppAttachConversationCustomerJSON,
    WhatsAppCreatePromotionJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

type WhatsAppResponse = ServiceResponse<WhatsAppAccountStatusResponseDTO | null>;
type WhatsAppAccountsResponse = ServiceResponse<WhatsAppAccountsResponseDTO | null>;
type WhatsAppInvoiceResponse = ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>;
type WhatsAppReminderResponse = ServiceResponse<WhatsAppReminderQueueResponseDTO | null>;
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

export const queueWhatsAppInvoice = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    customMessage?: string,
): Promise<WhatsAppInvoiceResponse> => {
    try {
        const response = await api.post(invoicePath(organizationId, storeId, saleId), { saleId, customMessage });
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
