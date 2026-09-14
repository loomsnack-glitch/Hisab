import { describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import {
    StoreCommercialSummary,
    StoreWorkspacePlanNavbarSummary,
} from "@/components/dashboard/store-commercial-summary";
import { commercialLicenseKeys } from "@/lib/query-keys";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const activeTrialStatus = {
    storeId,
    organizationId,
    timezone: "Asia/Kolkata",
    baseAccess: {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        sourceKind: "store_license" as const,
        planKey: "trial",
        planDisplayName: "Trial",
        planType: "trial" as const,
        term: { count: 7, unit: "day" as const },
        startsAt: new Date("2026-09-14T10:00:00.000Z"),
        endsAt: new Date("2026-09-16T13:00:00.000Z"),
        status: "active" as const,
    },
    scheduledSuccessor: null,
    accessGrants: [],
    activeAddOns: [],
    availablePaidPlans: [],
    availableCoTermAddOns: [],
    pendingCheckout: null,
    commercialHistory: [],
    trial: { eligible: false, message: "This Store has already used its standard Trial Plan." },
    entitlements: { storeId, features: [] },
};

describe("Store commercial summary", () => {
    test("shows the current Plan and a compact precise remaining time", () => {
        const markup = renderToStaticMarkup(
            <StoreCommercialSummary
                commercialStatus={activeTrialStatus}
                now={new Date("2026-09-14T11:30:00.000Z")}
            />,
        );

        expect(markup).toContain("Trial");
        expect(markup).toContain("2d 2h left");
    });

    test("shows a clear empty state for a Store without a current Plan", () => {
        const markup = renderToStaticMarkup(
            <StoreCommercialSummary
                commercialStatus={{ ...activeTrialStatus, baseAccess: null }}
            />,
        );

        expect(markup).toContain("No active plan");
    });

    test("uses an active Plan access grant when it extends the original Trial", () => {
        const markup = renderToStaticMarkup(
            <StoreCommercialSummary
                commercialStatus={{
                    ...activeTrialStatus,
                    accessGrants: [{
                        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                        sourceKind: "store_access_grant" as const,
                        origin: "administrator" as const,
                        termKind: "custom_range" as const,
                        selectionKind: "plan" as const,
                        label: "Custom Store Access Grant",
                        selectionLabel: "Trial",
                        planKey: "trial",
                        planDisplayName: "Trial",
                        moduleKey: null,
                        moduleDisplayName: null,
                        term: { count: 30, unit: "day" as const },
                        startsAt: new Date("2026-09-14T10:00:00.000Z"),
                        endsAt: new Date("2026-10-14T10:00:00.000Z"),
                        status: "active" as const,
                        modules: [],
                    }],
                }}
                now={new Date("2026-09-14T11:30:00.000Z")}
            />,
        );

        expect(markup).toContain("Trial");
        expect(markup).toContain("29d 23h left");
        expect(markup).not.toContain("6d 23h left");
    });

    test("shows the active Store Access Grant when no Store License is active", () => {
        const markup = renderToStaticMarkup(
            <StoreCommercialSummary
                commercialStatus={{
                    ...activeTrialStatus,
                    baseAccess: null,
                    accessGrants: [{
                        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                        sourceKind: "store_access_grant" as const,
                        origin: "legacy_migration" as const,
                        termKind: "complimentary" as const,
                        selectionKind: "all_current_modules" as const,
                        label: "Legacy migration grant",
                        selectionLabel: "All current Modules",
                        planKey: null,
                        planDisplayName: null,
                        moduleKey: null,
                        moduleDisplayName: null,
                        term: { count: 30, unit: "day" as const },
                        startsAt: new Date("2026-09-14T10:00:00.000Z"),
                        endsAt: new Date("2026-10-14T10:00:00.000Z"),
                        status: "active" as const,
                        modules: [],
                    }],
                }}
                now={new Date("2026-09-14T11:30:00.000Z")}
            />,
        );

        expect(markup).toContain("All current Modules");
        expect(markup).toContain("29d 23h left");
        expect(markup).not.toContain("No active plan");
    });

    test("shows the selected Store's Plan in the dashboard navbar", () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(commercialLicenseKeys.status(organizationId, storeId), {
            status: "success" as const,
            data: { commercialStatus: activeTrialStatus },
            code: 200,
        });

        const markup = renderToStaticMarkup(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[`/organizations/${organizationId}/workspaces/${storeId}/products`]}>
                    <Routes>
                        <Route
                            path="/organizations/:organizationId/workspaces/:storeId/products"
                            element={<StoreWorkspacePlanNavbarSummary now={new Date("2026-09-14T11:30:00.000Z")} />}
                        />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        );

        expect(markup).toContain("Current plan");
        expect(markup).toContain("Trial");
        expect(markup).toContain("2d 2h left");
    });
});
