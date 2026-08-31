import type { z } from "zod";
import type { VendorOutstandingDTO } from "../outgoing-payments/outgoing-payments.type";
import type {
  CreateDraftPurchaseSchema,
  PayableStatusSchema,
  PurchaseDTOSchema,
  PurchaseLifecycleSchema,
  PurchaseLineDTOSchema,
  PurchaseLineInputSchema,
  RecordPurchaseSchema,
  UpdateDraftPurchaseSchema,
  VoidPurchaseSchema,
} from "./purchases.schema";
export type PurchaseLifecycle = z.infer<typeof PurchaseLifecycleSchema>;
export type PayableStatus = z.infer<typeof PayableStatusSchema>;
export type PurchaseLineDTO = z.infer<typeof PurchaseLineDTOSchema>;
export type PurchaseDTO = z.infer<typeof PurchaseDTOSchema>;

export type PurchaseLineInputJSON = z.infer<typeof PurchaseLineInputSchema>;
export type CreateDraftPurchaseJSON = z.infer<typeof CreateDraftPurchaseSchema>;
export type CreateDraftPurchaseSVC = CreateDraftPurchaseJSON;
export type UpdateDraftPurchaseJSON = z.infer<typeof UpdateDraftPurchaseSchema>;
export type UpdateDraftPurchaseSVC = UpdateDraftPurchaseJSON;
export type RecordPurchaseJSON = z.infer<typeof RecordPurchaseSchema>;
export type RecordPurchaseSVC = RecordPurchaseJSON;
export type VoidPurchaseJSON = z.infer<typeof VoidPurchaseSchema>;
export type VoidPurchaseSVC = VoidPurchaseJSON;

export type CreatePurchaseLineREPO = Pick<
  PurchaseLineDTO,
  | "id"
  | "organizationId"
  | "purchaseId"
  | "vendorItemId"
  | "vendorItemName"
  | "unitId"
  | "unitLabel"
  | "quantity"
  | "agreedUnitPrice"
  | "lineTotal"
>;

export type CreatePurchaseREPO = Pick<
  PurchaseDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "vendorId"
  | "vendorName"
  | "lifecycle"
  | "payableStatus"
  | "effectiveDate"
  | "invoiceReference"
  | "notes"
  | "adjustment"
  | "linesTotal"
  | "total"
  | "paidTotal"
  | "dueAmount"
  | "recordedAt"
  | "createdBy"
> & {
  updatedBy?: string | null;
  voidedAt?: Date | string | null;
  voidReason?: string | null;
};

export type UpdatePurchaseREPO = Pick<
  PurchaseDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "vendorId"
  | "vendorName"
  | "lifecycle"
  | "payableStatus"
  | "effectiveDate"
  | "invoiceReference"
  | "notes"
  | "adjustment"
  | "linesTotal"
  | "total"
  | "paidTotal"
  | "dueAmount"
  | "recordedAt"
  | "voidedAt"
  | "voidReason"
  | "updatedBy"
>;

export type PurchasesListResponse = {
  purchases: PurchaseDTO[];
  vendorOutstanding: VendorOutstandingDTO[];
};

export type PurchaseResponse = {
  purchase: PurchaseDTO;
};
