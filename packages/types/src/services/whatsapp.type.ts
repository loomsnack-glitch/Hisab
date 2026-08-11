import type z from "zod";
import {
    WhatsAppAccountDTOSchema,
    WhatsAppAccountStatusResponseSchema,
    WhatsAppAccountStatusSchema,
    WhatsAppConversationDTOSchema,
    WhatsAppConversationMessageDirectionSchema,
    WhatsAppMessageDTOSchema,
    WhatsAppMessageStatusSchema,
    WhatsAppMessageTypeSchema,
    WhatsAppOutboxKindSchema,
    WhatsAppOutboxStatusSchema,
    WhatsAppProviderSchema,
    WhatsAppCreateAccountSchema,
    WhatsAppSendInvoiceSchema,
    WhatsAppInvoiceQueueResponseSchema,
    WhatsAppSendTextSchema,
    WhatsAppSendConversationTextSchema,
    WhatsAppAttachConversationCustomerSchema,
    WhatsAppWorkerAccountSchema,
    WhatsAppWorkerInvoiceJobSchema,
    WhatsAppWorkerInvoiceResultSchema,
    WhatsAppWorkerMessageStatusSchema,
    WhatsAppWorkerOutboundJobSchema,
    WhatsAppWorkerInboundMessageSchema,
    WhatsAppConversationListResponseSchema,
    WhatsAppConversationMessagesResponseSchema,
    WhatsAppAttachmentResponseSchema,
    WhatsAppWorkerStatusResponseSchema,
    WhatsAppWorkerStatusUpdateSchema,
} from "./whatsapp.schema";

export type OTPRequestData = {
    loginId: string;
    otp: string;
};

export type WhatsAppOTPResponseData = {
    messaging_product: string;
    contacts: Array<{
        input: string;
        wa_id: string;
    }>;
    messages: Array<{
        id: string;
    }>;
};

export type WhatsAppProvider = z.infer<typeof WhatsAppProviderSchema>;
export type WhatsAppAccountStatus = z.infer<typeof WhatsAppAccountStatusSchema>;
export type WhatsAppConversationMessageDirection = z.infer<typeof WhatsAppConversationMessageDirectionSchema>;
export type WhatsAppMessageType = z.infer<typeof WhatsAppMessageTypeSchema>;
export type WhatsAppMessageStatus = z.infer<typeof WhatsAppMessageStatusSchema>;
export type WhatsAppOutboxKind = z.infer<typeof WhatsAppOutboxKindSchema>;
export type WhatsAppOutboxStatus = z.infer<typeof WhatsAppOutboxStatusSchema>;
export type WhatsAppAccountDTO = z.infer<typeof WhatsAppAccountDTOSchema>;
export type WhatsAppConversationDTO = z.infer<typeof WhatsAppConversationDTOSchema>;
export type WhatsAppMessageDTO = z.infer<typeof WhatsAppMessageDTOSchema>;
export type WhatsAppCreateAccountJSON = z.infer<typeof WhatsAppCreateAccountSchema>;
export type WhatsAppAccountStatusResponseDTO = z.infer<typeof WhatsAppAccountStatusResponseSchema>;
export type WhatsAppWorkerAccountDTO = z.infer<typeof WhatsAppWorkerAccountSchema>;
export type WhatsAppWorkerStatusUpdateJSON = z.infer<typeof WhatsAppWorkerStatusUpdateSchema>;
export type WhatsAppWorkerStatusResponseDTO = z.infer<typeof WhatsAppWorkerStatusResponseSchema>;
export type WhatsAppSendTextJSON = z.infer<typeof WhatsAppSendTextSchema>;
export type WhatsAppSendConversationTextJSON = z.infer<typeof WhatsAppSendConversationTextSchema>;
export type WhatsAppAttachConversationCustomerJSON = z.infer<typeof WhatsAppAttachConversationCustomerSchema>;
export type WhatsAppSendInvoiceJSON = z.infer<typeof WhatsAppSendInvoiceSchema>;
export type WhatsAppInvoiceQueueResponseDTO = z.infer<typeof WhatsAppInvoiceQueueResponseSchema>;
export type WhatsAppWorkerInvoiceJobDTO = z.infer<typeof WhatsAppWorkerInvoiceJobSchema>;
export type WhatsAppWorkerInvoiceResultJSON = z.infer<typeof WhatsAppWorkerInvoiceResultSchema>;
export type WhatsAppWorkerMessageStatusJSON = z.infer<typeof WhatsAppWorkerMessageStatusSchema>;
export type WhatsAppWorkerOutboundJobDTO = z.infer<typeof WhatsAppWorkerOutboundJobSchema>;
export type WhatsAppWorkerInboundMessageJSON = z.infer<typeof WhatsAppWorkerInboundMessageSchema>;
export type WhatsAppConversationListResponse = z.infer<typeof WhatsAppConversationListResponseSchema>;
export type WhatsAppConversationMessagesResponse = z.infer<typeof WhatsAppConversationMessagesResponseSchema>;
export type WhatsAppAttachmentResponse = z.infer<typeof WhatsAppAttachmentResponseSchema>;
