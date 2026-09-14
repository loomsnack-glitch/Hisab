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

const renderLicense = (status = eligibleStatus) => {
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
        { initialEntries: [getStoreLicensePath(organizationId, storeId)] },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

describe("Store workspace License page", () => {
    test("presents the selected Store's access as a workspace control center", () => {
        const markup = renderLicense();

        expect(markup).toContain('data-testid="store-workspace-license-control-center"');
        expect(markup).toContain("Store access");
        expect(markup).toContain("Access timeline");
        expect(markup).toContain("What’s enabled");
        expect(markup).toContain("Next step");
        expect(markup).toContain("This Store can start the standard Trial Plan once.");
        expect(markup).toContain("Start Trial");
        expect(markup).not.toContain("Back to stores");
        expect(markup).not.toContain("Edit store");
        expect(markup).not.toContain("Add device");
        expect(markup).not.toContain("Bill numbering");
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/license"`);
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/devices"`);
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/settings"`);
    });

    test("connects the current Plan, timeline, and enabled features for an active Store", () => {
        const markup = renderLicense(activeTrialStatus);

        expect(markup).toContain("Adajan");
        expect(markup).toContain("Current plan");
        expect(markup).toContain("Trial");
        expect(markup).toContain("Store License");
        expect(markup).toContain("Billing");
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
