import type {
    CategoriesListResponse,
    CommitSaleJSON,
    CreateCustomerJSON,
    CreateDraftSaleJSON,
    CreatePaymentJSON,
    CustomerResponse,
    CustomersListResponse,
    PaymentResponse,
    ProductsListResponse,
    SaleResponse,
    SalesListQuery,
    SalesListResponse,
    ServiceResponse,
    UpdateDraftSaleJSON,
    VoidSaleJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getPosCategories = async (): Promise<ServiceResponse<CategoriesListResponse | null>> => {
    try {
        const response = await api.get("/pos/categories");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPosProducts = async (): Promise<ServiceResponse<ProductsListResponse | null>> => {
    try {
        const response = await api.get("/pos/products");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPosCustomers = async (
    params?: { search?: string; limit?: number },
): Promise<ServiceResponse<CustomersListResponse | null>> => {
    try {
        const response = await api.get("/pos/customers", { params });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createPosCustomer = async (
    data: CreateCustomerJSON,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    try {
        const response = await api.post("/pos/customers", data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPosSales = async (
    params?: SalesListQuery,
): Promise<ServiceResponse<SalesListResponse | null>> => {
    try {
        const response = await api.get("/pos/sales", { params });
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const createPosDraftSale = async (
    data: CreateDraftSaleJSON,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.post("/pos/sales", data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPosSale = async (
    saleId: string,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.get(`/pos/sales/${saleId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const updatePosDraftSale = async (
    saleId: string,
    data: UpdateDraftSaleJSON,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.patch(`/pos/sales/${saleId}`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const commitPosSale = async (
    saleId: string,
    data: CommitSaleJSON,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.post(`/pos/sales/${saleId}/commit`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const collectPosPayment = async (
    saleId: string,
    data: CreatePaymentJSON,
): Promise<ServiceResponse<PaymentResponse | null>> => {
    try {
        const response = await api.post(`/pos/sales/${saleId}/payments`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const voidPosSale = async (
    saleId: string,
    data: VoidSaleJSON,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.post(`/pos/sales/${saleId}/void`, data);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};
