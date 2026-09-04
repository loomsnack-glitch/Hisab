import { describe, expect, test } from "bun:test";

import {
    COMMERCIAL_CATALOG_KEY_MESSAGE,
    CommercialCatalogKeySchema,
    CommercialFeatureDetailDTOSchema,
    CommercialFeatureListQuerySchema,
    CommercialModuleDetailDTOSchema,
    CommercialPlanDetailDTOSchema,
    CreateCommercialFeatureSchema,
    CreateCommercialModuleSchema,
    CreateCommercialPlanSchema,
    UpdateCommercialFeatureDraftSchema,
    UpdateCommercialModuleDraftSchema,
    UpdateCommercialPlanDraftSchema,
} from "./commercial-catalog.schema";
import {
    SEEDED_COMMERCIAL_FEATURES,
    SEEDED_COMMERCIAL_MODULES,
    SEEDED_COMMERCIAL_PLANS,
} from "./seeded-commercial-catalog";

describe("Commercial Catalog Feature contracts", () => {
    test("accepts a unique lowercase Commercial Catalog Key and trims Feature fields", () => {
        const result = CreateCommercialFeatureSchema.parse({
            key: " billing ",
            displayName: "  Billing ",
            description: "  POS billing workflow ",
        });

        expect(result).toEqual({
            key: "billing",
            displayName: "Billing",
            description: "POS billing workflow",
        });
    });

    test("defaults an omitted Feature description to an empty string", () => {
        expect(
            CreateCommercialFeatureSchema.parse({
                key: "units",
                displayName: "Units",
            }),
        ).toEqual({
            key: "units",
            displayName: "Units",
            description: "",
        });
    });

    test("rejects a Commercial Catalog Key that is not lowercase, unique-shape, or reusable punctuation", () => {
        const invalidKeys = ["Billing", "1billing", "billing-core", "billing.core", "billing core", ""];

        for (const key of invalidKeys) {
            const result = CommercialCatalogKeySchema.safeParse(key);
            expect(result.success).toBe(false);
            if (key === "") {
                expect(result.success).toBe(false);
            } else if (key.trim() !== "") {
                expect(result.error?.issues[0]?.message).toBe(COMMERCIAL_CATALOG_KEY_MESSAGE);
            }
        }
    });

    test("does not allow a Draft update to change the Commercial Catalog Key", () => {
        expect(
            UpdateCommercialFeatureDraftSchema.safeParse({
                key: "renamed",
                displayName: "Billing",
                description: "Updated",
            }).success,
        ).toBe(false);
        expect(
            UpdateCommercialFeatureDraftSchema.parse({
                displayName: "  Billing ",
                description: "  Updated description ",
            }),
        ).toEqual({
            displayName: "Billing",
            description: "Updated description",
        });
    });

    test("defaults Feature list status to all and accepts name/key search", () => {
        expect(CommercialFeatureListQuerySchema.parse({})).toEqual({ status: "all" });
        expect(
            CommercialFeatureListQuerySchema.parse({
                search: "  billing ",
                status: "draft",
            }),
        ).toEqual({
            search: "billing",
            status: "draft",
        });
    });

    test("Feature detail includes revision history and audit actors", () => {
        const createdBy = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", firstName: "Asha", lastName: "Shah" };
        const parsed = CommercialFeatureDetailDTOSchema.parse({
            id: "11111111-1111-4111-8111-111111111111",
            key: "billing",
            currentRevision: {
                id: "22222222-2222-4222-8222-222222222222",
                featureId: "11111111-1111-4111-8111-111111111111",
                key: "billing",
                revisionNumber: 1,
                status: "active",
                displayName: "Billing",
                description: "POS billing workflow",
                createdBy,
                createdAt: "2026-09-04T00:00:00.000Z",
                publishedBy: createdBy,
                publishedAt: "2026-09-04T01:00:00.000Z",
                retiredBy: null,
                retiredAt: null,
                discardedBy: null,
                discardedAt: null,
            },
            revisions: [],
            referencingModules: [],
            affectedPlans: [],
        });

        expect(parsed.currentRevision.status).toBe("active");
        expect(parsed.currentRevision.publishedBy?.firstName).toBe("Asha");
        expect(parsed.key).toBe("billing");
        expect(parsed.referencingModules).toEqual([]);
        expect(parsed.affectedPlans).toEqual([]);
    });
});

