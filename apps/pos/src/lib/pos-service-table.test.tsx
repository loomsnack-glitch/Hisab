import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import type { DeviceSessionDTO, ServiceAreaDTO, ServiceTableDTO } from "@repo/types";

import {
  getPosServiceTableAction,
  getPosServiceTableStateLabel,
  shouldReturnToPosTablesAfterSale,
} from "./pos-service-table";
import { serviceAreaKeys, serviceTableKeys } from "./query-keys";
import PosTablesPage from "@/pages/pos-tables-page";
import PosTablesWorkspace from "@/pages/pos-tables-workspace";
import PosServiceTableLegend from "@/components/table-service/pos-service-table-legend";
import type { PosRouteContext } from "@/pages/pos-route-context";

const organizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-08-16T12:00:00.000Z");
const session: DeviceSessionDTO = {
  device: {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    organizationId,
    storeId,
    name: "Counter",
    loginUsername: "counter",
    status: "active",
    lastSeenAt: null,
  },
  store: {
    id: storeId,
    organizationId,
    name: "Main Store",
    address: null,
    kotSystemEnabled: false,
    tableManagementEnabled: true,
  },
  organization: {
    id: organizationId,
    name: "Demo Org",
    username: "demo",
    tagline: null,
  },
};

const table = (state: ServiceTableDTO["state"]): ServiceTableDTO => ({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  organizationId,
  storeId,
  tableLabel: "A1",
  capacity: 4,
  state,
  currentSaleId: null,
  currentTableOrderId: null,
  currentSaleTotal: null,
  serviceAreaId: null,
  createdBy: "11111111-1111-4111-8111-111111111111",
  updatedBy: null,
  createdAt: now,
  updatedAt: now,
});

const area: ServiceAreaDTO = {
  id: "99999999-9999-4999-8999-999999999999",
  organizationId,
  storeId,
  title: "First Floor",
  description: null,
  createdBy: "11111111-1111-4111-8111-111111111111",
  updatedBy: null,
  createdAt: now,
  updatedAt: now,
};

