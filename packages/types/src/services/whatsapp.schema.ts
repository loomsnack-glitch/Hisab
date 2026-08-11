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
