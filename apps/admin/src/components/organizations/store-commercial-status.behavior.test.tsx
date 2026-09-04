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
        availablePaidPlans: [],
        pendingCheckout: null,
        commercialHistory: [],
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
const availablePlansStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...eligibleStatus.commercialStatus,
        availablePaidPlans: [
            {
                key: "core",
                displayName: "Core",
                priceInr: 2999,
                term: { count: 1, unit: "year" },
                licenseTiming: "immediate",
                intendedStartsAt: startsAt,
                intendedEndsAt: new Date("2027-09-04T15:00:00.000Z"),
            },
        ],
    },
};
const pendingQuoteStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...availablePlansStatus.commercialStatus,
        pendingCheckout: {
            id: "00000000-0000-4000-8000-000000000201",
            kind: "paid_plan",
            status: "open",
            planKey: "core",
            planDisplayName: "Core",
            planType: "paid",
            priceInr: 2999,
            amountInr: 2999,
            amountPaise: 299900,
            currency: "INR",
            term: { count: 1, unit: "year" },
            licenseTiming: "immediate",
            intendedStartsAt: startsAt,
            intendedEndsAt: new Date("2027-09-04T15:00:00.000Z"),
            expiresAt: new Date("2026-09-04T15:30:00.000Z"),
            razorpayOrderId: "order_test_001",
            lineItems: [{ description: "Core Plan", amountInr: 2999 }],
            fulfilledAt: null,
        },
        commercialHistory: [
            {
                kind: "quote",
                id: "00000000-0000-4000-8000-000000000201",
                occurredAt: startsAt,
                title: "Commercial Quote for Core",
                detail: "₹2,999.00 GST-inclusive · Term Purchase",
                amountInr: 2999,
                status: "open",
            },
        ],
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
const activePaidStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...pendingQuoteStatus.commercialStatus,
        baseAccess: {
            id: "00000000-0000-4000-8000-000000000301",
            sourceKind: "store_license",
            planKey: "core",
            planDisplayName: "Core",
            planType: "paid",
            term: { count: 1, unit: "year" },
            startsAt,
            endsAt: new Date("2027-09-04T15:00:00.000Z"),
            status: "active",
        },
        availablePaidPlans: [],
        pendingCheckout: null,
        trial: {
            eligible: false,
            message: "This Store has already used its standard Trial Plan.",
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
        expect(markup).toContain("No active plan");
        expect(markup).toContain("This Store can start the standard Trial Plan once.");
        expect(markup).toContain("Start Trial");
        expect(markup).toContain("No features are currently enabled on this store.");
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
        expect(markup).toContain("Additional access grants");
        expect(markup).toContain("Legacy migration grant");
        expect(markup).toContain("All current Modules");
        expect(markup).toContain("Billing");
        expect(markup).toContain("Asia/Kolkata");
        expect(markup).not.toContain("Complimentary Store Access Grant");
        expect(markup).toContain("Start Trial");
    });
    test("shows an exact GST-inclusive paid Plan quote without treating browser checkout as access", () => {
        const plans = renderStatus(availablePlansStatus);
        const pending = renderStatus(pendingQuoteStatus);
        expect(plans).toContain("Choose a paid plan");
        expect(plans).toContain("Choose Core");
        expect(plans).toContain("GST-inclusive");
        expect(pending).toContain("Complete your purchase");
        expect(pending).toContain("Checkout ready");
        expect(pending).toContain("with Razorpay");
        expect(pending).toContain("Quote expires");
        expect(pending).toContain("Activity &amp; billing history");
        expect(pending).not.toContain("Confirming your payment");
        expect(pending).toContain("No active plan");
        expect(pending).not.toContain(">Active<");
    });
    test("hides checkout and trial actions after paid access is active", () => {
        const markup = renderStatus(activePaidStatus);
        expect(markup).toContain("Active");
        expect(markup).toContain("Core");
        expect(markup).not.toContain("Complete your purchase");
        expect(markup).not.toContain("Choose Core");
        expect(markup).not.toContain("Start Trial");
        expect(markup).not.toContain("Commercial Quote for Core");
    });
});
