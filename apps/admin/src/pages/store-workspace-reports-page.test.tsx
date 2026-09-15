import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { StoreDTO, StoreWithDevicesDTO } from "@repo/types";

import { organizationKeys } from "@/lib/query-keys";
import { getStoreReportsPath } from "@/lib/store-workspace-routes";
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

const renderReports = () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(organizationKeys.detail(organizationId), organizationResponse);
    queryClient.setQueryData(organizationKeys.store(organizationId, storeId), storeResponse(store));

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
    });

    test("registers a Store workspace reports route", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");

        expect(appSource).toContain(
            'path="/organizations/:organizationId/workspaces/:storeId/reports"',
        );
        expect(appSource).toContain("StoreWorkspaceReportsPage");
    });
});
