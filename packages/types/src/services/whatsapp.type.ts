import type z from "zod";
import {
    WhatsAppAccountDTOSchema,
    WhatsAppAccountStatusSchema,
    WhatsAppConversationDTOSchema,
    WhatsAppConversationMessageDirectionSchema,
    WhatsAppMessageDTOSchema,
    WhatsAppMessageStatusSchema,
    WhatsAppMessageTypeSchema,
    WhatsAppOutboxKindSchema,
    WhatsAppOutboxStatusSchema,
    WhatsAppProviderSchema,
    WhatsAppSendInvoiceSchema,
    WhatsAppSendTextSchema,
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
export type WhatsAppSendTextJSON = z.infer<typeof WhatsAppSendTextSchema>;
export type WhatsAppSendInvoiceJSON = z.infer<typeof WhatsAppSendInvoiceSchema>;