describe("Commercial Catalog Module contracts", () => {
    test("accepts a Draft Module with Feature revisions and optional add-on pricing", () => {
        expect(
            CreateCommercialModuleSchema.parse({
                key: " core_operations ",
                displayName: "  Core Operations ",
                description: "  Billing and reports ",
                featureRevisionIds: ["22222222-2222-4222-8222-222222222222"],
                isSeparatelyPurchasable: false,
            }),
        ).toEqual({
            key: "core_operations",
            displayName: "Core Operations",
            description: "Billing and reports",
            featureRevisionIds: ["22222222-2222-4222-8222-222222222222"],
            isSeparatelyPurchasable: false,
            priceInr: null,
            term: null,
        });
    });

    test("requires INR price and calendar term only when a Module is separately purchasable", () => {
        expect(
            CreateCommercialModuleSchema.parse({
                key: "integrations",
                displayName: "Integrations",
                featureRevisionIds: ["22222222-2222-4222-8222-222222222222"],
                isSeparatelyPurchasable: true,
                priceInr: 0,
                term: { count: 7, unit: "day" },
            }),
        ).toMatchObject({
            isSeparatelyPurchasable: true,
            priceInr: 0,
            term: { count: 7, unit: "day" },
        });
        expect(
            CreateCommercialModuleSchema.parse({
                key: "integrations",
                displayName: "Integrations",
                featureRevisionIds: ["22222222-2222-4222-8222-222222222222"],
                isSeparatelyPurchasable: true,
                priceInr: 2999,
                term: { count: 1, unit: "year" },
            }),
        ).toMatchObject({
            priceInr: 2999,
            term: { count: 1, unit: "year" },
        });

        expect(
            CreateCommercialModuleSchema.safeParse({
                key: "integrations",
                displayName: "Integrations",
                featureRevisionIds: ["22222222-2222-4222-8222-222222222222"],
                isSeparatelyPurchasable: true,
            }).success,
        ).toBe(false);
        expect(
            CreateCommercialModuleSchema.safeParse({
                key: "core_operations",
                displayName: "Core Operations",
                featureRevisionIds: ["22222222-2222-4222-8222-222222222222"],
                isSeparatelyPurchasable: false,
                priceInr: 2999,
                term: { count: 1, unit: "year" },
            }).success,
        ).toBe(false);
    });

    test("rejects invalid monetary or term data and an empty Feature set", () => {
        const base = {
            key: "integrations",
            displayName: "Integrations",
            featureRevisionIds: ["22222222-2222-4222-8222-222222222222"],
            isSeparatelyPurchasable: true,
            term: { count: 1, unit: "year" as const },
        };

        expect(CreateCommercialModuleSchema.safeParse({ ...base, priceInr: -1 }).success).toBe(false);
        expect(CreateCommercialModuleSchema.safeParse({ ...base, priceInr: 2999.999 }).success).toBe(false);
        expect(CreateCommercialModuleSchema.safeParse({ ...base, priceInr: 2999, term: { count: 0, unit: "year" } }).success).toBe(false);
        expect(
            CreateCommercialModuleSchema.safeParse({
                key: "core_operations",
                displayName: "Core Operations",
                featureRevisionIds: [],
                isSeparatelyPurchasable: false,
            }).success,
        ).toBe(false);
    });

    test("does not allow a Draft update to change the Commercial Catalog Key", () => {
        expect(
            UpdateCommercialModuleDraftSchema.safeParse({
                key: "renamed",
                displayName: "Core Operations",
                description: "Updated",
                featureRevisionIds: ["22222222-2222-4222-8222-222222222222"],
                isSeparatelyPurchasable: false,
            }).success,
        ).toBe(false);
    });

    test("Module detail includes Feature memberships, empty Plans when none exist, and audit actors", () => {
        const createdBy = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", firstName: "Asha", lastName: "Shah" };
        const parsed = CommercialModuleDetailDTOSchema.parse({
            id: "aaaa1111-1111-4111-8111-111111111111",
            key: "core_operations",
            currentRevision: {
                id: "bbbb2222-2222-4222-8222-222222222222",
                moduleId: "aaaa1111-1111-4111-8111-111111111111",
                key: "core_operations",
                revisionNumber: 1,
                status: "active",
                displayName: "Core Operations",
                description: "Billing and reports",
                isSeparatelyPurchasable: false,
                priceInr: null,
                term: null,
                features: [{
                    featureId: "11111111-1111-4111-8111-111111111111",
                    featureRevisionId: "22222222-2222-4222-8222-222222222222",
                    key: "billing",
                    displayName: "Billing",
                    revisionNumber: 1,
                    status: "active",
                }],
                createdBy,
                createdAt: "2026-09-04T00:00:00.000Z",
                publishedBy: createdBy,
                publishedAt: "2026-09-04T01:00:00.000Z",
                retiredBy: null,
                retiredAt: null,
                discardedBy: null,
                discardedAt: null,
            },
            revisions: [],
            referencingPlans: [],
        });

        expect(parsed.currentRevision.features).toHaveLength(1);
        expect(parsed.referencingPlans).toEqual([]);
        expect(parsed.currentRevision.publishedBy?.firstName).toBe("Asha");
    });
});

