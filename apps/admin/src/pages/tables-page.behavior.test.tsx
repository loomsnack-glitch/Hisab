import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

const testWindow = new Window({ url: "http://localhost" });
const requestAnimationFrame = (callback: FrameRequestCallback) =>
  Number(setTimeout(() => callback(Date.now()), 16));
const cancelAnimationFrame = (id: number) => clearTimeout(id);

Object.assign(globalThis, {
  Element: testWindow.Element,
  Event: testWindow.Event,
  document: testWindow.document,
  HTMLElement: testWindow.HTMLElement,
  HTMLInputElement: testWindow.HTMLInputElement,
  Node: testWindow.Node,
  MutationObserver: testWindow.MutationObserver,
  ResizeObserver: testWindow.ResizeObserver,
  getComputedStyle: testWindow.getComputedStyle.bind(testWindow),
  navigator: testWindow.navigator,
  window: testWindow,
  requestAnimationFrame,
  cancelAnimationFrame,
});

const { cleanup, fireEvent, render, screen } =
  await import("@testing-library/react");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { MemoryRouter, Route, Routes } = await import("react-router-dom");
const { default: TablesPage } = await import("@/pages/tables-page");
const {
  organizationKeys,
  serviceAreaKeys,
  serviceTableKeys,
} = await import("@/lib/query-keys");
import { renderToStaticMarkup } from "react-dom/server";
import type { ServiceAreaDTO, ServiceTableDTO } from "@repo/types";
import { ServiceTableTile } from "@/components/table-service/service-table-card";

afterEach(cleanup);

const organizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-08-16T12:00:00.000Z");

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
  id: "88888888-8888-4888-8888-888888888888",
  organizationId,
  storeId,
  serviceAreaId: area.id,
  tableLabel: "T1",
  capacity: 4,
  state: "free",
  currentSaleId: null,
  currentSaleTotal: null,
  createdBy: "11111111-1111-4111-8111-111111111111",
  updatedBy: null,
  createdAt: now,
  updatedAt: now,
};

