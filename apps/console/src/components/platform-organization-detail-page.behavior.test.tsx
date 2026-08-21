import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type {
    OwnerUserDTO,
    PlatformDashboardQueryJSON,
    PlatformBillingInspectionQueryJSON,
    PlatformCatalogProductDetailResponse,
    PlatformCatalogListResponse,
    PlatformCustomerInspectionDetailResponse,
    PlatformCustomerInspectionListResponse,
    PlatformCustomerInspectionQueryJSON,
    PlatformOrganizationDetailQueryJSON,
    PlatformOrganizationDetailResponse,
    PlatformOrganizationListItemDTO,
    PlatformOrganizationListQueryJSON,
    PlatformOrganizationListResponse,
    PlatformRecentSaleDTO,
    PlatformReportInspectionQueryJSON,
    PlatformReportInspectionResponse,
    PlatformSaleInspectionDetailResponse,
    PlatformSaleInspectionListResponse,
    PlatformStoreDetailResponse,
    PlatformStoreListResponse,
    ServiceResponse,
} from "@repo/types";

import ConsoleEntry from "./console-entry";
import PlatformOrganizationDetailPage, {
    type PlatformOrganizationDetailPageProps,
} from "./platform-organization-detail-page";
import PlatformOrganizationsPage from "./platform-organizations-page";
import { catalogInspectionPath, organizationInspectionPath, parseOrganizationInspectionPath } from "@/lib/organization-inspection-url";

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
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
};

const mixedBistro: PlatformOrganizationListItemDTO = {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Mixed Bistro",
    username: "mixed-bistro",
    isActive: true,
    creator: { firstName: "Omar", lastName: "Khan", phone: "+919800000003" },
    storeCount: 2,
    activeStoreCount: 1,
    customerCount: 0,
    completedSaleCount: 1,
    completedSalesValue: 50.5,
    lastCompletedSaleAt: "2026-08-19T10:00:00.000Z",
};

const newStand: PlatformOrganizationListItemDTO = {
    id: "44444444-4444-4444-8444-444444444444",
    name: "New Stand",
    username: "new-stand",
    isActive: false,
    creator: { firstName: "Priya", lastName: "Shah", phone: "+919800000004" },
    storeCount: 0,
    activeStoreCount: 0,
    customerCount: 0,
    completedSaleCount: 0,
    completedSalesValue: 0,
    lastCompletedSaleAt: null,
};

const successList = (
    organizations: PlatformOrganizationListItemDTO[],
): ServiceResponse<PlatformOrganizationListResponse> => ({
    status: "success",
    data: {
        reportingPeriod: { selection: "all-time", startDate: null, endDate: null },
        organizations,
        pagination: { page: 1, limit: 20, totalCount: organizations.length },
    },
    message: "Platform Organizations retrieved successfully",
    code: 200,
});

const successDetail = (
    organization: PlatformOrganizationListItemDTO,
    stores: PlatformOrganizationDetailResponse["organization"]["stores"],
    period: PlatformOrganizationDetailResponse["reportingPeriod"] = {
        selection: "all-time",
        startDate: null,
        endDate: null,
    },
    recentSales: PlatformRecentSaleDTO[] = [],
): ServiceResponse<PlatformOrganizationDetailResponse> => ({
    status: "success",
    data: {
        reportingPeriod: period,
        organization: { ...organization, stores, recentSales },
    },
    message: "Platform Organization retrieved successfully",
    code: 200,
});

const mixedStores: PlatformOrganizationDetailResponse["organization"]["stores"] = [
    {
        id: "77777777-7777-4777-8777-777777777777",
        name: "Front Hall",
        isActive: true,
        customerCount: 0,
        completedSaleCount: 1,
        completedSalesValue: 50.5,
        lastCompletedSaleAt: "2026-08-19T10:00:00.000Z",
    },
    {
        id: "88888888-8888-4888-8888-888888888888",
        name: "Garden Patio",
        isActive: false,
        customerCount: 0,
        completedSaleCount: 0,
        completedSalesValue: 0,
        lastCompletedSaleAt: null,
    },
];

const mixedRecentSales: PlatformRecentSaleDTO[] = [
    {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        saleNumber: "12",
        status: "completed",
        grandTotal: 50.5,
        occurredAt: "2026-08-19T10:00:00.000Z",
        store: {
            id: mixedStores[0]!.id,
            name: "Front Hall",
        },
    },
];

const categoryMixed = "c1111111-1111-4111-8111-c11111111111";
const productMixed = "d1111111-1111-4111-8111-d11111111111";
const addOnMixed = "e1111111-1111-4111-8111-e11111111111";
const attachmentMixed = "f1111111-1111-4111-8111-f11111111111";
const customerMixedActive = "cccccccc-1111-4111-8111-ccccccccccc1";
const customerMixedDue = "cccccccc-2222-4222-8222-ccccccccccc2";

const successCatalog = (
    overrides: Partial<PlatformCatalogListResponse> = {},
): ServiceResponse<PlatformCatalogListResponse> => ({
    status: "success",
    data: {
        tab: "products",
        counts: { categories: 1, products: 1, addOns: 1 },
        categories: [],
        products: [
            {
                id: productMixed,
                name: "Masala Chai",
                category: { id: categoryMixed, name: "Beverages" },
                price: 50,
                discount: 0,
                status: "active",
                productType: "single",
                productCode: "TEA-001",
                productCodeKind: "manufacturer",
                sortOrder: 0,
                attachmentCount: 1,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
            },
        ],
        addOns: [],
        pagination: { page: 1, limit: 20, totalCount: 1 },
        ...overrides,
    },
    message: "Platform Organization Catalog retrieved successfully",
    code: 200,
});

const successCatalogProduct = (): ServiceResponse<PlatformCatalogProductDetailResponse> => ({
    status: "success",
    data: {
        product: {
            id: productMixed,
            name: "Masala Chai",
            category: { id: categoryMixed, name: "Beverages" },
            price: 50,
            discount: 0,
            status: "active",
            productType: "single",
            productCode: "TEA-001",
            productCodeKind: "manufacturer",
            sortOrder: 0,
            attachmentCount: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            hasImage: false,
            attachments: [
                {
                    id: attachmentMixed,
                    addOnId: addOnMixed,
                    addOnName: "Extra Ginger",
                    selectionCap: 1,
                    status: "active",
                    addOnPrice: 10,
                    addOnDiscount: 0,
                    addOnStatus: "active",
                },
            ],
        },
    },
    message: "Platform Organization Catalog Product retrieved successfully",
    code: 200,
});

