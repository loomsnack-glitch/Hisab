import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type {
    OwnerUserDTO,
    PlatformDashboardQueryJSON,
    PlatformOrganizationDetailQueryJSON,
    PlatformOrganizationDetailResponse,
    PlatformOrganizationListItemDTO,
    PlatformOrganizationListQueryJSON,
    PlatformOrganizationListResponse,
    ServiceResponse,
} from "@repo/types";

import ConsoleEntry from "./console-entry";
import PlatformOrganizationDetailPage, {
    type PlatformOrganizationDetailPageProps,
} from "./platform-organization-detail-page";
import PlatformOrganizationsPage from "./platform-organizations-page";

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
): ServiceResponse<PlatformOrganizationDetailResponse> => ({
    status: "success",
    data: {
        reportingPeriod: period,
        organization: { ...organization, stores },
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

        fireEvent.click(await view.findByRole("button", { name: "Mixed Bistro" }));

        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(view.getByText(/7-day Platform Reporting Period/)).toBeTruthy();
        expect(view.getByText("mixed-bistro")).toBeTruthy();
        expect(view.getByText("Omar Khan")).toBeTruthy();
        expect(view.getByText("Front Hall")).toBeTruthy();
        expect(view.getByText("Garden Patio")).toBeTruthy();
        expect(view.getByText("Active Store")).toBeTruthy();
        expect(view.getAllByText("Inactive").length).toBeGreaterThan(0);
        expect(view.getAllByText("50.50", { exact: false }).length).toBeGreaterThan(0);
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Collect Payment")).toBeNull();
        expect(view.queryByText("device secret")).toBeNull();
        await waitFor(() => {
            expect(requested.some((query) => query.period === "7d")).toBe(true);
        });

        fireEvent.click(view.getByRole("button", { name: "Back to Organizations" }));
        expect(await view.findByRole("heading", { name: "Organizations" })).toBeTruthy();
        expect(view.getByText(/7-day Platform Reporting Period/)).toBeTruthy();
        expect(view.getByRole("button", { name: "Mixed Bistro" })).toBeTruthy();
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
        await view.findByRole("button", { name: "Mixed Bistro" });
        fireEvent.click(view.getByRole("button", { name: "Mixed Bistro" }));

        await waitFor(() => {
            expect(requested.some((item) => item.kind === "list" && item.query.period === "30d")).toBe(true);
            expect(requested.some((item) => item.kind === "detail" && item.query.period === "30d")).toBe(true);
        });
        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(view.getByText(/30-day Platform Reporting Period/)).toBeTruthy();
        expect(view.queryByText("Create Organization")).toBeNull();
    });

    test("shows Organization identity, adoption aggregates, and mixed Store activity", async () => {
        const view = renderDetail(async () => successDetail(mixedBistro, mixedStores));

        expect(await view.findByRole("heading", { name: "Mixed Bistro" })).toBeTruthy();
        expect(view.getByText("mixed-bistro")).toBeTruthy();
        expect(view.getByText("Omar Khan")).toBeTruthy();
        expect(view.getAllByText("Customer Count").length).toBeGreaterThan(0);
        expect(view.getAllByText("Completed Sales Value").length).toBeGreaterThan(0);
        expect(view.getByText("1 Active Store / 2")).toBeTruthy();
        expect(view.getByText("Front Hall")).toBeTruthy();
        expect(view.getByText("Garden Patio")).toBeTruthy();
        expect(view.getByText("Active Store")).toBeTruthy();
        expect(view.getByText("No completed Sale")).toBeTruthy();
        expect(view.getByText(/does not follow the selected Platform Reporting Period/)).toBeTruthy();
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Payments")).toBeNull();
    });

    test("shows a no-Stores state without tenant write controls", async () => {
        const view = renderDetail(async () => successDetail(newStand, []), { organizationId: newStand.id });

        expect(await view.findByRole("heading", { name: "New Stand" })).toBeTruthy();
        expect(view.getByText("This Organization has no Stores.")).toBeTruthy();
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
        expect(view.getByRole("button", { name: "Back to Organizations" })).toBeTruthy();
    });
});
