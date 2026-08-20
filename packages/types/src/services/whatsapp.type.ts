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
    WhatsAppMessageTemplateKindSchema,
    WhatsAppProviderSchema,
    WhatsAppCreateAccountSchema,
    WhatsAppAssignAccountSchema,
    WhatsAppChangeAccountNumberSchema,
    WhatsAppAccountsResponseSchema,
    WhatsAppSendInvoiceSchema,
    WhatsAppMessageTemplateDTOSchema,
    WhatsAppCreateMessageTemplateSchema,
    WhatsAppUpdateMessageTemplateSchema,
    WhatsAppMessageTemplatesResponseSchema,
    WhatsAppDueReminderRequestSchema,
    WhatsAppInvoiceQueueResponseSchema,
    WhatsAppReminderQueueResponseSchema,
    WhatsAppCreatePromotionSchema,
    WhatsAppPromotionResponseSchema,
    WhatsAppPromotionCampaignStatusSchema,
    WhatsAppPromotionCooldownSchema,
    WhatsAppPromotionStatsSchema,
    WhatsAppPromotionCampaignDTOSchema,
    WhatsAppPromotionDashboardResponseSchema,
    WhatsAppSendTextSchema,
    WhatsAppSendConversationTextSchema,
    WhatsAppAttachConversationCustomerSchema,
    WhatsAppWorkerAccountSchema,
    WhatsAppWorkerInvoiceJobSchema,
    WhatsAppWorkerInvoiceResultSchema,
    WhatsAppWorkerMessageStatusSchema,
    WhatsAppWorkerOutboundJobSchema,
    WhatsAppWorkerInboundMessageSchema,
    WhatsAppWorkerMessageEventSchema,
    WhatsAppConversationListResponseSchema,
    WhatsAppConversationMessagesResponseSchema,
    WhatsAppAttachmentResponseSchema,
    WhatsAppWorkerStatusResponseSchema,
    WhatsAppWorkerStatusUpdateSchema,
    WhatsAppCloudAccountStatusSchema,
    WhatsAppCloudProvisioningStatusSchema,
    WhatsAppCloudProvisioningStepSchema,
    WhatsAppCloudAccountSnapshotSchema,
    WhatsAppCloudProvisioningAttemptSchema,
    WhatsAppCloudOnboardingStateResponseSchema,
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
export type WhatsAppCloudAccountStatus = z.infer<typeof WhatsAppCloudAccountStatusSchema>;
export type WhatsAppCloudProvisioningStatus = z.infer<typeof WhatsAppCloudProvisioningStatusSchema>;
export type WhatsAppCloudProvisioningStep = z.infer<typeof WhatsAppCloudProvisioningStepSchema>;
export type WhatsAppCloudAccountSnapshot = z.infer<typeof WhatsAppCloudAccountSnapshotSchema>;
export type WhatsAppCloudProvisioningAttempt = z.infer<typeof WhatsAppCloudProvisioningAttemptSchema>;
export type WhatsAppCloudOnboardingStateResponseDTO = z.infer<typeof WhatsAppCloudOnboardingStateResponseSchema>;
export type WhatsAppMessageTemplateKind = z.infer<typeof WhatsAppMessageTemplateKindSchema>;
export type WhatsAppMessageTemplateDTO = z.infer<typeof WhatsAppMessageTemplateDTOSchema>;
export type WhatsAppCreateMessageTemplateJSON = z.infer<typeof WhatsAppCreateMessageTemplateSchema>;
export type WhatsAppUpdateMessageTemplateJSON = z.infer<typeof WhatsAppUpdateMessageTemplateSchema>;
export type WhatsAppMessageTemplatesResponseDTO = z.infer<typeof WhatsAppMessageTemplatesResponseSchema>;
export type WhatsAppAccountDTO = z.infer<typeof WhatsAppAccountDTOSchema>;
export type WhatsAppConversationDTO = z.infer<typeof WhatsAppConversationDTOSchema>;
export type WhatsAppMessageDTO = z.infer<typeof WhatsAppMessageDTOSchema>;
export type WhatsAppCreateAccountJSON = z.infer<typeof WhatsAppCreateAccountSchema>;
export type WhatsAppAssignAccountJSON = z.infer<typeof WhatsAppAssignAccountSchema>;
export type WhatsAppChangeAccountNumberJSON = z.infer<typeof WhatsAppChangeAccountNumberSchema>;
export type WhatsAppAccountStatusResponseDTO = z.infer<typeof WhatsAppAccountStatusResponseSchema>;
export type WhatsAppAccountsResponseDTO = z.infer<typeof WhatsAppAccountsResponseSchema>;
export type WhatsAppWorkerAccountDTO = z.infer<typeof WhatsAppWorkerAccountSchema>;
export type WhatsAppWorkerStatusUpdateJSON = z.infer<typeof WhatsAppWorkerStatusUpdateSchema>;
export type WhatsAppWorkerStatusResponseDTO = z.infer<typeof WhatsAppWorkerStatusResponseSchema>;
export type WhatsAppSendTextJSON = z.infer<typeof WhatsAppSendTextSchema>;
export type WhatsAppSendConversationTextJSON = z.infer<typeof WhatsAppSendConversationTextSchema>;
export type WhatsAppAttachConversationCustomerJSON = z.infer<typeof WhatsAppAttachConversationCustomerSchema>;
export type WhatsAppSendInvoiceJSON = z.infer<typeof WhatsAppSendInvoiceSchema>;
export type WhatsAppDueReminderRequestJSON = z.infer<typeof WhatsAppDueReminderRequestSchema>;
export type WhatsAppInvoiceQueueResponseDTO = z.infer<typeof WhatsAppInvoiceQueueResponseSchema>;
export type WhatsAppReminderQueueResponseDTO = z.infer<typeof WhatsAppReminderQueueResponseSchema>;
export type WhatsAppCreatePromotionJSON = z.infer<typeof WhatsAppCreatePromotionSchema>;
export type WhatsAppPromotionResponseDTO = z.infer<typeof WhatsAppPromotionResponseSchema>;
export type WhatsAppPromotionCampaignStatus = z.infer<typeof WhatsAppPromotionCampaignStatusSchema>;
export type WhatsAppPromotionCooldownDTO = z.infer<typeof WhatsAppPromotionCooldownSchema>;
export type WhatsAppPromotionStatsDTO = z.infer<typeof WhatsAppPromotionStatsSchema>;
export type WhatsAppPromotionCampaignDTO = z.infer<typeof WhatsAppPromotionCampaignDTOSchema>;
export type WhatsAppPromotionDashboardResponseDTO = z.infer<typeof WhatsAppPromotionDashboardResponseSchema>;
export type WhatsAppWorkerInvoiceJobDTO = z.infer<typeof WhatsAppWorkerInvoiceJobSchema>;
export type WhatsAppWorkerInvoiceResultJSON = z.infer<typeof WhatsAppWorkerInvoiceResultSchema>;
export type WhatsAppWorkerMessageStatusJSON = z.infer<typeof WhatsAppWorkerMessageStatusSchema>;
export type WhatsAppWorkerOutboundJobDTO = z.infer<typeof WhatsAppWorkerOutboundJobSchema>;
export type WhatsAppWorkerInboundMessageJSON = z.infer<typeof WhatsAppWorkerInboundMessageSchema>;
export type WhatsAppWorkerMessageEventJSON = z.infer<typeof WhatsAppWorkerMessageEventSchema>;
export type WhatsAppConversationListResponse = z.infer<typeof WhatsAppConversationListResponseSchema>;
export type WhatsAppConversationMessagesResponse = z.infer<typeof WhatsAppConversationMessagesResponseSchema>;
export type WhatsAppAttachmentResponse = z.infer<typeof WhatsAppAttachmentResponseSchema>;
