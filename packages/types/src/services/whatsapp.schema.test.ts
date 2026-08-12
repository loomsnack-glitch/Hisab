import { describe, expect, test } from "bun:test";
import {
    WhatsAppAccountDTOSchema,
    WhatsAppSendInvoiceSchema,
    WhatsAppSendTextSchema,
    WhatsAppWorkerInvoiceJobSchema,
    WhatsAppWorkerInvoiceResultSchema,
    WhatsAppWorkerInboundMessageSchema,
    WhatsAppWorkerMessageEventSchema,
    WhatsAppWorkerOutboundJobSchema,
    WhatsAppConversationListResponseSchema,
} from "./whatsapp.schema";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("WhatsApp schemas", () => {
    test("accepts an account DTO without exposing session material", () => {
        const result = WhatsAppAccountDTOSchema.safeParse({
            id: uuid,
            organizationId: uuid,
            storeId: "22222222-2222-4222-8222-222222222222",
            provider: "baileys",
            phoneNumber: "+919876543210",
            status: "connected",
            lastConnectedAt: "2026-08-11T10:00:00.000Z",
            lastSeenAt: null,
            lastErrorCode: null,
            createdAt: "2026-08-11T10:00:00.000Z",
            updatedAt: "2026-08-11T10:00:00.000Z",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect("sessionReference" in result.data).toBe(false);
        }
    });

    test("rejects non-international customer phone numbers for WhatsApp sends", () => {
        expect(
            WhatsAppSendTextSchema.safeParse({
                customerId: uuid,
                body: "Your bill is ready",
            }).success,
        ).toBe(true);

        expect(
            WhatsAppAccountDTOSchema.safeParse({
                id: uuid,
                organizationId: uuid,
                storeId: uuid,
                provider: "baileys",
                phoneNumber: "9876543210",
                status: "connected",
                createdAt: new Date(),
                updatedAt: new Date(),
            }).success,
        ).toBe(false);
    });

    test("rejects empty text and malformed invoice requests", () => {
        expect(WhatsAppSendTextSchema.safeParse({ customerId: uuid, body: " " }).success).toBe(false);
        expect(WhatsAppSendInvoiceSchema.safeParse({ saleId: "not-a-uuid" }).success).toBe(false);
    });

    test("validates bounded worker invoice payloads and result transitions", () => {
        expect(WhatsAppWorkerInvoiceJobSchema.safeParse({
            accountId: uuid,
            outboxId: uuid,
            messageId: uuid,
            phoneNumber: "+919876543210",
            attachmentFileName: "sale-1001.pdf",
            attachmentMimeType: "application/pdf",
            caption: "Sale 1001",
            documentBase64: "cGRm",
            attemptCount: 1,
            leaseOwner: "worker-lease",
        }).success).toBe(true);

        expect(WhatsAppWorkerInvoiceResultSchema.safeParse({
            leaseOwner: "worker-lease",
            providerMessageId: null,
            failureCode: "provider_unavailable",
            failureMessage: "WhatsApp provider is temporarily unavailable",
            retryable: true,
        }).success).toBe(true);
        expect(WhatsAppWorkerInvoiceResultSchema.safeParse({
            leaseOwner: "worker-lease",
            providerMessageId: null,
            failureCode: "Unsafe provider message",
            failureMessage: null,
            retryable: false,
        }).success).toBe(false);
    });

    test("validates inbound events and text outbound jobs", () => {
        expect(WhatsAppWorkerInboundMessageSchema.safeParse({
            providerMessageId: "wamid-inbound-1",
            externalChatId: "919876543210@s.whatsapp.net",
            contactPhoneNumber: "+919876543210",
            displayName: "Customer",
            messageType: "text",
            body: "Is my order ready?",
            caption: null,
            attachmentFileName: null,
            attachmentMimeType: null,
            documentBase64: null,
            occurredAt: "2026-08-12T10:00:00.000Z",
        }).success).toBe(true);

        expect(WhatsAppWorkerMessageEventSchema.safeParse({
            providerMessageId: "wamid-phone-1",
            externalChatId: "919876543210@s.whatsapp.net",
            contactPhoneNumber: "+919876543210",
            displayName: "Customer",
            messageType: "text",
            body: "Sent from the linked phone",
            caption: null,
            attachmentFileName: null,
            attachmentMimeType: null,
            documentBase64: null,
            occurredAt: new Date(),
            direction: "outbound",
            source: "realtime",
        }).success).toBe(true);

        expect(WhatsAppWorkerInboundMessageSchema.safeParse({
            providerMessageId: "wamid-inbound-2",
            externalChatId: "919876543210@s.whatsapp.net",
            contactPhoneNumber: "+919876543210",
            displayName: "Customer",
            messageType: "document",
            body: null,
            caption: "Payment proof",
            attachmentFileName: "proof.pdf",
            attachmentMimeType: "application/pdf",
            documentBase64: "cGRm",
            occurredAt: new Date(),
        }).success).toBe(true);

        expect(WhatsAppWorkerOutboundJobSchema.safeParse({
            accountId: uuid,
            outboxId: uuid,
            messageId: uuid,
            phoneNumber: "+919876543210",
            messageType: "text",
            body: "Thanks, we are checking.",
            caption: null,
            attachmentFileName: null,
            attachmentMimeType: null,
            documentBase64: null,
            attemptCount: 1,
            leaseOwner: "worker-lease",
        }).success).toBe(true);

        expect(WhatsAppConversationListResponseSchema.safeParse({
            accountId: "00000000-0000-4000-8000-000000000001",
            accountStatus: "connected",
            conversations: [],
        }).success).toBe(true);
    });
});
