import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { StoreCommercialStatusResponse, StoreDTO, StoreWithDevicesDTO } from "@repo/types";

import { commercialLicenseKeys, organizationKeys } from "@/lib/query-keys";
import { getStoreLicensePath } from "@/lib/store-workspace-routes";
import StoreWorkspaceLicensePage from "@/pages/store-workspace-license-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-09-07T03:19:00.000Z");

const store: StoreWithDevicesDTO = {
    id: storeId,
    organizationId,
    name: "Adajan",
    address: "Ring Road",
    reviewPlatform: null,
    reviewLink: null,
    socialMediaName: null,
    socialMediaLink: null,
    whatsappLinks: [],
    kotSystemEnabled: false,
    tableManagementEnabled: false,
    moneyAccountTrackingEnabled: false,
    devices: [],
    createdBy: "11111111-1111-4111-8111-111111111111",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const organizationResponse = {
    status: "success" as const,
    data: {
        organization: {
            id: organizationId,
            name: "Panini House",
            username: "panini_house",
            tagline: null,
            createdBy: store.createdBy,
            updatedBy: null,
            createdAt: now,
            updatedAt: now,
            stores: [store],
        },
    },
    message: "Organization fetched successfully",
    code: 200,
};

const storeResponse = (entry: StoreDTO) => ({
    status: "success" as const,
    data: { store: entry },
    message: "Store fetched successfully",
    code: 200,
});

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
        availableCoTermAddOns: [],
        pendingCheckout: null,
        commercialHistory: [],
        trial: {
            eligible: true,
            message: "This Store can start the standard Trial Plan once.",
        },
        availableTrialPlan: {
            key: "trial",
            displayName: "Trial",
            description: "Try every included Module before you buy.",
            term: { count: 7, unit: "day" },
            isBestValue: false,
            isRecommended: false,
            displaySequence: 1,
            modules: [{
                key: "core_operations",
                displayName: "Core Operations",
                features: [{ key: "billing", displayName: "Billing" }],
            }],
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
            id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            sourceKind: "store_license",
            planKey: "trial",
            planDisplayName: "Trial",
            planType: "trial",
            term: { count: 7, unit: "day" },
            startsAt: new Date("2026-09-07T03:19:00.000Z"),
            endsAt: new Date("2026-09-14T03:19:00.000Z"),
            status: "active",
        },
        trial: {
            eligible: false,
            message: "This Store has already used its standard Trial Plan.",
        },
        entitlements: {
            storeId,
            features: [{
                key: "billing",
                displayName: "Billing",
                sources: [{
                    sourceKind: "store_license",
                    sourceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                    moduleKey: "core_operations",
                    moduleDisplayName: "Core Operations",
                    featureDisplayName: "Billing",
                    startsAt: new Date("2026-09-07T03:19:00.000Z"),
                    endsAt: new Date("2026-09-14T03:19:00.000Z"),
                }],
            }],
        },
    },
};

const extendedTrialStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...activeTrialStatus.commercialStatus,
        accessGrants: [{
            id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            sourceKind: "store_access_grant",
            origin: "administrator",
            termKind: "custom_range",
            selectionKind: "plan",
            label: "Custom Store Access Grant",
            selectionLabel: "Trial",
            planKey: "trial",
            planDisplayName: "Trial",
            moduleKey: null,
            moduleDisplayName: null,
            term: { count: 30, unit: "day" },
            startsAt: new Date("2026-09-07T03:19:00.000Z"),
            endsAt: new Date("2026-10-07T03:19:00.000Z"),
            status: "active",
            modules: [],
        }],
    },
};

const corePlan = {
    key: "core",
    displayName: "Core",
    description: "Everything you need to get started.",
    checkoutAction: "term_purchase" as const,
    priceInr: 2999,
    amountInr: 2999,
    term: { count: 1, unit: "year" as const },
    licenseTiming: "immediate" as const,
    intendedStartsAt: now,
    intendedEndsAt: new Date("2027-09-07T03:19:00.000Z"),
    isBestValue: false,
    isRecommended: true,
    displaySequence: 2,
    modules: [{
        key: "core_operations",
        displayName: "Core Operations",
        features: [{ key: "billing", displayName: "Billing" }],
    }],
};

