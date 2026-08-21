import { pg } from "@/config/db";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import {
  STATUS_CODES,
  type DeviceSessionDTO,
  type CreateServiceAreaSVC,
  type CreateServiceTableSVC,
  type AssignServiceTablesToAreaSVC,
  type ServiceAreaResponse,
  type ServiceAreasListResponse,
  type ServiceResponse,
  type ServiceTableDTO,
  type ServiceTableResponse,
  type ServiceTableSaleResponse,
  type ServiceTablesListResponse,
  type UpdateServiceAreaSVC,
  type UpdateServiceTableSVC,
} from "@repo/types";
import * as billingRepository from "@/modules/tenant/billing/billing.repository";
import * as billingService from "@/modules/tenant/billing/billing.service";
import * as kotService from "@/modules/tenant/kot/kot.service";
import * as tableRepository from "./table-service.repository";

const defaultPosition = { x: 0.05, y: 0.05 } as const;

const isActiveDraftTableState = (state: ServiceTableDTO["state"]) =>
  state === "engaged" || state === "ready_to_bill";

const isLeftoverDraftTableWorkspace = (table: ServiceTableDTO) =>
  isActiveDraftTableState(table.state) &&
  Boolean(table.currentSaleId) &&
  !table.currentTableOrderId;

const usesKotTableOrders = async (session: DeviceSessionDTO) => {
  const store = await organizationRepository.getStoreById(
    session.organization.id,
    session.store.id,
  );
  return Boolean(store?.kotSystemEnabled && store?.tableManagementEnabled);
};

type StoreScopeResult =
  | { ok: true }
  | { ok: false; error: string; code: typeof STATUS_CODES.NOT_FOUND };

type AdminServiceAreaScope = {
  userId: string;
  organizationId: string;
  storeId: string;
  areaId: string;
};

type AdminServiceTableAreaScope = AdminServiceAreaScope & {
  tableId: string;
};

const getStoreForUser = async (
  userId: string,
  organizationId: string,
  storeId: string,
): Promise<StoreScopeResult> => {
  const organization = await organizationRepository.getOrganizationByIdForUser(
    organizationId,
    userId,
  );
  if (!organization)
    return {
      ok: false,
      error: "Organization not found",
      code: STATUS_CODES.NOT_FOUND,
    };

  const store = await organizationRepository.getStoreById(
    organizationId,
    storeId,
  );
  if (!store)
    return {
      ok: false,
      error: "Store not found",
      code: STATUS_CODES.NOT_FOUND,
    };
  return { ok: true };
};

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "23505";

const conflictResponse = (
  message = "A table with the same Table no already exists in this store",
) => ({
  status: "error" as const,
  message,
  data: null,
  code: STATUS_CODES.CONFLICT,
});

