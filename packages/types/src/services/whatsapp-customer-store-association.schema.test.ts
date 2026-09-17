import { describe, expect, test } from "bun:test";
import {
    WhatsAppCustomerStoreAssociationEventSchema,
    WhatsAppCustomerStoreAssociationSchema,
} from "./whatsapp.schema";

const organizationId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const storeId = "33333333-3333-4333-8333-333333333333";
const associationId = "44444444-4444-4444-8444-444444444444";

describe("Customer Store association schemas", () => {
    test("accepts association summaries and qualifying activity events", () => {
        const timestamp = new Date();
        expect(WhatsAppCustomerStoreAssociationSchema.safeParse({
            id: associationId,
            organizationId,
            customerId,
            storeId,
            originSource: "customer_creation",
            originSourceReference: "customer-created",
            firstSeenAt: timestamp,
            lastActivityAt: timestamp,
            lastActivitySource: "customer_creation",
            lastActivitySourceReference: "customer-created",
            createdBy: null,
            createdAt: timestamp,
            updatedAt: timestamp,
        }).success).toBe(true);

        expect(WhatsAppCustomerStoreAssociationEventSchema.safeParse({
            id: associationId,
            organizationId,
            customerId,
            storeId,
            source: "sale_completed",
            sourceReference: "sale-1",
            occurredAt: timestamp,
            createdBy: null,
            createdAt: timestamp,
        }).success).toBe(true);
    });

    test("requires a non-empty idempotent source reference", () => {
        expect(WhatsAppCustomerStoreAssociationEventSchema.safeParse({
            id: associationId,
            organizationId,
            customerId,
            storeId,
            source: "bill_delivery",
            sourceReference: " ",
            occurredAt: new Date(),
            createdBy: null,
            createdAt: new Date(),
        }).success).toBe(false);
    });
});
