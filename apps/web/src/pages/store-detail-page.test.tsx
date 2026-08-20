import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { StoreDeviceDTO, StoreWithDevicesDTO } from "@repo/types";

import StoresSection from "@/components/organizations/stores-section";
import {
    StoreDetailShell,
    StoreDevicesPage,
    StoreSettingsPage,
} from "@/pages/store-detail-page";
import { billingKeys, organizationKeys } from "@/lib/query-keys";

const organizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-08-16T12:00:00.000Z");

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
            name: "Demo Org",
            username: "demo",
            tagline: null,
            createdBy: "11111111-1111-4111-8111-111111111111",
            updatedBy: null,
            createdAt: now,
            updatedAt: now,
            stores: [store],
        },
    },
    message: "Organization fetched successfully",
    code: 200,
};

const renderWithDataRouter = (router: ReturnType<typeof createMemoryRouter>, queryClient: QueryClient) =>
    renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );

const renderStoresList = () => {
    const queryClient = new QueryClient();
    const router = createMemoryRouter(
        [
            {
                path: "/",
                element: (
                    <StoresSection
                        organizationId={organizationId}
                        organizationUsername="demo"
                        stores={[store]}
                    />
                ),
            },
        ],
        { initialEntries: ["/"] },
    );

    return renderWithDataRouter(router, queryClient);
};

const renderStoreDetail = (path: string) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(organizationKeys.detail(organizationId), organizationResponse);
    queryClient.setQueryData(billingKeys.saleNumberSettings(organizationId, storeId), {
        status: "success",
        data: {
            settings: {
                storeId,
                organizationId,
                resetPeriod: "never",
                timezone: "Asia/Kolkata",
                tokenNumberEnabled: false,
                tokenNumberResetPeriod: "daily",
                createdAt: now,
                updatedAt: now,
            },
        },
        message: "Sale number settings fetched successfully",
        code: 200,
    });

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/stores/:storeId",
                element: <StoreDetailShell />,
                children: [
                    { path: "devices", element: <StoreDevicesPage /> },
                    { path: "settings", element: <StoreSettingsPage /> },
                ],
            },
        ],
        { initialEntries: [path] },
    );

    return renderWithDataRouter(router, queryClient);
};

describe("Stores list cards", () => {
    test("shows compact store cards with edit affordance and hides inline device setup", () => {
        const markup = renderStoresList();

        expect(markup).toContain("Adajan");
        expect(markup).toContain("Ring Road");
        expect(markup).toContain("pointer-events-none");
        expect(markup).toContain("pointer-events-auto");
        expect(markup).toContain(`href="/organizations/${organizationId}/stores/${storeId}/devices"`);
        expect(markup).toContain(`aria-label="Edit Adajan"`);
        expect(markup).toContain("1 device");
        expect(markup).toContain("1 active");
        expect(markup).not.toContain("Add device");
        expect(markup).not.toContain("Bill numbering");
        expect(markup).not.toContain("Counter 1");
    });
});

describe("Store detail page", () => {
    test("defaults to devices with store header and add-device action", () => {
        const markup = renderStoreDetail(`/organizations/${organizationId}/stores/${storeId}/devices`);

        expect(markup).toContain("Back to stores");
        expect(markup).toContain("Adajan");
        expect(markup).toContain("Edit store");
        expect(markup).toContain("Devices");
        expect(markup).toContain("Settings");
        expect(markup).toContain("Add device");
        expect(markup).toContain("Counter 1");
        expect(markup).toContain("Open POS");
        expect(markup).not.toContain("Bill numbering");
    });

    test("shows bill and token numbering controls on settings", () => {
        const markup = renderStoreDetail(`/organizations/${organizationId}/stores/${storeId}/settings`);

        expect(markup).toContain("Bill numbering");
        expect(markup).toContain("Reset period");
        expect(markup).toContain("Token numbering");
        expect(markup).toContain("Save settings");
        expect(markup).not.toContain("Add device");
        expect(markup).not.toContain("Counter 1");
    });
});
