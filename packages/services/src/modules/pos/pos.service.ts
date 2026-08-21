import type {
  AddOnsListResponse,
  CategoriesListResponse,
  ComboProductResponse,
  ComboProductsListResponse,
  CommitSaleJSON,
  CompleteSaleJSON,
  CreateParcelKotJSON,
  ParcelKotResponse,
  ReplaceSaleJSON,
  CreateCustomerJSON,
  CreateDraftSaleJSON,
  CreatePaymentJSON,
  CustomerResponse,
  CustomerListQuery,
  CustomersListResponse,
  PaymentResponse,
  ProductSalesSummaryListResponse,
  ProductSalesSummaryQuery,
  ProductAddOnAttachmentsListResponse,
  PosSettingsResponse,
  ProductsListResponse,
  SaleResponse,
  SalesListQuery,
  SalesListResponse,
  ServiceResponse,
  UpdateDraftSaleJSON,
  UpdateStoreDevicePosSettingsJSON,
  UpdateCustomerJSON,
  VoidSaleJSON,
  CreatePurchaseJSON,
  PurchaseListQuery,
  UpdatePurchaseJSON,
  VoidPurchaseJSON,
  WhatsAppInvoiceQueueResponseDTO,
  WhatsAppMessageTemplatesResponseDTO,
  WhatsAppReminderQueueResponseDTO,
  WhatsAppAccountStatusResponseDTO,
  WhatsAppConversationListResponse,
  WhatsAppConversationMessagesResponse,
  WhatsAppConversationDTO,
  WhatsAppAttachmentResponse,
  WhatsAppMessageDTO,
  WhatsAppSendConversationTextJSON,
  WhatsAppAttachConversationCustomerJSON,
  ServiceTableResponse,
  ServiceTableSaleResponse,
  ServiceTablesListResponse,
  ServiceAreasListResponse,
  CreateTableKotJSON,
  UpdateTableKotJSON,
  UpdateTableOrderJSON,
  CheckoutTableOrderJSON,
} from "@repo/types";
import { api, handleApiError } from "../../api";

export const getPosCategories = async (): Promise<
  ServiceResponse<CategoriesListResponse | null>
