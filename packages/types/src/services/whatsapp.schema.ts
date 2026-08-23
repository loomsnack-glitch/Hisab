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
export const WhatsAppLegacyMessageTypeSchema = z.enum(["text", "document", "image"]);
export const WhatsAppMessageTypeSchema = z.enum(["text", "document", "image", "template"]);
export const WhatsAppMessageStatusSchema = z.enum(["queued", "sending", "sent", "delivered", "read", "failed"]);
export const WhatsAppOutboxKindSchema = z.enum(["invoice", "text", "document", "promotion", "template"]);
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

export const WhatsAppCloudTemplateStatusSchema = z.enum([
    "approved",
    "rejected",
    "paused",
    "disabled",
    "pending",
    "unknown",
]);

export const WhatsAppCloudTemplateCategorySchema = z.enum([
    "marketing",
    "utility",
    "authentication",
    "unknown",
]);

export const WhatsAppCloudTemplateSubmissionStatusSchema = z.enum([
    "draft",
    "submitting",
    "pending",
    "approved",
    "rejected",
    "paused",
    "disabled",
    "failed",
]);

export const WhatsAppCloudTemplateAssetSchema = z.object({
    id: z.uuid("Invalid Cloud template id"),
    organizationId: z.uuid("Invalid organization id"),
    whatsappBusinessAccountId: z.uuid("Invalid WABA id"),
    metaTemplateId: z.string().trim().min(1).max(255),
    name: z.string().trim().min(1).max(512),
    languageCode: z.string().trim().min(1).max(64),
    category: WhatsAppCloudTemplateCategorySchema,
    status: WhatsAppCloudTemplateStatusSchema,
    components: z.array(z.unknown()),
    rejectionReason: z.string().trim().min(1).max(1000).nullable(),
    providerUpdatedAt: dtoDateSchema.nullable(),
    lastSyncedAt: dtoDateSchema,
    version: z.number().int().min(1),
});