const successCustomers = (
    overrides: Partial<PlatformCustomerInspectionListResponse> = {},
): ServiceResponse<PlatformCustomerInspectionListResponse> => ({
    status: "success",
    data: {
        customers: [
            {
                id: customerMixedActive,
                name: "Anita Rao",
                phone: "+919800000201",
                balance: 0,
                isActive: true,
                createdAt: "2026-02-01T10:00:00.000Z",
            },
            {
                id: customerMixedDue,
                name: "Dev Patel",
                phone: "+919800000202",
                balance: 25,
                isActive: true,
                createdAt: "2026-03-01T10:00:00.000Z",
            },
        ],
        pagination: { page: 1, limit: 20, totalCount: 2 },
        ...overrides,
    },
    message: "Platform Organization Customers retrieved successfully",
    code: 200,
});

const successReports = (
    overrides: Partial<PlatformReportInspectionResponse> = {},
): ServiceResponse<PlatformReportInspectionResponse> => ({
    status: "success",
    data: {
        dateRange: {
            startDate: "2026-08-19",
            endDate: "2026-08-19",
            label: "2026-08-19",
            timezone: "Asia/Kolkata",
        },
        stores: mixedStores.map((store) => ({ id: store.id, name: store.name })),
        productSales: {
            products: [{
                productId: productMixed,
                productName: "Masala Chai",
                categoryName: "Beverages",
                quantitySold: 2,
            }],
            productCount: 1,
            totalQuantitySold: 2,
        },
        ...overrides,
    },
    message: "Platform Organization Reports retrieved successfully",
    code: 200,
});

const successCustomerDetail = (): ServiceResponse<PlatformCustomerInspectionDetailResponse> => ({
    status: "success",
    data: {
        customer: {
            id: customerMixedDue,
            name: "Dev Patel",
            phone: "+919800000202",
            balance: 25,
            isActive: true,
            marketingOptedOut: true,
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-08-18T10:00:00.000Z",
            ledger: [
                {
                    id: "a1111111-1111-4111-8111-a11111111111",
                    organizationId: mixedBistro.id,
                    customerId: customerMixedDue,
                    saleId: mixedRecentSales[0]!.id,
                    entryType: "sale",
                    amount: 25,
                    balanceAfter: 25,
                    notes: null,
                    createdAt: "2026-08-19T10:00:00.000Z",
                },
            ],
            sales: [
                {
                    id: mixedRecentSales[0]!.id,
                    saleNumber: "13",
                    status: "completed",
                    paymentStatus: "partial",
                    grandTotal: 75,
                    paidTotal: 50,
                    dueTotal: 25,
                    createdAt: "2026-08-18T10:00:00.000Z",
                    committedAt: "2026-08-18T10:00:00.000Z",
                    voidedAt: null,
                    itemCount: 2,
                    itemsSummary: "Tea, Snacks",
                    paymentMethods: "cash",
                    customerName: "Dev Patel",
                    store: { id: mixedStores[0]!.id, name: "Front Hall" },
                },
            ],
        },
    },
    message: "Platform Organization Customer retrieved successfully",
    code: 200,
});

const successStores = (
    stores: PlatformOrganizationDetailResponse["organization"]["stores"] = mixedStores,
): ServiceResponse<PlatformStoreListResponse> => ({
    status: "success",
    data: {
        reportingPeriod: { selection: "all-time", startDate: null, endDate: null },
        stores,
    },
    message: "Platform Organization Stores retrieved successfully",
    code: 200,
});

const successStoreDetail = (
    store = {
        id: mixedStores[0]!.id,
        organizationId: mixedBistro.id,
        name: "Front Hall",
        address: "12 Market Road",
        kotSystemEnabled: true,
        tableManagementEnabled: false,
        createdAt: "2026-01-10T00:00:00.000Z",
        isActive: true,
        customerCount: 0,
        completedSaleCount: 1,
        completedSalesValue: 50.5,
        lastCompletedSaleAt: "2026-08-19T10:00:00.000Z",
        devices: [
            {
                id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                name: "Counter POS",
                loginUsername: "front-hall-pos",
                status: "active" as const,
                lastSeenAt: "2026-08-19T09:00:00.000Z",
                createdAt: "2026-01-15T00:00:00.000Z",
            },
        ],
        recentSales: mixedRecentSales,
    },
): ServiceResponse<PlatformStoreDetailResponse> => ({
    status: "success",
    data: {
        reportingPeriod: { selection: "all-time", startDate: null, endDate: null },
        store,
    },
    message: "Platform Store retrieved successfully",
    code: 200,
});

const successSales = (
    sales: PlatformSaleInspectionListResponse["sales"] = [
        {
            id: mixedRecentSales[0]!.id,
            saleNumber: "12",
            status: "completed",
            paymentStatus: "paid",
            grandTotal: 50.5,
            paidTotal: 50.5,
            dueTotal: 0,
            createdAt: "2026-08-19T10:00:00.000Z",
            committedAt: "2026-08-19T10:00:00.000Z",
            voidedAt: null,
            itemCount: 1,
            itemsSummary: "Tea",
            paymentMethods: "cash",
            customerName: null,
            store: { id: mixedStores[0]!.id, name: "Front Hall" },
        },
    ],
): ServiceResponse<PlatformSaleInspectionListResponse> => ({
    status: "success",
    data: {
        stores: mixedStores.map((store) => ({ id: store.id, name: store.name })),
        sales,
        pagination: { page: 1, limit: 20, totalCount: sales.length },
    },
    message: "Platform Organization Sales retrieved successfully",
    code: 200,
});

