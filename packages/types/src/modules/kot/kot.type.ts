import type z from "zod";
import type {
  CheckoutTableOrderSchema,
  CreateTableKotSchema,
  KitchenKotDTOSchema,
  KitchenKotsListResponseSchema,
  KotDTOSchema,
  KotItemAddOnDTOSchema,
  KotItemBundleComponentAddOnDTOSchema,
  KotItemBundleComponentDTOSchema,
  KotItemDTOSchema,
  KotFulfillmentTypeSchema,
  KotTypeSchema,
  TableOrderDTOSchema,
  TableOrderStatusSchema,
  UpdateTableKotSchema,
  UpdateStandaloneKotSchema,
  UpdateTableOrderSchema,
} from "./kot.schema";

export type KotType = z.infer<typeof KotTypeSchema>;
export type KotFulfillmentType = z.infer<typeof KotFulfillmentTypeSchema>;
export type TableOrderStatus = z.infer<typeof TableOrderStatusSchema>;
export type TableOrderDTO = z.infer<typeof TableOrderDTOSchema>;
export type KotItemAddOnDTO = z.infer<typeof KotItemAddOnDTOSchema>;
export type KotItemBundleComponentAddOnDTO = z.infer<
  typeof KotItemBundleComponentAddOnDTOSchema
>;
export type KotItemBundleComponentDTO = z.infer<
  typeof KotItemBundleComponentDTOSchema
>;
export type KotItemDTO = z.infer<typeof KotItemDTOSchema>;
export type KotDTO = z.infer<typeof KotDTOSchema>;
export type KitchenKotDTO = z.infer<typeof KitchenKotDTOSchema>;
export type KitchenKotsListResponse = z.infer<
  typeof KitchenKotsListResponseSchema
>;

export type CreateKotItemAddOnREPO = Pick<
  KotItemAddOnDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "kotId"
  | "kotItemId"
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

export type CreateKotItemBundleComponentAddOnREPO = Pick<
  KotItemBundleComponentAddOnDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "kotId"
  | "kotItemId"
  | "kotItemBundleComponentId"
  | "addOnId"
  | "quantityPerComponent"
  | "totalQuantity"
  | "addOnNameSnapshot"
  | "unitPriceSnapshot"
  | "unitDiscountSnapshot"
>;

export type CreateKotItemBundleComponentREPO = Pick<
  KotItemBundleComponentDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "kotId"
  | "kotItemId"
  | "choiceGroupId"
  | "componentProductId"
  | "quantityPerBundle"
  | "totalQuantity"
  | "productNameSnapshot"
  | "unitPriceSnapshot"
  | "unitDiscountSnapshot"
  | "priceAdjustmentSnapshot"
> & {
  addOns: CreateKotItemBundleComponentAddOnREPO[];
};

export type CreateKotItemREPO = Pick<
  KotItemDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "kotId"
  | "productId"
  | "quantity"
  | "configurationSignature"
  | "productNameSnapshot"
  | "unitPriceSnapshot"
  | "discountAmount"
  | "lineSubtotal"
  | "lineTotal"
> & {
  addOns: CreateKotItemAddOnREPO[];
  bundleComponents: CreateKotItemBundleComponentREPO[];
};

export type CreateKotREPO = Pick<
  KotDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "saleId"
  | "kotType"
  | "fulfillmentType"
  | "saleBatchSequence"
  | "generationRequestId"
  | "kotNumber"
  | "kotSequenceNumber"
  | "kotPeriodKey"
> & {
  tableOrderId?: string | null;
  createdByDeviceId?: string | null;
  updatedByDeviceId?: string | null;
  items: CreateKotItemREPO[];
};

export type CreateTableOrderREPO = Pick<
  TableOrderDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "serviceTableId"
  | "customerId"
  | "status"
> & {
  notes?: string | null;
  createdByDeviceId?: string | null;
  updatedByDeviceId?: string | null;
};

export type CreateTableKotJSON = z.infer<typeof CreateTableKotSchema>;
export type CreateTableKotSVC = CreateTableKotJSON;
export type UpdateTableKotJSON = z.infer<typeof UpdateTableKotSchema>;
export type UpdateTableKotSVC = UpdateTableKotJSON;
export type UpdateStandaloneKotJSON = z.infer<typeof UpdateStandaloneKotSchema>;
export type UpdateStandaloneKotSVC = UpdateStandaloneKotJSON;
export type UpdateTableOrderJSON = z.infer<typeof UpdateTableOrderSchema>;
export type UpdateTableOrderSVC = UpdateTableOrderJSON;
export type CheckoutTableOrderJSON = z.infer<typeof CheckoutTableOrderSchema>;
export type CheckoutTableOrderSVC = CheckoutTableOrderJSON;

export type TableKotResponse = {
  kot: KotDTO;
  tableOrder: TableOrderDTO;
};
