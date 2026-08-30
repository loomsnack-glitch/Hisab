import { createHash } from "node:crypto";
import {
    STATUS_CODES,
    type DeviceSessionDTO,
    type ServiceResponse,
    type WhatsAppAttachConversationCustomerJSON,
    type WhatsAppConversationListResponse,
    type WhatsAppConversationMessagesResponse,
    type WhatsAppConversationDTO,
    type WhatsAppAttachmentResponse,
    type WhatsAppMessageDTO,
    type WhatsAppSendConversationTextJSON,
    type WhatsAppInboundMessageJSON,
    type WhatsAppMessageEventJSON,
    WhatsAppMessageEventSchema,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as storage from "@/services/storage";
import * as repository from "./whatsapp.repository";
import * as consentRepository from "./cloud-api/customer-consent.repository";
import { isWhatsAppOptOutKeyword } from "./opt-out";

const privateBucket = () => process.env.MINIO_BUCKET_NAME?.trim() || "";
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_SECONDS = 300;

type Scope = { organizationId: string; storeId: string; account: NonNullable<Awaited<ReturnType<typeof repository.getAccount>>> };

const success = <T>(data: T, message: string): ServiceResponse<T> => ({
    status: "success",
    data,
    message,
    code: STATUS_CODES.SUCCESS,
});

const error = <T>(message: string, code: 400 | 404 | 409 | 429 | 500 | 503): ServiceResponse<T | null> => ({
    status: "error",
    message,
    data: null,
    code,
});

const scopeForUser = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<Scope | null>> => {
    const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
    if (!organization) return error("Organization not found", STATUS_CODES.NOT_FOUND);
    const store = await organizationRepository.getStoreById(organizationId, storeId);
    if (!store) return error("Store not found", STATUS_CODES.NOT_FOUND);
    const account = await repository.getAccount(organizationId, storeId);
    if (!account) return error("Link the Store WhatsApp account first", STATUS_CODES.CONFLICT);
    return success({ organizationId, storeId, account }, "WhatsApp scope resolved");
};

const scopeForDevice = async (session: DeviceSessionDTO): Promise<ServiceResponse<Scope | null>> => {
    const account = await repository.getAccount(session.organization.id, session.store.id);
    if (!account) return error("Link the Store WhatsApp account first", STATUS_CODES.CONFLICT);
    return success({ organizationId: session.organization.id, storeId: session.store.id, account }, "WhatsApp scope resolved");
};

const conversationResponse = (
    conversation: WhatsAppConversationDTO,
    messages: WhatsAppMessageDTO[],
): ServiceResponse<WhatsAppConversationMessagesResponse> => success(
    { conversation, messages },
    "WhatsApp conversation loaded",
);

const listForScope = async (scope: Scope): Promise<ServiceResponse<WhatsAppConversationListResponse>> => success(
    {
        accountId: scope.account.id,
        accountStatus: scope.account.status,
        conversations: await repository.getConversations(scope.organizationId, scope.storeId, scope.account.id),
    },
    "WhatsApp conversations loaded",
);

const conversationForScope = async (
    scope: Scope,
    conversationId: string,
): Promise<ServiceResponse<WhatsAppConversationMessagesResponse | null>> => {
    const conversation = await repository.getConversation(
        scope.organizationId,
        scope.storeId,
        scope.account.id,
        conversationId,
    );
    if (!conversation) return error("WhatsApp conversation not found", STATUS_CODES.NOT_FOUND);
    await repository.markConversationRead(scope.organizationId, scope.storeId, scope.account.id, conversationId);
    return conversationResponse(
        { ...conversation, unreadCount: 0 },
        await repository.getConversationMessages(scope.organizationId, scope.storeId, scope.account.id, conversationId),
    );
};

const sendTextForScope = async (
    scope: Scope,
    _conversationId: string,
    _data: WhatsAppSendConversationTextJSON,
): Promise<ServiceResponse<WhatsAppConversationMessagesResponse["messages"][number] | null>> => {
    return scope.account.provider === "cloud_api"
        ? error("Cloud WhatsApp messages require an approved Cloud template route", STATUS_CODES.CONFLICT)
        : error("This WhatsApp account uses a retired provider; connect a Cloud API account before sending messages", STATUS_CODES.CONFLICT);
};

const attachCustomerForScope = async (
    scope: Scope,
    conversationId: string,
    data: WhatsAppAttachConversationCustomerJSON,
): Promise<ServiceResponse<WhatsAppConversationDTO | null>> => {
    const conversation = await repository.attachConversationCustomer(
        scope.organizationId,
        scope.storeId,
        scope.account.id,
        conversationId,
        data.customerId,
    );
    return conversation
        ? success(conversation, "Customer attached to WhatsApp conversation")
        : error("Customer must belong to this Store and have the same WhatsApp phone number", STATUS_CODES.CONFLICT);
};

export const listConversations = async (userId: string, organizationId: string, storeId: string) => {
    const scoped = await scopeForUser(userId, organizationId, storeId);
    return scoped.status === "success" && scoped.data ? listForScope(scoped.data) : scoped as unknown as ServiceResponse<WhatsAppConversationListResponse>;
};

export const listConversationsForDevice = async (session: DeviceSessionDTO) => {
    const scoped = await scopeForDevice(session);
    return scoped.status === "success" && scoped.data ? listForScope(scoped.data) : scoped as unknown as ServiceResponse<WhatsAppConversationListResponse>;
};

export const getConversation = async (userId: string, organizationId: string, storeId: string, conversationId: string) => {
    const scoped = await scopeForUser(userId, organizationId, storeId);
    return scoped.status === "success" && scoped.data
        ? conversationForScope(scoped.data, conversationId)
        : scoped as unknown as ServiceResponse<WhatsAppConversationMessagesResponse>;
};

export const getConversationForDevice = async (session: DeviceSessionDTO, conversationId: string) => {
    const scoped = await scopeForDevice(session);
    return scoped.status === "success" && scoped.data
        ? conversationForScope(scoped.data, conversationId)
        : scoped as unknown as ServiceResponse<WhatsAppConversationMessagesResponse>;
};

export const sendText = async (
    userId: string,
    organizationId: string,
    storeId: string,
    conversationId: string,
    data: WhatsAppSendConversationTextJSON,
) => {
    const scoped = await scopeForUser(userId, organizationId, storeId);
    return scoped.status === "success" && scoped.data
        ? sendTextForScope(scoped.data, conversationId, data)
        : scoped as unknown as ServiceResponse<WhatsAppMessageDTO>;
};

export const sendTextForDevice = async (
    session: DeviceSessionDTO,
    conversationId: string,
    data: WhatsAppSendConversationTextJSON,
) => {
    const scoped = await scopeForDevice(session);
    return scoped.status === "success" && scoped.data
        ? sendTextForScope(scoped.data, conversationId, data)
        : scoped as unknown as ServiceResponse<WhatsAppMessageDTO>;
};

export const attachCustomer = async (
    userId: string,
    organizationId: string,
    storeId: string,
    conversationId: string,
    data: WhatsAppAttachConversationCustomerJSON,
) => {
    const scoped = await scopeForUser(userId, organizationId, storeId);
    return scoped.status === "success" && scoped.data
        ? attachCustomerForScope(scoped.data, conversationId, data)
        : scoped as unknown as ServiceResponse<WhatsAppConversationDTO>;
};

export const attachCustomerForDevice = async (
    session: DeviceSessionDTO,
    conversationId: string,
    data: WhatsAppAttachConversationCustomerJSON,
) => {
    const scoped = await scopeForDevice(session);
    return scoped.status === "success" && scoped.data
        ? attachCustomerForScope(scoped.data, conversationId, data)
        : scoped as unknown as ServiceResponse<WhatsAppConversationDTO>;
};

const attachmentObjectKey = (organizationId: string, storeId: string, accountId: string, providerMessageId: string) =>
    `whatsapp-inbound/${organizationId}/${storeId}/${accountId}/${createHash("sha256").update(providerMessageId).digest("hex")}`;

export const getAttachment = async (
    userId: string,
    organizationId: string,
    storeId: string,
    conversationId: string,
    messageId: string,
): Promise<ServiceResponse<WhatsAppAttachmentResponse | null>> => {
    const scoped = await scopeForUser(userId, organizationId, storeId);
    if (scoped.status !== "success" || !scoped.data) return scoped as unknown as ServiceResponse<WhatsAppAttachmentResponse>;
    const attachment = await repository.getMessageAttachmentKey(organizationId, storeId, scoped.data.account.id, conversationId, messageId);
    if (!attachment) return error("Attachment not found", STATUS_CODES.NOT_FOUND);
    const bucket = privateBucket();
    if (!bucket) return error("Private media storage is not configured", STATUS_CODES.INTERNAL_SERVER_ERROR);
    return success({ url: await storage.generateSignedUrlBeta(bucket, attachment.key, SIGNED_URL_SECONDS, attachment.fileName) }, "Attachment URL created");
};

export const getAttachmentForDevice = async (
    session: DeviceSessionDTO,
    conversationId: string,
    messageId: string,
): Promise<ServiceResponse<WhatsAppAttachmentResponse | null>> => {
    const scoped = await scopeForDevice(session);
    if (scoped.status !== "success" || !scoped.data) return scoped as unknown as ServiceResponse<WhatsAppAttachmentResponse>;
    const attachment = await repository.getMessageAttachmentKey(session.organization.id, session.store.id, scoped.data.account.id, conversationId, messageId);
    if (!attachment) return error("Attachment not found", STATUS_CODES.NOT_FOUND);
    const bucket = privateBucket();
    if (!bucket) return error("Private media storage is not configured", STATUS_CODES.INTERNAL_SERVER_ERROR);
    return success({ url: await storage.generateSignedUrlBeta(bucket, attachment.key, SIGNED_URL_SECONDS, attachment.fileName) }, "Attachment URL created");
};

const processMessageEvent = async (
    accountId: string,
    data: WhatsAppMessageEventJSON,
): Promise<{ stored: boolean }> => {
    const account = await repository.getAccountById(accountId);
    if (!account) throw new Error("WhatsApp account not found");
    if (data.externalChatId !== `${data.contactPhoneNumber.slice(1)}@s.whatsapp.net`) {
        throw new Error("Unsupported WhatsApp chat id");
    }
    if (await repository.hasProviderMessage(accountId, data.providerMessageId)) return { stored: false };

    const routedStoreId = await repository.resolveMessageEventStore({
        whatsappAccountId: account.id,
        externalChatId: data.externalChatId,
        direction: data.direction,
        messageType: data.messageType,
        body: data.body,
        caption: data.caption,
        attachmentFileName: data.attachmentFileName,
        occurredAt: String(data.occurredAt),
    });
    const storeId = routedStoreId ?? account.defaultStoreId ?? account.assignedStoreIds[0] ?? null;
    if (!storeId) throw new Error("WhatsApp account is not assigned to a Store");

    let attachmentStorageKey: string | null = null;
    const bucket = privateBucket();
    if (data.messageType === "document") {
        if (!bucket || !data.documentBase64) throw new Error("WhatsApp document storage is not configured");
        const document = Buffer.from(data.documentBase64, "base64");
        if (document.byteLength > MAX_MEDIA_BYTES) throw new Error("WhatsApp document is too large");
        attachmentStorageKey = attachmentObjectKey(account.organizationId, storeId, account.id, data.providerMessageId);
        await storage.uploadBuffer(bucket, attachmentStorageKey, document, data.attachmentMimeType ?? "application/octet-stream");
    }

    try {
        const customer = await repository.getCustomerByPhone(account.organizationId, data.contactPhoneNumber);
        const customerId = customer?.id ?? null;
        if (account.provider === "cloud_api" && customerId && data.direction === "inbound" && data.messageType === "text" && isWhatsAppOptOutKeyword(data.body ?? "")) {
            await consentRepository.setCustomerSuppression(account.organizationId, customerId, null, {
                suppressed: true,
                source: "customer_reply",
                reason: "Customer sent a WhatsApp opt-out keyword",
                evidenceReference: `provider:${data.providerMessageId}`,
            });
        }
        const result = await repository.createMessageEvent({
            organizationId: account.organizationId,
            storeId,
            whatsappAccountId: account.id,
            customerId: customer?.id ?? null,
            externalChatId: data.externalChatId,
            contactPhoneNumber: data.contactPhoneNumber,
            displayName: customer?.name ?? data.displayName,
            providerMessageId: data.providerMessageId,
            direction: data.direction,
            source: data.source,
            messageType: data.messageType,
            body: data.body,
            caption: data.caption,
            attachmentStorageKey,
            attachmentFileName: data.attachmentFileName,
            attachmentMimeType: data.attachmentMimeType,
            occurredAt: String(data.occurredAt),
        });
        if (!result.created && attachmentStorageKey && bucket) await storage.deleteObject(bucket, attachmentStorageKey);
        return { stored: result.created };
    } catch (error) {
        if (attachmentStorageKey && bucket) {
            try { await storage.deleteObject(bucket, attachmentStorageKey); } catch { /* preserve ingest failure */ }
        }
        throw error;
    }
};

/**
 * Cloud receipts already have their own durable inbox. They must enter the
 * shared Store-scoped writer without creating a legacy provider inbox row.
 */
export const ingestNormalizedMessageEvent = async (
    accountId: string,
    data: WhatsAppMessageEventJSON,
): Promise<{ stored: boolean }> => processMessageEvent(accountId, data);

export const ingestMessageEvent = async (
    accountId: string,
    data: WhatsAppMessageEventJSON,
): Promise<{ stored: boolean }> => {
    const claim = await repository.claimProviderEvent(accountId, data.providerMessageId, data);
    if (claim.completed || !claim.claimed) return { stored: false };

    try {
        const result = await processMessageEvent(accountId, data);
        await repository.completeProviderEvent(claim.claimed.id);
        return result;
    } catch (error) {
        await repository.failProviderEvent(claim.claimed.id, error instanceof Error ? error.message : "WhatsApp provider event failed");
        throw error;
    }
};

export const replayPendingMessageEvents = async (): Promise<void> => {
    const events = await repository.claimPendingProviderEvents();
    for (const event of events) {
        const parsed = WhatsAppMessageEventSchema.safeParse(event.payload);
        if (!parsed.success) {
            await repository.failProviderEvent(event.id, "Stored WhatsApp provider event payload is invalid");
            continue;
        }
        try {
            await processMessageEvent(event.accountId, parsed.data);
            await repository.completeProviderEvent(event.id);
        } catch (error) {
            await repository.failProviderEvent(event.id, error instanceof Error ? error.message : "WhatsApp provider event replay failed");
        }
    }
};

export const ingestInboundMessage = async (
    accountId: string,
    data: WhatsAppInboundMessageJSON,
): Promise<{ stored: boolean }> => ingestMessageEvent(accountId, {
    ...data,
    direction: "inbound",
    source: "realtime",
});
