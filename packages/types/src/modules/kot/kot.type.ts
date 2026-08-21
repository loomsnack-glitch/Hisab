import type z from "zod";
import type { SaleDetailDTO } from "../billing";
import type {
  CreateParcelKotSchema,
  KotDTOSchema,
  KotItemAddOnDTOSchema,
  KotItemBundleComponentAddOnDTOSchema,
  KotItemBundleComponentDTOSchema,
  KotItemDTOSchema,
  KotTypeSchema,
} from "./kot.schema";

export type KotType = z.infer<typeof KotTypeSchema>;
export type KotItemAddOnDTO = z.infer<typeof KotItemAddOnDTOSchema>;
export type KotItemBundleComponentAddOnDTO = z.infer<
  typeof KotItemBundleComponentAddOnDTOSchema
>;
export type KotItemBundleComponentDTO = z.infer<
  typeof KotItemBundleComponentDTOSchema
>;
export type KotItemDTO = z.infer<typeof KotItemDTOSchema>;
export type KotDTO = z.infer<typeof KotDTOSchema>;

export type CreateParcelKotJSON = z.infer<typeof CreateParcelKotSchema>;
export type CreateParcelKotSVC = CreateParcelKotJSON;

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
  | "kotNumber"
  | "kotSequenceNumber"
  | "kotPeriodKey"
> & {
  createdByDeviceId?: string | null;
  updatedByDeviceId?: string | null;
  items: CreateKotItemREPO[];
};

export type ParcelKotResponse = {
  kot: KotDTO;
  sale: SaleDetailDTO;
};
