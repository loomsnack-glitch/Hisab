import type {
  CreateServiceTableJSON,
  ServiceTableResponse,
  ServiceTablesListResponse,
  ServiceResponse,
  UpdateServiceTableJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getServiceTables = async (
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<ServiceTablesListResponse | null>> => {
  try {
    const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/tables`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
export const createServiceTable = async (
  organizationId: string,
  storeId: string,
  data: CreateServiceTableJSON,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  try {
    const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/tables`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateServiceTable = async (
  organizationId: string,
  storeId: string,
  tableId: string,
  data: UpdateServiceTableJSON,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  try {
    const response = await api.patch(
      `/organizations/${organizationId}/stores/${storeId}/tables/${tableId}`,
      data,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
