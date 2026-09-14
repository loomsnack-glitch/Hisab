import { describe, expect, test } from "bun:test";
import type { StoreCommercialStatusDTO } from "@repo/types";

import {
    buildAccessTimelineEntries,
    currentPlanAction,
    isLicensePlanCatalogOpen,
    parseLicenseWorkspaceTab,
    remainingTermPercent,
    resolvePreviousPaidPlan,
    shouldShowPlanCatalogByDefault,
    orderedLicenseCatalogCards,
    shouldIncludeTrialInCatalog,
    visiblePaidPlans,
} from "./store-license-workspace";

const storeId = "11111111-1111-4111-8111-111111111111";
const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const startsAt = new Date("2026-09-04T15:00:00.000Z");
const endsAt = new Date("2027-09-04T15:00:00.000Z");

const emptyStatus = (): StoreCommercialStatusDTO => ({
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
    trial: {
        eligible: true,
        message: "This Store can start the standard Trial Plan once.",
    },
    entitlements: { storeId, features: [] },
});

const corePlan = {
    key: "core",
    displayName: "Core",
    checkoutAction: "term_purchase" as const,
    priceInr: 2999,
    amountInr: 2999,
    term: { count: 1, unit: "year" as const },
    licenseTiming: "immediate" as const,
    intendedStartsAt: startsAt,
    intendedEndsAt: endsAt,
    isRecommended: true,
    displaySequence: 2,
};