> => {
  try {
    const response = await api.get("/pos/categories");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosProducts = async (): Promise<
  ServiceResponse<ProductsListResponse | null>
> => {
  try {
    const response = await api.get("/pos/products");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosSettings = async (): Promise<
  ServiceResponse<PosSettingsResponse | null>
> => {
  try {
    const response = await api.get("/pos/settings");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosServiceTables = async (): Promise<
  ServiceResponse<ServiceTablesListResponse | null>
> => {
  try {
    const response = await api.get("/pos/tables");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosServiceAreas = async (): Promise<
  ServiceResponse<ServiceAreasListResponse | null>
> => {
  try {
    const response = await api.get("/pos/areas");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const allocatePosServiceTable = async (
  tableId: string,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  try {
    const response = await api.post(`/pos/tables/${tableId}/allocate`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const freePosServiceTable = async (
  tableId: string,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  try {
    const response = await api.post(`/pos/tables/${tableId}/free`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const startPosServiceTableOrder = async (
  tableId: string,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
  try {
    const response = await api.post(`/pos/tables/${tableId}/order`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosServiceTableOrder = async (
  tableId: string,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
  try {
    const response = await api.get(`/pos/tables/${tableId}/order`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const cancelPosServiceTableOrder = async (
  tableId: string,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  try {
    const response = await api.delete(`/pos/tables/${tableId}/order`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updatePosServiceTableOrder = async (
  tableId: string,
  data: UpdateTableOrderJSON,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
  try {
    const response = await api.patch(`/pos/tables/${tableId}/order`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createPosTableKot = async (
  tableId: string,
  data: CreateTableKotJSON,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
  try {
    const response = await api.post(`/pos/tables/${tableId}/kots`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updatePosTableKot = async (
  tableId: string,
  kotId: string,
  data: UpdateTableKotJSON,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
  try {
    const response = await api.patch(`/pos/tables/${tableId}/kots/${kotId}`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const checkoutPosTableOrder = async (
  tableId: string,
  data: CheckoutTableOrderJSON,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
  try {
    const response = await api.post(`/pos/tables/${tableId}/checkout`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const freePaidPosServiceTable = async (
  tableId: string,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  try {
    const response = await api.post(`/pos/tables/${tableId}/free-paid`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const freeDuePosServiceTable = async (
  tableId: string,
): Promise<ServiceResponse<ServiceTableResponse | null>> => {
  try {
    const response = await api.post(`/pos/tables/${tableId}/free-due`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updatePosSettings = async (
  data: UpdateStoreDevicePosSettingsJSON,
): Promise<ServiceResponse<PosSettingsResponse | null>> => {
  try {
    const response = await api.patch("/pos/settings", data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosAddOns = async (): Promise<
  ServiceResponse<AddOnsListResponse | null>
> => {
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

export const getPosComboProducts = async (): Promise<
  ServiceResponse<ComboProductsListResponse | null>
> => {
  try {
    const response = await api.get("/pos/combos");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosCustomers = async (
  params?: CustomerListQuery,
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

export const updatePosCustomer = async (
  customerId: string,
  data: UpdateCustomerJSON,
): Promise<ServiceResponse<CustomerResponse | null>> => {
  try {
    const response = await api.patch(`/pos/customers/${customerId}`, data);
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

export const getPosProductSalesSummary = async (
  params?: ProductSalesSummaryQuery,
): Promise<ServiceResponse<ProductSalesSummaryListResponse | null>> => {
  try {
    const response = await api.get("/pos/product-sales-summary", { params });
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

export const replacePosSale = async (
  saleId: string,
  data: ReplaceSaleJSON,
): Promise<ServiceResponse<SaleResponse | null>> => {
  try {
    const response = await api.post(`/pos/sales/${saleId}/replace`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deletePosDraftSale = async (
  saleId: string,
): Promise<ServiceResponse<null>> => {
  try {
    const response = await api.delete(`/pos/sales/${saleId}`);
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

export const createPosParcelKot = async (
  data: CreateParcelKotJSON,
): Promise<ServiceResponse<ParcelKotResponse | null>> => {
  try {
    const response = await api.post("/pos/kots/parcel", data);
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

export const getPosWhatsAppInvoiceStatus = async (
  saleId: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  try {
    const response = await api.get(`/pos/sales/${saleId}/whatsapp`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const queuePosWhatsAppInvoice = async (
  saleId: string,
  customMessage?: string,
  templateId?: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  try {
    const response = await api.post(`/pos/sales/${saleId}/whatsapp`, { customMessage, templateId });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosWhatsAppMessageTemplates = async (): Promise<
  ServiceResponse<WhatsAppMessageTemplatesResponseDTO | null>
> => {
  try {
    const response = await api.get("/pos/whatsapp/templates", { params: { kind: "bill" } });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const retryPosWhatsAppInvoice = async (
  saleId: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  try {
    const response = await api.post(`/pos/sales/${saleId}/whatsapp/retry`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const queuePosWhatsAppDueReminder = async (customerId: string, customMessage?: string, saleId?: string): Promise<ServiceResponse<WhatsAppReminderQueueResponseDTO | null>> => {
  try {
    const response = await api.post(`/pos/customers/${customerId}/whatsapp/due-reminder`, { customMessage, saleId });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosWhatsAppDueReminderStatus = async (saleId: string): Promise<ServiceResponse<WhatsAppReminderQueueResponseDTO | null>> => {
  try {
    const response = await api.get(`/pos/sales/${saleId}/whatsapp/due-reminder`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosWhatsAppConversations = async (): Promise<
  ServiceResponse<WhatsAppConversationListResponse | null>
> => {
  try {
    const response = await api.get("/pos/whatsapp/conversations");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosWhatsAppAccount = async (): Promise<
  ServiceResponse<WhatsAppAccountStatusResponseDTO | null>
> => {
  try {
    const response = await api.get("/pos/whatsapp/account");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const connectPosWhatsAppAccount = async (): Promise<
  ServiceResponse<WhatsAppAccountStatusResponseDTO | null>
> => {
  try {
    const response = await api.post("/pos/whatsapp/account/connect");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const syncPosWhatsAppAccount = async (): Promise<
  ServiceResponse<unknown>
> => {
  try {
    const response = await api.post("/pos/whatsapp/sync");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosWhatsAppConversation = async (
  conversationId: string,
): Promise<ServiceResponse<WhatsAppConversationMessagesResponse | null>> => {
  try {
    const response = await api.get(
      `/pos/whatsapp/conversations/${conversationId}`,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const sendPosWhatsAppConversationText = async (
  conversationId: string,
  data: WhatsAppSendConversationTextJSON,
): Promise<ServiceResponse<WhatsAppMessageDTO | null>> => {
  try {
    const response = await api.post(
      `/pos/whatsapp/conversations/${conversationId}/messages`,
      data,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const attachPosWhatsAppConversationCustomer = async (
  conversationId: string,
  data: WhatsAppAttachConversationCustomerJSON,
): Promise<ServiceResponse<WhatsAppConversationDTO | null>> => {
  try {
    const response = await api.post(
      `/pos/whatsapp/conversations/${conversationId}/customer`,
      data,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosWhatsAppAttachment = async (
  conversationId: string,
  messageId: string,
): Promise<ServiceResponse<WhatsAppAttachmentResponse | null>> => {
  try {
    const response = await api.get(
      `/pos/whatsapp/conversations/${conversationId}/messages/${messageId}/attachment`,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosPurchases = async (params?: PurchaseListQuery) => {
  try {
    const response = await api.get("/pos/purchases", { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosPurchaseSummary = async () => {
  try {
    const response = await api.get("/pos/purchases/summary");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPosPurchase = async (purchaseId: string) => {
  try {
    const response = await api.get(`/pos/purchases/${purchaseId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createPosPurchase = async (data: CreatePurchaseJSON) => {
  try {
    const response = await api.post("/pos/purchases", data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updatePosPurchase = async (
  purchaseId: string,
  data: UpdatePurchaseJSON,
) => {
  try {
    const response = await api.patch(`/pos/purchases/${purchaseId}`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const voidPosPurchase = async (
  purchaseId: string,
  data: VoidPurchaseJSON,
) => {
  try {
    const response = await api.post(`/pos/purchases/${purchaseId}/void`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
