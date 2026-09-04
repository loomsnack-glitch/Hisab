import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { StoreCommercialStatusResponse } from "@repo/types";

import StoreCommercialStatus from "./store-commercial-status";
import { commercialLicenseKeys } from "@/lib/query-keys";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "11111111-1111-4111-8111-111111111111";
const startsAt = new Date("2026-09-04T15:00:00.000Z");
const endsAt = new Date("2026-09-11T15:00:00.000Z");

const eligibleStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        storeId,
        organizationId,
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
            storeId,
            features: [],
        },
    },
};

const activeTrialStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...eligibleStatus.commercialStatus,
        baseAccess: {
            id: "00000000-0000-4000-8000-000000000001",
            sourceKind: "store_license",
            planKey: "trial",
            planDisplayName: "Trial",
            planType: "trial",
            term: { count: 7, unit: "day" },
            startsAt,
            endsAt,
            status: "active",
        },
        trial: {
            eligible: false,
            message: "This Store has already used its standard Trial Plan.",
        },
        entitlements: {
            storeId,
            features: [
                {
                    key: "billing",
                    displayName: "Billing",
                    sources: [
                        {
                            sourceKind: "store_license",
                            sourceId: "00000000-0000-4000-8000-000000000001",
                            moduleKey: "core_operations",
                            moduleDisplayName: "Core Operations",
                            featureDisplayName: "Billing",
                            startsAt,
                            endsAt,
                        },
                    ],
                },
            ],
        },
    },
};

const migrationGrantStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...eligibleStatus.commercialStatus,
        accessGrants: [
            {
                id: "00000000-0000-4000-8000-000000000101",
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
                startsAt,
                endsAt: new Date("2026-10-04T15:00:00.000Z"),
                status: "active",
                modules: [
                    {
                        key: "core_operations",
                        displayName: "Core Operations",
                        features: [{ key: "billing", displayName: "Billing" }],
                    },
                ],
            },
        ],
        entitlements: {
            storeId,
            features: [
                {
                    key: "billing",
                    displayName: "Billing",
                    sources: [
                        {
                            sourceKind: "store_access_grant",
                            sourceId: "00000000-0000-4000-8000-000000000101",
                            moduleKey: "core_operations",
                            moduleDisplayName: "Core Operations",
                            featureDisplayName: "Billing",
                            startsAt,
                            endsAt: new Date("2026-10-04T15:00:00.000Z"),
                        },
                    ],
                },
            ],
        },
    },
};

const renderStatus = (data: StoreCommercialStatusResponse) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(commercialLicenseKeys.status(organizationId, storeId), {
        status: "success",
        data,
        message: "Store commercial status fetched successfully",
        code: 200,
    });

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <StoreCommercialStatus organizationId={organizationId} storeId={storeId} />
        </QueryClientProvider>,
    );
};

describe("Store commercial status", () => {
    test("shows Trial eligibility and the start action from server status", () => {
        const markup = renderStatus(eligibleStatus);

        expect(markup).toContain("Store License");
        expect(markup).toContain("No current Plan on this Store");
        expect(markup).toContain("This Store can start the standard Trial Plan once.");
        expect(markup).toContain("Start Trial");
        expect(markup).toContain("This Store has no current Feature Entitlement.");
        expect(markup).not.toContain("Billing");
    });

    test("shows the active Trial Plan, expiry timezone, and Feature Entitlement without a second start action", () => {
        const markup = renderStatus(activeTrialStatus);

        expect(markup).toContain("Trial");
        expect(markup).toContain("Asia/Kolkata");
        expect(markup).toContain("Billing");
        expect(markup).toContain("This Store has already used its standard Trial Plan.");
        expect(markup).not.toContain("Start Trial");
        expect(markup).not.toContain("This Store can start the standard Trial Plan once.");
    });

    test("shows a legacy migration grant's source, Features, and expiry separately from a Trial", () => {
        const markup = renderStatus(migrationGrantStatus);

        expect(markup).toContain("Access Grants");
        expect(markup).toContain("Legacy migration grant");
        expect(markup).toContain("All current Modules");
        expect(markup).toContain("Billing");
        expect(markup).toContain("Asia/Kolkata");
        expect(markup).not.toContain("Complimentary Store Access Grant");
        expect(markup).toContain("Start Trial");
    });
});