export const WhatsAppCloudTemplateBindingSchema = z.object({
    id: z.uuid("Invalid template binding id"),
    organizationId: z.uuid("Invalid organization id"),
    storeId: z.uuid("Invalid store id"),
    localTemplateId: z.uuid("Invalid local template id"),
    cloudTemplateId: z.uuid("Invalid Cloud template id"),
    whatsappBusinessAccountId: z.uuid("Invalid WABA id"),
    localTemplateBody: z.string().trim().min(1).max(4096).nullable(),
    variableMapping: z.record(z.string(), z.string()).default({}),
    kind: WhatsAppMessageTemplateKindSchema,
    isDefault: z.boolean(),
    isActive: z.boolean(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const WhatsAppCreateCloudTemplateBindingSchema = z.object({
    localTemplateId: z.uuid("Invalid local template id"),
    cloudTemplateId: z.uuid("Invalid Cloud template id"),
    whatsappBusinessAccountId: z.uuid("Invalid WABA id"),
    variableMapping: z.record(z.string(), z.string()).optional(),
    kind: WhatsAppMessageTemplateKindSchema,
    isDefault: z.boolean().optional(),
});

export const WhatsAppCloudTemplateSubmissionSchema = z.object({
    id: z.uuid("Invalid template submission id"),
    organizationId: z.uuid("Invalid organization id"),
    whatsappBusinessAccountId: z.uuid("Invalid internal Cloud business account id"),
    originatingStoreId: z.uuid("Invalid originating store id").nullable(),
    localTemplateId: z.uuid("Invalid local template id").nullable(),
    kind: WhatsAppMessageTemplateKindSchema,
    friendlyName: z.string().trim().min(1).max(120),
    metaTemplateName: z.string().regex(/^[a-z0-9_]{1,512}$/),
    languageCode: z.string().regex(/^[A-Za-z]{2,10}(?:[_-][A-Za-z0-9]{2,10})*$/),
    category: WhatsAppCloudTemplateCategorySchema,
    requestedComponents: z.array(z.unknown()),
    sampleValues: z.record(z.string(), z.unknown()),
    idempotencyKey: z.string().trim().min(1).max(255),
    metaTemplateId: z.string().trim().min(1).max(255).nullable(),
    status: WhatsAppCloudTemplateSubmissionStatusSchema,
    rejectionReason: z.string().trim().min(1).max(1000).nullable(),
    lastErrorCode: z.string().trim().min(1).max(100).nullable(),
    lastErrorMessage: z.string().trim().min(1).max(1000).nullable(),
    submittedAt: dtoDateSchema.nullable(),
    providerUpdatedAt: dtoDateSchema.nullable(),
    createdBy: z.uuid("Invalid creator id"),
    updatedBy: z.uuid("Invalid updater id").nullable(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const WhatsAppCreateCloudTemplateSubmissionSchema = z.object({
    storeId: z.uuid("Invalid store id").nullable().optional(),
    whatsappBusinessAccountId: z.uuid("Invalid internal Cloud business account id"),
    localTemplateId: z.uuid("Invalid local template id").nullable().optional(),
    kind: WhatsAppMessageTemplateKindSchema,
    friendlyName: z.string().trim().min(1).max(120),
    metaTemplateName: z.string().trim().regex(/^[a-z0-9_]{1,512}$/),
    languageCode: z.string().trim().regex(/^[A-Za-z]{2,10}(?:[_-][A-Za-z0-9]{2,10})*$/),
    components: z.array(z.unknown()).max(20),
    sampleValues: z.record(z.string(), z.unknown()).default({}),
    headerSampleBase64: z.string().min(1).max(14_000_000).optional(),
    headerSampleFileName: z.string().trim().min(1).max(255).optional(),
    headerSampleMimeType: z.string().trim().regex(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i).max(255).optional(),
    idempotencyKey: z.string().trim().min(1).max(255),
}).superRefine((data, context) => {
    const fields = [data.headerSampleBase64, data.headerSampleFileName, data.headerSampleMimeType];
    if (fields.some(Boolean) && fields.some(value => !value)) {
        context.addIssue({ code: "custom", path: ["headerSampleBase64"], message: "Provide all header sample media fields or omit the sample" });
    }
});

export const WhatsAppUseCloudTemplateForStoreSchema = z.object({
    cloudTemplateId: z.uuid("Invalid Cloud template id"),
    whatsappBusinessAccountId: z.uuid("Invalid internal Cloud business account id"),
    kind: WhatsAppMessageTemplateKindSchema,
});

export const WhatsAppCloudQuotaPolicySchema = z.object({
    monthlyMessageLimit: z.number().int().nonnegative().nullable(),
    monthlyBudgetMinor: z.number().int().nonnegative().nullable(),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    accountSendIntervalSeconds: z.number().int().min(0).max(86_400),
    recipientWindowSeconds: z.number().int().min(60).max(2_592_000),
    recipientWindowLimit: z.number().int().positive().nullable(),
    customerCooldownSeconds: z.number().int().min(0).max(2_592_000),
}).strict();

export const WhatsAppCloudSafetySchema = z.object({
    policy: WhatsAppCloudQuotaPolicySchema,
    usage: z.object({ units: z.number().int().nonnegative(), costMinor: z.number().int().nonnegative() }),
    reconciliation: z.object({
        reservationCount: z.number().int().nonnegative(),
        ledgerEventCount: z.number().int().nonnegative(),
        missingReservedEvents: z.number().int().nonnegative(),
        missingSettlementEvents: z.number().int().nonnegative(),
        missingReleaseEvents: z.number().int().nonnegative(),
    }),
    outbox: z.object({
        reconcilingCount: z.number().int().nonnegative(),
        oldestReconcilingAt: dtoDateSchema.nullable(),
        retryableCount: z.number().int().nonnegative(),
        deadLetterCount: z.number().int().nonnegative(),
    }),
});

export const WhatsAppCloudOutboxOperationSchema = z.object({
    id: z.uuid("Invalid Cloud outbox id"),
    storeName: z.string().trim().min(1).max(255),
    kind: WhatsAppOutboxKindSchema,
    status: WhatsAppOutboxStatusSchema,
    attemptCount: z.number().int().nonnegative(),
    lastErrorCode: z.string().trim().min(1).max(100).nullable(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
    nextAttemptAt: dtoDateSchema,
}).strict();

export const WhatsAppCloudOutboxOperationsResponseSchema = z.object({
    operations: z.array(WhatsAppCloudOutboxOperationSchema),
});

export const WhatsAppCloudOutboxActionResponseSchema = z.object({
    outboxId: z.uuid("Invalid Cloud outbox id"),
    previousStatus: WhatsAppOutboxStatusSchema,
    nextStatus: WhatsAppOutboxStatusSchema,
});

export const WhatsAppCustomerConsentKindSchema = z.enum(["marketing", "utility"]);
export const WhatsAppCustomerConsentStateSchema = z.enum(["opted_in", "opted_out"]);
export const WhatsAppCustomerConsentSourceSchema = z.enum(["admin", "pos", "import", "customer_reply", "migration", "system"]);
export const WhatsAppCustomerConsentEventSchema = z.object({
    id: z.uuid("Invalid consent event id"),
    organizationId: z.uuid("Invalid organization id"),
    customerId: z.uuid("Invalid customer id"),
    kind: z.enum(["marketing", "utility", "suppression"]),
    state: z.enum(["opted_in", "opted_out", "suppressed", "cleared"]),
    source: WhatsAppCustomerConsentSourceSchema,
    wordingVersion: z.string().trim().min(1).max(64).nullable(),
    evidenceReference: z.string().trim().min(1).max(255).nullable(),
    reason: z.string().trim().min(1).max(1000).nullable(),
    createdBy: z.uuid("Invalid creator id").nullable(),
    createdAt: dtoDateSchema,
});
export const WhatsAppRecordCustomerConsentSchema = z.object({
    kind: WhatsAppCustomerConsentKindSchema,
    state: WhatsAppCustomerConsentStateSchema,
    source: WhatsAppCustomerConsentSourceSchema,
    wordingVersion: z.string().trim().min(1).max(64).nullable().optional(),
    evidenceReference: z.string().trim().min(1).max(255).nullable().optional(),
    reason: z.string().trim().min(1).max(1000).nullable().optional(),
});
export const WhatsAppSetCustomerSuppressionSchema = z.object({
    suppressed: z.boolean(),
    source: WhatsAppCustomerConsentSourceSchema,
    reason: z.string().trim().min(1).max(1000).nullable().optional(),
    evidenceReference: z.string().trim().min(1).max(255).nullable().optional(),
});

export const WhatsAppCloudAccountSnapshotSchema = z.object({
    id: z.uuid("Invalid WhatsApp account id"),
    organizationId: z.uuid("Invalid organization id"),
    whatsappBusinessAccountId: z.uuid("Invalid internal Cloud business account id").nullable(),
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
    whatsappAccountId: z.uuid("Invalid WhatsApp account id").nullable(),
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

export const WhatsAppCloudOnboardingResultSchema = z
    .object({
        state: z.string().trim().min(1).max(4_096),
        code: z.string().trim().min(1).max(4_096),
        wabaId: z.string().trim().regex(/^\d{1,64}$/, "Invalid WABA id"),
        phoneNumberId: z
            .string()
            .trim()
            .regex(/^\d{1,64}$/, "Invalid phone number id"),
    })
    .strict();

export const WhatsAppAccountDTOSchema = z.object({
    id: z.uuid("Invalid WhatsApp account id"),
    organizationId: z.uuid("Invalid organization id"),
    defaultStoreId: z.uuid("Invalid store id").nullable(),
    assignedStoreIds: z.array(z.uuid("Invalid store id")),
    provider: WhatsAppProviderSchema,
    phoneNumber: phoneSchema,
    status: WhatsAppAccountStatusSchema,
    cloudStatus: WhatsAppCloudAccountStatusSchema.nullable().optional(),
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
    templateName: z.string().trim().max(512).nullable().optional(),
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
    messageType: WhatsAppLegacyMessageTypeSchema,
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
    messageType: WhatsAppLegacyMessageTypeSchema,
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
