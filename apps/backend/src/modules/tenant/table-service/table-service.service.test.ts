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
  currentSaleTotal: null,
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
  organization: {
    id: organizationId,
    name: "Demo Org",
    username: "demo",
    tagline: null,
  },
};

const getOrganizationByIdForUser = mock(async () => organization);
const getStoreById = mock(
  async (_organizationId: string, requestedStoreId: string) =>
    requestedStoreId === storeId ? store : null,
);
const getServiceTables = mock(
  async (requestedOrganizationId?: string, requestedStoreId?: string) =>
    requestedOrganizationId === organizationId && requestedStoreId === storeId
      ? [table]
      : [],
);
const getServiceTableById = mock(
  async (): Promise<ServiceTableDTO | null> => table,
);
const serviceTableLabelExists = mock(async () => false);
const createServiceTableRepo = mock(
  async (data: {
    id: string;
    organizationId: string;
    storeId: string;
    tableLabel: string;
    capacity: number | null;
    position: { x: number; y: number };
    createdBy: string;
  }) => ({ ...table, ...data }),
);
const updateServiceTableRepo = mock(
  async (data: { position?: { x: number; y: number } }) => ({
    ...table,
    position: data.position ?? table.position,
    updatedBy: userId,
  }),
);
const transitionServiceTableState = mock(
  async (
    _organizationId: string,
    _storeId: string,
    _tableId: string,
    _fromState: ServiceTableDTO["state"],
    toState: ServiceTableDTO["state"],
  ): Promise<ServiceTableDTO | null> =>
    _organizationId === organizationId && _storeId === storeId
      ? { ...table, state: toState }
      : null,
);
const lockServiceTableForDevice = mock(async () => allocatedTable);
const attachDraftSale = mock(
  async (
    _organizationId: string,
    _storeId: string,
    _tableId: string,
    saleId: string,
  ) => ({
    ...allocatedTable,
    state: "engaged" as const,
    currentSaleId: saleId,
    currentSaleTotal: 0,
  }),
);
const clearDraftSale = mock(async () => ({
  ...allocatedTable,
  state: "free" as const,
  currentSaleId: null,
  currentSaleTotal: null,
}));
const markTableReadyToBill = mock(async () => ({
  ...allocatedTable,
  state: "ready_to_bill" as const,
  currentSaleId: "sale-id",
  currentSaleTotal: 42,
}));
const releasePaidTable = mock(async () => ({
  ...table,
  state: "free" as const,
  currentSaleId: null,
  currentSaleTotal: null,
}));
const releaseDueTable = mock(async () => ({
  ...table,
  state: "free" as const,
  currentSaleId: null,
  currentSaleTotal: null,
}));
const releasePaidTableFromActiveState = mock(async () => ({
  ...table,
  state: "free" as const,
  currentSaleId: null,
  currentSaleTotal: null,
}));
const createSale = mock(async (data: Record<string, unknown>) => ({
  ...data,
  paidTotal: 0,
  dueTotal: 0,
  itemCount: 0,
  itemsSummary: null,
  paymentMethods: null,
  customer: null,
  createdByDevice: null,
  updatedByDevice: null,
  createdAt: now,
  updatedAt: now,
}));
const getSaleById = mock(
  async (): Promise<{
    id: string;
    status: string;
    serviceTableId: string;
    grandTotal: number;
    paymentStatus?: string;
  } | null> => ({
    id: "sale-id",
    status: "draft",
    serviceTableId: tableId,
    grandTotal: 0,
  }),
);
const lockDraftSale = mock(async () => true);
const deleteDraftSale = mock(async () => true);
const getSaleDetailsForDevice = mock(async () => ({
  status: "success" as const,
  data: { sale: { id: "sale-id", status: "draft", serviceTableId: tableId } },
  message: "loaded",
  code: 200,
}));
const begin = mock(
  async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback({}),
);

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
  lockServiceTableForDevice,
  attachDraftSale,
  clearDraftSale,
  markTableReadyToBill,
  releasePaidTableFromActiveState,
  releasePaidTable,
  releaseDueTable,
}));
mock.module("@/modules/tenant/billing/billing.repository", () => ({
  createSale,
  lockDraftSale,
  getSaleById,
  deleteDraftSale,
}));
mock.module("@/modules/tenant/billing/billing.service", () => ({
  getSaleDetailsForDevice,
}));

const tableService = await import("./table-service.service");

