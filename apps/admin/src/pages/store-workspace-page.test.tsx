import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { StoreDTO, StoreWithDevicesDTO } from "@repo/types";

import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { organizationKeys } from "@/lib/query-keys";
import { getStoreWorkspacePath } from "@/lib/store-workspace-routes";
import StoreWorkspacePage from "@/pages/store-workspace-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const adajanId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const vesuId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const foreignStoreId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const now = new Date("2026-09-06T00:00:00.000Z");

const adajan: StoreWithDevicesDTO = {
    id: adajanId,
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

const vesu: StoreWithDevicesDTO = {
    ...adajan,
    id: vesuId,
    name: "Vesu",
    address: "Vesu Main",
};

const organizationResponse = {
    status: "success" as const,
    data: {
        organization: {
            id: organizationId,
            name: "Panini House",
            username: "panini_house",
            tagline: null,
            createdBy: adajan.createdBy,
            updatedBy: null,
            createdAt: now,
            updatedAt: now,
            stores: [adajan, vesu],
        },
    },
    message: "Organization fetched successfully",
    code: 200,
};

const storeResponse = (store: StoreDTO) => ({
    status: "success" as const,
    data: { store },
    message: "Store fetched successfully",
    code: 200,
});

const notFoundResponse = {
    status: "error" as const,
    data: null,
    message: "Store not found",
    code: 404,
};

const renderWorkspace = (path: string, storeQuery: ReturnType<typeof storeResponse> | typeof notFoundResponse) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(organizationKeys.detail(organizationId), organizationResponse);
    const parsed = path.split("/");
    const requestedStoreId = parsed[parsed.length - 1] ?? "";
    queryClient.setQueryData(organizationKeys.store(organizationId, requestedStoreId), storeQuery);

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/workspaces/:storeId",
                element: <StoreWorkspacePage />,
            },
        ],
        { initialEntries: [path] },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

describe("Store workspace page", () => {
    test("identifies the selected Store and keeps the Organization workspace available", () => {
        const markup = renderWorkspace(
            getStoreWorkspacePath(organizationId, adajanId),
            storeResponse(adajan),
        );

        expect(markup).toContain("Store workspace");
        expect(markup).toContain("Adajan");
        expect(markup).toContain("Panini House");
        expect(markup).toContain(`href="${getOrganizationWorkspacePath(organizationId)}"`);
        expect(markup).toContain("Organization workspace");
        expect(markup).toContain(`href="${getStoreWorkspacePath(organizationId, vesuId)}"`);
        expect(markup).toContain("Vesu");
        expect(markup).not.toContain("Create product");
        expect(markup).not.toContain("Add vendor");
    });

    test("does not name a Store that the Organization cannot access", () => {
        const markup = renderWorkspace(
            getStoreWorkspacePath(organizationId, foreignStoreId),
            notFoundResponse,
        );

        expect(markup).toContain("Store not found");
        expect(markup).not.toContain("Ahmedabad");
        expect(markup).toContain(`href="${getOrganizationWorkspacePath(organizationId)}"`);
        expect(markup).not.toContain("Store workspace</h1>");
    });

    test("registers a refresh-safe Store workspace route without replacing Organization store-detail routes", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");

        expect(appSource).toContain('path="/organizations/:organizationId/workspaces/:storeId"');
        expect(appSource).toContain('path="/organizations/:organizationId/stores/:storeId"');
        expect(appSource).toContain('path="/organizations/:organizationId/stores"');
        expect(appSource).toContain('path="/organizations/:organizationId/products"');
    });
});
