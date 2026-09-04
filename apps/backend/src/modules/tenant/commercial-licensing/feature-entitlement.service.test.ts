import { describe, expect, test } from "bun:test";

import {
    billingFeature,
    createMemoryCommercialLicensing,
    integrationsModule,
    otherStoreId,
    reportsFeature,
    storeId,
    trialEnd,
    trialStart,
    whatsappFeature,
} from "./commercial-licensing.test-harness";

describe("Feature Entitlement", () => {
    test("resolves the union of active Plan, Co-Term Add-On, and Store Access Grant snapshots", async () => {
        const memory = createMemoryCommercialLicensing();
        memory.addAccessSource({
            id: "aaaa0001-0000-4000-8000-000000000001",
            kind: "store_license",
            storeId,
            organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            startsAt: trialStart,
            endsAt: trialEnd,
            revokedAt: null,
            planKey: "trial",
            planDisplayName: "Trial",
            planType: "trial",
            term: { count: 7, unit: "day" },
            modules: [{
                moduleId: "dddd1111-1111-4111-8111-111111111111",
                moduleRevisionId: "dddd1111-2222-4222-8222-222222222222",
                key: "core_operations",
                displayName: "Core Operations",
                features: [billingFeature, reportsFeature],
            }],
        });
        memory.addAccessSource({
            id: "aaaa0002-0000-4000-8000-000000000002",
            kind: "co_term_add_on",
            storeId,
            organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            startsAt: trialStart,
            endsAt: trialEnd,
            revokedAt: null,
            planKey: null,
            planDisplayName: null,
            planType: null,
            term: { count: 7, unit: "day" },
            modules: [integrationsModule],
        });
        memory.addAccessSource({
            id: "aaaa0003-0000-4000-8000-000000000003",
            kind: "store_access_grant",
            storeId,
            organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            startsAt: trialStart,
            endsAt: trialEnd,
            revokedAt: null,
            planKey: null,
            planDisplayName: null,
            planType: null,
            term: { count: 7, unit: "day" },
            modules: [{
                moduleId: "dddd1111-1111-4111-8111-111111111111",
                moduleRevisionId: "dddd1111-2222-4222-8222-222222222222",
                key: "core_operations",
                displayName: "Core Operations",
                features: [billingFeature],
            }],
        });

        const entitlement = await memory.featureEntitlement.resolveStoreFeatureEntitlement(storeId, trialStart);
        const billing = await memory.featureEntitlement.resolveFeatureEntitlement(storeId, "billing", trialStart);
        const whatsapp = await memory.featureEntitlement.resolveFeatureEntitlement(storeId, "whatsapp", trialStart);

        expect(entitlement.features.map((feature) => feature.key).sort()).toEqual([
            "billing",
            "reports",
            "whatsapp",
        ]);
        expect(billing.entitled).toBe(true);
        expect(billing.evidence.map((item) => item.sourceKind).sort()).toEqual([
            "store_access_grant",
            "store_license",
        ]);
        expect(whatsapp.entitled).toBe(true);
        expect(whatsapp.evidence).toEqual([
            expect.objectContaining({
                sourceKind: "co_term_add_on",
                moduleKey: "integrations",
                featureDisplayName: "WhatsApp",
                endsAt: trialEnd,
            }),
        ]);
    });

    test("ignores expired, revoked, and not-yet-started sources and does not read live catalog state", async () => {
        const memory = createMemoryCommercialLicensing();
        memory.addAccessSource({
            id: "bbbb0001-0000-4000-8000-000000000001",
            kind: "store_license",
            storeId,
            organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            startsAt: trialStart,
            endsAt: trialEnd,
            revokedAt: null,
            planKey: "trial",
            planDisplayName: "Trial",
            planType: "trial",
            term: { count: 7, unit: "day" },
            modules: [{
                moduleId: "dddd1111-1111-4111-8111-111111111111",
                moduleRevisionId: "dddd1111-2222-4222-8222-222222222222",
                key: "core_operations",
                displayName: "Core Operations",
                features: [billingFeature],
            }],
        });
        memory.addAccessSource({
            id: "bbbb0002-0000-4000-8000-000000000002",
            kind: "store_access_grant",
            storeId,
            organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            startsAt: trialStart,
            endsAt: trialEnd,
            revokedAt: trialStart,
            planKey: null,
            planDisplayName: null,
            planType: null,
            term: { count: 7, unit: "day" },
            modules: [integrationsModule],
        });
        memory.addAccessSource({
            id: "bbbb0003-0000-4000-8000-000000000003",
            kind: "co_term_add_on",
            storeId,
            organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            startsAt: trialEnd,
            endsAt: new Date("2026-09-18T15:00:00.000Z"),
            revokedAt: null,
            planKey: null,
            planDisplayName: null,
            planType: null,
            term: { count: 7, unit: "day" },
            modules: [{
                moduleId: "dddd1111-1111-4111-8111-111111111111",
                moduleRevisionId: "dddd1111-2222-4222-8222-222222222222",
                key: "core_operations",
                displayName: "Core Operations",
                features: [reportsFeature],
            }],
        });

        const duringTrial = await memory.featureEntitlement.resolveFeatureEntitlement(
            storeId,
            "billing",
            new Date("2026-09-08T12:00:00.000Z"),
        );
        const afterExpiry = await memory.featureEntitlement.resolveFeatureEntitlement(storeId, "billing", trialEnd);
        const whatsapp = await memory.featureEntitlement.resolveFeatureEntitlement(storeId, "whatsapp", trialStart);
        const reports = await memory.featureEntitlement.resolveFeatureEntitlement(storeId, "reports", trialStart);

        expect(duringTrial.entitled).toBe(true);
        expect(afterExpiry.entitled).toBe(false);
        expect(whatsapp.entitled).toBe(false);
        expect(reports.entitled).toBe(false);
    });

    test("does not leak another Store's access inside the same Organization", async () => {
        const memory = createMemoryCommercialLicensing();
        memory.addAccessSource({
            id: "cccc0001-0000-4000-8000-000000000001",
            kind: "store_license",
            storeId,
            organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            startsAt: trialStart,
            endsAt: trialEnd,
            revokedAt: null,
            planKey: "trial",
            planDisplayName: "Trial",
            planType: "trial",
            term: { count: 7, unit: "day" },
            modules: [{
                moduleId: "dddd1111-1111-4111-8111-111111111111",
                moduleRevisionId: "dddd1111-2222-4222-8222-222222222222",
                key: "core_operations",
                displayName: "Core Operations",
                features: [billingFeature],
            }],
        });

        const otherStore = await memory.featureEntitlement.resolveFeatureEntitlement(
            otherStoreId,
            "billing",
            trialStart,
        );
        const missing = await memory.featureEntitlement.resolveFeatureEntitlement(
            storeId,
            "google_contacts_synchronization",
            trialStart,
        );

        expect(otherStore.entitled).toBe(false);
        expect(otherStore.evidence).toEqual([]);
        expect(missing.entitled).toBe(false);
        expect(missing.evidence).toEqual([]);
    });
});
