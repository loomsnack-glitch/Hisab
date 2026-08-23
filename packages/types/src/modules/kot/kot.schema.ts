import { z } from "zod";
import { dtoDateSchema } from "../../common";
import {
  CreatePaymentSchema,
  SaleItemInputSchema,
  UpdateDraftSaleSchema,
} from "../billing/billing.schema";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(255, "Name must be at most 255 characters");

const moneySchema = z
  .number({ error: "Amount is required" })
  .min(0, "Amount must be 0 or more");

const quantitySchema = z
  .number({ error: "Quantity is required" })
  .int("Quantity must be a whole number")
  .gt(0, "Quantity must be greater than 0");

const optionalNotesSchema = z
  .union([
    z.literal(""),
    z.string().trim().max(2000, "Notes must be at most 2000 characters"),
  ])
  .nullable()
  .optional();

export const KotTypeSchema = z.enum(["table", "parcel"]);

export const KotFulfillmentTypeSchema = z.enum(["dine_in", "pick_up"]);

export const KotItemAddOnDTOSchema = z.object({
  id: z.uuid("Invalid KOT item add-on id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  kotId: z.uuid("Invalid KOT id"),
  kotItemId: z.uuid("Invalid KOT item id"),
  addOnId: z.uuid("Invalid add-on id"),
  quantityPerParent: quantitySchema,
  totalQuantity: quantitySchema,
  addOnNameSnapshot: nameSchema,
  unitPriceSnapshot: moneySchema,
  unitDiscountSnapshot: moneySchema,
  discountAmount: moneySchema,
  lineSubtotal: moneySchema,
  lineTotal: moneySchema,
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});
export const KotItemBundleComponentAddOnDTOSchema = z.object({
  id: z.uuid("Invalid KOT item bundle component add-on id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  kotId: z.uuid("Invalid KOT id"),
  kotItemId: z.uuid("Invalid KOT item id"),
  kotItemBundleComponentId: z.uuid("Invalid KOT item bundle component id"),
  addOnId: z.uuid("Invalid add-on id"),
  quantityPerComponent: quantitySchema,
  totalQuantity: quantitySchema,
  addOnNameSnapshot: nameSchema,
  unitPriceSnapshot: moneySchema,
  unitDiscountSnapshot: moneySchema,
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const KotItemBundleComponentDTOSchema = z.object({
  id: z.uuid("Invalid KOT item bundle component id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  kotId: z.uuid("Invalid KOT id"),
  kotItemId: z.uuid("Invalid KOT item id"),
  choiceGroupId: z
    .uuid("Invalid combo choice group id")
    .nullable()
    .optional()
    .default(null),
  componentProductId: z.uuid("Invalid component product id"),
  quantityPerBundle: quantitySchema,
  totalQuantity: quantitySchema,
  productNameSnapshot: nameSchema,
  unitPriceSnapshot: moneySchema,
  unitDiscountSnapshot: moneySchema,
  priceAdjustmentSnapshot: z.number().finite().default(0),
  addOns: z.array(KotItemBundleComponentAddOnDTOSchema).default([]),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const KotItemDTOSchema = z.object({
  id: z.uuid("Invalid KOT item id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  kotId: z.uuid("Invalid KOT id"),
  productId: z.uuid("Invalid product id"),
  quantity: quantitySchema,
  configurationSignature: z.string(),
  productNameSnapshot: nameSchema,
  unitPriceSnapshot: moneySchema,
  discountAmount: moneySchema,
  lineSubtotal: moneySchema,
  lineTotal: moneySchema,
  addOns: z.array(KotItemAddOnDTOSchema).default([]),
  bundleComponents: z.array(KotItemBundleComponentDTOSchema).default([]),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const KotDTOSchema = z.object({
  id: z.uuid("Invalid KOT id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  saleId: z.uuid("Invalid sale id").nullable(),
  tableOrderId: z
    .uuid("Invalid table order id")
    .nullable()
    .optional()
    .default(null),
  kotType: KotTypeSchema,
  fulfillmentType: KotFulfillmentTypeSchema,
  saleBatchSequence: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .default(null),
  generationRequestId: z
    .uuid("Invalid generation request id")
    .nullable()
    .optional()
    .default(null),
  kotNumber: z.string().min(1).max(64),
  kotSequenceNumber: z.number().int().positive(),
  kotPeriodKey: z.string().min(1).max(32),
  kitchenCompletedAt: dtoDateSchema.nullable().optional().default(null),
  createdByDeviceId: z.uuid("Invalid creator device id").nullable().optional(),
  updatedByDeviceId: z.uuid("Invalid updater device id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
  items: z.array(KotItemDTOSchema).default([]),
});

export const KitchenKotItemSummarySchema = z.object({
  productNameSnapshot: nameSchema,
  quantity: quantitySchema,
});

export const KitchenKotDTOSchema = z.object({
  id: z.uuid("Invalid KOT id"),
  kotNumber: z.string().min(1).max(64),
  fulfillmentType: KotFulfillmentTypeSchema,
  tableLabel: z.string().nullable(),
  items: z.array(KitchenKotItemSummarySchema).default([]),
});

export const KitchenKotsListResponseSchema = z.object({
  kots: z.array(KitchenKotDTOSchema).default([]),
});

export const TableOrderStatusSchema = z.enum([
  "active",
  "checked_out",
  "discarded",
]);

export const TableOrderDTOSchema = z.object({
  id: z.uuid("Invalid table order id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  serviceTableId: z.uuid("Invalid service table id"),
  customerId: z.uuid("Invalid customer id").nullable(),
  saleId: z.uuid("Invalid sale id").nullable(),
  status: TableOrderStatusSchema,
  notes: z.string().nullable().optional(),
  remainingSubtotal: moneySchema.optional().default(0),
  remainingDiscountTotal: moneySchema.optional().default(0),
  remainingGrandTotal: moneySchema.optional().default(0),
  createdByDeviceId: z.uuid("Invalid creator device id").nullable().optional(),
  updatedByDeviceId: z.uuid("Invalid updater device id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
  kots: z.array(KotDTOSchema).default([]),
});

export const CreateTableKotSchema = z.object({
  requestId: z.uuid("Invalid KOT generation request id"),
  items: z.array(SaleItemInputSchema).min(1, "At least one item is required"),
  fulfillmentType: KotFulfillmentTypeSchema.optional().default("dine_in"),
  customerId: z
    .union([z.literal(""), z.uuid("Invalid customer id")])
    .nullable()
    .optional(),
  notes: optionalNotesSchema,
});

export const UpdateTableKotSchema = z.object({
  items: z.array(SaleItemInputSchema),
});

export const UpdateStandaloneKotSchema = z.object({
  items: z
    .array(SaleItemInputSchema)
    .min(1, "At least one KOT item is required"),
  sale: UpdateDraftSaleSchema,
});

export const UpdateTableOrderSchema = z.object({
  customerId: z
    .union([z.literal(""), z.uuid("Invalid customer id")])
    .nullable()
    .optional(),
  notes: optionalNotesSchema,
});

export const CheckoutTableOrderSchema = z.object({
  requestId: z.uuid("Invalid completion request id"),
  customerId: z
    .union([z.literal(""), z.uuid("Invalid customer id")])
    .nullable()
    .optional(),
  orderDiscountAmount: moneySchema.optional(),
  notes: optionalNotesSchema,
  payments: z.array(CreatePaymentSchema).optional().default([]),
});
