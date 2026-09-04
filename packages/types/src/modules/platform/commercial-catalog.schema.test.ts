import { describe, expect, test } from "bun:test";

import {
    COMMERCIAL_CATALOG_KEY_MESSAGE,
    CommercialCatalogKeySchema,
    CommercialFeatureDetailDTOSchema,
    CommercialFeatureListQuerySchema,
    CreateCommercialFeatureSchema,
    UpdateCommercialFeatureDraftSchema,
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
        });

        expect(parsed.currentRevision.status).toBe("active");
        expect(parsed.currentRevision.publishedBy?.firstName).toBe("Asha");
        expect(parsed.key).toBe("billing");
    });
});
