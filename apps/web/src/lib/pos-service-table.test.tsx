import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import type { DeviceSessionDTO, ServiceTableDTO } from "@repo/types";

import {
  getPosServiceTableAction,
  getPosServiceTableStateLabel,
} from "./pos-service-table";
import { serviceTableKeys } from "./query-keys";
import PosTablesPage from "@/pages/pos-tables-page";
import PosTablesWorkspace from "@/pages/pos-tables-workspace";
import type { PosRouteContext } from "@/pages/pos-route-context";
import { tableServiceUnavailableMessage } from "@/lib/table-service-availability";

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
  store: { id: storeId, organizationId, name: "Main Store", address: null },
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
  position: { x: 0.05, y: 0.05 },
  state,
  currentSaleId: null,
  currentSaleTotal: null,
  createdBy: "11111111-1111-4111-8111-111111111111",
  updatedBy: null,
  createdAt: now,
  updatedAt: now,
});

const renderTablesPage = (
  tables: ServiceTableDTO[],
  Page: typeof PosTablesPage | typeof PosTablesWorkspace,
) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(serviceTableKeys.pos(organizationId, storeId), {
    status: "success",
    data: { tables },
    message: "Service tables fetched successfully",
    code: 200,
  });
  const context: PosRouteContext = {
    session,
    searchValue: "",
    onSearchChange: () => {},
    onPanelTabChange: () => {},
    pendingComposerHandoff: null,
    clearPendingComposerHandoff: () => {},
  };

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/pos/tables"]}>
        <Routes>
          <Route element={<Outlet context={context} />}>
            <Route path="/pos/tables" element={<Page />} />
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
    expect(getPosServiceTableStateLabel("ready_to_bill")).toBe("Ready to bill");
    expect(getPosServiceTableStateLabel("payment_due")).toBe("Payment due");
  });

  test("keeps POS table cache entries isolated by Store", () => {
    expect(serviceTableKeys.pos("org-a", "store-a")).not.toEqual(
      serviceTableKeys.pos("org-a", "store-b"),
    );
  });

  test("shows under development on the live POS Tables tab", () => {
    const markup = renderTablesPage([table("free")], PosTablesPage);

    expect(markup).toContain("under-development");
    expect(markup).toContain("Tables is under development");
    expect(markup).toContain(tableServiceUnavailableMessage);
    expect(markup).not.toContain("Allocate table A1");
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
