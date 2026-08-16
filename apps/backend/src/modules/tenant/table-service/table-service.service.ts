import { pg } from "@/config/db";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import {
  STATUS_CODES,
  type CreateServiceTableSVC,
  type ServiceResponse,
  type ServiceTableResponse,
  type ServiceTablesListResponse,
  type UpdateServiceTableSVC,
} from "@repo/types";
import * as tableRepository from "./table-service.repository";

const defaultPosition = { x: 0.05, y: 0.05 } as const;

type StoreScopeResult =
  | { ok: true }
  | { ok: false; error: string; code: typeof STATUS_CODES.NOT_FOUND };

const getStoreForUser = async (
  userId: string,
  organizationId: string,
  storeId: string,
): Promise<StoreScopeResult> => {
  const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
  if (!organization) return { ok: false, error: "Organization not found", code: STATUS_CODES.NOT_FOUND };

  const store = await organizationRepository.getStoreById(organizationId, storeId);
  if (!store) return { ok: false, error: "Store not found", code: STATUS_CODES.NOT_FOUND };
  return { ok: true };
};

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";

const conflictResponse = (message = "A table with the same Table no already exists in this store") => ({
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
  if (!scope.ok) return { status: "error", message: scope.error, data: null, code: scope.code };

  const tables = await tableRepository.getServiceTables(organizationId, storeId);
  return { status: "success", data: { tables }, message: "Service tables fetched successfully", code: STATUS_CODES.SUCCESS };
};

export const createServiceTable = async (
  userId: string,
  organizationId: string,
  storeId: string,
  data: CreateServiceTableSVC,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  const scope = await getStoreForUser(userId, organizationId, storeId);
  if (!scope.ok) return { status: "error", message: scope.error, data: null, code: scope.code };

  const tableLabel = data.tableLabel.trim();
  if (await tableRepository.serviceTableLabelExists(storeId, tableLabel)) return conflictResponse();

  try {
    const table = await pg.begin((tx) =>
      tableRepository.createServiceTable({
        id: crypto.randomUUID(),
        organizationId,
        storeId,
        tableLabel,
        capacity: data.capacity ?? null,
        position: data.position ?? defaultPosition,
        createdBy: userId,
      }, tx),
    );
    if (!table) return { status: "error", message: "Failed to create service table", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
    return { status: "success", data: { table }, message: "Service table created successfully", code: STATUS_CODES.CREATED };
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
  if (!scope.ok) return { status: "error", message: scope.error, data: null, code: scope.code };

  const existing = await tableRepository.getServiceTableById(organizationId, storeId, tableId);
  if (!existing) return { status: "error", message: "Service table not found", data: null, code: STATUS_CODES.NOT_FOUND };

  const nextLabel = data.tableLabel?.trim();
  if (nextLabel && nextLabel.toLowerCase() !== existing.tableLabel.toLowerCase()) {
    if (await tableRepository.serviceTableLabelExists(storeId, nextLabel, tableId)) return conflictResponse();
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
    if (!table) return { status: "error", message: "Failed to update service table", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
    return { status: "success", data: { table }, message: "Service table updated successfully", code: STATUS_CODES.SUCCESS };
  } catch (error) {
    if (isUniqueViolation(error)) return conflictResponse();
    throw error;
  }
};
