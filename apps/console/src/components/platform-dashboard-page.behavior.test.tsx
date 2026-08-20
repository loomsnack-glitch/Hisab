import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { OwnerUserDTO, PlatformDashboardQueryJSON, PlatformDashboardResponse, ServiceResponse } from "@repo/types";

import ConsoleEntry from "./console-entry";
import PlatformDashboardPage, { type PlatformDashboardPageProps } from "./platform-dashboard-page";

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

const successDashboard = (
    query: PlatformDashboardQueryJSON = {},
    overrides: Partial<PlatformDashboardResponse> = {},
): ServiceResponse<PlatformDashboardResponse> => {
    const period = query.period ?? "all-time";
    const reportingPeriodMetrics = period === "7d"
        ? { completedSaleCount: 5, completedSalesValue: 200.75, customerCount: 1 }
        : period === "custom"
            ? { completedSaleCount: 0, completedSalesValue: 0, customerCount: 0 }
            : { completedSaleCount: 8, completedSalesValue: 263.75, customerCount: 2 };

    return {
        status: "success",
        data: {
            reportingPeriod: {
                selection: period,
                startDate: period === "all-time" ? null : period === "7d" ? "2026-08-15" : query.startDate ?? "2026-08-02",
                endDate: period === "all-time" ? null : period === "7d" ? "2026-08-21" : query.endDate ?? "2026-08-03",
            },
            allTime: {
                organizationCount: 4,
                storeCount: 4,
                customerCount: 2,
                completedSaleCount: 8,
            },
            activity: {
                activeOrganizationCount: 2,
                activeStoreCount: 2,
            },
            reportingPeriodMetrics,
            ...overrides,
        },
        message: "Platform dashboard retrieved successfully",
        code: 200,
    };
};

type LoadDashboard = NonNullable<PlatformDashboardPageProps["getPlatformDashboard"]>;

const renderDashboard = (
    loadDashboard: LoadDashboard = async (query = {}) => successDashboard(query),
    options: {
        initialQuery?: PlatformDashboardQueryJSON;
        initialCustomValues?: { startDate: string; endDate: string };
        onUnauthorized?: () => Promise<void>;
    } = {},
) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <PlatformDashboardPage
                onBack={() => {}}
                getPlatformDashboard={loadDashboard}
                initialQuery={options.initialQuery}
                initialCustomValues={options.initialCustomValues}
                onUnauthorized={options.onUnauthorized}
            />
        </QueryClientProvider>,
    );
};

