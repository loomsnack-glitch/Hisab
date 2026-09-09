import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { StoreDeviceDTO, StoreDTO, StoreWithDevicesDTO } from "@repo/types";

import { organizationKeys } from "@/lib/query-keys";
import { getPosLoginUrl } from "@/lib/pos-origin";
import { getStoreDevicesPath } from "@/lib/store-workspace-routes";
import StoreWorkspaceDevicesPage from "@/pages/store-workspace-devices-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-09-07T03:19:00.000Z");

const device: StoreDeviceDTO = {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    storeId,
    organizationId,
    name: "Counter 1",
    loginUsername: "counter_1",
    status: "active",
    lastSeenAt: now,
    createdBy: "11111111-1111-4111-8111-111111111111",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

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
    devices: [device],
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

const renderDevices = () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(organizationKeys.detail(organizationId), organizationResponse);
    queryClient.setQueryData(organizationKeys.store(organizationId, storeId), storeResponse(store));

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/workspaces/:storeId/devices",
                element: <StoreWorkspaceDevicesPage />,
            },
        ],
        { initialEntries: [getStoreDevicesPath(organizationId, storeId)] },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

describe("Store workspace Devices page", () => {
    test("shows the selected Store's devices with add-device and Open POS actions", () => {
        const markup = renderDevices();

        expect(markup).toContain("Devices");
        expect(markup).toContain("POS terminals registered to this store.");
        expect(markup).toContain("Add device");
        expect(markup).toContain("Counter 1");
        expect(markup).toContain("Open POS");
        expect(markup).toContain(
            `href="${getPosLoginUrl({ organizationUsername: "panini_house", deviceUsername: "counter_1" }).replaceAll("&", "&amp;")}"`,
        );
        expect(markup).not.toContain("Back to stores");
        expect(markup).not.toContain("Edit store");
        expect(markup).not.toContain("Bill numbering");
        expect(markup).not.toContain("/pos/login");
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/devices"`);
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/settings"`);
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/license"`);
    });

    test("registers a Store workspace devices route without replacing Organization store-detail routes", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");

        expect(appSource).toContain(
            'path="/organizations/:organizationId/workspaces/:storeId/devices"',
        );
        expect(appSource).toContain('path="/organizations/:organizationId/workspaces/:storeId"');
        expect(appSource).toContain('path="/organizations/:organizationId/stores/:storeId"');
        expect(appSource).toContain('path="devices" element={<StoreDevicesPage />}');
    });
});
