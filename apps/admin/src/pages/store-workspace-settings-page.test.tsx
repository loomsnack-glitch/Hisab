import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { StoreDTO, StoreWithDevicesDTO } from "@repo/types";

import { billingKeys, moneyAccountKeys, organizationKeys, whatsappKeys } from "@/lib/query-keys";
import { getStoreSettingsPath, getStoreSettingsTabPath, type StoreSettingsTab } from "@/lib/store-workspace-routes";
import StoreWorkspaceSettingsPage, {
    StoreSettingsFeaturesPage,
    StoreSettingsGeneralPage,
    StoreSettingsIndexRedirect,
    StoreSettingsInvoicePage,
    StoreSettingsPaymentsPage,
    StoreSettingsWhatsAppPage,
} from "@/pages/store-workspace-settings-page";

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

const hdfcBankAccount = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "HDFC Current",
    type: "bank" as const,
    scope: "organization_wide" as const,
    storeId: null,
    notes: null,
    status: "active" as const,
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
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

const renderSettings = (options?: {
    tab?: StoreSettingsTab;
    whatsappUnlinked?: boolean;
    whatsappLinked?: boolean;
    whatsappAccounts?: typeof orgWhatsAppAccount[];
    store?: StoreWithDevicesDTO;
}) => {
    const queryClient = new QueryClient();
    const storeForPage = options?.store ?? store;
    queryClient.setQueryData(organizationKeys.detail(organizationId), {
        ...organizationResponse,
        data: {
            organization: {
                ...organizationResponse.data.organization,
                stores: [storeForPage],
            },
        },
    });
    queryClient.setQueryData(organizationKeys.store(organizationId, storeId), storeResponse(storeForPage));
    queryClient.setQueryData(billingKeys.saleNumberSettings(organizationId, storeId), {
        status: "success",
        data: {
            settings: {
                storeId,
                organizationId,
                resetPeriod: "financial_yearly",
                timezone: "Asia/Kolkata",
                tokenNumberEnabled: true,
                tokenNumberResetPeriod: "daily",
                kotNumberResetPeriod: "daily",
                createdAt: now,
                updatedAt: now,
            },
        },
        message: "Sale number settings fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(moneyAccountKeys.list(organizationId), {
        status: "success",
        data: {
            moneyAccounts: [hdfcBankAccount],
        },
        message: "Money Accounts fetched successfully",
        code: 200,
    });
    queryClient.setQueryData(moneyAccountKeys.paymentRoutes(organizationId, storeId), {
        status: "success",
        data: {
            routes: [
                {
                    id: "12121212-1212-4121-8121-121212121212",
                    organizationId,
                    storeId,
                    paymentMethod: "upi" as const,
                    moneyAccountId: hdfcBankAccount.id,
                    createdBy: hdfcBankAccount.createdBy,
                    updatedBy: null,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
        },
        message: "Payment Routing Rules fetched successfully",
        code: 200,
    });
    if (options?.whatsappUnlinked) {
        queryClient.setQueryData(whatsappKeys.account(organizationId, storeId), {
            status: "error",
            data: null,
            message: "WhatsApp account is not linked",
            code: 404,
        });
        const accountQuery = queryClient.getQueryCache().build(queryClient, {
            queryKey: whatsappKeys.account(organizationId, storeId),
        });
        accountQuery.setState({
            status: "error",
            error: {
                message: "WhatsApp account is not linked",
                data: null,
                status: "error",
                code: 404,
            },
            fetchStatus: "idle",
        });
    } else if (options?.whatsappLinked) {
        queryClient.setQueryData(whatsappKeys.account(organizationId, storeId), {
            status: "success",
            data: {
                account: {
                    ...orgWhatsAppAccount,
                    assignedStoreIds: [storeId],
                },
            },
            message: "WhatsApp account fetched successfully",
            code: 200,
        });
    } else {
        queryClient.setQueryData(whatsappKeys.account(organizationId, storeId), {
            status: "success",
            data: { account: null },
            message: "WhatsApp account not linked",
            code: 200,
        });
    }
    queryClient.setQueryData(whatsappKeys.accounts(organizationId), {
        status: "success",
        data: { accounts: options?.whatsappAccounts ?? [] },
        message: "WhatsApp accounts fetched successfully",
        code: 200,
    });

    const router = createMemoryRouter(
        [
            {
                path: "/organizations/:organizationId/workspaces/:storeId/settings",
                element: <StoreWorkspaceSettingsPage />,
                children: [
                    { index: true, element: <StoreSettingsIndexRedirect /> },
                    { path: "general", element: <StoreSettingsGeneralPage /> },
                    { path: "whatsapp", element: <StoreSettingsWhatsAppPage /> },
                    { path: "features", element: <StoreSettingsFeaturesPage /> },
                    { path: "payments", element: <StoreSettingsPaymentsPage /> },
                    { path: "invoice", element: <StoreSettingsInvoicePage /> },
                ],
            },
        ],
        {
            initialEntries: [
                options?.tab
                    ? getStoreSettingsTabPath(organizationId, storeId, options.tab)
                    : getStoreSettingsPath(organizationId, storeId),
            ],
        },
    );

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
};

describe("Store workspace Settings page", () => {
    test("shows store details on the General tab", () => {
        const markup = renderSettings({ tab: "general" });

        expect(markup).toContain("Store settings navigation tabs");
        expect(markup).toContain("General");
        expect(markup).toContain("WhatsApp");
        expect(markup).toContain("Features");
        expect(markup).toContain("Payments");
        expect(markup).toContain("Invoice");
        expect(markup).toContain(`href="/organizations/${organizationId}/workspaces/${storeId}/settings/general"`);
        expect(markup).toContain(`href="/organizations/${organizationId}/workspaces/${storeId}/settings/whatsapp"`);
        expect(markup).toContain(`href="/organizations/${organizationId}/workspaces/${storeId}/settings/features"`);
        expect(markup).toContain(`href="/organizations/${organizationId}/workspaces/${storeId}/settings/payments"`);
        expect(markup).toContain(`href="/organizations/${organizationId}/workspaces/${storeId}/settings/invoice"`);
        expect(markup).toContain("Edit store details");
        expect(markup).toContain("Edit reviews and social");
        expect(markup).toContain("Store details");
        expect(markup).toContain("Reviews and social");
        expect(markup).toContain("Customer links");
        expect(markup).toContain("Address");
        expect(markup).toContain("Adajan");
        expect(markup).toContain("Ring Road");
        expect(markup).toContain("Google review");
        expect(markup).toContain("Social profile");
        expect(markup).toContain("Not configured");
        expect(markup).toContain("0/2 set");
        expect(markup).toContain("Complete");
        expect(markup).not.toContain("Store WhatsApp");
        expect(markup).not.toContain("Store features");
        expect(markup).not.toContain("Bill numbering");
        expect(markup).not.toContain("Payment routing");
        expect(markup).not.toContain("Invoice appearance");
        expect(markup).not.toContain("Back to stores");
        expect(markup).not.toContain("Add device");
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/settings"`);
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/devices"`);
        expect(markup).not.toContain(`href="/organizations/${organizationId}/stores/${storeId}/license"`);
    });

    test("shows review and social links separately from store details", () => {
        const markup = renderSettings({
            tab: "general",
            store: {
                ...store,
                reviewPlatform: "Google",
                reviewLink: "https://g.page/r/adajan",
                socialMediaName: "Instagram",
                socialMediaLink: "https://instagram.com/adajan",
            },
        });

        expect(markup).toContain("Store details");
        expect(markup).toContain("Reviews and social");
        expect(markup).toContain("Google");
        expect(markup).toContain("https://g.page/r/adajan");
        expect(markup).toContain("Instagram");
        expect(markup).toContain("https://instagram.com/adajan");
        expect(markup).toContain("Edit store details");
        expect(markup).toContain("Edit reviews and social");
        expect(markup).toContain("2/2 set");
        expect(markup).not.toContain("Not configured");
        expect(markup).not.toContain("customer-facing profile");
    });

    test("shows a linked WhatsApp account on the WhatsApp tab", () => {
        const markup = renderSettings({ tab: "whatsapp", whatsappLinked: true });

        expect(markup).toContain("Store WhatsApp");
        expect(markup).toContain("Messaging");
        expect(markup).toContain("Linked number");
        expect(markup).toContain("+919876543210");
        expect(markup).toContain("Connected · Cloud API");
        expect(markup).toContain("Unlink from Store");
        expect(markup).toContain("Shared with 1 Store");
        expect(markup).not.toContain("Store details");
        expect(markup).not.toContain("Reviews and social");
        expect(markup).not.toContain("Edit store");
        expect(markup).not.toContain("Store features");
    });

    test("shows WhatsApp linking options when no account is linked", () => {
        const markup = renderSettings({ tab: "whatsapp" });

        expect(markup).toContain("Store WhatsApp");
        expect(markup).toContain("Not linked");
        expect(markup).toContain("Add or manage accounts");
        expect(markup).toContain(`href="/organizations/${organizationId}/whatsapp/accounts"`);
        expect(markup).not.toContain("Linked number");
    });

    test("shows store features and numbering on the Features tab", () => {
        const markup = renderSettings({ tab: "features" });

        expect(markup).toContain("Bill numbering");
        expect(markup).toContain("Store features");
        expect(markup).toContain("KOT system");
        expect(markup).toContain("Table management");
        expect(markup).toContain("Money Account Tracking");
        expect(markup).not.toContain("Store WhatsApp");
        expect(markup).not.toContain("Payment routing");
        expect(markup).not.toContain("Reviews and social");
        expect(markup).not.toContain("Edit store");
    });

    test("shows payment routing on the Payments tab", () => {
        const markup = renderSettings({ tab: "payments" });

        expect(markup).toContain("Payment routing");
        expect(markup).toContain("HDFC Current");
        expect(markup).not.toContain("Store features");
        expect(markup).not.toContain("Store WhatsApp");
        expect(markup).not.toContain("Bill numbering");
    });

    test("shows invoice appearance on the Invoice tab", () => {
        const markup = renderSettings({ tab: "invoice" });

        expect(markup).toContain("Store settings navigation tabs");
        expect(markup).toContain(`href="/organizations/${organizationId}/workspaces/${storeId}/settings/invoice"`);
        expect(markup).not.toContain("Store WhatsApp");
        expect(markup).not.toContain("Payment routing");
        expect(markup).not.toContain("Store features");
        expect(markup).not.toContain("Edit store");
    });

    test("lets an unlinked Store add or link an organization WhatsApp account", () => {
        const markup = renderSettings({ tab: "whatsapp", whatsappUnlinked: true });

        expect(markup).toContain("Store WhatsApp");
        expect(markup).toContain("Add or manage accounts");
        expect(markup).toContain(`href="/organizations/${organizationId}/whatsapp/accounts"`);
        expect(markup).toContain("No organization WhatsApp account is available yet.");
        expect(markup).not.toMatch(/WhatsApp account is not linked<\/p>/);
    });

    test("lets an unlinked Store link an existing organization WhatsApp account", () => {
        const markup = renderSettings({
            tab: "whatsapp",
            whatsappUnlinked: true,
            whatsappAccounts: [orgWhatsAppAccount],
        });

        expect(markup).toContain("Organization account");
        expect(markup).toContain("Link account");
        expect(markup).toContain("Select a WhatsApp account");
        expect(markup).toContain("Add or manage accounts");
        expect(markup).not.toMatch(/WhatsApp account is not linked<\/p>/);
    });

    test("registers a Store workspace settings route without replacing Organization store-detail routes", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");
        const pageSource = readFileSync(join(import.meta.dir, "store-workspace-settings-page.tsx"), "utf8");

        expect(appSource).toContain(
            'path="/organizations/:organizationId/workspaces/:storeId/settings"',
        );
        expect(appSource).toContain('path="general" element={<StoreSettingsGeneralPage />}');
        expect(appSource).toContain('path="whatsapp" element={<StoreSettingsWhatsAppPage />}');
        expect(appSource).toContain('path="features" element={<StoreSettingsFeaturesPage />}');
        expect(appSource).toContain('path="payments" element={<StoreSettingsPaymentsPage />}');
        expect(appSource).toContain('path="invoice" element={<StoreSettingsInvoicePage />}');
        expect(appSource).toContain("<StoreSettingsIndexRedirect />");
        expect(pageSource).toContain('Navigate to="general"');
        expect(appSource).toContain('path="/organizations/:organizationId/workspaces/:storeId"');
        expect(appSource).toContain('path="settings" element={<StoreSettingsPage />}');
    });
});