describe("Platform dashboard console destination", () => {
    test("opens the dashboard from the console home", async () => {
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ConsoleEntry
                    ownerUser={asha}
                    onLogout={async () => {}}
                    dashboardPageProps={{
                        getPlatformDashboard: async (query = {}) => successDashboard(query),
                    }}
                />
            </QueryClientProvider>,
        );

        fireEvent.click(view.getByRole("button", { name: "Open Dashboard" }));
        expect(await view.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
        expect(view.getByText(/not revenue or collected Payments/)).toBeTruthy();
        expect(view.queryByText("Create Sale")).toBeNull();
    });

    test("opens Dashboard from its Console route", async () => {
        window.history.replaceState(null, "", "/dashboard");
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ConsoleEntry
                    ownerUser={asha}
                    onLogout={async () => {}}
                    dashboardPageProps={{ getPlatformDashboard: async (query = {}) => successDashboard(query) }}
                />
            </QueryClientProvider>,
        );

        expect(await view.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
    });

    test("shows all-time totals, fixed activity totals, and period metrics", async () => {
        const view = renderDashboard();
        const allTime = await view.findByRole("region", { name: "All-time totals" });
        const activity = view.getByRole("region", { name: "Active Organization and Active Store" });
        const period = view.getByRole("region", { name: "Selected Platform Reporting Period" });

        expect(within(allTime).getByText("Organizations")).toBeTruthy();
        expect(within(allTime).getByText("Stores")).toBeTruthy();
        expect(within(allTime).getByText("Customer Count")).toBeTruthy();
        expect(within(allTime).getByText("Completed Sales")).toBeTruthy();
        expect(within(allTime).getByText("8")).toBeTruthy();
        expect(within(activity).getByText("Active Organization")).toBeTruthy();
        expect(within(activity).getByText("Active Store")).toBeTruthy();
        expect(within(activity).getByText(/do not follow the selected Platform Reporting Period/)).toBeTruthy();
        expect(within(period).getByText("Completed Sales Value")).toBeTruthy();
        expect(within(period).getByText("263.75", { exact: false })).toBeTruthy();
    });

    test("keeps Active Store totals unchanged when the Platform Reporting Period changes", async () => {
        const requested: PlatformDashboardQueryJSON[] = [];
        const view = renderDashboard(async (query = {}) => {
            requested.push(query);
            return successDashboard(query);
        });

        await view.findByRole("region", { name: "All-time totals" });
        fireEvent.click(view.getByRole("button", { name: "30-day" }));
        fireEvent.click(view.getByRole("button", { name: "90-day" }));
        fireEvent.click(view.getByRole("button", { name: "7-day" }));
        await waitFor(() => {
            expect(requested.some((query) => query.period === "7d")).toBe(true);
            expect(requested.some((query) => query.period === "30d")).toBe(true);
            expect(requested.some((query) => query.period === "90d")).toBe(true);
            expect(within(view.getByRole("region", { name: "Selected Platform Reporting Period" })).getByText("5")).toBeTruthy();
        });

        const activity = view.getByRole("region", { name: "Active Organization and Active Store" });
        const period = view.getByRole("region", { name: "Selected Platform Reporting Period" });
        expect(within(activity).getAllByText("2")).toHaveLength(2);
        expect(within(period).getByText("5")).toBeTruthy();
        expect(within(period).getByText("200.75", { exact: false })).toBeTruthy();
        expect(within(period).getByText("Customer Count")).toBeTruthy();
        expect(within(period).getByText("1")).toBeTruthy();
    });

    test("applies a custom Platform Reporting Period and shows zeros for an empty window", async () => {
        let requested: PlatformDashboardQueryJSON | null = null;
        const view = renderDashboard(async (query = {}) => {
            requested = query;
            return successDashboard(query);
        }, {
            initialCustomValues: {
                startDate: "2026-08-02",
                endDate: "2026-08-03",
            },
        });

        await view.findByRole("heading", { name: "Dashboard" });
        fireEvent.click(view.getByRole("button", { name: "Custom" }));
        fireEvent.click(view.getByRole("button", { name: "Apply Platform Reporting Period" }));

        await waitFor(() => {
            expect(requested).toEqual({
                period: "custom",
                startDate: "2026-08-02",
                endDate: "2026-08-03",
            });
            expect(within(view.getByRole("region", { name: "Selected Platform Reporting Period" })).getAllByText("0").length).toBeGreaterThan(0);
        });
        const period = view.getByRole("region", { name: "Selected Platform Reporting Period" });
        expect(within(period).getByText("Completed Sales")).toBeTruthy();
        expect(view.queryByRole("alert")).toBeNull();
    });

    test("rejects an inverted custom Platform Reporting Period before loading metrics", async () => {
        const view = renderDashboard(undefined, {
            initialCustomValues: {
                startDate: "2026-08-21",
                endDate: "2026-08-01",
            },
        });

        await view.findByRole("heading", { name: "Dashboard" });
        fireEvent.click(view.getByRole("button", { name: "Custom" }));
        fireEvent.click(view.getByRole("button", { name: "Apply Platform Reporting Period" }));

        expect(view.getByText("Start date must be before or equal to end date")).toBeTruthy();
        expect(view.getByText("Platform Reporting Period was not applied")).toBeTruthy();
    });

    test("shows a dashboard load failure without treating it as an empty period", async () => {
        const view = renderDashboard(async () => {
            throw { message: "Cannot reach the API" };
        });

        expect(await view.findByText("Dashboard could not be loaded")).toBeTruthy();
        expect(view.getByText("Cannot reach the API")).toBeTruthy();
        expect(view.queryByRole("region", { name: "All-time totals" })).toBeNull();
    });

    test("returns the operator to sign-in when the Console session is unauthorized", async () => {
        let unauthorized = false;
        renderDashboard(
            async () => ({ status: "error", data: null, message: "Owner session is no longer active", code: 401 }),
            { onUnauthorized: async () => { unauthorized = true; } },
        );

        await waitFor(() => expect(unauthorized).toBe(true));
    });
});
