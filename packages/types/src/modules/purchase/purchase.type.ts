import type z from "zod";
import type {
    CreatePurchaseSchema,
    PurchaseDetailDTOSchema,
    PurchaseItemDTOSchema,
    PurchaseItemInputSchema,
    PurchaseListQuerySchema,
    PurchaseStatusSchema,
    PurchaseSummaryDTOSchema,
    UpdatePurchaseSchema,
    VoidPurchaseSchema,
} from "./purchase.schema";

export type PurchaseStatus = z.infer<typeof PurchaseStatusSchema>;
export type PurchaseItemInput = z.infer<typeof PurchaseItemInputSchema>;
export type PurchaseItemDTO = z.infer<typeof PurchaseItemDTOSchema>;
export type PurchaseSummaryDTO = z.infer<typeof PurchaseSummaryDTOSchema>;
export type PurchaseDetailDTO = z.infer<typeof PurchaseDetailDTOSchema>;
export type CreatePurchaseJSON = z.infer<typeof CreatePurchaseSchema>;
export type UpdatePurchaseJSON = z.infer<typeof UpdatePurchaseSchema>;
export type VoidPurchaseJSON = z.infer<typeof VoidPurchaseSchema>;
export type PurchaseListQuery = z.infer<typeof PurchaseListQuerySchema>;

export type PurchaseActor = {
    userId?: string | null;
    deviceId?: string | null;
};

export type CreatePurchaseREPO = {
    id: string;
    organizationId: string;
    storeId: string;
    purchaseDate: string;
    supplierName: string;
    invoiceNumber?: string | null;
    notes?: string | null;
    totalAmount: number;
    status: PurchaseStatus;
    createdByUserId?: string | null;
    createdByDeviceId?: string | null;
};

export type UpdatePurchaseREPO = {
    id: string;
    organizationId: string;
    storeId: string;
    purchaseDate: string;
    supplierName: string;
    invoiceNumber?: string | null;
    notes?: string | null;
    totalAmount: number;
    updatedByUserId?: string | null;
    updatedByDeviceId?: string | null;
};

export type CreatePurchaseItemREPO = {
    id: string;
    purchaseId: string;
    itemName: string;
    description?: string | null;
    quantity: number;
    rate: number;
    lineTotal: number;
};

export type PurchasesListResponse = { purchases: PurchaseSummaryDTO[] };
export type PurchaseResponse = { purchase: PurchaseDetailDTO };
export type PurchaseSummary = {
    today: { amount: number; count: number };
    thisWeek: { amount: number; count: number };
    thisMonth: { amount: number; count: number };
};
export type PurchaseSummaryResponse = { summary: PurchaseSummary };