const successSaleDetail = (): ServiceResponse<PlatformSaleInspectionDetailResponse> => ({
    status: "success",
    data: {
        sale: {
            id: mixedRecentSales[0]!.id,
            saleNumber: "12",
            status: "completed",
            paymentStatus: "paid",
            grandTotal: 50.5,
            paidTotal: 50.5,
            dueTotal: 0,
            createdAt: "2026-08-19T10:00:00.000Z",
            committedAt: "2026-08-19T10:00:00.000Z",
            voidedAt: null,
            itemCount: 1,
            itemsSummary: "Tea",
            paymentMethods: "cash",
            customerName: null,
            store: { id: mixedStores[0]!.id, name: "Front Hall" },
            subtotal: 50.5,
            discountTotal: 0,
            orderDiscountAmount: 0,
            notes: null,
            voidReason: null,
            customer: null,
            createdByDevice: { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "Counter POS" },
            updatedByDevice: { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "Counter POS" },
            items: [{
                id: "item-1",
                organizationId: mixedBistro.id,
                storeId: mixedStores[0]!.id,
                saleId: mixedRecentSales[0]!.id,
                productId: "prod-1",
                quantity: 1,
                configurationSignature: "plain",
                productNameSnapshot: "Tea",
                unitPriceSnapshot: 50.5,
                discountAmount: 0,
                lineSubtotal: 50.5,
                lineTotal: 50.5,
                addOns: [],
                bundleComponents: [],
                createdAt: "2026-08-19T10:00:00.000Z",
                updatedAt: "2026-08-19T10:00:00.000Z",
            }],
            payments: [{
                id: "pay-1",
                organizationId: mixedBistro.id,
                storeId: mixedStores[0]!.id,
                saleId: mixedRecentSales[0]!.id,
                amount: 50.5,
                method: "cash",
                collectedAt: "2026-08-19T10:00:00.000Z",
                createdAt: "2026-08-19T10:00:00.000Z",
                updatedAt: "2026-08-19T10:00:00.000Z",
            }],
            receipt: {
                organizationName: "Mixed Bistro",
                storeName: "Front Hall",
                storeAddress: "12 Market Road",
                previewText: "Mixed Bistro\nFront Hall\nBill 12",
            },
        },
    },
    message: "Platform Organization Sale retrieved successfully",
    code: 200,
});

type LoadOrganization = NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganization"]>;

const renderDetail = (
    loadOrganization: LoadOrganization,
    options: { organizationId?: string; reportingQuery?: PlatformDashboardQueryJSON } = {},
) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <PlatformOrganizationDetailPage
                organizationId={options.organizationId ?? mixedBistro.id}
                onBack={() => {}}
                reportingQuery={options.reportingQuery}
                getPlatformOrganization={loadOrganization}
            />
        </QueryClientProvider>,
    );
};