export const getServiceTables = async (
  userId: string,
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<ServiceTablesListResponse | null>> => {
  const scope = await getStoreForUser(userId, organizationId, storeId);
  if (!scope.ok)
    return {
      status: "error",
      message: scope.error,
      data: null,
      code: scope.code,
    };

  const tables = await tableRepository.getServiceTables(
    organizationId,
    storeId,
  );
  return {
    status: "success",
    data: { tables },
    message: "Service tables fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const getServiceTablesForDevice = async (
  session: DeviceSessionDTO,
): Promise<ServiceResponse<ServiceTablesListResponse | null>> => {
  const tables = await tableRepository.getServiceTables(
    session.organization.id,
    session.store.id,
  );
  return {
    status: "success",
    data: { tables },
    message: "POS service tables fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const getServiceAreasForDevice = async (
  session: DeviceSessionDTO,
): Promise<ServiceResponse<ServiceAreasListResponse | null>> => {
  const areas = await tableRepository.getServiceAreas(
    session.organization.id,
    session.store.id,
  );
  return {
    status: "success",
    data: { areas },
    message: "POS service areas fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

const transitionServiceTableForDevice = async (
  session: DeviceSessionDTO,
  tableId: string,
  fromState: "free" | "allocated",
  toState: "free" | "allocated",
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  const table = await tableRepository.transitionServiceTableState(
    session.organization.id,
    session.store.id,
    tableId,
    fromState,
    toState,
    session.device.id,
  );
  if (table) {
    return {
      status: "success",
      data: { table },
      message:
        toState === "allocated"
          ? "Service table allocated"
          : "Service table freed",
      code: STATUS_CODES.SUCCESS,
    };
  }

  const existing = await tableRepository.getServiceTableById(
    session.organization.id,
    session.store.id,
    tableId,
  );
  if (!existing) {
    return {
      status: "error",
      message: "Service table not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  return {
    status: "error",
    message:
      fromState === "free"
        ? "Service table is no longer free"
        : "Only an allocated service table can be freed",
    data: null,
    code: STATUS_CODES.CONFLICT,
  };
};

export const allocateServiceTableForDevice = async (
  session: DeviceSessionDTO,
  tableId: string,
) => transitionServiceTableForDevice(session, tableId, "free", "allocated");

export const freeAllocatedServiceTableForDevice = async (
  session: DeviceSessionDTO,
  tableId: string,
) => transitionServiceTableForDevice(session, tableId, "allocated", "free");

export const startServiceTableOrderForDevice = async (
  session: DeviceSessionDTO,
  tableId: string,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
  if (await usesKotTableOrders(session)) {
    return kotService.startActiveTableOrderForDevice(session, tableId);
  }

  const result = await pg.begin(async (tx) => {
    const table = await tableRepository.lockServiceTableForDevice(
      session.organization.id,
      session.store.id,
      tableId,
      tx,
    );
    if (!table) return { kind: "not_found" as const };
    if (table.state !== "allocated" || table.currentSaleId || table.currentTableOrderId)
      return { kind: "conflict" as const };

    const saleId = crypto.randomUUID();
    const sale = await billingRepository.createSale(
      {
        id: saleId,
        organizationId: session.organization.id,
        storeId: session.store.id,
        serviceTableId: tableId,
        userId: null,
        createdByDeviceId: session.device.id,
        updatedByDeviceId: session.device.id,
        status: "draft",
        paymentStatus: "pending",
        subtotal: 0,
        discountTotal: 0,
        grandTotal: 0,
        customerId: null,
        customerNameSnapshot: null,
        customerPhoneSnapshot: null,
        notes: null,
      },
      tx,
    );
    if (!sale) throw new Error("Failed to create table draft sale");

    const engagedTable = await tableRepository.attachDraftSale(
      session.organization.id,
      session.store.id,
      tableId,
      saleId,
      session.device.id,
      tx,
    );
    if (!engagedTable) throw new Error("Failed to engage service table");

    return {
      kind: "started" as const,
      saleId,
      table: { ...engagedTable, currentSaleId: saleId, currentSaleTotal: 0 },
    };
  });

  if (result.kind === "not_found") {
    return {
      status: "error",
      message: "Service table not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  if (result.kind === "conflict") {
    return {
      status: "error",
      message:
        "Only an allocated service table without an active order can start an order",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const saleResponse = await billingService.getSaleDetailsForDevice(
    session,
    result.saleId,
  );
  if (saleResponse.status !== "success" || !saleResponse.data?.sale) {
    return {
      status: "error",
      message: "Table draft sale could not be loaded",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    status: "success",
    data: { table: result.table, sale: saleResponse.data.sale },
    message: "Table order started",
    code: STATUS_CODES.CREATED,
  };
};

export const getServiceTableOrderForDevice = async (
  session: DeviceSessionDTO,
  tableId: string,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
  const table = await tableRepository.getServiceTableById(
    session.organization.id,
    session.store.id,
    tableId,
  );
  if (await usesKotTableOrders(session)) {
    if (!table) {
      return {
        status: "error",
        message: "Service table not found",
        data: null,
        code: STATUS_CODES.NOT_FOUND,
      };
    }
    if (!isLeftoverDraftTableWorkspace(table)) {
      return kotService.getActiveTableOrderForDevice(session, tableId);
    }
  } else if (!table) {
    return {
      status: "error",
      message: "Service table not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  if (!table.currentSaleId || !isActiveDraftTableState(table.state)) {
    return {
      status: "error",
      message: "Service table has no active draft order",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const saleResponse = await billingService.getSaleDetailsForDevice(
    session,
    table.currentSaleId,
  );
  if (
    saleResponse.status !== "success" ||
    !saleResponse.data?.sale ||
    saleResponse.data.sale.status !== "draft" ||
    saleResponse.data.sale.serviceTableId !== tableId
  ) {
    return {
      status: "error",
      message: "The table's active draft order is unavailable",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  return {
    status: "success",
    data: { table, sale: saleResponse.data.sale },
    message: "Table order loaded",
    code: STATUS_CODES.SUCCESS,
  };
};

export const cancelServiceTableOrderForDevice = async (
  session: DeviceSessionDTO,
  tableId: string,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  if (await usesKotTableOrders(session)) {
    const table = await tableRepository.getServiceTableById(
      session.organization.id,
      session.store.id,
      tableId,
    );
    if (!table) {
      return {
        status: "error",
        message: "Service table not found",
        data: null,
        code: STATUS_CODES.NOT_FOUND,
      };
    }
    if (!isLeftoverDraftTableWorkspace(table)) {
      return kotService.discardActiveTableOrderForDevice(session, tableId);
    }
  }
  const result = await pg.begin(async (tx) => {
    const table = await tableRepository.lockServiceTableForDevice(
      session.organization.id,
      session.store.id,
      tableId,
      tx,
    );
    if (!table) return { kind: "not_found" as const };
    if (!isActiveDraftTableState(table.state) || !table.currentSaleId)
      return { kind: "conflict" as const };

    const saleIsDraft = await billingRepository.lockDraftSale(
      session.organization.id,
      session.store.id,
      table.currentSaleId,
      tx,
    );

    const sale = await billingRepository.getSaleById(
      session.organization.id,
      session.store.id,
      table.currentSaleId,
      tx,
    );
    if (!sale) {
      // A table can retain a stale pointer if an older deployment or a manual
      // cleanup removed the draft without using the table cancellation flow.
      // Clearing only the table pointer makes the floor usable again without
      // ever treating a committed sale as cancellable.
      const freeTable = await tableRepository.clearDraftSale(
        session.organization.id,
        session.store.id,
        tableId,
        table.currentSaleId,
        session.device.id,
        tx,
      );
      if (!freeTable) throw new Error("Failed to clear stale service table draft");

      return {
        kind: "recovered" as const,
        table: { ...freeTable, currentSaleId: null, currentSaleTotal: null },
      };
    }

    if (
      sale.status === "completed" &&
      sale.paymentStatus === "paid" &&
      sale.serviceTableId === tableId
    ) {
      const freeTable = await tableRepository.releasePaidTableFromActiveState(
        session.organization.id,
        session.store.id,
        tableId,
        table.currentSaleId,
        session.device.id,
        tx,
      );
      if (!freeTable) throw new Error("Failed to release paid service table");

      return {
        kind: "recovered_paid" as const,
        table: { ...freeTable, currentSaleId: null, currentSaleTotal: null },
      };
    }

    if (!saleIsDraft || sale.status !== "draft" || sale.serviceTableId !== tableId)
      return { kind: "conflict" as const };

    const freeTable = await tableRepository.clearDraftSale(
      session.organization.id,
      session.store.id,
      tableId,
      table.currentSaleId,
      session.device.id,
      tx,
    );
    if (!freeTable) throw new Error("Failed to free service table");

    const deleted = await billingRepository.deleteDraftSale(
      session.organization.id,
      session.store.id,
      sale.id,
      tx,
    );
    if (!deleted) throw new Error("Failed to discard table draft");

    return {
      kind: "cancelled" as const,
      table: { ...freeTable, currentSaleId: null, currentSaleTotal: null },
    };
  });

  if (result.kind === "not_found")
    return {
      status: "error",
      message: "Service table not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  if (result.kind === "conflict")
    return {
      status: "error",
      message: "Only the current uncommitted table draft can be cancelled",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  if (result.kind === "recovered")
    return {
      status: "success",
      data: { table: result.table },
      message: "Stale table draft link cleared",
      code: STATUS_CODES.SUCCESS,
    };
  if (result.kind === "recovered_paid")
    return {
      status: "success",
      data: { table: result.table },
      message: "Paid table link cleared",
      code: STATUS_CODES.SUCCESS,
    };
  return {
    status: "success",
    data: { table: result.table },
    message: "Table order cancelled",
    code: STATUS_CODES.SUCCESS,
  };
};

const releaseCommittedServiceTableForDevice = async (
  session: DeviceSessionDTO,
  tableId: string,
  expectedState: "payment_due" | "paid",
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  const result = await pg.begin(async (tx) => {
    const table = await tableRepository.lockServiceTableForDevice(
      session.organization.id,
      session.store.id,
      tableId,
      tx,
    );
    if (!table) return { kind: "not_found" as const };
    if (table.state !== expectedState || !table.currentSaleId)
      return { kind: "conflict" as const };

    const sale = await billingRepository.getSaleById(
      session.organization.id,
      session.store.id,
      table.currentSaleId,
      tx,
    );
    const saleMatchesTableState =
      expectedState === "paid"
        ? sale?.paymentStatus === "paid"
        : sale?.paymentStatus === "pending" || sale?.paymentStatus === "partial";
    if (
      !sale ||
      sale.status !== "completed" ||
      sale.serviceTableId !== tableId ||
      !saleMatchesTableState
    ) {
      return { kind: "conflict" as const };
    }

    const releasedTable =
      expectedState === "paid"
        ? await tableRepository.releasePaidTable(
            session.organization.id,
            session.store.id,
            tableId,
            table.currentSaleId,
            session.device.id,
            tx,
          )
        : await tableRepository.releaseDueTable(
            session.organization.id,
            session.store.id,
            tableId,
            table.currentSaleId,
            session.device.id,
            tx,
          );
    if (!releasedTable) return { kind: "conflict" as const };
    return { kind: "released" as const, table: releasedTable };
  });

  if (result.kind === "not_found")
    return {
      status: "error",
      message: "Service table not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  if (result.kind === "conflict")
    return {
      status: "error",
      message:
        expectedState === "paid"
          ? "Only a Paid service table can be freed"
          : "Only a Payment due service table can be freed with bill due",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  return {
    status: "success",
    data: { table: result.table },
    message:
      expectedState === "paid"
        ? "Paid service table freed"
        : "Payment due service table freed with bill due",
    code: STATUS_CODES.SUCCESS,
  };
};

export const freePaidServiceTableForDevice = (
  session: DeviceSessionDTO,
  tableId: string,
) => releaseCommittedServiceTableForDevice(session, tableId, "paid");

export const freeDueServiceTableForDevice = (
  session: DeviceSessionDTO,
  tableId: string,
) => releaseCommittedServiceTableForDevice(session, tableId, "payment_due");

export const createServiceTable = async (
  userId: string,
  organizationId: string,
  storeId: string,
  data: CreateServiceTableSVC,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  const scope = await getStoreForUser(userId, organizationId, storeId);
  if (!scope.ok)
    return {
      status: "error",
      message: scope.error,
      data: null,
      code: scope.code,
    };

  const tableLabel = data.tableLabel.trim();
  if (await tableRepository.serviceTableLabelExists(storeId, tableLabel))
    return conflictResponse();

  try {
    const table = await pg.begin((tx) =>
      tableRepository.createServiceTable(
        {
          id: crypto.randomUUID(),
          organizationId,
          storeId,
          tableLabel,
          capacity: data.capacity ?? null,
          position: data.position ?? defaultPosition,
          createdBy: userId,
        },
        tx,
      ),
    );
    if (!table)
      return {
        status: "error",
        message: "Failed to create service table",
        data: null,
        code: STATUS_CODES.INTERNAL_SERVER_ERROR,
      };
    return {
      status: "success",
      data: { table },
      message: "Service table created successfully",
      code: STATUS_CODES.CREATED,
    };
  } catch (error) {
    if (isUniqueViolation(error)) return conflictResponse();
    throw error;
  }
};

export const updateServiceTable = async (
  userId: string,
  organizationId: string,
  storeId: string,
  tableId: string,
  data: UpdateServiceTableSVC,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  const scope = await getStoreForUser(userId, organizationId, storeId);
  if (!scope.ok)
    return {
      status: "error",
      message: scope.error,
      data: null,
      code: scope.code,
    };

  const existing = await tableRepository.getServiceTableById(
    organizationId,
    storeId,
    tableId,
  );
  if (!existing)
    return {
      status: "error",
      message: "Service table not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };

  const nextLabel = data.tableLabel?.trim();
  if (
    nextLabel &&
    nextLabel.toLowerCase() !== existing.tableLabel.toLowerCase()
  ) {
    if (
      await tableRepository.serviceTableLabelExists(storeId, nextLabel, tableId)
    )
      return conflictResponse();
  }

  try {
    const table = await tableRepository.updateServiceTable({
      id: tableId,
      organizationId,
      storeId,
      ...(nextLabel ? { tableLabel: nextLabel } : {}),
      ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      ...(data.position ? { position: data.position } : {}),
      updatedBy: userId,
    });
    if (!table)
      return {
        status: "error",
        message: "Failed to update service table",
        data: null,
        code: STATUS_CODES.INTERNAL_SERVER_ERROR,
      };
    return {
      status: "success",
      data: { table },
      message: "Service table updated successfully",
      code: STATUS_CODES.SUCCESS,
    };
  } catch (error) {
    if (isUniqueViolation(error)) return conflictResponse();
    throw error;
  }
};

const areaConflictResponse = (
  message = "An area with the same title already exists in this store",
) => conflictResponse(message);

const normalizeAreaDescription = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

const scopeError = (scope: Exclude<StoreScopeResult, { ok: true }>) => ({
  status: "error" as const,
  message: scope.error,
  data: null,
  code: scope.code,
});

export const getServiceAreas = async (
  userId: string,
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<ServiceAreasListResponse | null>> => {
  const scope = await getStoreForUser(userId, organizationId, storeId);
  if (!scope.ok) return scopeError(scope);

  const areas = await tableRepository.getServiceAreas(organizationId, storeId);
  return {
    status: "success",
    data: { areas },
    message: "Service areas fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const createServiceArea = async (
  userId: string,
  organizationId: string,
  storeId: string,
  data: CreateServiceAreaSVC,
): Promise<ServiceResponse<ServiceAreaResponse | null>> => {
  const scope = await getStoreForUser(userId, organizationId, storeId);
  if (!scope.ok) return scopeError(scope);

  const title = data.title.trim();
  if (await tableRepository.serviceAreaTitleExists(storeId, title))
    return areaConflictResponse();

  try {
    const area = await pg.begin((tx) =>
      tableRepository.createServiceArea(
        {
          id: crypto.randomUUID(),
          organizationId,
          storeId,
          title,
          description: normalizeAreaDescription(data.description) ?? null,
          createdBy: userId,
        },
        tx,
      ),
    );
    if (!area)
      return {
        status: "error",
        message: "Failed to create service area",
        data: null,
        code: STATUS_CODES.INTERNAL_SERVER_ERROR,
      };
    return {
      status: "success",
      data: { area },
      message: "Service area created successfully",
      code: STATUS_CODES.CREATED,
    };
  } catch (error) {
    if (isUniqueViolation(error)) return areaConflictResponse();
    throw error;
  }
};

export const updateServiceArea = async (
  userId: string,
  organizationId: string,
  storeId: string,
  areaId: string,
  data: UpdateServiceAreaSVC,
): Promise<ServiceResponse<ServiceAreaResponse | null>> => {
  const scope = await getStoreForUser(userId, organizationId, storeId);
  if (!scope.ok) return scopeError(scope);

  const existing = await tableRepository.getServiceAreaById(
    organizationId,
    storeId,
    areaId,
  );
  if (!existing)
    return {
      status: "error",
      message: "Service area not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };

  const nextTitle = data.title?.trim();
  if (nextTitle && nextTitle.toLowerCase() !== existing.title.toLowerCase()) {
    if (await tableRepository.serviceAreaTitleExists(storeId, nextTitle, areaId))
      return areaConflictResponse();
  }

  try {
    const area = await tableRepository.updateServiceArea({
      id: areaId,
      organizationId,
      storeId,
      ...(nextTitle ? { title: nextTitle } : {}),
      ...(data.description !== undefined
        ? { description: normalizeAreaDescription(data.description) ?? null }
        : {}),
      updatedBy: userId,
    });
    if (!area)
      return {
        status: "error",
        message: "Failed to update service area",
        data: null,
        code: STATUS_CODES.INTERNAL_SERVER_ERROR,
      };
    return {
      status: "success",
      data: { area },
      message: "Service area updated successfully",
      code: STATUS_CODES.SUCCESS,
    };
  } catch (error) {
    if (isUniqueViolation(error)) return areaConflictResponse();
    throw error;
  }
};

export const deleteServiceArea = async (
  userId: string,
  organizationId: string,
  storeId: string,
  areaId: string,
): Promise<ServiceResponse<ServiceAreaResponse | null>> => {
  const scope = await getStoreForUser(userId, organizationId, storeId);
  if (!scope.ok) return scopeError(scope);

  const existing = await tableRepository.getServiceAreaById(
    organizationId,
    storeId,
    areaId,
  );
  if (!existing)
    return {
      status: "error",
      message: "Service area not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };

  const area = await tableRepository.deleteServiceArea(
    organizationId,
    storeId,
    areaId,
  );
  if (!area)
    return {
      status: "error",
      message: "Failed to delete service area",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };

  return {
    status: "success",
    data: { area },
    message: "Service area deleted successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const assignServiceTablesToArea = async (
  { userId, organizationId, storeId, areaId }: AdminServiceAreaScope,
  data: AssignServiceTablesToAreaSVC,
): Promise<ServiceResponse<ServiceTablesListResponse | null>> => {
  const scope = await getStoreForUser(userId, organizationId, storeId);
  if (!scope.ok) return scopeError(scope);

  const tableIds = [...new Set(data.tableIds)];
  const result = await pg.begin(async (tx) => {
    const area = await tableRepository.lockServiceArea(
      { organizationId, storeId, areaId },
      tx,
    );
    if (!area) return { kind: "area_not_found" as const };

    const lockedTables: ServiceTableDTO[] = [];
    for (const tableId of tableIds) {
      const table = await tableRepository.lockServiceTableForDevice(
        organizationId,
        storeId,
        tableId,
        tx,
      );
      if (!table) return { kind: "table_not_found" as const };
      if (table.serviceAreaId) {
        return {
          kind: "already_assigned" as const,
          tableLabel: table.tableLabel,
        };
      }
      lockedTables.push(table);
    }

    const tables: ServiceTableDTO[] = [];
    for (const table of lockedTables) {
      const assigned = await tableRepository.assignServiceTableToArea(
        {
          organizationId,
          storeId,
          areaId,
          tableId: table.id,
          updatedBy: userId,
        },
        tx,
      );
      if (!assigned) throw new Error("Failed to assign service table to area");
      tables.push({
        ...assigned,
        currentSaleTotal: table.currentSaleTotal,
      });
    }

    return { kind: "ok" as const, tables };
  });

  if (result.kind === "area_not_found") {
    return {
      status: "error",
      message: "Service area not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  if (result.kind === "table_not_found") {
    return {
      status: "error",
      message: "Service table not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  if (result.kind === "already_assigned") {
    return {
      status: "error",
      message: `Table ${result.tableLabel} must be unassigned before it can be assigned to an area`,
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  return {
    status: "success",
    data: { tables: result.tables },
    message: "Service tables assigned to area",
    code: STATUS_CODES.SUCCESS,
  };
};

export const unassignServiceTableFromArea = async (
  {
    userId,
    organizationId,
    storeId,
    areaId,
    tableId,
  }: AdminServiceTableAreaScope,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  const scope = await getStoreForUser(userId, organizationId, storeId);
  if (!scope.ok) return scopeError(scope);

  const result = await pg.begin(async (tx) => {
    const area = await tableRepository.lockServiceArea(
      { organizationId, storeId, areaId },
      tx,
    );
    if (!area) return { kind: "area_not_found" as const };

    const table = await tableRepository.lockServiceTableForDevice(
      organizationId,
      storeId,
      tableId,
      tx,
    );
    if (!table) return { kind: "table_not_found" as const };
    if (table.serviceAreaId !== areaId) {
      return { kind: "not_in_area" as const };
    }

    const unassigned = await tableRepository.unassignServiceTableFromArea(
      {
        organizationId,
        storeId,
        areaId,
        tableId,
        updatedBy: userId,
      },
      tx,
    );
    if (!unassigned) throw new Error("Failed to unassign service table from area");

    return {
      kind: "ok" as const,
      table: {
        ...unassigned,
        serviceAreaId: null,
        currentSaleTotal: table.currentSaleTotal,
      },
    };
  });

  if (result.kind === "area_not_found") {
    return {
      status: "error",
      message: "Service area not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  if (result.kind === "table_not_found") {
    return {
      status: "error",
      message: "Service table not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  if (result.kind === "not_in_area") {
    return {
      status: "error",
      message: "Service table is not assigned to this area",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  return {
    status: "success",
    data: { table: result.table },
    message: "Service table unassigned from area",
    code: STATUS_CODES.SUCCESS,
  };
};
