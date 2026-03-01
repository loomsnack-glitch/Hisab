import { z } from "zod";
import { SALE_ITEM_CONSTANTS } from "./sale-item.constant";

export const SaleItemDTOSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  storeId: z.uuid(),
  saleId: z.uuid(),
  productId: z.uuid().nullable().optional(),
  quantity: z.number().positive(),
  productNameSnapshot: z.string().min(1).max(SALE_ITEM_CONSTANTS.MAX_PRODUCT_NAME_LENGTH),
  priceSnapshot: z.number().nonnegative(),
  costPriceSnapshot: z.number().nonnegative(),
  taxRateSnapshot: z.number().min(0).max(100).default(0),
  discountAmount: z.number().nonnegative().default(0),
  lineTotal: z.number(),
  createdAt: z.coerce.date(),
});

export const CreateSaleItemDTOSchema = SaleItemDTOSchema.omit({
  id: true,
  createdAt: true,
});
