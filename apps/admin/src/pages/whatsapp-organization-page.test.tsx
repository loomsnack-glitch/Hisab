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

const businessAccountId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const cloudAccountSnapshot = {
    id: orgWhatsAppAccount.id,
    organizationId,
    whatsappBusinessAccountId: businessAccountId,
    wabaId: "123456789012345",
    phoneNumberId: "109876543210987",
    verifiedName: "Adajan",
    status: "connected" as const,
    qualityRating: "GREEN",
    messagingLimit: 1_000,
    lastLimitSyncedAt: now,
    lastWebhookAt: null,
    lastGraphApiAt: now,
    lastErrorCode: null,
};

const seedWorkspace = (
    queryClient: QueryClient,
    options?: {
        accounts?: typeof orgWhatsAppAccount[];
        cloudAccounts?: typeof cloudAccountSnapshot[];
    },
) => {
    queryClient.setQueryData(["whatsapp-workspace", organizationId, "organization"], organizationResponse);
    queryClient.setQueryData(whatsappKeys.accounts(organizationId), {
        status: "success",
        data: { accounts: options?.accounts ?? [] },
        message: "WhatsApp accounts fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(whatsappKeys.cloudAccounts(organizationId), {
        status: "success",
        data: { accounts: options?.cloudAccounts ?? [] },
        message: "WhatsApp Cloud accounts fetched successfully",
        code: 200,
    });
};

const renderWorkspace = (
    tab: "accounts" | "templates",
    options?: {
        accounts?: typeof orgWhatsAppAccount[];
        cloudAccounts?: typeof cloudAccountSnapshot[];
    },
) => {
    const queryClient = new QueryClient();
    seedWorkspace(queryClient, options);
    if (tab === "templates" && options?.cloudAccounts?.length) {
        const accountId = options.cloudAccounts[0]!.id;
        queryClient.setQueryData(whatsappKeys.cloudTemplates(organizationId, accountId), {
            status: "success",
            data: { templates: [] },
            message: "WhatsApp Cloud templates fetched successfully",
            code: 200,
        });
        queryClient.setQueryData(["whatsapp", "cloud-submissions", organizationId, accountId, storeId], {
            status: "success",
            data: { submissions: [] },
            message: "WhatsApp Cloud template submissions fetched successfully",
            code: 200,
        });
        queryClient.setQueryData(["whatsapp", "cloud-template-bindings", organizationId, storeId, businessAccountId], {
            status: "success",
            data: { bindings: [] },
            message: "WhatsApp Cloud template bindings fetched successfully",
            code: 200,
        });
        queryClient.setQueryData(whatsappKeys.publicInvoiceTemplateConfig(organizationId), {
            status: "success",
            data: { invoiceTemplateUrl: "https://example.com/invoice" },
            message: "Public invoice template config fetched successfully",
            code: 200,
        });
    }

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/whatsapp/accounts",
                element: <WhatsAppOrganizationPage />,
            },
            {
                path: "/organizations/:organizationId/whatsapp/templates",
                element: <WhatsAppOrganizationPage />,
            },
        ],
        { initialEntries: [`/organizations/${organizationId}/whatsapp/${tab}?storeId=${storeId}`] },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

const renderAccounts = (options?: { accounts?: typeof orgWhatsAppAccount[] }) =>
    renderWorkspace("accounts", options);

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

describe("Organization WhatsApp templates page", () => {
    test("shows Cloud templates instead of the retired local template editor", () => {
        const markup = renderWorkspace("templates");

        expect(markup).toContain("WhatsApp Cloud templates");
        expect(markup).not.toContain("Templates and links");
        expect(markup).not.toContain("Reusable links");
        expect(markup).not.toContain("Bill templates");
        expect(markup).not.toContain("Due reminder templates");
        expect(markup).not.toContain("Promotion templates");
        expect(markup).toContain("Link a WhatsApp Cloud account to this Store");
    });

    test("lets an administrator manage Cloud templates for a linked Store", () => {
        const markup = renderWorkspace("templates", {
            accounts: [{ ...orgWhatsAppAccount, assignedStoreIds: [storeId] }],
            cloudAccounts: [cloudAccountSnapshot],
        });

        expect(markup).toContain("WhatsApp Cloud templates");
        expect(markup).toContain("Store defaults");
        expect(markup).toContain("Cloud template library");
        expect(markup).not.toContain("Templates and links");
        expect(markup).not.toContain("Reusable links");
    });
});