const renderTablesPage = (
  tables: ServiceTableDTO[],
  Page: typeof PosTablesPage | typeof PosTablesWorkspace,
  areaResult: "success" | "error" = "success",
  tableManagementEnabled = true,
) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(serviceTableKeys.pos(organizationId, storeId), {
    status: "success",
    data: { tables },
    message: "Service tables fetched successfully",
    code: 200,
  });
  queryClient.setQueryData(serviceAreaKeys.pos(organizationId, storeId), {
    status: areaResult,
    data: areaResult === "success" ? { areas: [area] } : null,
    message:
      areaResult === "success"
        ? "POS service areas fetched successfully"
        : "POS service areas unavailable",
    code: areaResult === "success" ? 200 : 500,
  });
  const context: PosRouteContext = {
    session: {
      ...session,
      store: {
        ...session.store,
        tableManagementEnabled,
      },
    },
    searchValue: "",
    onSearchChange: () => {},
    onPanelTabChange: () => {},
    pendingComposerHandoff: null,
    clearPendingComposerHandoff: () => {},
  };

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/tables"]}>
        <Routes>
          <Route element={<Outlet context={context} />}>
            <Route path="/tables" element={<Page />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const renderTableFloor = (tables: ServiceTableDTO[]) => renderTablesPage(tables, PosTablesWorkspace);

describe("POS Service Table behavior", () => {
  test("shows Allocate only for a Free table and Free only for an Allocated table", () => {
    expect(getPosServiceTableAction("free")).toBe("allocate");
    expect(getPosServiceTableAction("allocated")).toBe("free");
    expect(getPosServiceTableAction("engaged")).toBeNull();
    expect(getPosServiceTableAction("ready_to_bill")).toBeNull();
    expect(getPosServiceTableAction("payment_due")).toBeNull();
    expect(getPosServiceTableAction("paid")).toBeNull();
  });

  test("uses the operator-facing state labels", () => {
    expect(getPosServiceTableStateLabel("free")).toBe("Free");
    expect(getPosServiceTableStateLabel("allocated")).toBe("Allocated");
    expect(getPosServiceTableStateLabel("engaged")).toBe("Engaged");
    expect(getPosServiceTableStateLabel("ready_to_bill")).toBe("Engaged");
    expect(getPosServiceTableStateLabel("payment_due")).toBe("Payment due");
  });

  test("returns cashiers to Tables after a table-linked draft save or place", () => {
    expect(shouldReturnToPosTablesAfterSale({ serviceTableId: table("engaged").id })).toBe(
      true,
    );
    expect(shouldReturnToPosTablesAfterSale({ serviceTableId: null })).toBe(false);
    expect(shouldReturnToPosTablesAfterSale({})).toBe(false);
  });

  test("keeps POS table cache entries isolated by Store", () => {
    expect(serviceTableKeys.pos("org-a", "store-a")).not.toEqual(
      serviceTableKeys.pos("org-a", "store-b"),
    );
  });

  test("renders the live POS Tables tab workspace", () => {
    const markup = renderTablesPage([table("free")], PosTablesPage);

    expect(markup).toContain("Allocate table A1");
    expect(markup).not.toContain("under-development");
    expect(markup).not.toContain("service-disabled");
  });

  test("shows service disabled when Table Management is turned off", () => {
    const markup = renderTablesPage([table("free")], PosTablesPage, "success", false);

    expect(markup).toContain("service-disabled");
    expect(markup).toContain("Service disabled");
    expect(markup).toContain("Table management is disabled for this store.");
    expect(markup).not.toContain("Allocate table A1");
    expect(markup).toContain('data-testid="pos-tables-scroller"');
    expect(markup).toContain("touch-pan-y");
  });

  test("renders the aligned table grid", () => {
    const markup = renderTableFloor([table("free")]);

    expect(markup).toContain("service-table-simple-grid");
    expect(markup).not.toContain("floor-canvas");
    expect(markup).not.toContain("Live service area");
    expect(markup).not.toContain("Manage the current floor");
    expect(markup).not.toContain("Grouped by area.");
    expect(markup).not.toContain("Main Store floor");
  });

  test("pins the tables floor to the nav with a definite one-finger scrollport", () => {
    const markup = renderTableFloor([table("free")]);
    const pageAttr = markup.indexOf('data-testid="pos-tables-page"');
    const pageTag = markup.slice(markup.lastIndexOf("<div", pageAttr), markup.indexOf(">", pageAttr));
    const scrollerAttr = markup.indexOf('data-testid="pos-tables-scroller"');
    const scrollerTag = markup.slice(
      markup.lastIndexOf("<div", scrollerAttr),
      markup.indexOf(">", scrollerAttr),
    );
    const allocateOpen = markup.indexOf("Allocate table A1");
    const allocateTag = markup.slice(
      markup.lastIndexOf("<button", allocateOpen),
      markup.indexOf(">", allocateOpen),
    );

    expect(pageTag).toContain("absolute");
    expect(pageTag).toContain("inset-x-0");
    expect(pageTag).toContain("top-0");
    expect(pageTag).toContain("bottom-[var(--pos-mobile-nav-height)]");
    expect(pageTag).not.toContain("h-full");
    expect(pageTag).not.toContain("100dvh");
    expect(scrollerTag).toContain("h-0");
    expect(scrollerTag).toContain("flex-1");
    expect(scrollerTag).toContain("overflow-y-auto");
    expect(scrollerTag).toContain("touch-pan-y");
    expect(allocateTag).toContain("touch-pan-y");
  });

  test("groups POS simple-view tables under their Service Area", () => {
    const markup = renderTableFloor([
      { ...table("free"), serviceAreaId: area.id, tableLabel: "T1" },
      { ...table("free"), id: "88888888-8888-4888-8888-888888888888", tableLabel: "T3" },
    ]);

    expect(markup).toContain("First Floor");
    expect(markup).toContain("Unassigned");
    expect(markup).toContain("Allocate table T1");
    expect(markup).toContain("Allocate table T3");
  });

  test("does not relabel assigned tables when POS Service Areas cannot be loaded", () => {
    const markup = renderTablesPage(
      [{ ...table("free"), serviceAreaId: area.id, tableLabel: "T1" }],
      PosTablesWorkspace,
      "error",
    );

    expect(markup).toContain("POS service areas unavailable");
    expect(markup).not.toContain("Unassigned");
    expect(markup).not.toContain("Allocate table T1");
  });

  test("renders only the action valid for each pre-order table state", () => {
    const freeMarkup = renderTableFloor([table("free")]);
    const allocatedMarkup = renderTableFloor([table("allocated")]);

    expect(freeMarkup).toContain("Allocate table A1");
    expect(freeMarkup).not.toContain("Free table A1");
    expect(allocatedMarkup).toContain("Free table A1");
    expect(allocatedMarkup).not.toContain("Allocate table A1");
  });

  test("shows a current draft total and order actions for an engaged table", () => {
    const markup = renderTableFloor([
      {
        ...table("engaged"),
        currentSaleId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        currentSaleTotal: 125,
      },
    ]);

    expect(markup).toContain("Current total");
    expect(markup).toContain("Open order");
    expect(markup).toContain("Cancel order");
    expect(markup).not.toContain("Ready to bill");
    expect(markup).not.toContain("Mark table A1 Ready to bill");
  });

  test("shows Open and Cancel for an engaged table with an Active Table Order", () => {
    const markup = renderTableFloor([
      {
        ...table("engaged"),
        currentTableOrderId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
        currentSaleTotal: 90,
      },
    ]);

    expect(markup).toContain("Current total");
    expect(markup).toContain("Open order");
    expect(markup).toContain("Cancel order");
  });

  test("treats leftover Ready to bill tables as Engaged draft orders", () => {
    const markup = renderTableFloor([
      {
        ...table("ready_to_bill"),
        currentSaleId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        currentSaleTotal: 90,
      },
    ]);

    expect(markup).toContain("Engaged");
    expect(markup).toContain("Open order");
    expect(markup).toContain("Cancel order");
    expect(markup).not.toContain("Ready to bill");
  });

  test("shows a color legend for simple-view table states", () => {
    const markup = renderTableFloor([table("free")]);

    expect(markup).toContain("View table status colors");
    expect(markup).not.toContain("pos-table-state-legend");

    const legendMarkup = renderToStaticMarkup(<PosServiceTableLegend />);
    expect(legendMarkup).toContain("pos-table-state-legend");
    expect(legendMarkup).toContain("Available to seat");
    expect(legendMarkup).toContain("Seated, no order yet");
    expect(legendMarkup).toContain("Order in progress");
    expect(legendMarkup).toContain("Bill still outstanding");
    expect(legendMarkup).toContain("Paid, waiting to clear");
  });

  test("renders billing, collection, and release actions for committed table states", () => {
    const markup = renderTableFloor([
      {
        ...table("payment_due"),
        currentSaleId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        currentSaleTotal: 17,
      },
      {
        ...table("paid"),
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        currentSaleId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        currentSaleTotal: 42,
      },
    ]);

    expect(markup).toContain("Outstanding");
    expect(markup).toContain("Collect payment");
    expect(markup).toContain("Free with bill due");
    expect(markup).toContain("Free paid table");
  });
});
