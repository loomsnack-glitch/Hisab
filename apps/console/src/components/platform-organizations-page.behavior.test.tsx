import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
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
import { organizationInspectionPath } from "@/lib/organization-inspection-url";

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
        onUnauthorized?: () => Promise<void>;
    } = {},
) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <PlatformOrganizationsPage
                reportingQuery={options.reportingQuery}
                getPlatformOrganizations={loadOrganizations}
                initialSearch={options.initialSearch}
                initialActivity={options.initialActivity}
                onUnauthorized={options.onUnauthorized}
            />
        </QueryClientProvider>,
    );
};

const openStatusFilter = (view: ReturnType<typeof render>) => {
    fireEvent.click(view.getByRole("button", { name: "Status" }));
};

const selectStatusFilter = async (view: ReturnType<typeof render>, label: string) => {
    openStatusFilter(view);
    const option = await waitFor(() => view.getByRole("option", { name: label }));
    fireEvent.click(option);
};

const selectSortFilter = async (view: ReturnType<typeof render>, label: string) => {
    fireEvent.click(view.getByRole("button", { name: /^Sort/ }));
    const option = await waitFor(() => view.getByRole("option", { name: label }));
    fireEvent.click(option);
};

describe("Organization Directory", () => {
    test("opens Organizations from the console home", async () => {
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
                    <ConsoleEntry
                        ownerUser={asha}
                        onLogout={async () => {}}
                        organizationsPageProps={{
                            getPlatformOrganizations: async () => successList([activeCafe]),
                        }}
                    />
                </ThemeProvider>
            </QueryClientProvider>,
        );

        fireEvent.click(view.getAllByRole("button", { name: "Organizations" })[0]!);
        expect(await view.findByRole("link", { name: "Active Cafe" })).toBeTruthy();
        expect(view.queryByText("Outreach")).toBeNull();
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Create Organization")).toBeNull();
        expect(view.queryByText("Payments")).toBeNull();
    });

    test("shows identity, creator, adoption health, and selected-period sales in a table and mobile cards", async () => {
        const view = renderList();

        expect(await view.findByRole("link", { name: "Active Cafe" })).toBeTruthy();
        expect(view.queryByText("Outreach")).toBeNull();
        expect(view.getByRole("table")).toBeTruthy();
        expect(view.getByRole("columnheader", { name: "Organization" })).toBeTruthy();
        expect(view.getByRole("link", { name: "Inspect Active Cafe" })).toBeTruthy();
        expect(view.getAllByText("active-cafe").length).toBeGreaterThan(0);
        expect(view.getAllByText("Kiran Patel").length).toBeGreaterThan(0);
        expect(view.getAllByText("Quiet Mart").length).toBeGreaterThan(0);
        expect(view.getAllByText("Leela Nair").length).toBeGreaterThan(0);
        expect(view.getAllByText("Active").length).toBeGreaterThan(0);
        expect(view.getAllByText("Inactive").length).toBeGreaterThan(0);
        expect(view.getAllByText("Customers").length).toBeGreaterThan(0);
        expect(view.getAllByText("Sales value").length).toBeGreaterThan(0);
        expect(view.getAllByText("Last sale").length).toBeGreaterThan(0);
        expect(view.getAllByText("161.25", { exact: false }).length).toBeGreaterThan(0);
        expect(view.getAllByText("—").length).toBeGreaterThan(0);
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Edit Organization")).toBeNull();
    });

    test("filters to inactive Organizations without changing the seven-day activity meaning", async () => {
        const requested: PlatformOrganizationListQueryJSON[] = [];
        const view = renderList(async (query = {}) => {
            requested.push(query);
            if (query.activity === "inactive") return successList([newStand, quietMart]);
            return successList([activeCafe, quietMart, newStand]);
        });

        await view.findByRole("link", { name: "Active Cafe" });
        await selectStatusFilter(view, "Inactive");
        await waitFor(() => {
            expect(requested.some((query) => query.activity === "inactive")).toBe(true);
            expect(view.queryAllByRole("link", { name: "Active Cafe" }).length).toBe(0);
        });
        expect(view.getByRole("link", { name: "New Stand" })).toBeTruthy();
        expect(view.getByRole("link", { name: "Quiet Mart" })).toBeTruthy();
        expect(view.queryByText("Create Sale") === null).toBe(true);
    });

    test("shows a clear empty state when search and filter match no Organizations", async () => {
        const requested: PlatformOrganizationListQueryJSON[] = [];
        const view = renderList(async (query = {}) => {
            requested.push(query);
            return successList([]);
        }, { initialSearch: "zzzz", initialActivity: "inactive" });

        expect(await view.findByText("No matches")).toBeTruthy();
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

        await view.findByRole("link", { name: "Active Cafe" });
        fireEvent.click(view.getByRole("button", { name: "Next" }));
        await waitFor(() => {
            expect(requested.some((query) => query.page === 2 && query.period === "7d")).toBe(true);
            expect(view.getByRole("link", { name: "Quiet Mart" })).toBeTruthy();
        });
        expect(requested[0]?.period).toBe("7d");
        expect(view.getByText("Page 2 of 2")).toBeTruthy();
    });

    test("keeps the Dashboard Platform Reporting Period when opening Organizations", async () => {
        const requested: PlatformOrganizationListQueryJSON[] = [];
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
                </ThemeProvider>
            </QueryClientProvider>,
        );

        fireEvent.click(view.getAllByRole("button", { name: "Dashboard" })[0]!);
        await view.findByRole("heading", { name: "Dashboard" });
        fireEvent.click(view.getByRole("button", { name: "7-day" }));
        fireEvent.click(view.getAllByRole("button", { name: "Organizations" })[0]!);

        await waitFor(() => {
            expect(requested.some((query) => query.period === "7d")).toBe(true);
        });
        expect(view.queryByText("Create Sale")).toBeNull();
    });

    test("shows a list load failure without treating it as a zero-result search", async () => {
        const view = renderList(async () => {
            throw { message: "Cannot reach the API" };
        });

        expect(await view.findByText("Organizations could not be loaded")).toBeTruthy();
        expect(view.getByText("Cannot reach the API")).toBeTruthy();
        expect(view.queryByText("No matches")).toBeNull();
    });

    test("shows a labeled loading state while the Organization Directory loads", async () => {
        const view = renderList(() => new Promise(() => {}));

        expect(await view.findByLabelText("Loading organizations")).toBeTruthy();
        expect(view.queryByText("Create Sale")).toBeNull();
    });

    test("searches Organization identity and creator through the platform list contract", async () => {
        const requested: PlatformOrganizationListQueryJSON[] = [];
        const view = renderList(async (query = {}) => {
            requested.push(query);
            if (query.search === "Nair") return successList([quietMart]);
            return successList([activeCafe, quietMart, newStand]);
        }, { initialSearch: "Nair" });

        expect(view.getByRole("searchbox", { name: "Search organization or creator" })).toBeTruthy();
        expect(await view.findByRole("link", { name: "Quiet Mart" })).toBeTruthy();
        await waitFor(() => {
            expect(requested.some((query) => query.search === "Nair")).toBe(true);
        });
        expect(view.queryAllByRole("link", { name: "Active Cafe" }).length).toBe(0);
        expect(view.getAllByText("Leela Nair").length).toBeGreaterThan(0);
        expect(view.queryByText("Create Sale")).toBeNull();
    });

    test("requests recency-first sorting by default and can change directory sort", async () => {
        const requested: PlatformOrganizationListQueryJSON[] = [];
        const view = renderList(async (query = {}) => {
            requested.push(query);
            if (query.sort === "name_asc") return successList([activeCafe, newStand, quietMart]);
            if (query.sort === "sales_value_desc") return successList([activeCafe, quietMart, newStand]);
            return successList([activeCafe, quietMart, newStand]);
        });

        await view.findByRole("link", { name: "Active Cafe" });
        expect(requested[0]?.sort).toBe("recent_activity");
        await selectSortFilter(view, "Name A–Z");
        await waitFor(() => {
            expect(requested.some((query) => query.sort === "name_asc" && query.page === 1)).toBe(true);
        });
        await selectSortFilter(view, "Highest sales value");
        await waitFor(() => {
            expect(requested.some((query) => query.sort === "sales_value_desc")).toBe(true);
        });
        expect(view.queryByText("Create Sale")).toBeNull();
    });

    test("opens an Inspection URL from a directory row or name", async () => {
        window.history.replaceState(null, "", "/organizations");
        const view = renderList();

        const nameLink = await view.findByRole("link", { name: "Active Cafe" });
        fireEvent.click(nameLink.closest("tr")!);

        await waitFor(() => {
            expect(window.location.pathname).toBe(organizationInspectionPath(activeCafe.id));
        });
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText("Edit Organization")).toBeNull();
    });

    test("hides Organizations when the Owner User session is no longer valid", async () => {
        let unauthorized = false;
        const view = renderList(async () => {
            throw { code: 401, message: "Owner authentication is required", data: null, status: "error" };
        }, {
            onUnauthorized: async () => {
                unauthorized = true;
            },
        });

        expect(await view.findByText("Owner session is no longer valid")).toBeTruthy();
        expect(view.queryByText("Active Cafe")).toBeNull();
        expect(view.queryByText("Create Sale")).toBeNull();
        await waitFor(() => {
            expect(unauthorized).toBe(true);
        });
    });
});
