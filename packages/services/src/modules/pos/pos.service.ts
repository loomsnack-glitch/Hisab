import type {
    AddOnsListResponse,
    CategoriesListResponse,
    ComboProductResponse,
    ComboProductsListResponse,
    CommitSaleJSON,
    CompleteSaleJSON,
    CreateCustomerJSON,
    CreateDraftSaleJSON,
    CreatePaymentJSON,
    CustomerResponse,
    CustomersListResponse,
    PaymentResponse,
    ProductAddOnAttachmentsListResponse,
    ProductsListResponse,
    SaleResponse,
    SalesListQuery,
    SalesListResponse,
    ServiceResponse,
    UpdateDraftSaleJSON,
    VoidSaleJSON,
    CreatePurchaseJSON,
    PurchaseListQuery,
    UpdatePurchaseJSON,
    VoidPurchaseJSON,
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

export const getPosAddOns = async (): Promise<ServiceResponse<AddOnsListResponse | null>> => {
    try {
        const response = await api.get("/pos/add-ons");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPosProductAddOnAttachments = async (): Promise<
    ServiceResponse<ProductAddOnAttachmentsListResponse | null>
> => {
    try {
        const response = await api.get("/pos/product-add-on-attachments");
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPosComboProduct = async (
    productId: string,
): Promise<ServiceResponse<ComboProductResponse | null>> => {
    try {
        const response = await api.get(`/pos/combos/${productId}`);
        return response.data;
    } catch (error) {
        return handleApiError(error);
    }
};

export const getPosComboProducts = async (): Promise<ServiceResponse<ComboProductsListResponse | null>> => {
    try {
        const response = await api.get("/pos/combos");
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

export const completePosSale = async (
    data: CompleteSaleJSON,
): Promise<ServiceResponse<SaleResponse | null>> => {
    try {
        const response = await api.post("/pos/sales/complete", data);
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

export const getPosPurchases = async (params?: PurchaseListQuery) => {
    try {
        const response = await api.get("/pos/purchases", { params });
        return response.data;
    } catch (error) { return handleApiError(error); }
};

export const getPosPurchaseSummary = async () => {
    try {
        const response = await api.get("/pos/purchases/summary");
        return response.data;
    } catch (error) { return handleApiError(error); }
};

export const getPosPurchase = async (purchaseId: string) => {
    try {
        const response = await api.get(`/pos/purchases/${purchaseId}`);
        return response.data;
    } catch (error) { return handleApiError(error); }
};

export const createPosPurchase = async (data: CreatePurchaseJSON) => {
    try {
        const response = await api.post("/pos/purchases", data);
        return response.data;
    } catch (error) { return handleApiError(error); }
};

export const updatePosPurchase = async (purchaseId: string, data: UpdatePurchaseJSON) => {
    try {
        const response = await api.patch(`/pos/purchases/${purchaseId}`, data);
        return response.data;
    } catch (error) { return handleApiError(error); }
};

export const voidPosPurchase = async (purchaseId: string, data: VoidPurchaseJSON) => {
    try {
        const response = await api.post(`/pos/purchases/${purchaseId}/void`, data);
        return response.data;
    } catch (error) { return handleApiError(error); }
};