const unassignedTable: ServiceTableDTO = {
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

const renderTables = (tables: ServiceTableDTO[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
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
    status: "success",
    data: { areas: [area] },
    message: "Service areas fetched successfully",
    code: 200,
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          `/organizations/${organizationId}/workspaces/${storeId}/tables`,
        ]}
      >
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

describe("Admin Service Table layout editing", () => {
  test("keeps add and edit available until Rearrange, then only order changes", () => {
    renderTables([assignedTable]);

    expect(screen.getByRole("button", { name: "Add area" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add table to Patio" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit table T1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete table T1" })).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Open Patio area menu" }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Confirm layout" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Rearrange layout" }));

    expect(screen.queryByRole("button", { name: "Add table" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add area" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Add table to Patio" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit table T1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete table T1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Open Patio area menu" })).toBeNull();
    expect(screen.getByRole("button", { name: "Confirm layout" })).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel layout edits" }),
    );
    expect(screen.getByLabelText("Table T1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add area" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirm layout" })).toBeNull();
  });

  test("keeps Add area outside the scroll row and uses a floating Rearrange control", () => {
    renderTables([assignedTable]);

    const addAreaButton = screen.getByRole("button", { name: "Add area" });
    const rearrangeButton = screen.getByRole("button", { name: "Rearrange layout" });
    const filterBar = screen.getByTestId("tables-area-filter-bar");

    expect(addAreaButton.closest(".overflow-x-auto")).toBeNull();
    expect(rearrangeButton.className).toContain("fixed");
    expect(rearrangeButton.className).toContain("z-50");
    expect(filterBar.className).toContain("sticky");
    expect(filterBar.className).toContain("top-0");
    expect(filterBar.className).toContain("z-20");
  });

  test("shows Cancel and Confirm in the same floating dock while rearranging", () => {
    renderTables([assignedTable]);

    fireEvent.click(screen.getByRole("button", { name: "Rearrange layout" }));

    const cancelButton = screen.getByRole("button", { name: "Cancel layout edits" });
    const confirmButton = screen.getByRole("button", { name: "Confirm layout" });
    const actionDock = cancelButton.parentElement;

    expect(screen.queryByRole("button", { name: "Rearrange layout" })).toBeNull();
    expect(actionDock).toBeTruthy();
    expect(actionDock?.className).toContain("fixed");
    expect(actionDock?.className).toContain("z-50");
    expect(confirmButton.parentElement).toBe(actionDock);
  });

  test("highlights a grabbed table tile for drag feedback", () => {
    const markup = renderToStaticMarkup(
      <ServiceTableTile table={assignedTable} showDragHandle isGrabbed />,
    );

    expect(markup).toContain('data-grabbed="true"');
    expect(markup).toContain("ring-primary/40");
  });

  test("uses pointer sortable reorder in Rearrange instead of native HTML drag", () => {
    renderTables([assignedTable]);

    fireEvent.click(screen.getByRole("button", { name: "Rearrange layout" }));

    expect(document.querySelector("[draggable='true']")).toBeNull();
    expect(
      screen.getByLabelText("Table T1").closest("[data-sortable='table']"),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Filter by Patio, 1 table" })
        .closest("[data-sortable='area']"),
    ).toBeTruthy();
  });

  test("shows only the filtered area and its tables", () => {
    renderTables([assignedTable, unassignedTable]);

    fireEvent.click(
      screen.getByRole("button", { name: "Filter by Patio, 1 table" }),
    );

    expect(screen.getByLabelText("Table T1")).toBeTruthy();
    expect(screen.queryByLabelText("Table T2")).toBeNull();
    expect(screen.queryByText("No tables in this area yet.")).toBeNull();
  });

  test("shows add table on the Unassigned section", () => {
    renderTables([assignedTable, unassignedTable]);

    expect(
      screen.getByRole("button", { name: "Add table to Unassigned" }),
    ).toBeTruthy();
  });

  test("opens edit and delete as separate table actions", () => {
    renderTables([assignedTable]);

    fireEvent.click(screen.getByRole("button", { name: "Edit table T1" }));
    expect(screen.getByText("Edit Service Table")).toBeTruthy();
    expect(
      screen.queryByText("will be removed from this Store and from POS."),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete table T1" }));
    expect(
      screen.getByText("will be removed from this Store and from POS.", {
        exact: false,
      }),
    ).toBeTruthy();
  });

  test("opens a mobile sheet with edit and delete table actions", () => {
    renderTables([assignedTable]);

    fireEvent.click(screen.getByRole("button", { name: "Table T1 actions" }));
    expect(screen.getByRole("button", { name: /^Edit table$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Delete table$/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Edit table$/ }));
    expect(screen.getByText("Edit Service Table")).toBeTruthy();
  });

  test("opens area actions from the area name on touch", () => {
    renderTables([assignedTable]);

    fireEvent.click(screen.getByRole("button", { name: "Patio area actions" }));
    expect(screen.getByRole("button", { name: /^Edit area$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Delete area$/ })).toBeTruthy();
  });

  test("opens a mobile sheet with edit and delete area actions", () => {
    renderTables([assignedTable]);

    fireEvent.click(screen.getByRole("button", { name: "Patio area actions" }));
    expect(screen.getByRole("button", { name: /^Edit area$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Delete area$/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Edit area$/ }));
    expect(screen.getByText("Edit Service Area")).toBeTruthy();
  });

  test("opens area edit and delete as separate area actions", () => {
    renderTables([assignedTable]);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Open Patio area menu" })[0],
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /Edit area/ }));
    expect(screen.getByText("Edit Service Area")).toBeTruthy();
    expect(screen.queryByText("Tables in this area will become unassigned.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Open Patio area menu" })[0],
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /Delete area/ }));
    expect(
      screen.getByText("Tables in this area will become unassigned.", {
        exact: false,
      }),
    ).toBeTruthy();
  });

  test("lets staff add tables to an empty Service Area", () => {
    renderTables([]);

    expect(screen.queryByRole("button", { name: "Add table" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Add table to Patio" }),
    ).toBeTruthy();
  });
});