describe("Platform Organization drill-down", () => {
    test("opens a read-only Organization detail from the outreach list and keeps the reporting period", async () => {
        const requested: PlatformOrganizationDetailQueryJSON[] = [];
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <PlatformOrganizationsPage
                    reportingQuery={{ period: "7d" }}
                    getPlatformOrganizations={async () => successList([mixedBistro])}
                    getPlatformOrganization={async (_organizationId, query = {}) => {
                        requested.push(query);
                        return successDetail(
                            { ...mixedBistro, completedSaleCount: 1, completedSalesValue: 50.5 },
                            [
                                { ...mixedStores[0], completedSaleCount: 1, completedSalesValue: 50.5 },
                                mixedStores[1],
                            ],
                            { selection: "7d", startDate: "2026-08-15", endDate: "2026-08-21" },
                        );
                    }}
                />
            </QueryClientProvider>,
        );

        fireEvent.click(await view.findByRole("link", { name: "Mixed Bistro" }));

        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(view.getByText(/7-day metrics from Dashboard/)).toBeTruthy();
        expect(view.getByText(/@mixed-bistro/)).toBeTruthy();
        expect(view.getByText("Omar Khan")).toBeTruthy();
        expect(view.getByText("Front Hall")).toBeTruthy();
        expect(view.getByText("Garden Patio")).toBeTruthy();
        expect(view.getAllByText("Active").length).toBeGreaterThan(0);
        expect(view.getAllByText("Inactive").length).toBeGreaterThan(0);
        expect(view.getAllByText("50.50", { exact: false }).length).toBeGreaterThan(0);
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Collect Payment")).toBeNull();
        expect(view.queryByText("device secret")).toBeNull();
        await waitFor(() => {
            expect(requested.some((query) => query.period === "7d")).toBe(true);
        });

        fireEvent.click(view.getByRole("button", { name: "Back to organizations" }));
        expect(await view.findByRole("heading", { name: "Organizations" })).toBeTruthy();
        expect(view.getByText(/7-day metrics from Dashboard/)).toBeTruthy();
        expect(view.getByRole("link", { name: "Mixed Bistro" })).toBeTruthy();
    });

    test("keeps the Dashboard Platform Reporting Period through list and detail navigation", async () => {
        const requested: Array<{ kind: "list" | "detail"; query: PlatformOrganizationListQueryJSON | PlatformOrganizationDetailQueryJSON }> = [];
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
                    <ConsoleEntry
                        ownerUser={asha}
                        onLogout={async () => {}}
                        dashboardPageProps={{
                            getPlatformDashboard: async (query = {}) => ({
                                status: "success",
                                data: {
                                    reportingPeriod: {
                                        selection: query.period ?? "all-time",
                                        startDate: query.period === "30d" ? "2026-07-23" : null,
                                        endDate: query.period === "30d" ? "2026-08-21" : null,
                                    },
                                    allTime: { organizationCount: 4, storeCount: 4, customerCount: 2, completedSaleCount: 8 },
                                    activity: { activeOrganizationCount: 2, activeStoreCount: 2 },
                                    reportingPeriodMetrics: { completedSaleCount: 6, completedSalesValue: 240, customerCount: 1 },
                                },
                                message: "Platform dashboard retrieved successfully",
                                code: 200,
                            }),
                        }}
                        organizationsPageProps={{
                            getPlatformOrganizations: async (query = {}) => {
                                requested.push({ kind: "list", query });
                                return successList([mixedBistro]);
                            },
                            getPlatformOrganization: async (_organizationId, query = {}) => {
                                requested.push({ kind: "detail", query });
                                return successDetail(mixedBistro, mixedStores, {
                                    selection: "30d",
                                    startDate: "2026-07-23",
                                    endDate: "2026-08-21",
                                });
                            },
                        }}
                    />
                </ThemeProvider>
            </QueryClientProvider>,
        );

        fireEvent.click(view.getAllByRole("button", { name: "Dashboard" })[0]!);
        await view.findByRole("heading", { name: "Dashboard" });
        fireEvent.click(view.getByRole("button", { name: "30-day" }));
        fireEvent.click(view.getAllByRole("button", { name: "Organizations" })[0]!);
        await view.findByRole("link", { name: "Mixed Bistro" });
        fireEvent.click(view.getByRole("link", { name: "Mixed Bistro" }));

        await waitFor(() => {
            expect(requested.some((item) => item.kind === "list" && item.query.period === "30d")).toBe(true);
            expect(requested.some((item) => item.kind === "detail" && item.query.period === "30d")).toBe(true);
        });
        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(view.getByText(/30-day metrics from Dashboard/)).toBeTruthy();
        expect(view.queryByText("Create Organization")).toBeNull();
    });

    test("shows Organization identity, adoption aggregates, and mixed Store activity", async () => {
        const view = renderDetail(async () => successDetail(mixedBistro, mixedStores, undefined, mixedRecentSales));

        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(view.getByText(/@mixed-bistro/)).toBeTruthy();
        expect(view.getByText("Omar Khan")).toBeTruthy();
        expect(view.getAllByText("Customers").length).toBeGreaterThan(0);
        expect(view.getAllByText("Sales value").length).toBeGreaterThan(0);
        expect(view.getByText(/1\/2 active stores/)).toBeTruthy();
        expect(view.getAllByText("Front Hall").length).toBeGreaterThan(0);
        expect(view.getByText("Garden Patio")).toBeTruthy();
        expect(view.getAllByText("Active").length).toBeGreaterThan(0);
        expect(view.getAllByText("—").length).toBeGreaterThan(0);
        expect(view.getAllByText(/Activity uses last 7 days/).length).toBeGreaterThan(0);
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Payments")).toBeNull();
    });

    test("shows a no-Stores state without tenant write controls", async () => {
        const view = renderDetail(async () => successDetail(newStand, []), { organizationId: newStand.id });

        expect(await view.findByRole("heading", { name: "New Stand" })).toBeTruthy();
        expect(view.getByText("No stores yet")).toBeTruthy();
        expect(view.getByText("No recent sales")).toBeTruthy();
        expect(view.getByText("Inactive")).toBeTruthy();
        expect(view.queryByText("Create Store")).toBeNull();
        expect(view.queryByText("Create Sale")).toBeNull();
    });

    test("does not expose other Organizations when the requested Organization is missing", async () => {
        const view = renderDetail(async () => {
            throw { code: 404, message: "Organization not found", data: null, status: "error" };
        });

        expect(await view.findByText("Organization was not found")).toBeTruthy();
        expect(view.queryByText("Mixed Bistro")).toBeNull();
        expect(view.queryByText("Omar Khan")).toBeNull();
        expect(view.queryByText("Front Hall")).toBeNull();
        expect(view.queryByText("Create Sale")).toBeNull();
    });

    test("hides Organization data when the owner session is no longer valid", async () => {
        const view = renderDetail(async () => {
            throw { code: 401, message: "Owner authentication is required", data: null, status: "error" };
        });

        expect(await view.findByText("Owner session is no longer valid")).toBeTruthy();
        expect(view.queryByText("Mixed Bistro")).toBeNull();
        expect(view.queryByText("Omar Khan")).toBeNull();
        expect(view.queryByText("Front Hall")).toBeNull();
        expect(view.getByRole("button", { name: "Back to organizations" })).toBeTruthy();
    });

    test("shows a loading overview and a distinct unavailable state", async () => {
        const loadingView = renderDetail(() => new Promise(() => {}));
        expect(await loadingView.findByLabelText("Loading organization")).toBeTruthy();
        expect(loadingView.queryByText("Create Sale")).toBeNull();

        const unavailableView = renderDetail(async () => {
            throw { message: "Cannot reach the API" };
        });
        expect(await unavailableView.findByText("Organization could not be loaded")).toBeTruthy();
        expect(unavailableView.getByText("Cannot reach the API")).toBeTruthy();
        expect(unavailableView.queryByText("Omar Khan")).toBeNull();
        expect(unavailableView.queryByText("Create Sale")).toBeNull();
    });
});

