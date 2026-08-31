import type { z } from "zod";
import type {
  CreateDraftPurchaseSchema,
  PayableStatusSchema,
  PurchaseDTOSchema,
  PurchaseLifecycleSchema,
  PurchaseLineDTOSchema,
  PurchaseLineInputSchema,
  UpdateDraftPurchaseSchema,
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
  | "updatedBy"
>;

export type PurchasesListResponse = {
  purchases: PurchaseDTO[];
};

export type PurchaseResponse = {
  purchase: PurchaseDTO;
};
