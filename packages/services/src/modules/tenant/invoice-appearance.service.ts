import type {
  InvoiceAppearancePreviewResponse,
  InvoiceAppearanceSettingsResponse,
  ServiceResponse,
  StoreInvoiceAppearanceSettingsResponse,
  UpdateInvoiceAppearanceSettings,
} from "@repo/types";
import { api, handleApiError } from "../../api";

const freshReadConfig = () => ({
  params: { _appearanceRefresh: Date.now() },
});

export const getOrganizationInvoiceAppearance = async (
  organizationId: string,
): Promise<ServiceResponse<InvoiceAppearanceSettingsResponse | null>> => {
  try {
    const response = await api.get(`/organizations/${organizationId}/invoice-appearance`, freshReadConfig());
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateOrganizationInvoiceAppearanceDraft = async (
  organizationId: string,
  data: UpdateInvoiceAppearanceSettings,
): Promise<ServiceResponse<InvoiceAppearanceSettingsResponse | null>> => {
  try {
    const response = await api.patch(`/organizations/${organizationId}/invoice-appearance`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const publishOrganizationInvoiceAppearance = async (
  organizationId: string,
): Promise<ServiceResponse<InvoiceAppearanceSettingsResponse | null>> => {
  try {
    const response = await api.post(`/organizations/${organizationId}/invoice-appearance/publish`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const resetOrganizationInvoiceAppearance = async (
  organizationId: string,
): Promise<ServiceResponse<InvoiceAppearanceSettingsResponse | null>> => {
  try {
    const response = await api.post(`/organizations/${organizationId}/invoice-appearance/reset`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getStoreInvoiceAppearance = async (
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<StoreInvoiceAppearanceSettingsResponse | null>> => {
  try {
    const response = await api.get(
      `/organizations/${organizationId}/stores/${storeId}/invoice-appearance`,
      freshReadConfig(),
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateStoreInvoiceAppearanceDraft = async (
  organizationId: string,
  storeId: string,
  data: UpdateInvoiceAppearanceSettings & { usesOrganizationDefault?: boolean },
): Promise<ServiceResponse<StoreInvoiceAppearanceSettingsResponse | null>> => {
  try {
    const response = await api.patch(
      `/organizations/${organizationId}/stores/${storeId}/invoice-appearance`,
      data,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const publishStoreInvoiceAppearance = async (
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<StoreInvoiceAppearanceSettingsResponse | null>> => {
  try {
    const response = await api.post(
      `/organizations/${organizationId}/stores/${storeId}/invoice-appearance/publish`,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const resetStoreInvoiceAppearance = async (
  organizationId: string,
  storeId: string,
): Promise<ServiceResponse<StoreInvoiceAppearanceSettingsResponse | null>> => {
  try {
    const response = await api.post(
      `/organizations/${organizationId}/stores/${storeId}/invoice-appearance/reset`,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const previewStoreInvoiceAppearance = async (
  organizationId: string,
  storeId: string,
  data: UpdateInvoiceAppearanceSettings & {
    usesOrganizationDefault?: boolean;
    viewport?: "desktop" | "mobile" | "pdf";
    mode?: "screen" | "print" | "preview";
  },
): Promise<ServiceResponse<InvoiceAppearancePreviewResponse | null>> => {
  try {
    const response = await api.post(
      `/organizations/${organizationId}/stores/${storeId}/invoice-appearance/preview`,
      data,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
