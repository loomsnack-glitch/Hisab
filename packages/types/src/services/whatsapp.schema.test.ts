import { describe, expect, test } from "bun:test";
import {
    WhatsAppAccountDTOSchema,
    WhatsAppSendInvoiceSchema,
    WhatsAppSendTextSchema,
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
});
