import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ServiceAreaDTO, ServiceTableDTO } from "@repo/types";

import { commercialAccessDeniedMessage } from "@/lib/commercial-access";
import {
  commercialLicenseKeys,
  organizationKeys,
  serviceAreaKeys,
  serviceTableKeys,
} from "@/lib/query-keys";
import TablesPage from "@/pages/tables-page";

const organizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-08-16T12:00:00.000Z");

const noTableServiceCommercialStatus = {
  status: "success" as const,
  data: {
    commercialStatus: {
      storeId,
      organizationId,
      timezone: "Asia/Kolkata",
      baseAccess: null,
      scheduledSuccessor: null,
      accessGrants: [],
      activeAddOns: [],
      availablePaidPlans: [],
      availableCoTermAddOns: [],
      pendingCheckout: null,
      commercialHistory: [],
      trial: { eligible: true, message: "This Store can start the standard Trial Plan once." },
      entitlements: { storeId, features: [] },
    },
  },
  message: "Store commercial status fetched successfully",
  code: 200,
};

const table: ServiceTableDTO = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  organizationId,
  storeId,
  serviceAreaId: null,
  tableLabel: "T2",
  capacity: 4,
  state: "free",
  currentSaleId: null,
  currentSaleTotal: null,
  createdBy: "11111111-1111-4111-8111-111111111111",
  updatedBy: null,
  createdAt: now,
  updatedAt: now,
};

const area: ServiceAreaDTO = {
  id: "99999999-9999-4999-8999-999999999999",
  organizationId,
  storeId,
  title: "Patio",
  description: "Outdoor seating",
  createdBy: "11111111-1111-4111-8111-111111111111",
  updatedBy: null,
  createdAt: now,
  updatedAt: now,
};

const assignedTable: ServiceTableDTO = {
  ...table,
  id: "88888888-8888-4888-8888-888888888888",
  tableLabel: "T1",
  serviceAreaId: area.id,
};

const renderAdminTables = (
  tables: ServiceTableDTO[],
  path = `/organizations/${organizationId}/workspaces/${storeId}/tables`,
  areaResult: "success" | "error" = "success",
  options?: { tableCommercialDenied?: boolean },
) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(organizationKeys.detail(organizationId), {
    status: "success",
    data: {
      organization: {
        id: organizationId,
        name: "Demo Org",
        username: "demo",
        tagline: null,
        createdBy: "11111111-1111-4111-8111-111111111111",
        updatedBy: null,
        createdAt: now,
        updatedAt: now,
        stores: [
          {
            id: storeId,
            organizationId,
            name: "Adajan",
            address: null,
            devices: [],
            createdBy: "11111111-1111-4111-8111-111111111111",
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    },
    message: "Organization fetched successfully",
    code: 200,
  });
  queryClient.setQueryData(serviceTableKeys.store(organizationId, storeId), {
    status: options?.tableCommercialDenied ? "error" : "success",
    data: options?.tableCommercialDenied ? null : { tables },
    message: options?.tableCommercialDenied
      ? `Table Management is not available for this Store. ${commercialAccessDeniedMessage}`
      : "Service tables fetched successfully",
    code: options?.tableCommercialDenied ? 403 : 200,
  });
  queryClient.setQueryData(serviceAreaKeys.store(organizationId, storeId), {
    status: areaResult,
    data: areaResult === "success" ? { areas: [area] } : null,
    message:
      areaResult === "success"
        ? "Service areas fetched successfully"
        : "Service areas unavailable",
    code: areaResult === "success" ? 200 : 500,
  });
  queryClient.setQueryData(
    commercialLicenseKeys.status(organizationId, storeId),
    noTableServiceCommercialStatus,
  );

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/organizations/:organizationId/workspaces/:storeId/tables"
            element={<TablesPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("Admin Service Table setup", () => {
  test("adds tables from a dialog and defaults to the simple aligned grid", () => {
    const markup = renderAdminTables([table]);

    expect(markup).toContain("Rearrange layout");
    expect(markup).toContain("Add area");
    expect(markup).toContain("Add table to Patio");
    expect(markup).not.toContain("Confirm layout");
    expect(markup).not.toContain("Remove table T2");
    expect(markup).toContain("service-table-simple-grid");
    expect(markup).toContain("Table T2");
    expect(markup).not.toContain("Table service navigation tabs");
    expect(markup).not.toContain("service-areas-list");
    expect(markup).not.toContain("floor-canvas");
    expect(markup).not.toContain("e.g. Patio-2");
    expect(markup).not.toContain("e.g. Outdoor seating near the entrance");
  });

  test("groups the simple grid under Service Area headings", () => {
    const markup = renderAdminTables([table, assignedTable]);

    expect(markup).toContain("Patio");
    expect(markup).toContain("Unassigned");
    expect(markup).toContain("Table T1");
    expect(markup).toContain("Table T2");
    expect(markup).toContain("service-table-simple-grid");
  });

  test("does not relabel assigned tables when Service Areas cannot be loaded", () => {
    const markup = renderAdminTables(
      [assignedTable],
      `/organizations/${organizationId}/workspaces/${storeId}/tables`,
      "error",
    );

    expect(markup).toContain("Service areas unavailable");
    expect(markup).not.toContain("Unassigned");
    expect(markup).not.toContain("Table T1");
  });

  test("shows paused access when Table Service is commercially denied", () => {
    const markup = renderAdminTables(
      [table],
      `/organizations/${organizationId}/workspaces/${storeId}/tables`,
      "success",
      { tableCommercialDenied: true },
    );

    expect(markup).toContain('data-testid="catalog-access-paused"');
    expect(markup).toContain("Table service paused");
    expect(markup).toContain("No plan purchased");
    expect(markup).toContain("Choose a plan");
    expect(markup).toContain(`href="/organizations/${organizationId}/workspaces/${storeId}/license"`);
    expect(markup).not.toContain("Unable to load tables");
  });

  test("ignores the retired Areas tab query and keeps the table grid", () => {
    const markup = renderAdminTables(
      [table, assignedTable],
      `/organizations/${organizationId}/workspaces/${storeId}/tables?tab=areas`,
    );

    expect(markup).toContain("service-table-simple-grid");
    expect(markup).toContain("Table T1");
    expect(markup).toContain("Table T2");
    expect(markup).toContain("Rearrange layout");
    expect(markup).not.toContain("Table service navigation tabs");
    expect(markup).not.toContain("service-areas-list");
    expect(markup).not.toContain("Area Patio");
    expect(markup).not.toContain("Tables in Patio");
    expect(markup).not.toContain("Add tables");
  });

  test("locks Store workspace tables to the selected Store", () => {
    const markup = renderAdminTables(
      [table],
      `/organizations/${organizationId}/workspaces/${storeId}/tables`,
    );

    expect(markup).toContain("Table T2");
    expect(markup).toContain(">All<");
    expect(markup).not.toContain("Showing tables");
    expect(markup).not.toContain("All areas");
    expect(markup).toContain('data-admin-workspace="store"');
    expect(markup).toContain("Rearrange layout");
    expect(markup).toContain("Add area");
    expect(markup).toContain("Add table to Patio");
    expect(markup).not.toContain("Search tables...");
    expect(markup).not.toContain("Add a Store first");
  });
});
