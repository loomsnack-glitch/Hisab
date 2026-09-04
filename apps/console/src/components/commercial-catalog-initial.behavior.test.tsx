import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
    CommercialFeatureDetailDTO,
    CommercialFeatureListItemDTO,
    CommercialModuleDetailDTO,
    CommercialModuleListItemDTO,
    CommercialPlanDetailDTO,
    CommercialPlanListItemDTO,
    OwnerUserDTO,
    ServiceResponse,
} from "@repo/types";

import CommercialCatalogPage from "./commercial-catalog-page";

afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
});

const asha: OwnerUserDTO = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    firstName: "Asha",
    lastName: "Shah",
    phone: "+919876543210",
    isActive: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
};

const ashaActor = { id: asha.id, firstName: asha.firstName, lastName: asha.lastName };

const featureList: CommercialFeatureListItemDTO[] = [
    { id: "f-billing", key: "billing", currentRevisionId: "fr-billing", revisionNumber: 1, status: "active", displayName: "Billing", description: "" },
    { id: "f-catalog", key: "catalog_products", currentRevisionId: "fr-catalog", revisionNumber: 1, status: "active", displayName: "Catalog Products", description: "" },
    { id: "f-units", key: "units", currentRevisionId: "fr-units", revisionNumber: 1, status: "active", displayName: "Units", description: "" },
    { id: "f-reports", key: "reports", currentRevisionId: "fr-reports", revisionNumber: 1, status: "active", displayName: "Reports", description: "" },
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
    { id: "m-kot", key: "kot_system", currentRevisionId: "mr-kot", revisionNumber: 1, status: "active", displayName: "KOT System", description: "", isSeparatelyPurchasable: false, priceInr: null, term: null },
    { id: "m-restaurant", key: "restaurant_operations", currentRevisionId: "mr-restaurant", revisionNumber: 1, status: "active", displayName: "Restaurant Operations", description: "", isSeparatelyPurchasable: false, priceInr: null, term: null },
    { id: "m-integrations", key: "integrations", currentRevisionId: "mr-integrations", revisionNumber: 1, status: "active", displayName: "Integrations", description: "", isSeparatelyPurchasable: true, priceInr: 2999, term: { count: 1, unit: "year" } },
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
    createdBy: ashaActor,
    createdAt: "2026-09-04T00:00:00.000Z",
    publishedBy: ashaActor,
    publishedAt: "2026-09-04T00:00:00.000Z",
    retiredBy: null,
    retiredAt: null,
    discardedBy: null,
    discardedAt: null,
};

const tableFeature: CommercialFeatureDetailDTO = {
    id: "f-table",
    key: "table_management",
    currentRevision: {
        id: "fr-table",
        featureId: "f-table",
        key: "table_management",
        revisionNumber: 1,
        status: "active",
        displayName: "Table Management",
        description: "",
        ...audit,
    },
    revisions: [{
        id: "fr-table",
        featureId: "f-table",
        key: "table_management",
        revisionNumber: 1,
        status: "active",
        displayName: "Table Management",
        description: "",
        ...audit,
    }],
    referencingModules: [{
        id: "m-restaurant",
        key: "restaurant_operations",
        revisionId: "mr-restaurant",
        revisionNumber: 1,
        status: "active",
        displayName: "Restaurant Operations",
    }],
    affectedPlans: [
        { id: "p-pro", key: "pro", revisionId: "pr-pro", revisionNumber: 1, status: "active", displayName: "Pro" },
        { id: "p-trial", key: "trial", revisionId: "pr-trial", revisionNumber: 1, status: "active", displayName: "Trial" },
    ],
};

const integrationsModule: CommercialModuleDetailDTO = {
    id: "m-integrations",
    key: "integrations",
    currentRevision: {
        id: "mr-integrations",
        moduleId: "m-integrations",
        key: "integrations",
        revisionNumber: 1,
        status: "active",
        displayName: "Integrations",
        description: "",
        isSeparatelyPurchasable: true,
        priceInr: 2999,
        term: { count: 1, unit: "year" },
        features: [membership(featureList.find((item) => item.key === "whatsapp")!), membership(featureList.find((item) => item.key === "google_contacts_synchronization")!)],
        ...audit,
    },
    revisions: [],
    referencingPlans: [
        { id: "p-trial", key: "trial", revisionId: "pr-trial", revisionNumber: 1, status: "active", displayName: "Trial" },
    ],
};

