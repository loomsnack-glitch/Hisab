import type {
  AssignServiceTablesToAreaJSON,
  CreateServiceAreaJSON,
  CreateServiceTableJSON,
  ServiceAreaResponse,
  ServiceAreasListResponse,
  ServiceTableResponse,
  ServiceTablesListResponse,
  ServiceResponse,
  UpdateServiceAreaJSON,
  UpdateServiceTableJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

type StoreScope = {
  organizationId: string;
  storeId: string;
};

type ServiceAreaScope = StoreScope & {
  areaId: string;
};

type ServiceTableAreaScope = ServiceAreaScope & {
  tableId: string;
};

const storePath = ({ organizationId, storeId }: StoreScope) =>
  `/organizations/${organizationId}/stores/${storeId}`;

const tableServiceRequest = async <T>(
  request: () => Promise<{ data: ServiceResponse<T> }>,
): Promise<ServiceResponse<T>> => {
  try {
    return (await request()).data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getServiceTables = async (
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<ServiceTablesListResponse | null>> => {
  const scope = { organizationId, storeId };
  return tableServiceRequest(() =>
    api.get<ServiceResponse<ServiceTablesListResponse | null>>(
      `${storePath(scope)}/tables`,
    ),
  );
};
export const createServiceTable = async (
  organizationId: string,
  storeId: string,
  data: CreateServiceTableJSON,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  const scope = { organizationId, storeId };
  return tableServiceRequest(() =>
    api.post<ServiceResponse<ServiceTableResponse | null>>(
      `${storePath(scope)}/tables`,
      data,
    ),
  );
};

export const updateServiceTable = async (
  organizationId: string,
  storeId: string,
  tableId: string,
  data: UpdateServiceTableJSON,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  const scope = { organizationId, storeId };
  return tableServiceRequest(() =>
    api.patch<ServiceResponse<ServiceTableResponse | null>>(
      `${storePath(scope)}/tables/${tableId}`,
      data,
    ),
  );
};

export const getServiceAreas = async (
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<ServiceAreasListResponse | null>> => {
  const scope = { organizationId, storeId };
  return tableServiceRequest(() =>
    api.get<ServiceResponse<ServiceAreasListResponse | null>>(
      `${storePath(scope)}/areas`,
    ),
  );
};

export const createServiceArea = async (
  organizationId: string,
  storeId: string,
  data: CreateServiceAreaJSON,
): Promise<ServiceResponse<ServiceAreaResponse | null>> => {
  const scope = { organizationId, storeId };
  return tableServiceRequest(() =>
    api.post<ServiceResponse<ServiceAreaResponse | null>>(
      `${storePath(scope)}/areas`,
      data,
    ),
  );
};

export const updateServiceArea = async (
  organizationId: string,
  storeId: string,
  areaId: string,
  data: UpdateServiceAreaJSON,
): Promise<ServiceResponse<ServiceAreaResponse | null>> => {
  const scope = { organizationId, storeId };
  return tableServiceRequest(() =>
    api.patch<ServiceResponse<ServiceAreaResponse | null>>(
      `${storePath(scope)}/areas/${areaId}`,
      data,
    ),
  );
};

export const deleteServiceArea = async (
  organizationId: string,
  storeId: string,
  areaId: string,
): Promise<ServiceResponse<ServiceAreaResponse | null>> => {
  const scope = { organizationId, storeId };
  return tableServiceRequest(() =>
    api.delete<ServiceResponse<ServiceAreaResponse | null>>(
      `${storePath(scope)}/areas/${areaId}`,
    ),
  );
};

export const assignServiceTablesToArea = async (
  { organizationId, storeId, areaId }: ServiceAreaScope,
  data: AssignServiceTablesToAreaJSON,
): Promise<ServiceResponse<ServiceTablesListResponse | null>> => {
  const scope = { organizationId, storeId };
  return tableServiceRequest(() =>
    api.post<ServiceResponse<ServiceTablesListResponse | null>>(
      `${storePath(scope)}/areas/${areaId}/tables`,
      data,
    ),
  );
};

export const unassignServiceTableFromArea = async (
  {
    organizationId,
    storeId,
    areaId,
    tableId,
  }: ServiceTableAreaScope,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  const scope = { organizationId, storeId };
  return tableServiceRequest(() =>
    api.delete<ServiceResponse<ServiceTableResponse | null>>(
      `${storePath(scope)}/areas/${areaId}/tables/${tableId}`,
    ),
  );
};
