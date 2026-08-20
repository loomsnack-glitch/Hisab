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
export const WhatsAppMessageTypeSchema = z.enum(["text", "document", "image"]);
export const WhatsAppMessageStatusSchema = z.enum(["queued", "sending", "sent", "delivered", "read", "failed"]);
export const WhatsAppOutboxKindSchema = z.enum(["invoice", "text", "document", "promotion"]);
export const WhatsAppOutboxStatusSchema = z.enum([
    "pending",
    "processing",
    "reconciling",
    "sent",
    "retryable",
    "dead_letter",
    "cancelled",
]);
export const WhatsAppMessageTemplateKindSchema = z.enum(["bill", "due_reminder", "promotion"]);

export const WhatsAppCloudAccountStatusSchema = z.enum([
    "pending_authorization",
    "provisioning",
    "connected",
    "needs_action",
    "disconnected",
    "revoked",
    "suspended",
    "failed",
]);

export const WhatsAppCloudProvisioningStatusSchema = z.enum([
    "running",
    "completed",
    "failed",
    "cancelled",
]);

export const WhatsAppCloudProvisioningStepSchema = z.enum([
    "authorization_received",
    "waba_resolved",
    "system_user_assigned",
    "phone_registered",
    "webhook_subscribed",
    "templates_synced",
    "completed",
]);

export const WhatsAppCloudAccountSnapshotSchema = z.object({
    id: z.uuid("Invalid WhatsApp account id"),
    organizationId: z.uuid("Invalid organization id"),
    wabaId: z.string().trim().min(1).max(64).nullable(),
    phoneNumberId: z.string().trim().min(1).max(64).nullable(),
    verifiedName: z.string().trim().min(1).max(255).nullable(),
    status: WhatsAppCloudAccountStatusSchema.nullable(),
    qualityRating: z.string().trim().min(1).max(32).nullable(),
    messagingLimit: z.number().int().min(0).nullable(),
    lastLimitSyncedAt: dtoDateSchema.nullable(),
    lastWebhookAt: dtoDateSchema.nullable(),
    lastGraphApiAt: dtoDateSchema.nullable(),
    lastErrorCode: z.string().trim().min(1).max(100).nullable(),
});

