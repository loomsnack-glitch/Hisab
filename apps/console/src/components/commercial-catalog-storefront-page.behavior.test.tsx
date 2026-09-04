import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
    CommercialFeatureListItemDTO,
    CommercialModuleListItemDTO,
    CommercialPlanDetailDTO,
    CommercialPlanListItemDTO,
    ServiceResponse,
} from "@repo/types";

import CommercialCatalogPage from "./commercial-catalog-page";
import CommercialCatalogStorefrontPage from "./commercial-catalog-storefront-page";

afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
});

const featureList: CommercialFeatureListItemDTO[] = [
    { id: "f-billing", key: "billing", currentRevisionId: "fr-billing", revisionNumber: 1, status: "active", displayName: "Billing", description: "" },
    { id: "f-reports", key: "reports", currentRevisionId: "fr-reports", revisionNumber: 1, status: "active", displayName: "Reports", description: "" },
    { id: "f-catalog", key: "catalog_products", currentRevisionId: "fr-catalog", revisionNumber: 1, status: "active", displayName: "Catalog Products", description: "" },
    { id: "f-units", key: "units", currentRevisionId: "fr-units", revisionNumber: 1, status: "active", displayName: "Units", description: "" },
    { id: "f-vendors", key: "vendors", currentRevisionId: "fr-vendors", revisionNumber: 1, status: "active", displayName: "Vendors", description: "" },
    { id: "f-purchases", key: "purchases", currentRevisionId: "fr-purchases", revisionNumber: 1, status: "active", displayName: "Purchases", description: "" },
    { id: "f-expenses", key: "expenses", currentRevisionId: "fr-expenses", revisionNumber: 1, status: "active", displayName: "Expenses", description: "" },
    { id: "f-money", key: "money_account_tracking", currentRevisionId: "fr-money", revisionNumber: 1, status: "active", displayName: "Money Account Tracking", description: "" },
    { id: "f-kot", key: "kot_system", currentRevisionId: "fr-kot", revisionNumber: 1, status: "active", displayName: "KOT System", description: "" },
    { id: "f-table", key: "table_management", currentRevisionId: "fr-table", revisionNumber: 1, status: "active", displayName: "Table Management", description: "" },
    { id: "f-whatsapp", key: "whatsapp", currentRevisionId: "fr-whatsapp", revisionNumber: 1, status: "active", displayName: "WhatsApp", description: "" },
    { id: "f-google", key: "google_contacts_synchronization", currentRevisionId: "fr-google", revisionNumber: 1, status: "active", displayName: "Google Contacts Synchronization", description: "" },
];

const moduleList: CommercialModuleListItemDTO[] = [
    { id: "m-core", key: "core_operations", currentRevisionId: "mr-core", revisionNumber: 1, status: "active", displayName: "Core Operations", description: "", isSeparatelyPurchasable: false, priceInr: null, term: null },
    { id: "m-catalog", key: "basic_catalog", currentRevisionId: "mr-catalog", revisionNumber: 1, status: "active", displayName: "Basic Catalog", description: "", isSeparatelyPurchasable: false, priceInr: null, term: null },
    { id: "m-finance", key: "finance", currentRevisionId: "mr-finance", revisionNumber: 1, status: "active", displayName: "Finance", description: "", isSeparatelyPurchasable: false, priceInr: null, term: null },
    { id: "m-restaurant", key: "restaurant_operations", currentRevisionId: "mr-restaurant", revisionNumber: 1, status: "active", displayName: "Restaurant Operations", description: "", isSeparatelyPurchasable: false, priceInr: null, term: null },
    { id: "m-integrations", key: "integrations", currentRevisionId: "mr-integrations", revisionNumber: 1, status: "active", displayName: "Integrations", description: "Connect WhatsApp and Google Contacts", isSeparatelyPurchasable: true, priceInr: 2999, term: { count: 1, unit: "year" } },
];

const planList: CommercialPlanListItemDTO[] = [
    { id: "p-trial", key: "trial", currentRevisionId: "pr-trial", revisionNumber: 1, status: "active", displayName: "Trial", description: "", planType: "trial", priceInr: 0, term: { count: 7, unit: "day" } },
    { id: "p-core", key: "core", currentRevisionId: "pr-core", revisionNumber: 1, status: "active", displayName: "Core", description: "", planType: "paid", priceInr: 2999, term: { count: 1, unit: "year" } },
    { id: "p-pro", key: "pro", currentRevisionId: "pr-pro", revisionNumber: 1, status: "active", displayName: "Pro", description: "", planType: "paid", priceInr: 4999, term: { count: 1, unit: "year" } },
];

const membership = (item: CommercialFeatureListItemDTO) => ({
    featureId: item.id,
    featureRevisionId: item.currentRevisionId,
    key: item.key,
    displayName: item.displayName,
    revisionNumber: item.revisionNumber,
    status: item.status,
});

const moduleMembership = (item: CommercialModuleListItemDTO, featureKeys: string[]) => ({
    moduleId: item.id,
    moduleRevisionId: item.currentRevisionId,
    key: item.key,
    displayName: item.displayName,
    revisionNumber: item.revisionNumber,
    status: item.status,
    features: featureList.filter((feature) => featureKeys.includes(feature.key)).map(membership),
});

