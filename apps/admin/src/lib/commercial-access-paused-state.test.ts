import { describe, expect, test } from "bun:test";
import type { StoreCommercialStatusDTO } from "@repo/types";

import { featureAccessPausedState, tableServiceAccessPausedState } from "@/lib/commercial-access-paused-state";

const now = new Date("2026-09-06T00:00:00.000Z");
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const baseStatus: StoreCommercialStatusDTO = {
    storeId,
    organizationId,
    timezone: "Asia/Kolkata",
    baseAccess: null,
    scheduledSuccessor: null,
    accessGrants: [],
    activeAddOns: [],
    availablePaidPlans: [],
    availableCoTermAddOns: [],
    pendingCheckout: null,
    commercialHistory: [],
    trial: { eligible: true, message: "This Store can start the standard Trial Plan once." },
    entitlements: { storeId, features: [] },
};

describe("featureAccessPausedState", () => {
    test("returns null when the feature is entitled", () => {
        expect(
            featureAccessPausedState(
                {
                    ...baseStatus,
                    entitlements: {
                        storeId,
                        features: [{
                            key: "whatsapp",
                            displayName: "WhatsApp",
                            sources: [],
                        }],
                    },
                },
                "whatsapp",
            ),
        ).toBeNull();
    });

    test("returns no-plan state when the store has no commercial access", () => {
        expect(featureAccessPausedState(baseStatus, "money_account_tracking")).toEqual({
            badge: "No plan purchased",
            title: "Payment routing paused",
            description: "Payment routing unlocks as soon as this Store has Money Account Tracking access.",
            actionLabel: "Choose a plan",
        });
    });

    test("returns expired-license state when a license expired", () => {
        expect(
            featureAccessPausedState(
                {
                    ...baseStatus,
                    commercialHistory: [{
                        kind: "license",
                        id: "00000000-0000-4000-8000-000000000002",
                        occurredAt: now,
                        title: "Store License · Basic",
                        detail: "₹999.00 · basic",
                        amountInr: 999,
                        status: "expired",
                    }],
                },
                "whatsapp",
            ),
        ).toEqual({
            badge: "License expired",
            title: "WhatsApp access paused",
            description: "Renew this Store's license to restore WhatsApp messaging.",
            actionLabel: "Renew license",
        });
    });

    test("requires both Table Management and KOT System for Table Service", () => {
        expect(
            tableServiceAccessPausedState({
                ...baseStatus,
                baseAccess: {
                    id: "00000000-0000-4000-8000-000000000003",
                    sourceKind: "store_license",
                    planKey: "core",
                    planDisplayName: "Core",
                    planType: "paid",
                    term: { count: 1, unit: "year" },
                    startsAt: now,
                    endsAt: new Date("2027-09-06T00:00:00.000Z"),
                    status: "active",
                },
                entitlements: {
                    storeId,
                    features: [{
                        key: "table_management",
                        displayName: "Table Management",
                        sources: [],
                    }],
                },
            }),
        ).toEqual({
            badge: "Table Service not included",
            title: "Table service paused",
            description: "This Store's current access does not include KOT System.",
            actionLabel: "Add Table Service access",
        });
    });

    test("does not pause Table Service when both required features are entitled", () => {
        expect(
            tableServiceAccessPausedState({
                ...baseStatus,
                entitlements: {
                    storeId,
                    features: [
                        { key: "table_management", displayName: "Table Management", sources: [] },
                        { key: "kot_system", displayName: "KOT System", sources: [] },
                    ],
                },
            }),
        ).toBeNull();
    });
});
