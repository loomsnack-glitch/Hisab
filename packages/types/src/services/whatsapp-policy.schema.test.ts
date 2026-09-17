import { describe, expect, test } from "bun:test";
import {
    WhatsAppSetStorePolicySchema,
    WhatsAppStorePolicySchema,
} from "./whatsapp.schema";

const organizationId = "11111111-1111-4111-8111-111111111111";
const storeId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";

describe("WhatsApp Store policy schemas", () => {
    test("requires an account only for Organization Cloud", () => {
        expect(WhatsAppSetStorePolicySchema.safeParse({ mode: "disabled" }).success).toBe(true);
        expect(WhatsAppSetStorePolicySchema.safeParse({ mode: "ganatri_utility" }).success).toBe(true);
        expect(WhatsAppSetStorePolicySchema.safeParse({ mode: "organization_cloud" }).success).toBe(false);
        expect(WhatsAppSetStorePolicySchema.safeParse({ mode: "disabled", whatsappAccountId: accountId }).success).toBe(false);
        expect(WhatsAppSetStorePolicySchema.safeParse({ mode: "organization_cloud", whatsappAccountId: accountId }).success).toBe(true);
    });

    test("accepts safe policy response metadata for each sender mode", () => {
        const base = {
            id: accountId,
            organizationId,
            storeId,
            entitlement: {
                featureKey: "whatsapp" as const,
                required: true,
                entitled: true,
                reason: null,
            },
            allowedKinds: ["bill" as const, "due_reminder" as const],
            version: 1,
            effectiveFrom: new Date(),
            effectiveTo: null,
        };

        expect(WhatsAppStorePolicySchema.safeParse({
            ...base,
            mode: "disabled",
            sender: { kind: "none" },
        }).success).toBe(true);
        expect(WhatsAppStorePolicySchema.safeParse({
            ...base,
            mode: "ganatri_utility",
            sender: { kind: "ganatri_utility", displayName: "Ganatri Utility" },
        }).success).toBe(true);
        expect(WhatsAppStorePolicySchema.safeParse({
            ...base,
            mode: "organization_cloud",
            sender: {
                kind: "organization_cloud",
                whatsappAccountId: accountId,
                phoneNumber: "+919876543210",
                accountStatus: "connected",
                cloudStatus: "connected",
            },
        }).success).toBe(true);
    });
});