describe("Organization Inspection Workspace", () => {
    const renderConsole = (
        path: string,
        options: {
            getPlatformOrganizations?: NonNullable<Parameters<typeof PlatformOrganizationsPage>[0]["getPlatformOrganizations"]>;
            getPlatformOrganization?: LoadOrganization;
            getPlatformOrganizationStores?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationStores"]>;
            getPlatformStore?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformStore"]>;
            getPlatformOrganizationSales?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationSales"]>;
            getPlatformOrganizationSale?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationSale"]>;
            getPlatformOrganizationCatalog?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationCatalog"]>;
            getPlatformOrganizationCatalogProduct?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationCatalogProduct"]>;
        } = {},
    ) => {
        window.history.replaceState(null, "", path);
        return render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
                    <ConsoleEntry
                        ownerUser={asha}
                        onLogout={async () => {}}
                        organizationsPageProps={{
                            getPlatformOrganizations: options.getPlatformOrganizations ?? (async () => successList([mixedBistro])),
                            getPlatformOrganization: options.getPlatformOrganization
                                ?? (async () => successDetail(mixedBistro, mixedStores, undefined, mixedRecentSales)),
                            getPlatformOrganizationStores: options.getPlatformOrganizationStores ?? (async () => successStores()),
                            getPlatformStore: options.getPlatformStore ?? (async () => successStoreDetail()),
                            getPlatformOrganizationSales: options.getPlatformOrganizationSales ?? (async () => successSales()),
                            getPlatformOrganizationSale: options.getPlatformOrganizationSale ?? (async () => successSaleDetail()),
                            getPlatformOrganizationCatalog: options.getPlatformOrganizationCatalog ?? (async () => successCatalog()),
                            getPlatformOrganizationCatalogProduct: options.getPlatformOrganizationCatalogProduct ?? (async () => successCatalogProduct()),
                        }}
                    />
                </ThemeProvider>
            </QueryClientProvider>,
        );
    };

    test("opens, refreshes, and restores an Inspection URL without replacing the Console sidebar", async () => {
        const view = renderConsole("/organizations");

        fireEvent.click(await view.findByRole("link", { name: "Mixed Bistro" }));
        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(window.location.pathname).toBe(organizationInspectionPath(mixedBistro.id));
        expect(view.getByRole("navigation", { name: "Organization inspection sections" })).toBeTruthy();
        expect(view.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe("page");
        expect(view.getAllByRole("button", { name: "Organizations" }).length).toBeGreaterThan(0);
        expect(view.getAllByRole("button", { name: "Dashboard" }).length).toBeGreaterThan(0);
        expect(view.getAllByRole("button", { name: "Console Users" }).length).toBeGreaterThan(0);
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Collect Payment")).toBeNull();
        expect(view.queryByText("Void")).toBeNull();
        expect(view.queryByText("device secret")).toBeNull();

        act(() => {
            window.history.back();
            window.dispatchEvent(new Event("popstate"));
        });
        expect(await view.findByRole("heading", { name: "Organizations" })).toBeTruthy();
        expect(window.location.pathname).toBe("/organizations");

        act(() => {
            window.history.forward();
            window.dispatchEvent(new Event("popstate"));
        });
        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(window.location.pathname).toBe(organizationInspectionPath(mixedBistro.id));
    });

    test("returns to the Organization directory from the existing Console sidebar", async () => {
        const view = renderConsole(organizationInspectionPath(mixedBistro.id));
        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();

        fireEvent.click(view.getAllByRole("button", { name: "Organizations" })[0]!);
        expect(await view.findByRole("heading", { name: "Organizations" })).toBeTruthy();
        expect(window.location.pathname).toBe("/organizations");
        expect(await view.findByRole("link", { name: "Mixed Bistro" })).toBeTruthy();
        expect(view.queryByText("Create Organization")).toBeNull();
    });

    test("loads an Inspection URL directly and keeps sidebar destinations unchanged", async () => {
        const view = renderConsole(organizationInspectionPath(mixedBistro.id));

        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(view.getByText("Omar Khan")).toBeTruthy();
        expect(view.getByText("Inspection")).toBeTruthy();
        expect(view.getByRole("link", { name: "Overview" })).toBeTruthy();
        expect(view.getByRole("link", { name: "Stores" })).toBeTruthy();
        expect(view.getByRole("link", { name: "Billing" })).toBeTruthy();
        expect(view.getAllByRole("button", { name: "Overview" }).length).toBeGreaterThan(0);
        expect(view.getAllByRole("button", { name: "Organizations" })[0]?.getAttribute("aria-current")).toBe("page");
    });

    test("shows labeled adoption metrics, Store performance, and recent Sales with Store attribution", async () => {
        const view = renderConsole(organizationInspectionPath(mixedBistro.id));

        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(view.getByText(/All-time metrics from Dashboard/)).toBeTruthy();
        expect(view.getAllByText("Stores").length).toBeGreaterThan(0);
        expect(view.getByText("Active stores")).toBeTruthy();
        expect(view.getByText("12")).toBeTruthy();
        expect(view.getByText("Completed")).toBeTruthy();
        expect(view.getAllByText("Front Hall").length).toBeGreaterThan(1);
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Edit Organization")).toBeNull();
        expect(view.queryByText("Print")).toBeNull();
    });

    test("links Store performance and recent Sales into workspace sections", async () => {
        const view = renderConsole(organizationInspectionPath(mixedBistro.id));
        await view.findByRole("heading", { name: "Mixed Bistro" });

        fireEvent.click(view.getAllByRole("link", { name: "Front Hall" })[0]!);
        expect(window.location.pathname).toBe(organizationInspectionPath(mixedBistro.id, "stores", mixedStores[0]!.id));
        expect(await view.findByRole("heading", { name: "Front Hall" })).toBeTruthy();
        expect(view.getByRole("link", { name: "Stores" }).getAttribute("aria-current")).toBe("page");
        expect(view.getByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(view.queryByText("Create Store")).toBeNull();

        fireEvent.click(view.getByRole("link", { name: "Overview" }));
        expect(await view.findByRole("heading", { name: "Store performance" })).toBeTruthy();
        fireEvent.click(view.getByRole("link", { name: "12" }));
        expect(window.location.pathname).toBe(organizationInspectionPath(mixedBistro.id, "billing", mixedRecentSales[0]!.id));
        expect(await view.findByRole("heading", { name: "12" })).toBeTruthy();
        expect(view.getByText("Receipt preview")).toBeTruthy();
        expect(view.queryByText("Collect Payment")).toBeNull();
        expect(view.queryByText("Void")).toBeNull();
        expect(view.queryByText("Print")).toBeNull();
    });

    test("handles invalid Inspection URLs without exposing Organization data", async () => {
        const view = renderConsole("/organizations/not-an-organization");

        expect(await view.findByText("Organization was not found")).toBeTruthy();
        expect(view.queryByText("Omar Khan")).toBeNull();
        expect(view.queryByText("Front Hall")).toBeNull();
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.getAllByRole("button", { name: "Organizations" }).length).toBeGreaterThan(0);
    });
});

