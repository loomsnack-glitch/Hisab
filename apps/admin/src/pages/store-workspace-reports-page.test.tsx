import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { StoreCommercialStatusResponse, StoreDTO, StoreWithDevicesDTO } from "@repo/types";

import { commercialLicenseKeys, organizationKeys } from "@/lib/query-keys";
import { getStoreLicensePath, getStoreReportsPath } from "@/lib/store-workspace-routes";
import StoreWorkspaceReportsPage from "@/pages/store-workspace-reports-page";

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

const reportsAccessStatus: StoreCommercialStatusResponse = {
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
        trial: { eligible: true, message: "This Store can start the standard Trial Plan once." },
        entitlements: {
            storeId,
            features: [{
                key: "reports",
                displayName: "Reports",
                sources: [{
                    sourceKind: "store_access_grant",
                    sourceId: "00000000-0000-4000-8000-000000000001",
                    moduleKey: "core_operations",
                    moduleDisplayName: "Core Operations",
                    featureDisplayName: "Reports",
                    startsAt: now,
                    endsAt: new Date("2026-10-06T00:00:00.000Z"),
                }],
            }],
        },
    },
};

const noReportsAccessStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...reportsAccessStatus.commercialStatus,
        entitlements: { storeId, features: [] },
    },
};

const expiredReportsAccessStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...noReportsAccessStatus.commercialStatus,
        commercialHistory: [{
            kind: "license",
            id: "00000000-0000-4000-8000-000000000002",
            occurredAt: new Date("2024-09-06T00:00:00.000Z"),
            title: "Store License · Basic",
            detail: "₹999.00 · basic",
            amountInr: 999,
            status: "expired",
        }],
    },
};

const reportsMissingFromPlanStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        ...noReportsAccessStatus.commercialStatus,
        baseAccess: {
            id: "00000000-0000-4000-8000-000000000003",
            sourceKind: "store_license",
            planKey: "core",
            planDisplayName: "Core",
            planType: "paid",
            term: { count: 1, unit: "year" },
            startsAt: now,
            endsAt: new Date("2027-09-06T00:00:00.000Z"),
            status: "active",
        },
    },
};

const renderReports = (commercialStatus: StoreCommercialStatusResponse = reportsAccessStatus) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(organizationKeys.detail(organizationId), organizationResponse);
    queryClient.setQueryData(organizationKeys.store(organizationId, storeId), storeResponse(store));
    queryClient.setQueryData(commercialLicenseKeys.status(organizationId, storeId), {
        status: "success",
        data: commercialStatus,
        message: "Store commercial status fetched successfully",
        code: 200,
    });

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/workspaces/:storeId/reports",
                element: <StoreWorkspaceReportsPage />,
            },
        ],
        { initialEntries: [getStoreReportsPath(organizationId, storeId)] },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

describe("Store workspace Reports page", () => {
    test("shows product and category views for the selected Store only", () => {
        const markup = renderReports();

        expect(markup).toContain('data-testid="store-reports-page"');
        expect(markup).toContain('data-testid="report-view-mode"');
        expect(markup).toContain('data-testid="report-view-products"');
        expect(markup).toContain('data-testid="report-view-categories"');
        expect(markup).toContain("Reports");
        expect(markup).toContain("Product sales");
        expect(markup).not.toContain("All stores");
        expect(markup).not.toContain("Under development");
        expect(markup).not.toContain("Reports is not available for this Store");
    });

    test("directs a Store without Reports access to choose a license", () => {
        const markup = renderReports(noReportsAccessStatus);

        expect(markup).toContain("Reports access paused");
        expect(markup).toContain("No plan purchased");
        expect(markup).toContain("Choose a plan");
        expect(markup).toContain("Retry access check");
        expect(markup).toContain(`href="${getStoreLicensePath(organizationId, storeId)}"`);
        expect(markup).not.toContain("Reports is not available for this Store");
        expect(markup).not.toContain("Product sales");
    });

    test("directs a Store with an expired license to renew it", () => {
        const markup = renderReports(expiredReportsAccessStatus);

        expect(markup).toContain("License expired");
        expect(markup).toContain("Renew license");
        expect(markup).toContain(`href="${getStoreLicensePath(organizationId, storeId)}"`);
        expect(markup).not.toContain("Reports is not available for this Store");
    });

    test("directs a Store whose plan excludes Reports to change access", () => {
        const markup = renderReports(reportsMissingFromPlanStatus);

        expect(markup).toContain("Reports not included");
        expect(markup).toContain("Add Reports access");
        expect(markup).toContain(`href="${getStoreLicensePath(organizationId, storeId)}"`);
        expect(markup).not.toContain("Unable to load");
    });

    test("registers a Store workspace reports route", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");

        expect(appSource).toContain(
            'path="/organizations/:organizationId/workspaces/:storeId/reports"',
        );
        expect(appSource).toContain("StoreWorkspaceReportsPage");
    });
});
