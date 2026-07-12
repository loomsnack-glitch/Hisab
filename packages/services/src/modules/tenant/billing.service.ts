import type {
    AddOnSalesRollupsListResponse,
    BundleSalesRollupsListResponse,
    CommitSaleJSON,
    CreateCustomerJSON,
    CreatePaymentJSON,
    CreateDraftSaleJSON,
    CustomerLedgerResponse,
    CustomerResponse,
    CustomersListResponse,
    PaymentResponse,
    SaleResponse,
    SalesListQuery,
    SalesListResponse,
    ServiceResponse,
    UpdateCustomerJSON,
    UpdateDraftSaleJSON,
    VoidSaleJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getCustomers = async (
    organizationId: string,
    params?: { search?: string; limit?: number },
): Promise<ServiceResponse<CustomersListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/customers`, { params });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createCustomer = async (
    organizationId: string,
    data: CreateCustomerJSON,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/customers`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateCustomer = async (
    organizationId: string,
    customerId: string,
    data: UpdateCustomerJSON,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    try {
        const response = await api.patch(`/organizations/${organizationId}/customers/${customerId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getCustomerLedger = async (
    organizationId: string,
    customerId: string,
): Promise<ServiceResponse<CustomerLedgerResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/customers/${customerId}/ledger`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getSales = async (
    organizationId: string,
    storeId: string,
    params?: SalesListQuery,
): Promise<ServiceResponse<SalesListResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/sales`, { params });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createDraftSale = async (
    organizationId: string,
    storeId: string,
    data: CreateDraftSaleJSON,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/sales`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getSale = async (
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.get(`/organizations/${organizationId}/stores/${storeId}/sales/${saleId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updateDraftSale = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    data: UpdateDraftSaleJSON,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.patch(`/organizations/${organizationId}/stores/${storeId}/sales/${saleId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const commitSale = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    data: CommitSaleJSON,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/sales/${saleId}/commit`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const collectPayment = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    data: CreatePaymentJSON,
): Promise<ServiceResponse<PaymentResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/sales/${saleId}/payments`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const voidSale = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    data: VoidSaleJSON,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.post(`/organizations/${organizationId}/stores/${storeId}/sales/${saleId}/void`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getAddOnSalesRollups = async (
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<AddOnSalesRollupsListResponse | null>> => {
    try {
        const response = await api.get(
            `/organizations/${organizationId}/stores/${storeId}/add-on-sales-rollups`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getBundleSalesRollups = async (
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<BundleSalesRollupsListResponse | null>> => {
    try {
        const response = await api.get(
            `/organizations/${organizationId}/stores/${storeId}/bundle-sales-rollups`,
        );
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
