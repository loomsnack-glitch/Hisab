import type z from "zod";
import type {
    CommitSaleSchema,
    CreateCustomerSchema,
    CreateDraftSaleSchema,
    CreatePaymentSchema,
    CustomerDTOSchema,
    CustomerLedgerEntryDTOSchema,
    CustomerListQuerySchema,
    PaymentDTOSchema,
    SaleDeviceAuditDTOSchema,
    SaleDetailDTOSchema,
    SaleItemAddOnDTOSchema,
    SaleItemAddOnInputSchema,
    SaleItemDTOSchema,
    SaleItemInputSchema,
    SaleSummaryDTOSchema,
    SalesListQuerySchema,
    UpdateCustomerSchema,
    UpdateDraftSaleSchema,
    VoidSaleSchema,
} from "./billing.schema";

export type CustomerDTO = z.infer<typeof CustomerDTOSchema>;
export type SaleItemAddOnDTO = z.infer<typeof SaleItemAddOnDTOSchema>;
export type SaleItemDTO = z.infer<typeof SaleItemDTOSchema>;
export type PaymentDTO = z.infer<typeof PaymentDTOSchema>;
export type CustomerLedgerEntryDTO = z.infer<typeof CustomerLedgerEntryDTOSchema>;
export type SaleDeviceAuditDTO = z.infer<typeof SaleDeviceAuditDTOSchema>;
export type SaleSummaryDTO = z.infer<typeof SaleSummaryDTOSchema>;
export type SaleDetailDTO = z.infer<typeof SaleDetailDTOSchema>;

export type SaleStatus = SaleSummaryDTO["status"];
export type PaymentStatus = SaleSummaryDTO["paymentStatus"];
export type PaymentMethod = PaymentDTO["method"];
export type CustomerLedgerEntryType = CustomerLedgerEntryDTO["entryType"];

export type CreateCustomerJSON = z.infer<typeof CreateCustomerSchema>;
export type CreateCustomerSVC = CreateCustomerJSON;
export type CreateCustomerREPO = Pick<
    CustomerDTO,
    "id" | "organizationId" | "name" | "balance" | "isActive" | "createdBy"
> & {
    phone?: string | null;
    updatedBy?: string | null;
};

export type UpdateCustomerJSON = z.infer<typeof UpdateCustomerSchema>;
export type UpdateCustomerSVC = UpdateCustomerJSON;
export type UpdateCustomerREPO = Pick<
    CustomerDTO,
    "id" | "organizationId" | "name" | "isActive" | "updatedBy"
> & {
    phone?: string | null;
};

export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;
export type SalesListQuery = z.infer<typeof SalesListQuerySchema>;

export type SaleItemAddOnInput = z.infer<typeof SaleItemAddOnInputSchema>;
export type SaleItemInput = z.infer<typeof SaleItemInputSchema>;
export type CreateDraftSaleJSON = z.infer<typeof CreateDraftSaleSchema>;
export type CreateDraftSaleSVC = CreateDraftSaleJSON;
export type UpdateDraftSaleJSON = z.infer<typeof UpdateDraftSaleSchema>;
export type UpdateDraftSaleSVC = UpdateDraftSaleJSON;
export type CommitSaleJSON = z.infer<typeof CommitSaleSchema>;
export type CommitSaleSVC = CommitSaleJSON;
export type CreatePaymentJSON = z.infer<typeof CreatePaymentSchema>;
export type CreatePaymentSVC = CreatePaymentJSON;
export type VoidSaleJSON = z.infer<typeof VoidSaleSchema>;
export type VoidSaleSVC = VoidSaleJSON;

export type CreateSaleREPO = Pick<
    SaleSummaryDTO,
    | "id"
    | "organizationId"
    | "storeId"
    | "status"
    | "paymentStatus"
    | "subtotal"
    | "discountTotal"
    | "grandTotal"
> & {
    userId?: string | null;
    createdByDeviceId?: string | null;
    updatedByDeviceId?: string | null;
    customerId?: string | null;
    notes?: string | null;
    committedAt?: string | Date | null;
    saleNumber?: number | null;
    voidedAt?: string | Date | null;
    voidReason?: string | null;
};

export type UpdateSaleREPO = Pick<
    SaleSummaryDTO,
    "id" | "organizationId" | "storeId" | "status" | "paymentStatus" | "subtotal" | "discountTotal" | "grandTotal"
> & {
    updatedByDeviceId?: string | null;
    customerId?: string | null;
    notes?: string | null;
    committedAt?: string | Date | null;
    saleNumber?: number | null;
    voidedAt?: string | Date | null;
    voidReason?: string | null;
};

export type CreateSaleItemREPO = Pick<
    SaleItemDTO,
    | "id"
    | "organizationId"
    | "storeId"
    | "saleId"
    | "productId"
    | "quantity"
    | "configurationSignature"
    | "productNameSnapshot"
    | "unitPriceSnapshot"
    | "discountAmount"
    | "lineSubtotal"
    | "lineTotal"
>;

export type CreateSaleItemAddOnREPO = Pick<
    SaleItemAddOnDTO,
    | "id"
    | "organizationId"
    | "storeId"
    | "saleId"
    | "saleItemId"
    | "addOnId"
    | "quantityPerParent"
    | "totalQuantity"
    | "addOnNameSnapshot"
    | "unitPriceSnapshot"
    | "unitDiscountSnapshot"
    | "discountAmount"
    | "lineSubtotal"
    | "lineTotal"
>;

export type CreatePaymentREPO = Pick<
    PaymentDTO,
    "id" | "organizationId" | "storeId" | "saleId" | "amount" | "method"
> & {
    collectedBy?: string | null;
    referenceNumber?: string | null;
    notes?: string | null;
    collectedAt?: string | Date;
};

export type CreateCustomerLedgerEntryREPO = Pick<
    CustomerLedgerEntryDTO,
    "id" | "organizationId" | "customerId" | "entryType" | "amount" | "balanceAfter"
> & {
    saleId?: string | null;
    paymentId?: string | null;
    notes?: string | null;
};

export type CustomersListResponse = {
    customers: CustomerDTO[];
};

export type CustomerResponse = {
    customer: CustomerDTO;
};

export type CustomerLedgerResponse = {
    customer: CustomerDTO;
    ledger: CustomerLedgerEntryDTO[];
};

export type SalesListResponse = {
    sales: SaleSummaryDTO[];
};

export type SaleResponse = {
    sale: SaleDetailDTO;
};

export type PaymentResponse = {
    payment: PaymentDTO;
    sale: SaleDetailDTO;
};