describe("Organization Store inspection", () => {
    const renderStoresSection = (
        path: string,
        options: {
            getPlatformOrganization?: LoadOrganization;
            getPlatformOrganizationStores?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationStores"]>;
            getPlatformStore?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformStore"]>;
        } = {},
    ) => {
        window.history.replaceState(null, "", path);
        const inspection = parseOrganizationInspectionPath(path);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return render(
            <QueryClientProvider client={client}>
                <PlatformOrganizationDetailPage
                    organizationId={mixedBistro.id}
                    section="stores"
                    resourceId={inspection?.kind === "workspace" ? inspection.resourceId : undefined}
                    onBack={() => {}}
                    getPlatformOrganization={options.getPlatformOrganization ?? (async () => successDetail(mixedBistro, mixedStores, undefined, mixedRecentSales))}
                    getPlatformOrganizationStores={options.getPlatformOrganizationStores ?? (async () => successStores())}
                    getPlatformStore={options.getPlatformStore ?? (async () => successStoreDetail())}
                />
            </QueryClientProvider>,
        );
    };

    test("shows a read-only Store list with activity metrics and no tenant write controls", async () => {
        const view = renderStoresSection(organizationInspectionPath(mixedBistro.id, "stores"));

        expect(await view.findByRole("heading", { name: "Stores" })).toBeTruthy();
        expect(view.getByText("Front Hall")).toBeTruthy();
        expect(view.getByText("Garden Patio")).toBeTruthy();
        expect(view.getAllByText("Active").length).toBeGreaterThan(0);
        expect(view.getAllByText("Inactive").length).toBeGreaterThan(0);
        expect(view.queryByText("Create Store")).toBeNull();
        expect(view.queryByText("Add device")).toBeNull();
        expect(view.queryByText("device secret")).toBeNull();
    });

    test("opens individual Store inspection with safe device metadata and billing links", async () => {
        const view = renderStoresSection(organizationInspectionPath(mixedBistro.id, "stores", mixedStores[0]!.id));

        expect(await view.findByRole("heading", { name: "Front Hall" })).toBeTruthy();
        expect(view.getByText(/12 Market Road/)).toBeTruthy();
        expect(view.getByText("Counter POS")).toBeTruthy();
        expect(view.getByText("front-hall-pos")).toBeTruthy();
        expect(view.getByText("Store devices")).toBeTruthy();
        expect(view.getByText(/Device secrets are never shown/)).toBeTruthy();
        expect(view.getByRole("link", { name: "12" })).toBeTruthy();
        expect(view.getByRole("button", { name: "Back to stores" })).toBeTruthy();
        expect(view.queryByText("Add device")).toBeNull();
        expect(view.queryByText("Reveal secret")).toBeNull();
        expect(view.queryByText("Open POS")).toBeNull();
    });

    test("shows empty, loading, and not-found Store states without exposing other Stores", async () => {
        const emptyView = renderStoresSection(organizationInspectionPath(mixedBistro.id, "stores"), {
            getPlatformOrganizationStores: async () => successStores([]),
        });
        expect(await emptyView.findByText("No stores yet")).toBeTruthy();

        const loadingView = renderStoresSection(organizationInspectionPath(mixedBistro.id, "stores"), {
            getPlatformOrganizationStores: () => new Promise(() => {}),
        });
        expect(await loadingView.findByLabelText("Loading stores")).toBeTruthy();

        const missingView = renderStoresSection(organizationInspectionPath(mixedBistro.id, "stores", mixedStores[0]!.id), {
            getPlatformStore: async () => {
                throw { code: 404, message: "Store not found", data: null, status: "error" };
            },
        });
        expect(await missingView.findByText("Store was not found")).toBeTruthy();
        expect(missingView.queryByText("Counter POS")).toBeNull();
    });
});

describe("Organization Catalog inspection", () => {
    const renderCatalogSection = (
        path: string,
        options: {
            getPlatformOrganization?: LoadOrganization;
            getPlatformOrganizationCatalog?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationCatalog"]>;
            getPlatformOrganizationCatalogProduct?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationCatalogProduct"]>;
        } = {},
    ) => {
        window.history.replaceState(null, "", path);
        const inspection = parseOrganizationInspectionPath(path);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return render(
            <QueryClientProvider client={client}>
                <PlatformOrganizationDetailPage
                    organizationId={mixedBistro.id}
                    section="catalog"
                    resourceId={inspection?.kind === "workspace" ? inspection.resourceId : undefined}
                    catalogResourceKind={inspection?.kind === "workspace" ? inspection.catalogResourceKind : undefined}
                    onNavigate={(nextPath) => {
                        window.history.pushState(null, "", nextPath);
                    }}
                    onBack={() => {}}
                    getPlatformOrganization={options.getPlatformOrganization ?? (async () => successDetail(mixedBistro, mixedStores, undefined, mixedRecentSales))}
                    getPlatformOrganizationCatalog={options.getPlatformOrganizationCatalog ?? (async () => successCatalog())}
                    getPlatformOrganizationCatalogProduct={options.getPlatformOrganizationCatalogProduct ?? (async () => successCatalogProduct())}
                />
            </QueryClientProvider>,
        );
    };

    test("shows a read-only catalog list with tabs and no tenant write controls", async () => {
        const view = renderCatalogSection(catalogInspectionPath(mixedBistro.id, { view: "list" }));

        expect(await view.findByRole("heading", { name: "Catalog" })).toBeTruthy();
        expect(view.getByText("Masala Chai")).toBeTruthy();
        expect(view.getByText("Beverages")).toBeTruthy();
        expect(view.getByText(/not limited by the Dashboard reporting period/)).toBeTruthy();
        expect(view.queryByText("Create Product")).toBeNull();
        expect(view.queryByText("Edit Category")).toBeNull();
        expect(view.queryByText("Delete")).toBeNull();
    });

    test("opens product detail with attachment metadata from an Inspection URL", async () => {
        const view = renderCatalogSection(catalogInspectionPath(mixedBistro.id, {
            view: "detail",
            kind: "products",
            id: productMixed,
        }));

        expect(await view.findByRole("heading", { name: "Masala Chai" })).toBeTruthy();
        expect(view.getByText("Product add-on attachments")).toBeTruthy();
        expect(view.getByText("Extra Ginger")).toBeTruthy();
        expect(view.getByRole("button", { name: "Back to catalog" })).toBeTruthy();
        expect(view.queryByText("Attach add-on")).toBeNull();
    });

    test("shows empty, loading, and not-found catalog states without exposing other Organizations", async () => {
        const emptyView = renderCatalogSection(catalogInspectionPath(mixedBistro.id, { view: "list" }), {
            getPlatformOrganizationCatalog: async () => successCatalog({
                products: [],
                pagination: { page: 1, limit: 20, totalCount: 0 },
            }),
        });
        expect(await emptyView.findByText("No products match these filters")).toBeTruthy();

        const loadingView = renderCatalogSection(catalogInspectionPath(mixedBistro.id, { view: "list" }), {
            getPlatformOrganizationCatalog: () => new Promise(() => {}),
        });
        expect(await loadingView.findByLabelText("Loading catalog")).toBeTruthy();

        const missingView = renderCatalogSection(catalogInspectionPath(mixedBistro.id, {
            view: "detail",
            kind: "products",
            id: productMixed,
        }), {
            getPlatformOrganizationCatalogProduct: async () => {
                throw { code: 404, message: "Product not found", data: null, status: "error" };
            },
        });
        expect(await missingView.findByText("Product was not found")).toBeTruthy();
        expect(missingView.queryByText("Extra Ginger")).toBeNull();
    });
});

