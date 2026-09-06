import { describe, expect, test } from "bun:test";

import {
    CreatePaidPlanCheckoutSchema,
    CreateCoTermAddOnCheckoutSchema,
    CreateStoreAccessGrantSchema,
    CommercialQuoteDTOSchema,
    COMMERCIAL_QUOTE_TTL_MS,
    inrToPaise,
    StoreAccessGrantDTOSchema,
    StoreCommercialStatusDTOSchema,
    storeAccessGrantLabel,
} from "./commercial-licensing.schema";

describe("Store commercial status contract", () => {
    test("accepts an eligible Store with no current access", () => {
        const parsed = StoreCommercialStatusDTOSchema.parse({
            storeId: "11111111-1111-4111-8111-111111111111",
            organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            timezone: "Asia/Kolkata",
            baseAccess: null,
            scheduledSuccessor: null,
            accessGrants: [],
            activeAddOns: [],
            availablePaidPlans: [],
            availableCoTermAddOns: [],
            pendingCheckout: null,
            commercialHistory: [],
            trial: {
                eligible: true,
                message: "This Store can start the standard Trial Plan once.",
            },
            entitlements: {
                storeId: "11111111-1111-4111-8111-111111111111",
                features: [],
            },
        });

        expect(parsed.trial.eligible).toBe(true);
        expect(parsed.baseAccess).toBeNull();
        expect(parsed.activeAddOns).toEqual([]);
        expect(parsed.availablePaidPlans).toEqual([]);
        expect(parsed.pendingCheckout).toBeNull();
        expect(parsed.commercialHistory).toEqual([]);
        expect(parsed.accessGrants).toEqual([]);
    });

    test("keeps a legacy migration grant distinct from an administrator Store Access Grant", () => {
        const startsAt = new Date("2026-09-04T15:00:00.000Z");
        const endsAt = new Date("2026-10-04T15:00:00.000Z");
        const modules = [{
            key: "core_operations",
            displayName: "Core Operations",
            features: [{ key: "billing", displayName: "Billing" }],
        }];
        const migration = StoreAccessGrantDTOSchema.parse({
            id: "00000000-0000-4000-8000-000000000101",
            sourceKind: "store_access_grant",
            origin: "legacy_migration",
            termKind: "complimentary",
            selectionKind: "all_current_modules",
            label: storeAccessGrantLabel({ origin: "legacy_migration", termKind: "complimentary" }),
            selectionLabel: "All current Modules",
            planKey: null,
            planDisplayName: null,
            moduleKey: null,
            moduleDisplayName: null,
            term: { count: 30, unit: "day" },
            startsAt,
            endsAt,
            status: "active",
            modules,
        });
        const administrator = StoreAccessGrantDTOSchema.parse({
            id: "00000000-0000-4000-8000-000000000102",
            sourceKind: "store_access_grant",
            origin: "administrator",
            termKind: "complimentary",
            selectionKind: "plan",
            label: storeAccessGrantLabel({ origin: "administrator", termKind: "complimentary" }),
            selectionLabel: "Core",
            planKey: "core",
            planDisplayName: "Core",
            moduleKey: null,
            moduleDisplayName: null,
            term: { count: 30, unit: "day" },
            startsAt,
            endsAt,
            status: "active",
            modules,
        });

        expect(migration.label).toBe("Legacy migration grant");
        expect(administrator.label).toBe("Complimentary Store Access Grant");
        expect(migration.origin).not.toBe(administrator.origin);
    });
});

describe("Create Store Access Grant contract", () => {
    test("accepts seven-day, extended, complimentary, and custom-range Plan or Module grants", () => {
        expect(CreateStoreAccessGrantSchema.parse({
            termKind: "seven_day",
            selection: { kind: "plan", planKey: "trial" },
        }).termKind).toBe("seven_day");
        expect(CreateStoreAccessGrantSchema.parse({
            termKind: "extended",
            selection: { kind: "module", moduleKey: "integrations" },
            term: { count: 14, unit: "day" },
        }).term).toEqual({ count: 14, unit: "day" });
        expect(CreateStoreAccessGrantSchema.parse({
            termKind: "complimentary",
            selection: { kind: "plan", planKey: "core" },
            term: { count: 30, unit: "day" },
        }).termKind).toBe("complimentary");
        expect(CreateStoreAccessGrantSchema.parse({
            termKind: "custom_range",
            selection: { kind: "module", moduleKey: "finance" },
            endsAt: "2026-09-20T15:00:00.000Z",
        }).endsAt).toBe("2026-09-20T15:00:00.000Z");
    });

    test("rejects administrator grants that try to use the legacy all-current-Modules selection", () => {
        expect(CreateStoreAccessGrantSchema.safeParse({
            termKind: "complimentary",
            selection: { kind: "all_current_modules" },
            term: { count: 30, unit: "day" },
        }).success).toBe(false);
    });
});

describe("Paid Plan checkout contract", () => {
    test("quotes a GST-inclusive paise amount and a 30-minute expiry", () => {
        expect(inrToPaise(2999)).toBe(299900);
        expect(COMMERCIAL_QUOTE_TTL_MS).toBe(30 * 60 * 1000);
        expect(CreatePaidPlanCheckoutSchema.parse({ planKey: "core" }).planKey).toBe("core");
        expect(CreatePaidPlanCheckoutSchema.safeParse({ planKey: "core", amountInr: 1 }).success).toBe(false);

        const parsed = CommercialQuoteDTOSchema.parse({
            id: "00000000-0000-4000-8000-000000000201",
            kind: "paid_plan",
            status: "open",
            planKey: "core",
            planDisplayName: "Core",
            planType: "paid",
            moduleKey: null,
            moduleDisplayName: null,
            priceInr: 2999,
            amountInr: 2999,
            amountPaise: 299900,
            currency: "INR",
            term: { count: 1, unit: "year" },
            licenseTiming: "immediate",
            intendedStartsAt: "2026-09-04T15:00:00.000Z",
            intendedEndsAt: "2027-09-04T15:00:00.000Z",
            expiresAt: "2026-09-04T15:30:00.000Z",
            razorpayOrderId: "order_test_core",
            lineItems: [{ description: "Core Plan", amountInr: 2999 }],
            fulfilledAt: null,
        });
        expect(parsed.amountPaise).toBe(299900);
        expect(parsed.licenseTiming).toBe("immediate");
    });

    test("quotes a prorated Co-Term Add-On with module selection fields", () => {
        expect(CreateCoTermAddOnCheckoutSchema.parse({ moduleKey: "integrations" }).moduleKey)
            .toBe("integrations");

        const parsed = CommercialQuoteDTOSchema.parse({
            id: "00000000-0000-4000-8000-000000000301",
            kind: "co_term_add_on",
            status: "open",
            planKey: null,
            planDisplayName: null,
            planType: null,
            moduleKey: "integrations",
            moduleDisplayName: "Integrations",
            priceInr: 999,
            amountInr: 499.5,
            amountPaise: 49950,
            currency: "INR",
            term: { count: 1, unit: "year" },
            licenseTiming: "immediate",
            intendedStartsAt: "2026-09-04T15:00:00.000Z",
            intendedEndsAt: "2027-09-04T15:00:00.000Z",
            expiresAt: "2026-09-04T15:30:00.000Z",
            razorpayOrderId: "order_test_addon",
            lineItems: [{ description: "Integrations Co-Term Add-On (prorated)", amountInr: 499.5 }],
            fulfilledAt: null,
        });

        expect(parsed.moduleKey).toBe("integrations");
        expect(parsed.amountPaise).toBe(49950);
    });
});
