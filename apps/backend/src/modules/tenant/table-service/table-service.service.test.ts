import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { DeviceSessionDTO, ServiceTableDTO } from "@repo/types";

const organizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const otherStoreId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const userId = "11111111-1111-4111-8111-111111111111";
const tableId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = new Date("2026-08-16T12:00:00.000Z");

const organization = { id: organizationId, name: "Demo Org" };
const store = { id: storeId, organizationId, name: "Main Store" };
const table: ServiceTableDTO = {
  id: tableId,
  organizationId,
  storeId,
  tableLabel: "A1",
  capacity: 4,
  position: { x: 0.05, y: 0.05 },
  state: "free",
  currentSaleId: null,
  createdBy: userId,
  updatedBy: null,
  createdAt: now,
  updatedAt: now,
};
const allocatedTable: ServiceTableDTO = { ...table, state: "allocated" };
const deviceSession: DeviceSessionDTO = {
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
  organization: { id: organizationId, name: "Demo Org", username: "demo", tagline: null },
};

const getOrganizationByIdForUser = mock(async () => organization);
const getStoreById = mock(async (_organizationId: string, requestedStoreId: string) =>
  requestedStoreId === storeId ? store : null,
);
const getServiceTables = mock(async (requestedOrganizationId?: string, requestedStoreId?: string) =>
  requestedOrganizationId === organizationId && requestedStoreId === storeId ? [table] : []);
const getServiceTableById = mock(async (): Promise<ServiceTableDTO | null> => table);
const serviceTableLabelExists = mock(async () => false);
const createServiceTableRepo = mock(async (data: {
  id: string;
  organizationId: string;
  storeId: string;
  tableLabel: string;
  capacity: number | null;
  position: { x: number; y: number };
  createdBy: string;
}) => ({ ...table, ...data }));
const updateServiceTableRepo = mock(async (data: { position?: { x: number; y: number } }) => ({
  ...table,
  position: data.position ?? table.position,
  updatedBy: userId,
}));
const transitionServiceTableState = mock(async (
  _organizationId: string,
  _storeId: string,
  _tableId: string,
  _fromState: ServiceTableDTO["state"],
  toState: ServiceTableDTO["state"],
) : Promise<ServiceTableDTO | null> =>
  _organizationId === organizationId && _storeId === storeId ? { ...table, state: toState } : null);
const begin = mock(async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback({}));

mock.module("@/config/db", () => ({ pg: { begin } }));
mock.module("@/modules/tenant/organization/organization.repository", () => ({
  getOrganizationByIdForUser,
  getStoreById,
}));
mock.module("./table-service.repository", () => ({
  getServiceTables,
  getServiceTableById,
  serviceTableLabelExists,
  createServiceTable: createServiceTableRepo,
  updateServiceTable: updateServiceTableRepo,
  transitionServiceTableState,
}));

const tableService = await import("./table-service.service");

describe("Service Table application service", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getStoreById.mockClear();
    getStoreById.mockImplementation(async (_organizationId, requestedStoreId) =>
      requestedStoreId === storeId ? store : null,
    );
    getServiceTables.mockClear();
    getServiceTableById.mockClear();
    serviceTableLabelExists.mockClear();
    serviceTableLabelExists.mockResolvedValue(false);
    createServiceTableRepo.mockClear();
    updateServiceTableRepo.mockClear();
    transitionServiceTableState.mockClear();
    begin.mockClear();
  });

  test("creates a trimmed table with Store scope and a blank capacity", async () => {
    const response = await tableService.createServiceTable(userId, organizationId, storeId, {
      tableLabel: "  Patio-2  ",
      capacity: null,
    });

    expect(response.status).toBe("success");
    expect(createServiceTableRepo).toHaveBeenCalledWith(expect.objectContaining({
      organizationId,
      storeId,
      tableLabel: "Patio-2",
      capacity: null,
      position: { x: 0.05, y: 0.05 },
      createdBy: userId,
    }), expect.anything());
  });

  test("rejects a duplicate label case-insensitively before writing", async () => {
    serviceTableLabelExists.mockResolvedValue(true);

    const response = await tableService.createServiceTable(userId, organizationId, storeId, {
      tableLabel: " a1 ",
      capacity: 4,
    });

    expect(response).toMatchObject({ status: "error", code: 409 });
    expect(createServiceTableRepo).not.toHaveBeenCalled();
  });

  test("cannot read or mutate a Store outside the Organization scope", async () => {
    const listResponse = await tableService.getServiceTables(userId, organizationId, otherStoreId);
    const updateResponse = await tableService.updateServiceTable(userId, organizationId, otherStoreId, tableId, {
      position: { x: 0.8, y: 0.8 },
    });

    expect(listResponse).toMatchObject({ status: "error", code: 404 });
    expect(updateResponse).toMatchObject({ status: "error", code: 404 });
    expect(getServiceTables).not.toHaveBeenCalled();
    expect(updateServiceTableRepo).not.toHaveBeenCalled();
  });

  test("updates only the normalized floor position through the Store-scoped table", async () => {
    const response = await tableService.updateServiceTable(userId, organizationId, storeId, tableId, {
      position: { x: 0.74, y: 0.31 },
    });

    expect(response.status).toBe("success");
    expect(updateServiceTableRepo).toHaveBeenCalledWith(expect.objectContaining({
      id: tableId,
      organizationId,
      storeId,
      position: { x: 0.74, y: 0.31 },
      updatedBy: userId,
    }));
  });

  test("lists only the authenticated device Store and allocates without creating a Sale", async () => {
    const listResponse = await tableService.getServiceTablesForDevice(deviceSession);
    const allocateResponse = await tableService.allocateServiceTableForDevice(deviceSession, tableId);

    expect(listResponse).toMatchObject({ status: "success", data: { tables: [table] } });
    expect(allocateResponse).toMatchObject({ status: "success", data: { table: { state: "allocated", currentSaleId: null } } });
  });

  test("frees an allocated table without retaining a financial record", async () => {
    transitionServiceTableState.mockResolvedValueOnce({ ...allocatedTable, state: "free" });

    const response = await tableService.freeAllocatedServiceTableForDevice(deviceSession, tableId);

    expect(response).toMatchObject({ status: "success", data: { table: { state: "free", currentSaleId: null } } });
  });

  test("rejects an operation when the table state changed before the atomic transition", async () => {
    transitionServiceTableState.mockResolvedValueOnce(null);
    getServiceTableById.mockResolvedValueOnce(table);

    const response = await tableService.allocateServiceTableForDevice(deviceSession, tableId);

    expect(response).toMatchObject({ status: "error", code: 409 });
  });

  test("does not expose a table from another Store through a device operation", async () => {
    transitionServiceTableState.mockResolvedValueOnce(null);
    getServiceTableById.mockResolvedValueOnce(null);

    const response = await tableService.allocateServiceTableForDevice(deviceSession, tableId);

    expect(response).toMatchObject({ status: "error", code: 404 });
  });
});