describe("Commercial Catalog Plan contracts", () => {
    const moduleRevisionId = "bbbb2222-2222-4222-8222-222222222222";

    test("accepts a Trial Plan at ₹0 for seven days with Module revisions only", () => {
        expect(
            CreateCommercialPlanSchema.parse({
                key: " trial ",
                displayName: "  Trial ",
                description: "  Explore the starting product range ",
                planType: "trial",
                priceInr: 0,
                term: { count: 7, unit: "day" },
                moduleRevisionIds: [moduleRevisionId],
            }),
        ).toEqual({
            key: "trial",
            displayName: "Trial",
            description: "Explore the starting product range",
            planType: "trial",
            priceInr: 0,
            term: { count: 7, unit: "day" },
            moduleRevisionIds: [moduleRevisionId],
        });
    });

    test("accepts a paid Plan with a positive INR price and calendar term", () => {
        expect(
            CreateCommercialPlanSchema.parse({
                key: "core",
                displayName: "Core",
                planType: "paid",
                priceInr: 2999,
                term: { count: 1, unit: "year" },
                moduleRevisionIds: [moduleRevisionId],
            }),
        ).toMatchObject({
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            description: "",
        });
    });

    test("rejects direct Feature membership, empty Modules, and invalid Trial or paid prices", () => {
        const trial = {
            key: "trial",
            displayName: "Trial",
            planType: "trial" as const,
            priceInr: 0,
            term: { count: 7, unit: "day" as const },
            moduleRevisionIds: [moduleRevisionId],
        };

        expect(
            CreateCommercialPlanSchema.safeParse({
                ...trial,
                featureRevisionIds: ["22222222-2222-4222-8222-222222222222"],
            }).success,
        ).toBe(false);
        expect(CreateCommercialPlanSchema.safeParse({ ...trial, moduleRevisionIds: [] }).success).toBe(false);
        expect(CreateCommercialPlanSchema.safeParse({ ...trial, priceInr: 100 }).success).toBe(false);
        expect(
            CreateCommercialPlanSchema.safeParse({
                key: "core",
                displayName: "Core",
                planType: "paid",
                priceInr: 0,
                term: { count: 1, unit: "year" },
                moduleRevisionIds: [moduleRevisionId],
            }).success,
        ).toBe(false);
        expect(
            CreateCommercialPlanSchema.safeParse({
                key: "core",
                displayName: "Core",
                planType: "paid",
                priceInr: 2999.999,
                term: { count: 1, unit: "year" },
                moduleRevisionIds: [moduleRevisionId],
            }).success,
        ).toBe(false);
        expect(
            CreateCommercialPlanSchema.safeParse({
                key: "core",
                displayName: "Core",
                planType: "paid",
                priceInr: 2999,
                term: { count: 0, unit: "year" },
                moduleRevisionIds: [moduleRevisionId],
            }).success,
        ).toBe(false);
    });

    test("does not allow a Draft update to change the Commercial Catalog Key", () => {
        expect(
            UpdateCommercialPlanDraftSchema.safeParse({
                key: "renamed",
                displayName: "Core",
                description: "Updated",
                planType: "paid",
                priceInr: 2999,
                term: { count: 1, unit: "year" },
                moduleRevisionIds: [moduleRevisionId],
            }).success,
        ).toBe(false);
    });

    test("Plan detail includes selected Modules, resolved Features, and audit actors", () => {
        const createdBy = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", firstName: "Asha", lastName: "Shah" };
        const feature = {
            featureId: "11111111-1111-4111-8111-111111111111",
            featureRevisionId: "22222222-2222-4222-8222-222222222222",
            key: "billing",
            displayName: "Billing",
            revisionNumber: 1,
            status: "active" as const,
        };
        const parsed = CommercialPlanDetailDTOSchema.parse({
            id: "cccc3333-3333-4333-8333-333333333333",
            key: "trial",
            currentRevision: {
                id: "dddd4444-4444-4444-8444-444444444444",
                planId: "cccc3333-3333-4333-8333-333333333333",
                key: "trial",
                revisionNumber: 1,
                status: "active",
                displayName: "Trial",
                description: "Seven-day exploration",
                planType: "trial",
                priceInr: 0,
                term: { count: 7, unit: "day" },
                modules: [{
                    moduleId: "aaaa1111-1111-4111-8111-111111111111",
                    moduleRevisionId,
                    key: "core_operations",
                    displayName: "Core Operations",
                    revisionNumber: 1,
                    status: "active",
                    features: [feature],
                }],
                resolvedFeatures: [feature],
                createdBy,
                createdAt: "2026-09-04T00:00:00.000Z",
                publishedBy: createdBy,
                publishedAt: "2026-09-04T01:00:00.000Z",
                retiredBy: null,
                retiredAt: null,
                discardedBy: null,
                discardedAt: null,
            },
            revisions: [],
        });

        expect(parsed.currentRevision.modules).toHaveLength(1);
        expect(parsed.currentRevision.resolvedFeatures.map((item) => item.key)).toEqual(["billing"]);
        expect(parsed.currentRevision.publishedBy?.firstName).toBe("Asha");
    });
});