export const WhatsAppCloudProvisioningAttemptSchema = z.object({
    id: z.uuid("Invalid provisioning attempt id"),
    organizationId: z.uuid("Invalid organization id"),
    whatsappAccountId: z.uuid("Invalid WhatsApp account id"),
    whatsappBusinessAccountId: z.uuid("Invalid WABA id").nullable(),
    idempotencyKey: z.string().trim().min(1).max(255),
    status: WhatsAppCloudProvisioningStatusSchema,
    currentStep: WhatsAppCloudProvisioningStepSchema,
    completedSteps: z.array(WhatsAppCloudProvisioningStepSchema),
    safeErrorCode: z.string().trim().min(1).max(100).nullable(),
    safeErrorMessage: z.string().trim().min(1).max(1000).nullable(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const WhatsAppCloudOnboardingStateResponseSchema = z.object({
    state: z.string().trim().min(1).max(4_096),
    expiresAt: dtoDateSchema,
});

export const WhatsAppAccountDTOSchema = z.object({
    id: z.uuid("Invalid WhatsApp account id"),
    organizationId: z.uuid("Invalid organization id"),
    defaultStoreId: z.uuid("Invalid store id").nullable(),
    assignedStoreIds: z.array(z.uuid("Invalid store id")),
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

export const WhatsAppAssignAccountSchema = z.object({
    whatsappAccountId: z.uuid("Invalid WhatsApp account id"),
});

export const WhatsAppChangeAccountNumberSchema = WhatsAppCreateAccountSchema;

export const WhatsAppAccountStatusResponseSchema = z.object({
    account: WhatsAppAccountDTOSchema,
    qrImageDataUrl: z.string().startsWith("data:image/png;base64,").max(200_000).nullable(),
});

export const WhatsAppAccountsResponseSchema = z.object({
    accounts: z.array(WhatsAppAccountDTOSchema),
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
  customMessage: z.string().trim().min(1).max(4096).optional(),
  templateId: z.uuid("Invalid template id").optional(),
});

export const WhatsAppMessageTemplateDTOSchema = z.object({
    id: z.uuid("Invalid template id"),
    organizationId: z.uuid("Invalid organization id"),
    storeId: z.uuid("Invalid store id"),
    kind: WhatsAppMessageTemplateKindSchema,
    name: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(4096),
    isDefault: z.boolean(),
    isActive: z.boolean(),
    createdBy: z.uuid("Invalid creator id"),
    updatedBy: z.uuid("Invalid updater id").nullable().optional(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const WhatsAppCreateMessageTemplateSchema = z.object({
    kind: WhatsAppMessageTemplateKindSchema,
    name: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(4096),
    isDefault: z.boolean().optional(),
});

export const WhatsAppUpdateMessageTemplateSchema = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    body: z.string().trim().min(1).max(4096).optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
}).refine(value => Object.keys(value).length > 0, "At least one template field is required");

export const WhatsAppMessageTemplatesResponseSchema = z.object({
    templates: z.array(WhatsAppMessageTemplateDTOSchema),
});

export const WhatsAppDueReminderRequestSchema = z.object({
    saleId: z.uuid("Invalid sale id").optional(),
    customMessage: z.string().trim().min(1).max(4096).optional(),
});

export const WhatsAppCreatePromotionSchema = z.object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(4096),
    imageBase64: z.string().min(1).max(14_000_000).optional(),
    imageFileName: z.string().trim().min(1).max(255).optional(),
    imageMimeType: z.string().regex(/^image\/[a-z0-9.+-]+$/i).max(255).optional(),
}).superRefine((data, context) => {
    const imageFields = [data.imageBase64, data.imageFileName, data.imageMimeType];
    const hasAnyImageField = imageFields.some(Boolean);
    if (hasAnyImageField && imageFields.some(value => !value)) {
        context.addIssue({ code: "custom", path: ["imageBase64"], message: "Provide all image fields or omit the image" });
    }
});

export const WhatsAppPromotionResponseSchema = z.object({
    campaignId: z.uuid("Invalid campaign id"),
    recipientCount: z.number().int().min(0),
    queuedCount: z.number().int().min(0),
});

export const WhatsAppPromotionCampaignStatusSchema = z.enum(["draft", "queued", "sending", "completed", "failed", "cancelled"]);

export const WhatsAppPromotionCooldownSchema = z.object({
    active: z.boolean(),
    remainingSeconds: z.number().int().min(0),
    nextAvailableAt: dtoDateSchema.nullable(),
});

export const WhatsAppPromotionStatsSchema = z.object({
    totalCampaigns: z.number().int().min(0),
    totalRecipients: z.number().int().min(0),
    queuedRecipients: z.number().int().min(0),
    sendingRecipients: z.number().int().min(0),
    sentRecipients: z.number().int().min(0),
    deliveredRecipients: z.number().int().min(0),
    readRecipients: z.number().int().min(0),
    retryingRecipients: z.number().int().min(0),
    failedRecipients: z.number().int().min(0),
});

export const WhatsAppPromotionCampaignDTOSchema = z.object({
    id: z.uuid("Invalid campaign id"),
    title: z.string().trim().min(1).max(255),
    body: z.string().trim().min(1).max(4096),
    imageFileName: z.string().trim().min(1).max(255).nullable(),
    imageMimeType: z.string().trim().min(1).max(255).nullable(),
    status: WhatsAppPromotionCampaignStatusSchema,
    totalRecipients: z.number().int().min(0),
    queuedRecipients: z.number().int().min(0),
    sendingRecipients: z.number().int().min(0),
    sentRecipients: z.number().int().min(0),
    deliveredRecipients: z.number().int().min(0),
    readRecipients: z.number().int().min(0),
    retryingRecipients: z.number().int().min(0),
    failedRecipients: z.number().int().min(0),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const WhatsAppPromotionDashboardResponseSchema = z.object({
    campaigns: z.array(WhatsAppPromotionCampaignDTOSchema),
    stats: WhatsAppPromotionStatsSchema,
    cooldown: WhatsAppPromotionCooldownSchema,
    pagination: z.object({
        page: z.number().int().min(1),
        limit: z.number().int().min(1),
        totalItems: z.number().int().min(0),
        totalPages: z.number().int().min(0),
    }),
});

export const WhatsAppInvoiceQueueResponseSchema = z.object({
    saleId: z.uuid("Invalid sale id"),
    messageId: z.uuid("Invalid message id"),
    outboxId: z.uuid("Invalid outbox id"),
    messageStatus: WhatsAppMessageStatusSchema,
    outboxStatus: WhatsAppOutboxStatusSchema,
    alreadyQueued: z.boolean(),
});

export const WhatsAppReminderQueueResponseSchema = z.object({
    customerId: z.uuid("Invalid customer id"),
    saleId: z.uuid("Invalid sale id").nullable(),
    messageId: z.uuid("Invalid message id"),
    outboxId: z.uuid("Invalid outbox id"),
    messageStatus: WhatsAppMessageStatusSchema,
    outboxStatus: WhatsAppOutboxStatusSchema,
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

const WhatsAppWorkerMessageFields = {
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
};

const validateWorkerMessageContent = (value: {
    messageType: "text" | "document" | "image";
    body: string | null;
    documentBase64: string | null;
}, context: z.RefinementCtx): void => {
    if (value.messageType === "text" && !value.body?.trim()) {
        context.addIssue({ code: "custom", path: ["body"], message: "Text message body is required" });
    }
    if ((value.messageType === "document" || value.messageType === "image") && !value.documentBase64) {
        context.addIssue({ code: "custom", path: ["documentBase64"], message: "Media content is required" });
    }
};

export const WhatsAppWorkerInboundMessageSchema = z.object(WhatsAppWorkerMessageFields).superRefine(validateWorkerMessageContent);

export const WhatsAppWorkerMessageEventSchema = z.object({
    ...WhatsAppWorkerMessageFields,
    direction: WhatsAppConversationMessageDirectionSchema,
    source: z.enum(["realtime", "history"]),
}).superRefine(validateWorkerMessageContent);

export const WhatsAppConversationListResponseSchema = z.object({
    accountId: z.uuid("Invalid WhatsApp account id"),
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
