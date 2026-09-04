import { describe, expect, test } from "bun:test";

import {
    CreateStoreAccessGrantSchema,
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