describe("Organization Billing inspection", () => {
    const renderBillingSection = (
        path: string,
        options: {
            getPlatformOrganization?: LoadOrganization;
            getPlatformOrganizationSales?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationSales"]>;
            getPlatformOrganizationSale?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationSale"]>;
        } = {},
    ) => {
        window.history.replaceState(null, "", path);
        const inspection = parseOrganizationInspectionPath(path);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return render(
            <QueryClientProvider client={client}>
                <PlatformOrganizationDetailPage
                    organizationId={mixedBistro.id}
                    section="billing"
                    resourceId={inspection?.kind === "workspace" ? inspection.resourceId : undefined}
                    onNavigate={(nextPath) => {
                        window.history.pushState(null, "", nextPath);
                    }}
                    onBack={() => {}}
                    getPlatformOrganization={options.getPlatformOrganization ?? (async () => successDetail(mixedBistro, mixedStores, undefined, mixedRecentSales))}
                    getPlatformOrganizationSales={options.getPlatformOrganizationSales ?? (async () => successSales())}
                    getPlatformOrganizationSale={options.getPlatformOrganizationSale ?? (async () => successSaleDetail())}
                />
            </QueryClientProvider>,
        );
    };

    test("shows a read-only bill list with Store attribution and independent billing filters", async () => {
        const requested: PlatformBillingInspectionQueryJSON[] = [];
        const view = renderBillingSection(organizationInspectionPath(mixedBistro.id, "billing", undefined, { storeId: mixedStores[0]!.id }), {
            getPlatformOrganizationSales: async (_organizationId, query = {}) => {
                requested.push(query);
                return successSales();
            },
        });

        expect(await view.findByRole("heading", { name: "Billing" })).toBeTruthy();
        expect(view.getByText("Front Hall")).toBeTruthy();
        expect(view.getByText(/not the Dashboard reporting period/)).toBeTruthy();
        expect(view.getByRole("link", { name: "12" })).toBeTruthy();
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Collect Payment")).toBeNull();
        await waitFor(() => {
            expect(requested.some((query) => query.storeId === mixedStores[0]!.id)).toBe(true);
        });
    });

    test("opens read-only Sale inspection with items, payments, devices, and receipt preview", async () => {
        const view = renderBillingSection(organizationInspectionPath(mixedBistro.id, "billing", mixedRecentSales[0]!.id));

        expect(await view.findByRole("heading", { name: "12" })).toBeTruthy();
        expect(view.getByText("Line items")).toBeTruthy();
        expect(view.getByText("Tea")).toBeTruthy();
        expect(view.getByText("Payments")).toBeTruthy();
        expect(view.getByText("Device attribution")).toBeTruthy();
        expect(view.getByText(/Created by Counter POS/)).toBeTruthy();
        expect(view.getByText("Receipt preview")).toBeTruthy();
        expect(view.getByText(/Bill 12/)).toBeTruthy();
        expect(view.getByRole("button", { name: "Back to billing" })).toBeTruthy();
        expect(view.queryByText("Void")).toBeNull();
        expect(view.queryByText("Print")).toBeNull();
        expect(view.queryByText("Download")).toBeNull();
        expect(view.queryByRole("button", { name: "WhatsApp" })).toBeNull();
    });

    test("shows empty, loading, and not-found billing states without exposing other Organizations", async () => {
        const emptyView = renderBillingSection(organizationInspectionPath(mixedBistro.id, "billing"), {
            getPlatformOrganizationSales: async () => successSales([]),
        });
        expect(await emptyView.findByText("No bills match these filters")).toBeTruthy();

        const loadingView = renderBillingSection(organizationInspectionPath(mixedBistro.id, "billing"), {
            getPlatformOrganizationSales: () => new Promise(() => {}),
        });
        expect(await loadingView.findByLabelText("Loading bills")).toBeTruthy();

        const missingView = renderBillingSection(
            organizationInspectionPath(mixedBistro.id, "billing", mixedRecentSales[0]!.id),
            {
                getPlatformOrganizationSale: async () => {
                    throw { code: 404, message: "Sale not found", data: null, status: "error" };
                },
            },
        );
        expect(await missingView.findByText("Bill was not found")).toBeTruthy();
        expect(missingView.queryByText("Tea")).toBeNull();
    });
});