describe("Initial Commercial Catalog composition", () => {
    test("seeds the agreed Feature, Module, and Plan identities", () => {
        expect(SEEDED_COMMERCIAL_FEATURES).toEqual([
            { key: "billing", displayName: "Billing" },
            { key: "catalog_products", displayName: "Catalog Products" },
            { key: "units", displayName: "Units" },
            { key: "reports", displayName: "Reports" },
            { key: "vendors", displayName: "Vendors" },
            { key: "purchases", displayName: "Purchases" },
            { key: "expenses", displayName: "Expenses" },
            { key: "money_account_tracking", displayName: "Money Account Tracking" },
            { key: "kot_system", displayName: "KOT System" },
            { key: "table_management", displayName: "Table Management" },
            { key: "whatsapp", displayName: "WhatsApp" },
            { key: "google_contacts_synchronization", displayName: "Google Contacts Synchronization" },
        ]);
        expect(SEEDED_COMMERCIAL_MODULES.map((moduleItem) => ({
            key: moduleItem.key,
            displayName: moduleItem.displayName,
            featureKeys: [...moduleItem.featureKeys],
            isSeparatelyPurchasable: moduleItem.isSeparatelyPurchasable,
        }))).toEqual([
            { key: "core_operations", displayName: "Core Operations", featureKeys: ["billing", "reports"], isSeparatelyPurchasable: false },
            { key: "basic_catalog", displayName: "Basic Catalog", featureKeys: ["catalog_products", "units"], isSeparatelyPurchasable: false },
            { key: "finance", displayName: "Finance", featureKeys: ["vendors", "purchases", "expenses", "money_account_tracking"], isSeparatelyPurchasable: false },
            { key: "kot_system", displayName: "KOT System", featureKeys: ["kot_system"], isSeparatelyPurchasable: false },
            { key: "restaurant_operations", displayName: "Restaurant Operations", featureKeys: ["kot_system", "table_management"], isSeparatelyPurchasable: false },
            { key: "integrations", displayName: "Integrations", featureKeys: ["whatsapp", "google_contacts_synchronization"], isSeparatelyPurchasable: true },
        ]);
        expect(SEEDED_COMMERCIAL_PLANS.map((planItem) => ({
            key: planItem.key,
            displayName: planItem.displayName,
            planType: planItem.planType,
            priceInr: planItem.priceInr,
            term: planItem.term,
            moduleKeys: [...planItem.moduleKeys],
        }))).toEqual([
            {
                key: "trial",
                displayName: "Trial",
                planType: "trial",
                priceInr: 0,
                term: { count: 7, unit: "day" },
                moduleKeys: ["core_operations", "basic_catalog", "finance", "kot_system", "restaurant_operations", "integrations"],
            },
            {
                key: "core",
                displayName: "Core",
                planType: "paid",
                priceInr: 2999,
                term: { count: 1, unit: "year" },
                moduleKeys: ["core_operations", "basic_catalog"],
            },
            {
                key: "pro",
                displayName: "Pro",
                planType: "paid",
                priceInr: 4999,
                term: { count: 1, unit: "year" },
                moduleKeys: ["core_operations", "basic_catalog", "finance", "restaurant_operations"],
            },
        ]);
    });

    test("offers Table Management only with KOT System, while KOT System can stand alone", () => {
        const kotOnly = SEEDED_COMMERCIAL_MODULES.find((moduleItem) => moduleItem.key === "kot_system");
        const restaurant = SEEDED_COMMERCIAL_MODULES.find((moduleItem) => moduleItem.key === "restaurant_operations");
        const tableOnly = SEEDED_COMMERCIAL_MODULES.filter((moduleItem) =>
            moduleItem.featureKeys.includes("table_management") && !moduleItem.featureKeys.includes("kot_system"),
        );

        expect(kotOnly?.featureKeys).toEqual(["kot_system"]);
        expect(restaurant?.featureKeys).toEqual(["kot_system", "table_management"]);
        expect(tableOnly).toEqual([]);
        expect(SEEDED_COMMERCIAL_PLANS.find((planItem) => planItem.key === "pro")?.moduleKeys).not.toContain("integrations");
        expect(SEEDED_COMMERCIAL_MODULES.find((moduleItem) => moduleItem.key === "integrations")).toMatchObject({
            isSeparatelyPurchasable: true,
            priceInr: 2999,
            term: { count: 1, unit: "year" },
        });
    });
});
