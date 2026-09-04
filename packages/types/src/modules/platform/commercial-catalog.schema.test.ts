import { describe, expect, test } from "bun:test";

import {
    COMMERCIAL_CATALOG_KEY_MESSAGE,
    CommercialCatalogKeySchema,
    CommercialFeatureDetailDTOSchema,
    CommercialFeatureListQuerySchema,
    CommercialModuleDetailDTOSchema,
    CreateCommercialFeatureSchema,
    CreateCommercialModuleSchema,
    UpdateCommercialFeatureDraftSchema,
    UpdateCommercialModuleDraftSchema,
} from "./commercial-catalog.schema";

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
        });

        expect(parsed.currentRevision.status).toBe("active");
        expect(parsed.currentRevision.publishedBy?.firstName).toBe("Asha");
        expect(parsed.key).toBe("billing");
        expect(parsed.referencingModules).toEqual([]);
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
