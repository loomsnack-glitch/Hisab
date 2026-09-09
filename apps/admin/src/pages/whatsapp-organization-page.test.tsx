import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { StoreWithDevicesDTO } from "@repo/types";

import { whatsappKeys } from "@/lib/query-keys";
import WhatsAppOrganizationPage from "@/pages/whatsapp-organization-page";

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

const orgWhatsAppAccount = {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    organizationId,
    defaultStoreId: null,
    assignedStoreIds: [] as string[],
    provider: "cloud_api" as const,
    phoneNumber: "+919876543210",
    status: "connected" as const,
    cloudStatus: "connected" as const,
    lastConnectedAt: now,
    lastSeenAt: now,
    lastErrorCode: null,
    createdAt: now,
    updatedAt: now,
};

const renderAccounts = (options?: { accounts?: typeof orgWhatsAppAccount[] }) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["whatsapp-workspace", organizationId, "organization"], organizationResponse);
    queryClient.setQueryData(whatsappKeys.accounts(organizationId), {
        status: "success",
        data: { accounts: options?.accounts ?? [] },
        message: "WhatsApp accounts fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(whatsappKeys.cloudAccounts(organizationId), {
        status: "success",
        data: { accounts: [] },
        message: "WhatsApp Cloud accounts fetched successfully",
        code: 200,
    });

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/whatsapp/accounts",
                element: <WhatsAppOrganizationPage />,
            },
        ],
        { initialEntries: [`/organizations/${organizationId}/whatsapp/accounts`] },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

describe("Organization WhatsApp accounts page", () => {
    test("lets an administrator add a WhatsApp Cloud account", () => {
        const markup = renderAccounts();

        expect(markup).toContain("Connect with Meta");
        expect(markup).toContain("No WhatsApp Cloud accounts connected yet.");
        expect(markup).toContain("then link it to a Store");
    });

    test("lets an administrator link an existing account to a Store", () => {
        const markup = renderAccounts({ accounts: [orgWhatsAppAccount] });

        expect(markup).toContain("+919876543210");
        expect(markup).toContain("Not linked to any Store yet");
        expect(markup).toContain("Select a Store to link");
        expect(markup).toContain("Link to Store");
    });
});