const proPlan = {
    key: "pro",
    displayName: "Pro",
    description: "Everything in Core, plus advanced business tools.",
    checkoutAction: "term_purchase" as const,
    priceInr: 4999,
    amountInr: 4999,
    term: { count: 1, unit: "year" as const },
    licenseTiming: "immediate" as const,
    intendedStartsAt: now,
    intendedEndsAt: new Date("2027-09-07T03:19:00.000Z"),
    isBestValue: true,
    isRecommended: false,
    displaySequence: 3,
    modules: [{
        key: "restaurant_operations",
        displayName: "Restaurant Operations",
        features: [{ key: "table_management", displayName: "Table Management" }],
    }],
};

const availablePlansStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...eligibleStatus.commercialStatus,
        availablePaidPlans: [corePlan, proPlan],
    },
};

const pendingCheckoutStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...availablePlansStatus.commercialStatus,
        pendingCheckout: {
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
            intendedStartsAt: now,
            intendedEndsAt: new Date("2027-09-07T03:19:00.000Z"),
            expiresAt: new Date("2026-09-07T03:49:00.000Z"),
            razorpayOrderId: "order_test_001",
            lineItems: [{ description: "Core Plan", amountInr: 2999 }],
            fulfilledAt: null,
        },
    },
};

const expiredPaidStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...availablePlansStatus.commercialStatus,
        trial: {
            eligible: false,
            message: "This Store has already used its standard Trial Plan.",
        },
        storeLicenses: [{
            id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            sourceKind: "store_license",
            planKey: "core",
            planDisplayName: "Core",
            planType: "paid",
            term: { count: 1, unit: "year" },
            startsAt: new Date("2025-09-07T03:19:00.000Z"),
            endsAt: now,
            status: "expired",
        }],
        commercialHistory: [{
            kind: "license",
            id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            occurredAt: now,
            title: "Store License · Core",
            detail: "₹2,999.00 · core",
            amountInr: 2999,
            status: "expired",
        }],
    },
};

const activePaidStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...activeTrialStatus.commercialStatus,
        baseAccess: {
            id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            sourceKind: "store_license",
            planKey: "core",
            planDisplayName: "Core",
            planType: "paid",
            term: { count: 1, unit: "year" },
            startsAt: now,
            endsAt: new Date("2027-09-07T03:19:00.000Z"),
            status: "active",
        },
        availablePaidPlans: [
            { ...corePlan, checkoutAction: "renewal", licenseTiming: "scheduled" },
            {
                ...corePlan,
                key: "pro",
                displayName: "Pro",
                checkoutAction: "upgrade",
                priceInr: 4999,
                amountInr: 1000,
                modules: [
                    {
                        key: "core_operations",
                        displayName: "Core Operations",
                        features: [{ key: "billing", displayName: "Billing" }],
                    },
                    {
                        key: "integrations",
                        displayName: "Integrations",
                        features: [{ key: "whatsapp", displayName: "WhatsApp" }],
                    },
                ],
            },
        ],
    },
};

const renderLicense = (status = eligibleStatus, search = "") => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(organizationKeys.detail(organizationId), organizationResponse);
    queryClient.setQueryData(organizationKeys.store(organizationId, storeId), storeResponse(store));
    queryClient.setQueryData(commercialLicenseKeys.status(organizationId, storeId), {
        status: "success",
        data: status,
        message: "Store commercial status fetched successfully",
        code: 200,
    });

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/workspaces/:storeId/license",
                element: <StoreWorkspaceLicensePage />,
            },
        ],
        { initialEntries: [`${getStoreLicensePath(organizationId, storeId)}${search}`] },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