const proPlan: CommercialPlanDetailDTO = {
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
            moduleMembership(moduleList[4]!, ["kot_system", "table_management"]),
        ],
        resolvedFeatures: featureList
            .filter((item) => ![
                "whatsapp",
                "google_contacts_synchronization",
            ].includes(item.key))
            .map(membership),
        ...audit,
    },
    revisions: [],
};

const ok = <T,>(data: T, message: string): ServiceResponse<T> => ({
    status: "success",
    data,
    message,
    code: 200,
});

describe("Initial Commercial Catalog hierarchy review", () => {
    test("reviews the seeded Features, Modules, Plans, and KOT/Table relationship", async () => {
        window.history.replaceState(null, "", "/catalog");
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <CommercialCatalogPage
                    listCommercialFeatures={async () => ok({ features: featureList }, "Features retrieved successfully")}
                    getCommercialFeature={async () => ok({ feature: tableFeature }, "Feature retrieved successfully")}
                    listCommercialModules={async () => ok({ modules: moduleList }, "Modules retrieved successfully")}
                    getCommercialModule={async () => ok({ module: integrationsModule }, "Module retrieved successfully")}
                    listCommercialPlans={async () => ok({ plans: planList }, "Plans retrieved successfully")}
                    getCommercialPlan={async () => ok({ plan: proPlan }, "Plan retrieved successfully")}
                />
            </QueryClientProvider>,
        );

        expect(await view.findByText("Billing")).toBeTruthy();
        expect(view.getByText("Table Management")).toBeTruthy();
        expect(view.getByText("Google Contacts Synchronization")).toBeTruthy();
        fireEvent.click(view.getByText("Table Management"));
        expect(await view.findByRole("heading", { name: "Table Management" })).toBeTruthy();
        expect(view.getByText("Affected Plans")).toBeTruthy();
        expect(view.getByText(/KOT System can be offered on its own/)).toBeTruthy();
        expect(view.getAllByText(/Restaurant Operations/).length).toBeGreaterThan(0);
        expect(view.getByText("trial")).toBeTruthy();
        expect(view.getByText("pro")).toBeTruthy();

        fireEvent.click(view.getByRole("button", { name: "Back to Features" }));
        fireEvent.click(await view.findByRole("button", { name: "Modules" }));
        expect(await view.findByText("Core Operations")).toBeTruthy();
        expect(view.getByText("Integrations")).toBeTruthy();
        expect(view.getByText(/₹2,999/)).toBeTruthy();
        expect(view.getByText(/KOT System can be offered on its own/)).toBeTruthy();
        fireEvent.click(view.getByText("Integrations"));
        expect(await view.findByRole("heading", { name: "Integrations" })).toBeTruthy();
        expect(view.getByText("whatsapp")).toBeTruthy();
        expect(view.getByText("google_contacts_synchronization")).toBeTruthy();
        expect(view.getByText("Referencing Plans")).toBeTruthy();
        expect(view.getByText("trial")).toBeTruthy();

        fireEvent.click(view.getByRole("button", { name: "Back to Modules" }));
        fireEvent.click(await view.findByRole("button", { name: "Plans" }));
        expect(await view.findByText("trial")).toBeTruthy();
        expect(view.getByText("core")).toBeTruthy();
        expect(view.getByText("pro")).toBeTruthy();
        expect(view.getByText(/₹0/)).toBeTruthy();
        expect(view.getByText(/7 days/)).toBeTruthy();
        expect(view.getByText(/₹2,999/)).toBeTruthy();
        expect(view.getByText(/₹4,999/)).toBeTruthy();
        fireEvent.click(view.getAllByText("Pro")[0]!);
        expect(await view.findByRole("heading", { name: "Pro" })).toBeTruthy();
        expect(view.getByText("Included Modules")).toBeTruthy();
        expect(view.getByText("core_operations")).toBeTruthy();
        expect(view.getByText("restaurant_operations")).toBeTruthy();
        expect(view.queryByText("integrations")).toBeNull();
        expect(view.getByText("Resolved Features")).toBeTruthy();
        expect(view.getAllByText("table_management").length).toBeGreaterThan(0);
        expect(view.getAllByText("kot_system").length).toBeGreaterThan(0);
        expect(view.queryByText("whatsapp")).toBeNull();
    });
});
