import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
    OwnerUserDTO,
    PlatformDashboardQueryJSON,
    PlatformOrganizationListItemDTO,
    PlatformOrganizationListQueryJSON,
    PlatformOrganizationListResponse,
    ServiceResponse,
} from "@repo/types";

import ConsoleEntry from "./console-entry";
import PlatformOrganizationsPage, { type PlatformOrganizationsPageProps } from "./platform-organizations-page";

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

const activeCafe: PlatformOrganizationListItemDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Active Cafe",
    username: "active-cafe",
    isActive: true,
    creator: { firstName: "Kiran", lastName: "Patel", phone: "+919800000001" },
    storeCount: 1,
    activeStoreCount: 1,
    customerCount: 2,
    completedSaleCount: 5,
    completedSalesValue: 161.25,
    lastCompletedSaleAt: "2026-08-21T18:30:00.000Z",
};

const quietMart: PlatformOrganizationListItemDTO = {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Quiet Mart",
    username: "quiet-mart",
    isActive: false,
    creator: { firstName: "Leela", lastName: "Nair", phone: "+919800000002" },
    storeCount: 1,
    activeStoreCount: 0,
    customerCount: 0,
    completedSaleCount: 2,
    completedSalesValue: 52,
    lastCompletedSaleAt: "2026-08-14T18:29:59.000Z",
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
    pagination: PlatformOrganizationListResponse["pagination"] = {
        page: 1,
        limit: 20,
        totalCount: organizations.length,
    },
    period: PlatformOrganizationListResponse["reportingPeriod"] = {
        selection: "all-time",
        startDate: null,
        endDate: null,
    },
): ServiceResponse<PlatformOrganizationListResponse> => ({
    status: "success",
    data: {
        reportingPeriod: period,
        organizations,
        pagination,
    },
    message: "Platform Organizations retrieved successfully",
    code: 200,
});

type LoadOrganizations = NonNullable<PlatformOrganizationsPageProps["getPlatformOrganizations"]>;

const renderList = (
    loadOrganizations: LoadOrganizations = async () => successList([activeCafe, quietMart, newStand]),
    options: {
        reportingQuery?: PlatformDashboardQueryJSON;
        initialSearch?: string;
        initialActivity?: PlatformOrganizationsPageProps["initialActivity"];
    } = {},
) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <PlatformOrganizationsPage
                onBack={() => {}}
                reportingQuery={options.reportingQuery}
                getPlatformOrganizations={loadOrganizations}
                initialSearch={options.initialSearch}
                initialActivity={options.initialActivity}
            />
        </QueryClientProvider>,
    );
};

