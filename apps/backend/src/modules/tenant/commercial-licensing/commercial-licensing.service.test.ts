import { describe, expect, test } from "bun:test";
import { STATUS_CODES } from "@repo/types";

import {
    createMemoryCommercialLicensing,
    createTrialPlanSnapshot,
    organizationId,
    otherStoreId,
    outsiderId,
    outsiderStoreId,
    otherOrganizationId,
    storeId,
    trialEnd,
    trialStart,
    userId,
} from "./commercial-licensing.test-harness";

describe("Commercial Licensing standard Trial", () => {
    test("starts the standard Trial Plan once with Asia/Kolkata term timing and snapshotted Features", async () => {
        const memory = createMemoryCommercialLicensing();

        const started = await memory.service.startStandardTrial(userId, organizationId, storeId);

        expect(started.status).toBe("success");
        expect(started.code).toBe(STATUS_CODES.CREATED);
        expect(started.data?.commercialStatus.timezone).toBe("Asia/Kolkata");
        expect(started.data?.commercialStatus.baseAccess).toEqual(expect.objectContaining({
            planKey: "trial",
            planDisplayName: "Trial",
            planType: "trial",
            status: "active",
            startsAt: trialStart,
            endsAt: trialEnd,
            term: { count: 7, unit: "day" },
        }));
        expect(started.data?.commercialStatus.trial.eligible).toBe(false);
        expect(started.data?.commercialStatus.entitlements.features.map((feature) => feature.key).sort()).toEqual([
            "billing",
            "reports",
            "whatsapp",
        ]);
        expect(started.data?.commercialStatus.entitlements.features[0]?.sources[0]).toEqual(
            expect.objectContaining({
                sourceKind: "store_license",
                moduleKey: expect.any(String),
                endsAt: trialEnd,
            }),
        );

        memory.setTrialPlan(createTrialPlanSnapshot({
            displayName: "Revised Trial",
            modules: [],
        }));
        const later = await memory.service.resolveFeatureEntitlement(storeId, "billing", trialStart);
        expect(later.entitled).toBe(true);
        expect(later.evidence[0]?.featureDisplayName).toBe("Billing");
    });

    test("rejects a repeat self-service trial while leaving another newly created Store eligible", async () => {
        const memory = createMemoryCommercialLicensing();
        await memory.service.startStandardTrial(userId, organizationId, storeId);

        const repeat = await memory.service.startStandardTrial(userId, organizationId, storeId);
        const otherStore = await memory.service.getStoreCommercialStatus(userId, organizationId, otherStoreId);
        const otherStart = await memory.service.startStandardTrial(userId, organizationId, otherStoreId);

        expect(repeat.status).toBe("error");
        expect(repeat.code).toBe(STATUS_CODES.CONFLICT);
        expect(repeat.message).toBe("This Store has already used its standard Trial Plan.");
        expect(otherStore.data?.commercialStatus.trial.eligible).toBe(true);
        expect(otherStart.status).toBe("success");
        expect(otherStart.data?.commercialStatus.baseAccess?.planKey).toBe("trial");
        expect(otherStart.data?.commercialStatus.storeId).toBe(otherStoreId);
    });

    test("does not treat an expired Trial as currently entitled, and still blocks a second self-service start", async () => {
        const memory = createMemoryCommercialLicensing();
        await memory.service.startStandardTrial(userId, organizationId, storeId);
        memory.setNow(trialEnd);

        const status = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);
        const entitlement = await memory.service.resolveFeatureEntitlement(storeId, "billing", trialEnd);
        const repeat = await memory.service.startStandardTrial(userId, organizationId, storeId);

        expect(status.data?.commercialStatus.baseAccess).toBeNull();
        expect(status.data?.commercialStatus.trial.eligible).toBe(false);
        expect(status.data?.commercialStatus.entitlements.features).toEqual([]);
        expect(entitlement.entitled).toBe(false);
        expect(repeat.code).toBe(STATUS_CODES.CONFLICT);
    });

    test("hides another Organization's Store and rejects an outsider", async () => {
        const memory = createMemoryCommercialLicensing();

        const hidden = await memory.service.getStoreCommercialStatus(userId, organizationId, outsiderStoreId);
        const outsider = await memory.service.startStandardTrial(outsiderId, organizationId, storeId);
        const otherOrg = await memory.service.getStoreCommercialStatus(
            userId,
            otherOrganizationId,
            storeId,
        );

        expect(hidden.code).toBe(STATUS_CODES.NOT_FOUND);
        expect(hidden.message).toBe("Store not found");
        expect(outsider.code).toBe(STATUS_CODES.NOT_FOUND);
        expect(outsider.message).toBe("Organization not found");
        expect(otherOrg.code).toBe(STATUS_CODES.NOT_FOUND);
        expect(otherOrg.message).toBe("Store not found");
    });

    test("rejects starting a Trial when no active Trial Plan exists in the Commercial Catalog", async () => {
        const memory = createMemoryCommercialLicensing();
        memory.setTrialPlan(null);

        const status = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);
        const started = await memory.service.startStandardTrial(userId, organizationId, storeId);

        expect(status.data?.commercialStatus.trial).toEqual({
            eligible: false,
            message: "The standard Trial Plan is not currently available.",
        });
        expect(started.code).toBe(STATUS_CODES.CONFLICT);
        expect(started.message).toBe("The standard Trial Plan is not currently available.");
    });
});