describe("Store workspace License page", () => {
    test("presents Plans, Plan history, and Payment history without crowding the first screen", () => {
        const markup = renderLicense();

        expect(markup).toContain('data-testid="store-workspace-license-control-center"');
        expect(markup).toContain("Plans");
        expect(markup).toContain("Plan history");
        expect(markup).toContain("Payment history");
        expect(markup).toContain("This Store can start the standard Trial Plan once.");
        expect(markup).toContain("Start Trial");
        expect(markup).not.toContain("Access timeline");
        expect(markup).not.toContain("Next step");
        expect(markup).not.toContain("Back to stores");
        expect(markup).not.toContain("Edit store");
        expect(markup).not.toContain("Add device");
        expect(markup).not.toContain("Bill numbering");
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/license"`);
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/devices"`);
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/settings"`);
    });

    test("shows every sellable Plan and its Modules when the Store has no current access", () => {
        const markup = renderLicense(availablePlansStatus);

        expect(markup).toContain("Choose Core");
        expect(markup).toContain("Choose Pro");
        expect(markup).toContain("Best value");
        expect(markup).toContain("Recommended");
        expect(markup).toContain("Free");
        expect(markup).toContain("Core Operations");
        expect(markup).toContain("Billing");
        expect(markup).toContain("Restaurant Operations");
        expect(markup).toContain("Table Management");
        expect(markup).toContain("Start Trial");
        expect(markup).not.toContain("Renew now");
    });

    test("connects the current Plan and enabled features without opening the catalog", () => {
        const markup = renderLicense(activePaidStatus);

        expect(markup).toContain("Current plan");
        expect(markup).toContain("Core");
        expect(markup).toContain("Store License");
        expect(markup).toContain("Billing");
        expect(markup).toContain("What’s enabled");
        expect(markup).toContain("Renew now");
        expect(markup).not.toContain("Upgrade to Pro");
        expect(markup).not.toContain("Renew with Core");
    });

    test("opens the Plan catalog from Renew now so a Store can renew or upgrade", () => {
        const markup = renderLicense(activePaidStatus, "?browse=1");

        expect(markup).toContain("Renew with Core");
        expect(markup).toContain("Upgrade to Pro");
        expect(markup).toContain("Integrations");
        expect(markup).toContain("Back to current plan");
        expect(markup).not.toContain("Start Trial");
    });

    test("keeps an open Commercial Quote on the Plans tab until payment is verified", () => {
        const markup = renderLicense(pendingCheckoutStatus);

        expect(markup).toContain("Complete your purchase");
        expect(markup).toContain("Checkout ready");
        expect(markup).toContain("with Razorpay");
        expect(markup).not.toContain("Choose Core");
    });

    test("offers a one-tap renewal when the previous paid Plan is still sellable", () => {
        const markup = renderLicense(expiredPaidStatus);

        expect(markup).toContain("Renew with Core");
        expect(markup).toContain("See other plans");
        expect(markup).toContain("Expired");
        expect(markup).not.toContain("Choose Core");
        expect(markup).not.toContain("Upgrade to Pro");
    });

    test("shows an extension as effective access without hiding its Store Access Grant source", () => {
        const markup = renderLicense(extendedTrialStatus);

        expect(markup).toContain("Effective access");
        expect(markup).toContain("Extended by Custom Store Access Grant.");
        expect(markup).toContain("Store License");
        expect(markup).toContain("Custom Store Access Grant");
    });

    test("moves the access timeline to Plan history", () => {
        const markup = renderLicense(extendedTrialStatus, "?tab=history");

        expect(markup).toContain("Access timeline");
        expect(markup).toContain("Trial");
        expect(markup).toContain("Custom Store Access Grant");
        expect(markup).not.toContain("Start Trial");
    });

    test("moves quotes and payments to Payment history", () => {
        const markup = renderLicense(expiredPaidStatus, "?tab=payments");

        expect(markup).toContain("Store License · Core");
        expect(markup).toContain("₹2,999.00 · core");
        expect(markup).not.toContain("Renew with Core");
    });

    test("registers a Store workspace license route without replacing Organization store-detail routes", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");

        expect(appSource).toContain(
            'path="/organizations/:organizationId/workspaces/:storeId/license"',
        );
        expect(appSource).toContain('path="/organizations/:organizationId/workspaces/:storeId"');
        expect(appSource).toContain('path="license" element={<StoreLicensePage />}');
    });
});