describe("Platform Organization outreach list", () => {
    test("opens Organizations from the console home", async () => {
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ConsoleEntry
                    ownerUser={asha}
                    onLogout={async () => {}}
                    organizationsPageProps={{
                        getPlatformOrganizations: async () => successList([activeCafe]),
                    }}
                />
            </QueryClientProvider>,
        );

        fireEvent.click(view.getByRole("button", { name: "Open Organizations" }));
        expect(await view.findByRole("heading", { name: "Organizations" })).toBeTruthy();
        expect(await view.findByText("Active Cafe")).toBeTruthy();
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Create Organization")).toBeNull();
        expect(view.queryByText("Payments")).toBeNull();
    });

    test("shows identity, creator contact, adoption metrics, and last completed Sale", async () => {
        const view = renderList();

        expect(await view.findByText("Active Cafe")).toBeTruthy();
        expect(view.getByText("active-cafe")).toBeTruthy();
        expect(view.getByText("Kiran Patel")).toBeTruthy();
        expect(view.getByText("Quiet Mart")).toBeTruthy();
        expect(view.getByText("Leela Nair")).toBeTruthy();
        expect(view.getAllByText("Active Organization").length).toBeGreaterThan(0);
        expect(view.getAllByText("Inactive").length).toBeGreaterThan(0);
        expect(view.getByText("Customer Count")).toBeTruthy();
        expect(view.getByText("Completed Sales Value")).toBeTruthy();
        expect(view.getByText("161.25", { exact: false })).toBeTruthy();
        expect(view.getByText("No completed Sale")).toBeTruthy();
        expect(view.getByText(/does not follow the selected Platform Reporting Period/)).toBeTruthy();
        expect(view.queryByText("Create Sale")).toBeNull();
    });

    test("filters to inactive Organizations without changing the seven-day activity meaning", async () => {
        const requested: PlatformOrganizationListQueryJSON[] = [];
        const view = renderList(async (query = {}) => {
            requested.push(query);
            if (query.activity === "inactive") return successList([newStand, quietMart]);
            return successList([activeCafe, quietMart, newStand]);
        });

        await view.findByText("Active Cafe");
        fireEvent.click(view.getByRole("button", { name: "Inactive" }));
        await waitFor(() => {
            expect(requested.some((query) => query.activity === "inactive")).toBe(true);
            expect(view.queryByText("Active Cafe") === null).toBe(true);
        });
        expect(view.getByText("New Stand")).toBeTruthy();
        expect(view.getByText("Quiet Mart")).toBeTruthy();
        expect(view.getByText(/does not follow the selected Platform Reporting Period/)).toBeTruthy();
        expect(view.queryByText("Create Sale") === null).toBe(true);
    });

    test("shows a clear empty state when search and filter match no Organizations", async () => {
        const requested: PlatformOrganizationListQueryJSON[] = [];
        const view = renderList(async (query = {}) => {
            requested.push(query);
            return successList([]);
        }, { initialSearch: "zzzz", initialActivity: "inactive" });

        expect(await view.findByText("No Organizations match this search or filter.")).toBeTruthy();
        await waitFor(() => {
            expect(requested.some((query) => query.search === "zzzz" && query.activity === "inactive")).toBe(true);
        });
        expect(view.queryByText("Create Sale") === null).toBe(true);
    });

    test("paginates while retaining the selected Platform Reporting Period", async () => {
        const requested: PlatformOrganizationListQueryJSON[] = [];
        const view = renderList(async (query = {}) => {
            requested.push(query);
            if (query.page === 2) {
                return successList([quietMart], { page: 2, limit: 20, totalCount: 21 });
            }
            return successList([activeCafe], { page: 1, limit: 20, totalCount: 21 });
        }, { reportingQuery: { period: "7d" } });

        await view.findByText("Active Cafe");
        expect(view.getByText(/7-day Platform Reporting Period/)).toBeTruthy();
        fireEvent.click(view.getByRole("button", { name: "Next page" }));
        await waitFor(() => {
            expect(requested.some((query) => query.page === 2 && query.period === "7d")).toBe(true);
            expect(view.getByText("Quiet Mart")).toBeTruthy();
        });
        expect(requested[0]?.period).toBe("7d");
        expect(view.getByText("Page 2 of 2")).toBeTruthy();
    });

    test("keeps the Dashboard Platform Reporting Period when opening Organizations", async () => {
        const requested: PlatformOrganizationListQueryJSON[] = [];
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ConsoleEntry
                    ownerUser={asha}
                    onLogout={async () => {}}
                    dashboardPageProps={{
                        getPlatformDashboard: async (query = {}) => ({
                            status: "success",
                            data: {
                                reportingPeriod: {
                                    selection: query.period ?? "all-time",
                                    startDate: query.period === "7d" ? "2026-08-15" : null,
                                    endDate: query.period === "7d" ? "2026-08-21" : null,
                                },
                                allTime: { organizationCount: 4, storeCount: 4, customerCount: 2, completedSaleCount: 8 },
                                activity: { activeOrganizationCount: 2, activeStoreCount: 2 },
                                reportingPeriodMetrics: { completedSaleCount: 5, completedSalesValue: 200.75, customerCount: 1 },
                            },
                            message: "Platform dashboard retrieved successfully",
                            code: 200,
                        }),
                    }}
                    organizationsPageProps={{
                        getPlatformOrganizations: async (query = {}) => {
                            requested.push(query);
                            return successList([activeCafe]);
                        },
                    }}
                />
            </QueryClientProvider>,
        );

        fireEvent.click(view.getByRole("button", { name: "Open Dashboard" }));
        await view.findByRole("heading", { name: "Dashboard" });
        fireEvent.click(view.getByRole("button", { name: "7-day" }));
        fireEvent.click(view.getByRole("button", { name: "Back to console" }));
        fireEvent.click(view.getByRole("button", { name: "Open Organizations" }));

        await waitFor(() => {
            expect(requested.some((query) => query.period === "7d")).toBe(true);
        });
        expect(view.getByText(/7-day Platform Reporting Period/)).toBeTruthy();
        expect(view.queryByText("Create Sale")).toBeNull();
    });

    test("shows a list load failure without treating it as a zero-result search", async () => {
        const view = renderList(async () => {
            throw { message: "Cannot reach the API" };
        });

        expect(await view.findByText("Organizations could not be loaded")).toBeTruthy();
        expect(view.getByText("Cannot reach the API")).toBeTruthy();
        expect(view.queryByText("No Organizations match this search or filter.")).toBeNull();
    });
});