describe("Organization Customer inspection", () => {
    const renderCustomerSection = (
        path: string,
        options: {
            getPlatformOrganization?: LoadOrganization;
            getPlatformOrganizationCustomers?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationCustomers"]>;
            getPlatformOrganizationCustomer?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationCustomer"]>;
        } = {},
    ) => {
        window.history.replaceState(null, "", path);
        const inspection = parseOrganizationInspectionPath(path);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return render(
            <QueryClientProvider client={client}>
                <PlatformOrganizationDetailPage
                    organizationId={mixedBistro.id}
                    section="customers"
                    resourceId={inspection?.kind === "workspace" ? inspection.resourceId : undefined}
                    onNavigate={(nextPath) => {
                        window.history.pushState(null, "", nextPath);
                    }}
                    onBack={() => {}}
                    getPlatformOrganization={options.getPlatformOrganization ?? (async () => successDetail(mixedBistro, mixedStores, undefined, mixedRecentSales))}
                    getPlatformOrganizationCustomers={options.getPlatformOrganizationCustomers ?? (async () => successCustomers())}
                    getPlatformOrganizationCustomer={options.getPlatformOrganizationCustomer ?? (async () => successCustomerDetail())}
                />
            </QueryClientProvider>,
        );
    };

    test("shows a read-only customer list with filters and no tenant mutation controls", async () => {
        const requested: PlatformCustomerInspectionQueryJSON[] = [];
        const view = renderCustomerSection(
            organizationInspectionPath(mixedBistro.id, "customers", undefined, { status: "due", search: "Dev" }),
            {
                getPlatformOrganizationCustomers: async (_organizationId, query = {}) => {
                    requested.push(query);
                    return successCustomers();
                },
            },
        );

        expect(await view.findByRole("heading", { name: "Customers" })).toBeTruthy();
        expect(view.getByText("Anita Rao")).toBeTruthy();
        expect(view.getByText("Dev Patel")).toBeTruthy();
        expect(view.getByText(/not limited by the Dashboard reporting period/)).toBeTruthy();
        expect(view.queryByText("Create Customer")).toBeNull();
        expect(view.queryByText("Edit Customer")).toBeNull();
        expect(view.queryByText("Collect Payment")).toBeNull();
        expect(view.queryByText("Adjust Balance")).toBeNull();
        await waitFor(() => {
            expect(requested.some((query) => query.status === "due" && query.search === "Dev")).toBe(true);
        });
    });

    test("opens customer detail with ledger and billing context from an Inspection URL", async () => {
        const view = renderCustomerSection(
            organizationInspectionPath(mixedBistro.id, "customers", customerMixedDue),
        );

        expect(await view.findByRole("heading", { name: "Dev Patel" })).toBeTruthy();
        expect(view.getByText("Customer ledger")).toBeTruthy();
        expect(view.getByText("Billing history")).toBeTruthy();
        expect(view.getByRole("link", { name: "13" })).toBeTruthy();
        expect(view.getByRole("button", { name: "Back to customers" })).toBeTruthy();
        expect(view.queryByText("Send reminder")).toBeNull();
        expect(view.queryByText("Edit")).toBeNull();
    });

    test("shows empty, loading, and not-found customer states without exposing other Organizations", async () => {
        const emptyView = renderCustomerSection(organizationInspectionPath(mixedBistro.id, "customers"), {
            getPlatformOrganizationCustomers: async () => successCustomers({
                customers: [],
                pagination: { page: 1, limit: 20, totalCount: 0 },
            }),
        });
        expect(await emptyView.findByText("No customers match these filters")).toBeTruthy();

        const loadingView = renderCustomerSection(organizationInspectionPath(mixedBistro.id, "customers"), {
            getPlatformOrganizationCustomers: () => new Promise(() => {}),
        });
        expect(await loadingView.findByLabelText("Loading customers")).toBeTruthy();

        const missingView = renderCustomerSection(
            organizationInspectionPath(mixedBistro.id, "customers", customerMixedDue),
            {
                getPlatformOrganizationCustomer: async () => {
                    throw { code: 404, message: "Customer not found", data: null, status: "error" };
                },
            },
        );
        expect(await missingView.findByText("Customer was not found")).toBeTruthy();
        expect(missingView.queryByText("Dev Patel")).toBeNull();
    });
});

describe("Organization Report inspection", () => {
    const renderReportSection = (
        path: string,
        options: {
            getPlatformOrganization?: LoadOrganization;
            getPlatformOrganizationReports?: NonNullable<PlatformOrganizationDetailPageProps["getPlatformOrganizationReports"]>;
            reportingQuery?: PlatformDashboardQueryJSON;
        } = {},
    ) => {
        window.history.replaceState(null, "", path);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return render(
            <QueryClientProvider client={client}>
                <PlatformOrganizationDetailPage
                    organizationId={mixedBistro.id}
                    section="reports"
                    reportingQuery={options.reportingQuery}
                    onNavigate={(nextPath) => {
                        window.history.pushState(null, "", nextPath);
                    }}
                    onBack={() => {}}
                    getPlatformOrganization={options.getPlatformOrganization ?? (async () => successDetail(mixedBistro, mixedStores, undefined, mixedRecentSales))}
                    getPlatformOrganizationReports={options.getPlatformOrganizationReports ?? (async () => successReports())}
                />
            </QueryClientProvider>,
        );
    };

    test("shows read-only product sales with explicit report range controls independent of the Dashboard reporting period", async () => {
        const requested: PlatformReportInspectionQueryJSON[] = [];
        const view = renderReportSection(
            organizationInspectionPath(mixedBistro.id, "reports", undefined, {
                startDate: "2026-08-19",
                endDate: "2026-08-19",
                storeId: mixedStores[0]!.id,
            }),
            {
                reportingQuery: { period: "7d" },
                getPlatformOrganizationReports: async (_organizationId, query = {}) => {
                    requested.push(query);
                    return successReports();
                },
            },
        );

        expect(await view.findByRole("heading", { name: "Reports" })).toBeTruthy();
        expect(view.getByRole("heading", { name: "Product sales" })).toBeTruthy();
        expect(view.getByText("Masala Chai")).toBeTruthy();
        expect(view.getByText("2026-08-19")).toBeTruthy();
        expect(view.getByText(/not the Dashboard reporting period/)).toBeTruthy();
        expect(view.queryByText("Export")).toBeNull();
        expect(view.queryByText("Configure report")).toBeNull();
        await waitFor(() => {
            expect(requested.some((query) =>
                query.startDate === "2026-08-19"
                && query.endDate === "2026-08-19"
                && query.storeId === mixedStores[0]!.id)).toBe(true);
        });
    });

    test("shows empty, loading, and unavailable report states without exposing other Organizations", async () => {
        const emptyView = renderReportSection(organizationInspectionPath(mixedBistro.id, "reports"), {
            getPlatformOrganizationReports: async () => successReports({
                productSales: { products: [], productCount: 0, totalQuantitySold: 0 },
            }),
        });
        expect(await emptyView.findByText("No product sales found")).toBeTruthy();

        const loadingView = renderReportSection(organizationInspectionPath(mixedBistro.id, "reports"), {
            getPlatformOrganizationReports: () => new Promise(() => {}),
        });
        expect(await loadingView.findByLabelText("Loading reports")).toBeTruthy();

        const unavailableView = renderReportSection(organizationInspectionPath(mixedBistro.id, "reports"), {
            getPlatformOrganizationReports: async () => {
                throw { code: 404, message: "Store not found", data: null, status: "error" };
            },
        });
        expect(await unavailableView.findByText("Report data was not found")).toBeTruthy();
        expect(unavailableView.queryByText("Masala Chai")).toBeNull();
    });
});
