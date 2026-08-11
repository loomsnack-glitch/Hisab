import { z } from "zod";
import { dtoDateSchema, phoneSchema } from "../common";

export const WhatsAppProviderSchema = z.enum(["baileys", "cloud_api"]);
export const WhatsAppAccountStatusSchema = z.enum([
    "pending_qr",
    "connecting",
    "connected",
    "disconnected",
    "failed",
    "revoked",
]);
export const WhatsAppConversationMessageDirectionSchema = z.enum(["inbound", "outbound"]);
export const WhatsAppMessageTypeSchema = z.enum(["text", "document"]);
export const WhatsAppMessageStatusSchema = z.enum(["queued", "sending", "sent", "delivered", "read", "failed"]);
export const WhatsAppOutboxKindSchema = z.enum(["invoice", "text", "document"]);
export const WhatsAppOutboxStatusSchema = z.enum([
    "pending",
    "processing",
    "sent",
    "retryable",
    "dead_letter",
    "cancelled",
]);

export const WhatsAppAccountDTOSchema = z.object({
    id: z.uuid("Invalid WhatsApp account id"),
    organizationId: z.uuid("Invalid organization id"),
    storeId: z.uuid("Invalid store id"),
    provider: WhatsAppProviderSchema,
    phoneNumber: phoneSchema,
    status: WhatsAppAccountStatusSchema,
    lastConnectedAt: dtoDateSchema.nullable().optional(),
    lastSeenAt: dtoDateSchema.nullable().optional(),
    lastErrorCode: z.string().nullable().optional(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const WhatsAppConversationDTOSchema = z.object({
    id: z.uuid("Invalid WhatsApp conversation id"),
    organizationId: z.uuid("Invalid organization id"),
    storeId: z.uuid("Invalid store id"),
    whatsappAccountId: z.uuid("Invalid WhatsApp account id"),
    customerId: z.uuid("Invalid customer id").nullable().optional(),
    contactPhoneNumber: phoneSchema,
    displayName: z.string().trim().min(1).max(255),
    lastMessageAt: dtoDateSchema.nullable().optional(),
    unreadCount: z.number().int().min(0),
    isArchived: z.boolean(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const WhatsAppMessageDTOSchema = z.object({
    id: z.uuid("Invalid WhatsApp message id"),
    organizationId: z.uuid("Invalid organization id"),
    storeId: z.uuid("Invalid store id"),
    whatsappAccountId: z.uuid("Invalid WhatsApp account id"),
    conversationId: z.uuid("Invalid conversation id"),
    direction: WhatsAppConversationMessageDirectionSchema,
    messageType: WhatsAppMessageTypeSchema,
    body: z.string().nullable().optional(),
    caption: z.string().nullable().optional(),
    attachmentFileName: z.string().nullable().optional(),
    attachmentMimeType: z.string().nullable().optional(),
    status: WhatsAppMessageStatusSchema,
    providerMessageId: z.string().nullable().optional(),
    failureCode: z.string().nullable().optional(),
    createdAt: dtoDateSchema,
    sentAt: dtoDateSchema.nullable().optional(),
    deliveredAt: dtoDateSchema.nullable().optional(),
    readAt: dtoDateSchema.nullable().optional(),
});

export const WhatsAppCreateAccountSchema = z.object({
    phoneNumber: phoneSchema,
});

export const WhatsAppAccountStatusResponseSchema = z.object({
    account: WhatsAppAccountDTOSchema,
    qrImageDataUrl: z.string().startsWith("data:image/png;base64,").max(200_000).nullable(),
});

export const WhatsAppWorkerAccountSchema = z.object({
    id: z.uuid("Invalid WhatsApp account id"),
    phoneNumber: phoneSchema,
    status: WhatsAppAccountStatusSchema,
});

export const WhatsAppWorkerStatusUpdateSchema = z.object({
    status: WhatsAppAccountStatusSchema,
    qrImageDataUrl: z.string().startsWith("data:image/png;base64,").max(200_000).nullable(),
    lastErrorCode: z.string().regex(/^[a-z0-9_]+$/).max(100).nullable(),
});

export const WhatsAppWorkerStatusResponseSchema = WhatsAppWorkerStatusUpdateSchema.extend({
    accountId: z.uuid("Invalid WhatsApp account id"),
});

export const WhatsAppSendTextSchema = z.object({
    customerId: z.uuid("Invalid customer id"),
    body: z.string().trim().min(1, "Message cannot be empty").max(4096, "Message is too long"),
});

export const WhatsAppSendConversationTextSchema = z.object({
    body: z.string().trim().min(1, "Message cannot be empty").max(4096, "Message is too long"),
});

export const WhatsAppAttachConversationCustomerSchema = z.object({
    customerId: z.uuid("Invalid customer id"),
});

export const WhatsAppSendInvoiceSchema = z.object({
    saleId: z.uuid("Invalid sale id"),
});

export const WhatsAppInvoiceQueueResponseSchema = z.object({
    saleId: z.uuid("Invalid sale id"),
    messageId: z.uuid("Invalid message id"),
    outboxId: z.uuid("Invalid outbox id"),
    messageStatus: WhatsAppMessageStatusSchema,
    outboxStatus: WhatsAppOutboxStatusSchema,
    alreadyQueued: z.boolean(),
});

export const WhatsAppWorkerInvoiceJobSchema = z.object({
    accountId: z.uuid("Invalid WhatsApp account id"),
    outboxId: z.uuid("Invalid outbox id"),
    messageId: z.uuid("Invalid message id"),
    phoneNumber: phoneSchema,
    attachmentFileName: z.string().trim().min(1).max(255),
    attachmentMimeType: z.string().trim().min(1).max(255),
    caption: z.string().max(4096).nullable(),
    documentBase64: z.string().min(1).max(14_000_000),
    attemptCount: z.number().int().positive(),
    leaseOwner: z.string().trim().min(1).max(255),
});

export const WhatsAppWorkerInvoiceResultSchema = z.object({
    leaseOwner: z.string().trim().min(1).max(255),
    providerMessageId: z.string().trim().min(1).max(255).nullable(),
    failureCode: z.string().regex(/^[a-z0-9_]+$/).max(100).nullable(),
    failureMessage: z.string().trim().max(1000).nullable(),
    retryable: z.boolean(),
});

export const WhatsAppWorkerMessageStatusSchema = z.object({
    providerMessageId: z.string().trim().min(1).max(255),
    status: z.enum(["delivered", "read"]),
});

export const WhatsAppWorkerOutboundJobSchema = z.object({
    accountId: z.uuid("Invalid WhatsApp account id"),
    outboxId: z.uuid("Invalid outbox id"),
    messageId: z.uuid("Invalid message id"),
    phoneNumber: phoneSchema,
    messageType: WhatsAppMessageTypeSchema,
    body: z.string().nullable(),
    caption: z.string().max(4096).nullable(),
    attachmentFileName: z.string().trim().min(1).max(255).nullable(),
    attachmentMimeType: z.string().trim().min(1).max(255).nullable(),
    documentBase64: z.string().max(14_000_000).nullable(),
    attemptCount: z.number().int().positive(),
    leaseOwner: z.string().trim().min(1).max(255),
});

export const WhatsAppWorkerInboundMessageSchema = z.object({
    providerMessageId: z.string().trim().min(1).max(255),
    externalChatId: z.string().trim().min(1).max(255),
    contactPhoneNumber: phoneSchema,
    displayName: z.string().trim().min(1).max(255),
    messageType: WhatsAppMessageTypeSchema,
    body: z.string().max(4096).nullable(),
    caption: z.string().max(4096).nullable(),
    attachmentFileName: z.string().trim().min(1).max(255).nullable(),
    attachmentMimeType: z.string().trim().min(1).max(255).nullable(),
    documentBase64: z.string().max(14_000_000).nullable(),
    occurredAt: dtoDateSchema,
}).superRefine((value, context) => {
    if (value.messageType === "text" && !value.body?.trim()) {
        context.addIssue({ code: "custom", path: ["body"], message: "Text message body is required" });
    }
    if (value.messageType === "document" && !value.documentBase64) {
        context.addIssue({ code: "custom", path: ["documentBase64"], message: "Document content is required" });
    }
});

export const WhatsAppConversationListResponseSchema = z.object({
    accountStatus: WhatsAppAccountStatusSchema,
    conversations: z.array(WhatsAppConversationDTOSchema),
});

export const WhatsAppConversationMessagesResponseSchema = z.object({
    conversation: WhatsAppConversationDTOSchema,
    messages: z.array(WhatsAppMessageDTOSchema),
});

export const WhatsAppAttachmentResponseSchema = z.object({
    url: z.string().url(),
});
