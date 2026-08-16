import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ServiceAreaDTO, ServiceTableDTO } from "@repo/types";

import { organizationKeys, serviceAreaKeys, serviceTableKeys } from "@/lib/query-keys";
import TablesPage from "@/pages/tables-page";

const organizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-08-16T12:00:00.000Z");

const table: ServiceTableDTO = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  organizationId,
  storeId,
  serviceAreaId: null,
  tableLabel: "T2",
  capacity: 4,
  position: { x: 0.4, y: 0.2 },
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
  path = `/organizations/${organizationId}/tables`,
  areaResult: "success" | "error" = "success",
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
    status: "success",
    data: { tables },
    message: "Service tables fetched successfully",
    code: 200,
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

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/organizations/:organizationId/tables" element={<TablesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("Admin Service Table setup", () => {
  test("adds tables from a dialog and defaults to the simple aligned grid", () => {
    const markup = renderAdminTables([table]);

    expect(markup).toContain("Add table");
    expect(markup).toContain("Simple view");
    expect(markup).toContain("Floor layout");
    expect(markup).toContain("service-table-simple-grid");
    expect(markup).toContain("Table T2");
    expect(markup).toContain("Areas");
    expect(markup).not.toContain("floor-canvas");
    expect(markup).not.toContain("e.g. Patio-2");
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
      `/organizations/${organizationId}/tables`,
      "error",
    );

    expect(markup).toContain("Service areas unavailable");
    expect(markup).not.toContain("Unassigned");
    expect(markup).not.toContain("Table T1");
  });

  test("opens the Areas tab with assigned tables and add/remove actions", () => {
    const markup = renderAdminTables(
      [table, assignedTable],
      `/organizations/${organizationId}/tables?tab=areas`,
    );

    expect(markup).toContain("Add area");
    expect(markup).toContain("service-areas-list");
    expect(markup).toContain("Area Patio");
    expect(markup).toContain("Outdoor seating");
    expect(markup).toContain("Tables in Patio");
    expect(markup).toContain("Table T1 in Patio");
    expect(markup).toContain("Add tables");
    expect(markup).toContain("Remove");
    expect(markup).not.toContain("Table T2 in Patio");
    expect(markup).toContain("Edit");
    expect(markup).toContain("Delete");
    expect(markup).not.toContain("Add table</button>");
    expect(markup).not.toContain("service-table-simple-grid");
  });
});