describe("license workspace view model", () => {
    test("defaults unknown tab values to Plans", () => {
        expect(parseLicenseWorkspaceTab(null)).toBe("plans");
        expect(parseLicenseWorkspaceTab("payments")).toBe("payments");
        expect(parseLicenseWorkspaceTab("history")).toBe("history");
        expect(parseLicenseWorkspaceTab("unknown")).toBe("plans");
    });

    test("opens the catalog when a Store has no current access and no reusable previous Plan", () => {
        const status = {
            ...emptyStatus(),
            availablePaidPlans: [corePlan],
        };

        expect(shouldShowPlanCatalogByDefault(status)).toBe(true);
        expect(isLicensePlanCatalogOpen(null, status)).toBe(true);
        expect(resolvePreviousPaidPlan(status)).toBeNull();
        expect(shouldIncludeTrialInCatalog(status)).toBe(false);
    });

    test("keeps the previous expired Plan when that Plan is still sellable", () => {
        const status: StoreCommercialStatusDTO = {
            ...emptyStatus(),
            availablePaidPlans: [corePlan],
            storeLicenses: [{
                id: "00000000-0000-4000-8000-000000000301",
                sourceKind: "store_license",
                planKey: "core",
                planDisplayName: "Core",
                planType: "paid",
                term: { count: 1, unit: "year" },
                startsAt,
                endsAt,
                status: "expired",
            }],
        };

        expect(shouldShowPlanCatalogByDefault(status)).toBe(false);
        expect(isLicensePlanCatalogOpen("1", status)).toBe(true);
        expect(shouldIncludeTrialInCatalog({
            ...status,
            availableTrialPlan: {
                key: "trial",
                displayName: "Trial",
                description: "Try before you buy.",
                term: { count: 7, unit: "day" },
                isBestValue: false,
                isRecommended: false,
                displaySequence: 1,
                modules: [],
            },
        })).toBe(false);
        expect(resolvePreviousPaidPlan(status)).toEqual({
            planKey: "core",
            planDisplayName: "Core",
            status: "expired",
            startsAt,
            endsAt,
            availablePlan: corePlan,
        });
    });

    test("falls back to the full catalog when the previous Plan is no longer sellable", () => {
        const status: StoreCommercialStatusDTO = {
            ...emptyStatus(),
            availablePaidPlans: [{ ...corePlan, key: "starter", displayName: "Starter" }],
            storeLicenses: [{
                id: "00000000-0000-4000-8000-000000000301",
                sourceKind: "store_license",
                planKey: "legacy_pro",
                planDisplayName: "Legacy Pro",
                planType: "paid",
                term: { count: 1, unit: "year" },
                startsAt,
                endsAt,
                status: "expired",
            }],
        };

        expect(resolvePreviousPaidPlan(status)?.availablePlan).toBeNull();
        expect(shouldShowPlanCatalogByDefault(status)).toBe(true);
        expect(shouldIncludeTrialInCatalog({
            ...status,
            availableTrialPlan: {
                key: "trial",
                displayName: "Trial",
                description: "Try before you buy.",
                term: { count: 7, unit: "day" },
                isBestValue: false,
                isRecommended: false,
                displaySequence: 1,
                modules: [],
            },
        })).toBe(true);
    });

    test("orders catalog cards by display sequence even when Trial is included", () => {
        const trialPlan = {
            key: "trial",
            displayName: "Trial",
            description: "Try before you buy.",
            term: { count: 7, unit: "day" as const },
            isBestValue: false,
            isRecommended: false,
            displaySequence: 3,
            modules: [],
        };
        const proPlan = {
            ...corePlan,
            key: "pro",
            displayName: "Pro",
            isRecommended: false,
            displaySequence: 1,
            isBestValue: true,
        };

        expect(orderedLicenseCatalogCards({
            trialPlan,
            plans: [corePlan, proPlan],
        }).map((card) => card.key)).toEqual(["pro", "core", "trial"]);
    });

    test("hides renewal options after a Scheduled Store License is already in place", () => {
        const status: StoreCommercialStatusDTO = {
            ...emptyStatus(),
            scheduledSuccessor: {
                id: "00000000-0000-4000-8000-000000000401",
                sourceKind: "store_license",
                planKey: "core",
                planDisplayName: "Core",
                planType: "paid",
                term: { count: 1, unit: "year" },
                startsAt: endsAt,
                endsAt: new Date("2028-09-04T15:00:00.000Z"),
                status: "scheduled",
            },
            availablePaidPlans: [
                { ...corePlan, checkoutAction: "renewal", licenseTiming: "scheduled" },
                { ...corePlan, key: "pro", displayName: "Pro", checkoutAction: "upgrade", amountInr: 1000 },
            ],
        };

        expect(visiblePaidPlans(status).map((plan) => plan.key)).toEqual(["pro"]);
        expect(currentPlanAction({
            ...status,
            baseAccess: {
                id: "00000000-0000-4000-8000-000000000301",
                sourceKind: "store_license",
                planKey: "core",
                planDisplayName: "Core",
                planType: "paid",
                term: { count: 1, unit: "year" },
                startsAt,
                endsAt,
                status: "active",
            },
        })).toEqual({ kind: "scheduled", label: "Next term already scheduled" });
    });

    test("builds Plan history from Store Licenses and Store Access Grants", () => {
        const status: StoreCommercialStatusDTO = {
            ...emptyStatus(),
            storeLicenses: [{
                id: "license-1",
                sourceKind: "store_license",
                planKey: "core",
                planDisplayName: "Core",
                planType: "paid",
                term: { count: 1, unit: "year" },
                startsAt,
                endsAt,
                status: "expired",
            }],
            accessGrants: [{
                id: "grant-1",
                sourceKind: "store_access_grant",
                origin: "legacy_migration",
                termKind: "complimentary",
                selectionKind: "all_current_modules",
                label: "Legacy migration grant",
                selectionLabel: "All current Modules",
                planKey: null,
                planDisplayName: null,
                moduleKey: null,
                moduleDisplayName: null,
                term: { count: 30, unit: "day" },
                startsAt: new Date("2026-08-01T15:00:00.000Z"),
                endsAt: new Date("2026-09-01T15:00:00.000Z"),
                status: "expired",
                modules: [],
            }],
        };

        expect(buildAccessTimelineEntries(status).map((entry) => entry.id)).toEqual(["grant-1", "license-1"]);
    });

    test("reports remaining term as a percent of the current Store License window", () => {
        expect(remainingTermPercent(
            { startsAt, endsAt },
            new Date("2026-09-04T15:00:00.000Z"),
        )).toBe(100);
        expect(remainingTermPercent(
            { startsAt, endsAt },
            new Date("2027-09-04T15:00:00.000Z"),
        )).toBe(0);
    });
});