describe("Service Table application service", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getStoreById.mockClear();
    getStoreById.mockImplementation(
      async (_organizationId, requestedStoreId) =>
        requestedStoreId === storeId ? store : null,
    );
    getServiceTables.mockClear();
    getServiceTableById.mockClear();
    serviceTableLabelExists.mockClear();
    serviceTableLabelExists.mockResolvedValue(false);
    createServiceTableRepo.mockClear();
    updateServiceTableRepo.mockClear();
    transitionServiceTableState.mockClear();
    lockServiceTableForDevice.mockReset();
    lockServiceTableForDevice.mockResolvedValue(allocatedTable);
    attachDraftSale.mockClear();
    clearDraftSale.mockClear();
    markTableReadyToBill.mockClear();
    releasePaidTableFromActiveState.mockClear();
    releasePaidTable.mockClear();
    releaseDueTable.mockClear();
    createSale.mockClear();
    getSaleById.mockReset();
    getSaleById.mockResolvedValue({
      id: "sale-id",
      status: "draft",
      serviceTableId: tableId,
      grandTotal: 0,
    });
    lockDraftSale.mockClear();
    deleteDraftSale.mockClear();
    getSaleDetailsForDevice.mockClear();
    begin.mockClear();
  });

  test("creates a trimmed table with Store scope and a blank capacity", async () => {
    const response = await tableService.createServiceTable(
      userId,
      organizationId,
      storeId,
      {
        tableLabel: "  Patio-2  ",
        capacity: null,
      },
    );

    expect(response.status).toBe("success");
    expect(createServiceTableRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        storeId,
        tableLabel: "Patio-2",
        capacity: null,
        position: { x: 0.05, y: 0.05 },
        createdBy: userId,
      }),
      expect.anything(),
    );
  });

  test("rejects a duplicate label case-insensitively before writing", async () => {
    serviceTableLabelExists.mockResolvedValue(true);

    const response = await tableService.createServiceTable(
      userId,
      organizationId,
      storeId,
      {
        tableLabel: " a1 ",
        capacity: 4,
      },
    );

    expect(response).toMatchObject({ status: "error", code: 409 });
    expect(createServiceTableRepo).not.toHaveBeenCalled();
  });

  test("cannot read or mutate a Store outside the Organization scope", async () => {
    const listResponse = await tableService.getServiceTables(
      userId,
      organizationId,
      otherStoreId,
    );
    const updateResponse = await tableService.updateServiceTable(
      userId,
      organizationId,
      otherStoreId,
      tableId,
      {
        position: { x: 0.8, y: 0.8 },
      },
    );

    expect(listResponse).toMatchObject({ status: "error", code: 404 });
    expect(updateResponse).toMatchObject({ status: "error", code: 404 });
    expect(getServiceTables).not.toHaveBeenCalled();
    expect(updateServiceTableRepo).not.toHaveBeenCalled();
  });

  test("updates only the normalized floor position through the Store-scoped table", async () => {
    const response = await tableService.updateServiceTable(
      userId,
      organizationId,
      storeId,
      tableId,
      {
        position: { x: 0.74, y: 0.31 },
      },
    );

    expect(response.status).toBe("success");
    expect(updateServiceTableRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: tableId,
        organizationId,
        storeId,
        position: { x: 0.74, y: 0.31 },
        updatedBy: userId,
      }),
    );
  });

  test("lists only the authenticated device Store and allocates without creating a Sale", async () => {
    const listResponse =
      await tableService.getServiceTablesForDevice(deviceSession);
    const allocateResponse = await tableService.allocateServiceTableForDevice(
      deviceSession,
      tableId,
    );

    expect(listResponse).toMatchObject({
      status: "success",
      data: { tables: [table] },
    });
    expect(allocateResponse).toMatchObject({
      status: "success",
      data: { table: { state: "allocated", currentSaleId: null } },
    });
  });

  test("frees an allocated table without retaining a financial record", async () => {
    transitionServiceTableState.mockResolvedValueOnce({
      ...allocatedTable,
      state: "free",
    });

    const response = await tableService.freeAllocatedServiceTableForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({
      status: "success",
      data: { table: { state: "free", currentSaleId: null } },
    });
  });

  test("rejects an operation when the table state changed before the atomic transition", async () => {
    transitionServiceTableState.mockResolvedValueOnce(null);
    getServiceTableById.mockResolvedValueOnce(table);

    const response = await tableService.allocateServiceTableForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({ status: "error", code: 409 });
  });

  test("does not expose a table from another Store through a device operation", async () => {
    transitionServiceTableState.mockResolvedValueOnce(null);
    getServiceTableById.mockResolvedValueOnce(null);

    const response = await tableService.allocateServiceTableForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({ status: "error", code: 404 });
  });

  test("starts one empty Draft Sale atomically from an Allocated table", async () => {
    const response = await tableService.startServiceTableOrderForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({
      status: "success",
      data: {
        table: { state: "engaged", currentSaleId: expect.any(String) },
        sale: { id: "sale-id", status: "draft" },
      },
    });
    expect(createSale).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceTableId: tableId,
        status: "draft",
        grandTotal: 0,
      }),
      expect.anything(),
    );
    expect(attachDraftSale).toHaveBeenCalledWith(
      organizationId,
      storeId,
      tableId,
      expect.any(String),
      deviceSession.device.id,
      expect.anything(),
    );
  });

  test("rejects a competing start when the table already has an active order", async () => {
    lockServiceTableForDevice.mockResolvedValueOnce({
      ...allocatedTable,
      state: "engaged",
      currentSaleId: "existing-sale",
    });

    const response = await tableService.startServiceTableOrderForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({ status: "error", code: 409 });
    expect(createSale).not.toHaveBeenCalled();
  });

  test("allows a same-Store device to resume the current Draft Sale", async () => {
    getServiceTableById.mockResolvedValueOnce({
      ...allocatedTable,
      state: "engaged",
      currentSaleId: "sale-id",
      currentSaleTotal: 42,
    });

    const response = await tableService.getServiceTableOrderForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({
      status: "success",
      data: {
        table: {
          state: "engaged",
          currentSaleId: "sale-id",
          currentSaleTotal: 42,
        },
        sale: { id: "sale-id" },
      },
    });
    expect(getSaleDetailsForDevice).toHaveBeenCalledWith(
      deviceSession,
      "sale-id",
    );
  });

  test("lets concurrent start attempts produce only one active table draft", async () => {
    let lockAttempts = 0;
    lockServiceTableForDevice.mockImplementation(async () => {
      lockAttempts += 1;
      return lockAttempts === 1
        ? allocatedTable
        : {
            ...allocatedTable,
            state: "engaged",
            currentSaleId: "sale-id",
            currentSaleTotal: 0,
          };
    });

    const responses = await Promise.all([
      tableService.startServiceTableOrderForDevice(deviceSession, tableId),
      tableService.startServiceTableOrderForDevice(deviceSession, tableId),
    ]);

    expect(
      responses.filter((response) => response.status === "success"),
    ).toHaveLength(1);
    expect(
      responses.filter(
        (response) => response.status === "error" && response.code === 409,
      ),
    ).toHaveLength(1);
    expect(createSale).toHaveBeenCalledTimes(1);
  });

  test("cancels only the current Draft Sale and frees the table in one transaction", async () => {
    lockServiceTableForDevice.mockResolvedValueOnce({
      ...allocatedTable,
      state: "engaged",
      currentSaleId: "sale-id",
      currentSaleTotal: 0,
    });
    const response = await tableService.cancelServiceTableOrderForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({
      status: "success",
      data: { table: { state: "free", currentSaleId: null } },
    });
    expect(clearDraftSale).toHaveBeenCalledWith(
      organizationId,
      storeId,
      tableId,
      expect.any(String),
      deviceSession.device.id,
      expect.anything(),
    );
    expect(deleteDraftSale).toHaveBeenCalledWith(
      organizationId,
      storeId,
      "sale-id",
      expect.anything(),
    );
  });

  test("does not cancel a committed Sale through the table action", async () => {
    lockServiceTableForDevice.mockResolvedValueOnce({
      ...allocatedTable,
      state: "engaged",
      currentSaleId: "sale-id",
      currentSaleTotal: 0,
    });
    getSaleById.mockResolvedValueOnce({
      id: "sale-id",
      status: "completed",
      serviceTableId: tableId,
      grandTotal: 10,
    });
    lockDraftSale.mockResolvedValueOnce(false);

    const response = await tableService.cancelServiceTableOrderForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({ status: "error", code: 409 });
    expect(clearDraftSale).not.toHaveBeenCalled();
    expect(deleteDraftSale).not.toHaveBeenCalled();
  });

  test("clears a stale table link when its Draft Sale is already missing", async () => {
    lockServiceTableForDevice.mockResolvedValueOnce({
      ...allocatedTable,
      state: "engaged",
      currentSaleId: "sale-id",
      currentSaleTotal: 0,
    });
    lockDraftSale.mockResolvedValueOnce(false);
    getSaleById.mockResolvedValueOnce(null);

    const response = await tableService.cancelServiceTableOrderForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({
      status: "success",
      message: "Stale table draft link cleared",
      data: { table: { state: "free", currentSaleId: null } },
    });
    expect(clearDraftSale).toHaveBeenCalledWith(
      organizationId,
      storeId,
      tableId,
      "sale-id",
      deviceSession.device.id,
      expect.anything(),
    );
    expect(deleteDraftSale).not.toHaveBeenCalled();
  });

  test("frees an engaged table linked to an already paid Sale without deleting the bill", async () => {
    lockServiceTableForDevice.mockResolvedValueOnce({
      ...allocatedTable,
      state: "engaged",
      currentSaleId: "sale-id",
      currentSaleTotal: 42,
    });
    lockDraftSale.mockResolvedValueOnce(false);
    getSaleById.mockResolvedValueOnce({
      id: "sale-id",
      status: "completed",
      serviceTableId: tableId,
      paymentStatus: "paid",
      grandTotal: 42,
    });

    const response = await tableService.cancelServiceTableOrderForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({
      status: "success",
      message: "Paid table link cleared",
      data: { table: { state: "free", currentSaleId: null } },
    });
    expect(releasePaidTableFromActiveState).toHaveBeenCalledWith(
      organizationId,
      storeId,
      tableId,
      "sale-id",
      deviceSession.device.id,
      expect.anything(),
    );
    expect(deleteDraftSale).not.toHaveBeenCalled();
  });

  test("marks only the current engaged Draft Sale Ready to bill", async () => {
    lockServiceTableForDevice.mockResolvedValue({
      ...allocatedTable,
      state: "engaged",
      currentSaleId: "sale-id",
      currentSaleTotal: 42,
    });
    getSaleById.mockResolvedValue({
      id: "sale-id",
      status: "draft",
      serviceTableId: tableId,
      grandTotal: 42,
    });
    const response = await tableService.markServiceTableReadyToBillForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({
      status: "success",
      data: { table: { state: "ready_to_bill", currentSaleId: "sale-id" } },
    });
    expect(markTableReadyToBill).toHaveBeenCalledWith(
      organizationId,
      storeId,
      tableId,
      "sale-id",
      deviceSession.device.id,
      expect.anything(),
    );
  });

  test("releases a Paid table without changing its historical Sale", async () => {
    lockServiceTableForDevice.mockResolvedValue({
      ...allocatedTable,
      state: "paid",
      currentSaleId: "sale-id",
      currentSaleTotal: 42,
    });
    getSaleById.mockResolvedValue({
      id: "sale-id",
      status: "completed",
      paymentStatus: "paid",
      serviceTableId: tableId,
      grandTotal: 42,
    });

    const response = await tableService.freePaidServiceTableForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({
      status: "success",
      data: { table: { state: "free", currentSaleId: null } },
    });
    expect(releasePaidTable).toHaveBeenCalledWith(
      organizationId,
      storeId,
      tableId,
      "sale-id",
      deviceSession.device.id,
      expect.anything(),
    );
    expect(deleteDraftSale).not.toHaveBeenCalled();
  });

  test("releases a Payment due table while preserving its outstanding Sale", async () => {
    lockServiceTableForDevice.mockResolvedValue({
      ...allocatedTable,
      state: "payment_due",
      currentSaleId: "sale-id",
      currentSaleTotal: 17,
    });
    getSaleById.mockResolvedValue({
      id: "sale-id",
      status: "completed",
      paymentStatus: "partial",
      serviceTableId: tableId,
      grandTotal: 42,
    });

    const response = await tableService.freeDueServiceTableForDevice(
      deviceSession,
      tableId,
    );

    expect(response).toMatchObject({
      status: "success",
      data: { table: { state: "free", currentSaleId: null } },
    });
    expect(releaseDueTable).toHaveBeenCalledWith(
      organizationId,
      storeId,
      tableId,
      "sale-id",
      deviceSession.device.id,
      expect.anything(),
    );
  });
});