const audit = {
    createdBy: { id: "owner", firstName: "Asha", lastName: "Shah" },
    createdAt: "2026-09-04T00:00:00.000Z",
    publishedBy: { id: "owner", firstName: "Asha", lastName: "Shah" },
    publishedAt: "2026-09-04T00:00:00.000Z",
    retiredBy: null,
    retiredAt: null,
    discardedBy: null,
    discardedAt: null,
};

const planDetails: Record<string, CommercialPlanDetailDTO> = {
    "p-trial": {
        id: "p-trial",
        key: "trial",
        currentRevision: {
            id: "pr-trial",
            planId: "p-trial",
            key: "trial",
            revisionNumber: 1,
            status: "active",
            displayName: "Trial",
            description: "",
            planType: "trial",
            priceInr: 0,
            term: { count: 7, unit: "day" },
            modules: [
                moduleMembership(moduleList[0]!, ["billing", "reports"]),
                moduleMembership(moduleList[1]!, ["catalog_products", "units"]),
            ],
            resolvedFeatures: featureList.slice(0, 4).map(membership),
            ...audit,
        },
        revisions: [],
    },
    "p-core": {
        id: "p-core",
        key: "core",
        currentRevision: {
            id: "pr-core",
            planId: "p-core",
            key: "core",
            revisionNumber: 1,
            status: "active",
            displayName: "Core",
            description: "",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            modules: [
                moduleMembership(moduleList[0]!, ["billing", "reports"]),
                moduleMembership(moduleList[1]!, ["catalog_products", "units"]),
            ],
            resolvedFeatures: featureList.slice(0, 4).map(membership),
            ...audit,
        },
        revisions: [],
    },
    "p-pro": {
        id: "p-pro",
        key: "pro",
        currentRevision: {
            id: "pr-pro",
            planId: "p-pro",
            key: "pro",
            revisionNumber: 1,
            status: "active",
            displayName: "Pro",
            description: "",
            planType: "paid",
            priceInr: 4999,
            term: { count: 1, unit: "year" },
            modules: [
                moduleMembership(moduleList[0]!, ["billing", "reports"]),
                moduleMembership(moduleList[1]!, ["catalog_products", "units"]),
                moduleMembership(moduleList[2]!, ["vendors", "purchases", "expenses", "money_account_tracking"]),
                moduleMembership(moduleList[3]!, ["kot_system", "table_management"]),
            ],
            resolvedFeatures: featureList.slice(0, 10).map(membership),
            ...audit,
        },
        revisions: [],
    },
};

const ok = <T,>(data: T, message: string): ServiceResponse<T> => ({
    status: "success",
    data,
    message,
    code: 200,
});

const renderStorefront = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <CommercialCatalogStorefrontPage
            listCommercialPlans={async () => ok({ plans: planList }, "Plans retrieved successfully")}
            getCommercialPlan={async (planId) => ok({ plan: planDetails[planId]! }, "Plan retrieved successfully")}
            listCommercialModules={async () => ok({ modules: moduleList }, "Modules retrieved successfully")}
        />
    </QueryClientProvider>,
);

describe("Commercial Catalog storefront preview", () => {
    test("renders customer-facing plan cards with modules, features, and add-ons", async () => {
        const view = renderStorefront();

        expect(await view.findByText("Choose the right plan for your business")).toBeTruthy();
        expect(view.getByText("Most popular")).toBeTruthy();
        expect(view.getByText("Free trial")).toBeTruthy();
        expect(view.getByText("Start free trial")).toBeTruthy();
        expect(view.getByText("Get Pro")).toBeTruthy();
        expect(view.getAllByText("Core Operations").length).toBeGreaterThan(0);
        expect(view.getByText("Restaurant Operations")).toBeTruthy();
        expect(view.getByText("Optional add-ons")).toBeTruthy();
        expect(view.getByText("Integrations")).toBeTruthy();
        expect(view.getByText("Connect WhatsApp and Google Contacts")).toBeTruthy();
        expect(view.getAllByRole("button", { name: /Start free trial|Get Core|Get Pro/ }).every((button) => button.hasAttribute("disabled"))).toBe(true);
    });

    test("navigates to the storefront tab from the catalog section nav", async () => {
        window.history.replaceState(null, "", "/plans/list?status=active");
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <CommercialCatalogPage
                    listCommercialPlans={async () => ok({ plans: planList }, "Plans retrieved successfully")}
                    getCommercialPlan={async (planId) => ok({ plan: planDetails[planId]! }, "Plan retrieved successfully")}
                    listCommercialModules={async () => ok({ modules: moduleList }, "Modules retrieved successfully")}
                />
            </QueryClientProvider>,
        );

        fireEvent.click(await view.findByRole("button", { name: "Storefront" }));
        await waitFor(() => {
            expect(window.location.pathname).toBe("/plans/storefront");
        });
        expect(await view.findByText("Choose the right plan for your business")).toBeTruthy();
    });
});
