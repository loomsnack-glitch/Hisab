import { z } from "zod";
import { PRODUCT_CONSTANTS } from "./product.constant";

export const ProductDTOSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  storeId: z.uuid().nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  barcode: z.string().min(1).max(PRODUCT_CONSTANTS.MAX_BARCODE_LENGTH),
  sku: z.string().max(PRODUCT_CONSTANTS.MAX_SKU_LENGTH).nullable().optional(),
  name: z.string().min(1).max(PRODUCT_CONSTANTS.MAX_NAME_LENGTH),
  description: z.string().nullable().optional(),
  price: z.number().nonnegative(),
  costPrice: z.number().nonnegative().nullable().optional(),
  taxRate: z.number().min(0).max(PRODUCT_CONSTANTS.MAX_TAX_RATE).default(0),
  currentStock: z.number().default(0),
  lowStockThreshold: z.number().default(0),
  isActive: z.boolean().default(true),
  syncId: z.uuid().optional(),
  syncVersion: z.number().int().default(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateProductDTOSchema = ProductDTOSchema.omit({
  id: true,
  currentStock: true,
  isActive: true,
  syncId: true,
  syncVersion: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateProductDTOSchema = ProductDTOSchema.omit({
  id: true,
  organizationId: true,
  currentStock: true,
  syncId: true,
  syncVersion: true,
  createdAt: true,
  updatedAt: true,
}).partial();
