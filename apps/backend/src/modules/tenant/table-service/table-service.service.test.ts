import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { ServiceTableDTO } from "@repo/types";

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

const getOrganizationByIdForUser = mock(async () => organization);
const getStoreById = mock(async (_organizationId: string, requestedStoreId: string) =>
  requestedStoreId === storeId ? store : null,
);
const getServiceTables = mock(async () => [table]);
const getServiceTableById = mock(async () => table);
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
});
