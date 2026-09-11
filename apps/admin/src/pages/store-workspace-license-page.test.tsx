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

const renderLicense = () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(organizationKeys.detail(organizationId), organizationResponse);
    queryClient.setQueryData(organizationKeys.store(organizationId, storeId), storeResponse(store));
    queryClient.setQueryData(commercialLicenseKeys.status(organizationId, storeId), {
        status: "success",
        data: eligibleStatus,
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
    test("shows the selected Store's license, trial, and included features", () => {
        const markup = renderLicense();

        expect(markup).toContain("Store License");
        expect(markup).toContain("Manage this store");
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

    test("registers a Store workspace license route without replacing Organization store-detail routes", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");

        expect(appSource).toContain(
            'path="/organizations/:organizationId/workspaces/:storeId/license"',
        );
        expect(appSource).toContain('path="/organizations/:organizationId/workspaces/:storeId"');
        expect(appSource).toContain('path="license" element={<StoreLicensePage />}');
    });
});
