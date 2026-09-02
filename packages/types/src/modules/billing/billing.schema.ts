import { z } from "zod";
import { dtoDateSchema, phoneSchema } from "../../common";
import { defaultSellingQuantitySchema } from "../catalog/catalog.schema";

export const SaleNumberResetPeriodSchema = z.enum([
  "never",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
  "financial_yearly",
]);

export const TokenNumberResetPeriodSchema = SaleNumberResetPeriodSchema;
export const KotNumberResetPeriodSchema = SaleNumberResetPeriodSchema;

export const SaleNumberSettingsDTOSchema = z.object({
  storeId: z.uuid("Invalid store id"),
  organizationId: z.uuid("Invalid organization id"),
  resetPeriod: z.literal("financial_yearly"),
  timezone: z.string().min(1).max(64),
  tokenNumberEnabled: z.literal(true),
  tokenNumberResetPeriod: z.literal("daily"),
  kotNumberResetPeriod: z.literal("daily"),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

/** Bill / token / KOT reset rules are fixed platform-wide; no Store customization. */
export const UpdateSaleNumberSettingsSchema = z.object({}).strict();

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(255, "Name must be at most 255 characters");

const soldProductNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(320, "Name must be at most 320 characters");

const optionalPhoneSchema = z
  .union([z.literal(""), phoneSchema])
  .nullable()
  .optional();

const optionalNotesSchema = z
  .union([
    z.literal(""),
    z.string().trim().max(2000, "Notes must be at most 2000 characters"),
  ])
  .nullable()
  .optional();

const moneySchema = z
  .number({ error: "Amount is required" })
  .min(0, "Amount must be 0 or more");

const positiveMoneySchema = z
  .number({ error: "Amount is required" })
  .gt(0, "Amount must be greater than 0");

const quantitySchema = z
  .number({ error: "Quantity is required" })
  .int("Quantity must be a whole number")
  .gt(0, "Quantity must be greater than 0");

const positiveIntLimitSchema = z.coerce
  .number({ error: "Limit must be a number" })
  .int("Limit must be a whole number")
  .min(1, "Limit must be at least 1")
  .max(100, "Limit must be at most 100");

export const SaleServiceModeSchema = z.enum(["dine_in", "pick_up"]);

export const SaleStatusSchema = z.enum(["draft", "completed", "voided"]);
export const PaymentStatusSchema = z.enum(["pending", "partial", "paid"]);
export const PaymentMethodSchema = z.enum([
  "cash",
  "upi",
  "card",
  "bank_transfer",
  "other",
]);
export const SalesSortSchema = z.enum([
  "newest",
  "oldest",
  "highest",
  "lowest",
]);

export const SalesPaymentMethodsQuerySchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }

    return value;
  },
  z.array(PaymentMethodSchema).optional(),
);
export const CustomerLedgerEntryTypeSchema = z.enum([
  "sale",
  "payment",
  "void",
  "adjustment",
]);
export const SaleDeviceAuditDTOSchema = z.object({
  id: z.uuid("Invalid device id"),
  name: nameSchema,
});

export const CustomerDTOSchema = z.object({
  id: z.uuid("Invalid customer id"),
  organizationId: z.uuid("Invalid organization id"),
  name: nameSchema,
  phone: phoneSchema.nullable().optional(),
  balance: moneySchema,
  isActive: z.boolean(),
  marketingOptedOut: z.boolean().default(false),
  marketingOptedIn: z.boolean().default(false),
  marketingOptedInAt: dtoDateSchema.nullable().optional().default(null),
  marketingOptInSource: z.string().trim().min(1).max(32).nullable().optional().default(null),
  // Utility messages (bills and due reminders) are enabled for customers by default.
  // An explicit utility opt-out is still represented as false by the API.
  utilityOptedIn: z.boolean().default(true),
  utilityOptedInAt: dtoDateSchema.nullable().optional().default(null),
  utilityOptInSource: z.string().trim().min(1).max(32).nullable().optional().default(null),
  whatsappSuppressed: z.boolean().default(false),
  whatsappSuppressedAt: dtoDateSchema.nullable().optional().default(null),
  whatsappSuppressionReason: z.string().trim().min(1).max(1000).nullable().optional().default(null),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CustomerSummaryDTOSchema = CustomerDTOSchema.pick({
  id: true,
  name: true,
  phone: true,
  balance: true,
  isActive: true,
});

export const SaleItemAddOnDTOSchema = z.object({
  id: z.uuid("Invalid sale item add-on id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  saleId: z.uuid("Invalid sale id"),
  saleItemId: z.uuid("Invalid sale item id"),
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

export const SaleItemBundleComponentAddOnDTOSchema = z.object({
  id: z.uuid("Invalid sale item bundle component add-on id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  saleId: z.uuid("Invalid sale id"),
  saleItemId: z.uuid("Invalid sale item id"),
  saleItemBundleComponentId: z.uuid("Invalid sale item bundle component id"),
  addOnId: z.uuid("Invalid add-on id"),
  quantityPerComponent: quantitySchema,
  totalQuantity: quantitySchema,
  addOnNameSnapshot: nameSchema,
  unitPriceSnapshot: moneySchema,
  unitDiscountSnapshot: moneySchema,
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const SaleItemBundleComponentDTOSchema = z.object({
  id: z.uuid("Invalid sale item bundle component id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  saleId: z.uuid("Invalid sale id"),
  saleItemId: z.uuid("Invalid sale item id"),
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
  addOns: z.array(SaleItemBundleComponentAddOnDTOSchema).default([]),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const SaleItemDTOSchema = z.object({
  id: z.uuid("Invalid sale item id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  saleId: z.uuid("Invalid sale id"),
  productId: z.uuid("Invalid product id"),
  quantity: quantitySchema,
  configurationSignature: z.string(),
  soldQuantity: defaultSellingQuantitySchema,
  unitId: z.uuid("Invalid unit id"),
  unitLabelSnapshot: z.string().min(1).max(32),
  productNameSnapshot: soldProductNameSchema,
  unitPriceSnapshot: moneySchema,
  discountAmount: moneySchema,
  lineSubtotal: moneySchema,
  lineTotal: moneySchema,
  addOns: z.array(SaleItemAddOnDTOSchema).default([]),
  bundleComponents: z.array(SaleItemBundleComponentDTOSchema).default([]),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const PaymentDTOSchema = z.object({
  id: z.uuid("Invalid payment id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  saleId: z.uuid("Invalid sale id"),
  collectedBy: z.uuid("Invalid collector id").nullable().optional(),
  amount: positiveMoneySchema,
  method: PaymentMethodSchema,
  referenceNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  collectedAt: dtoDateSchema,
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CustomerLedgerEntryDTOSchema = z.object({
  id: z.uuid("Invalid ledger entry id"),
  organizationId: z.uuid("Invalid organization id"),
  customerId: z.uuid("Invalid customer id"),
  saleId: z.uuid("Invalid sale id").nullable().optional(),
  paymentId: z.uuid("Invalid payment id").nullable().optional(),
  entryType: CustomerLedgerEntryTypeSchema,
  amount: z.number(),
  balanceAfter: moneySchema,
  notes: z.string().nullable().optional(),
  createdAt: dtoDateSchema,
});

export const SaleSummaryDTOSchema = z.object({
  id: z.uuid("Invalid sale id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  saleNumber: z.string().nullable().optional(),
  saleSequenceNumber: z.number().int().nullable().optional(),
  salePeriodKey: z.string().nullable().optional(),
  tokenNumber: z.string().nullable().optional(),
  tokenSequenceNumber: z.number().int().nullable().optional(),
  tokenPeriodKey: z.string().nullable().optional(),
  kotNumbers: z.array(z.string().min(1)).optional(),
  customerId: z.uuid("Invalid customer id").nullable().optional(),
  serviceTableId: z.uuid("Invalid service table id").nullable().optional(),
  serviceTableLabel: z.string().nullable().optional(),
  serviceMode: SaleServiceModeSchema,
  customerNameSnapshot: nameSchema.nullable().optional(),
  customerPhoneSnapshot: z.string().nullable().optional(),
  userId: z.uuid("Invalid user id").nullable().optional(),
  createdByDeviceId: z.uuid("Invalid creator device id").nullable().optional(),
  updatedByDeviceId: z.uuid("Invalid updater device id").nullable().optional(),
  status: SaleStatusSchema,
  paymentStatus: PaymentStatusSchema,
  subtotal: moneySchema,
  discountTotal: moneySchema,
  grandTotal: moneySchema,
  paidTotal: moneySchema,
  dueTotal: moneySchema,
  notes: z.string().nullable().optional(),
  committedAt: dtoDateSchema.nullable().optional(),
  voidedAt: dtoDateSchema.nullable().optional(),
  voidReason: z.string().nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
  replacementOfSaleId: z.uuid("Invalid original sale id").nullable().optional(),
  replacementSaleId: z
    .uuid("Invalid replacement sale id")
    .nullable()
    .optional(),
  replacementOfSaleNumber: z.string().nullable().optional(),
  replacementSaleNumber: z.string().nullable().optional(),
  itemCount: z.number().int().min(0),
  itemsSummary: z.string().nullable().optional(),
  paymentMethods: z.string().nullable().optional(),
  customer: CustomerSummaryDTOSchema.nullable(),
  createdByDevice: SaleDeviceAuditDTOSchema.nullable().optional(),
  updatedByDevice: SaleDeviceAuditDTOSchema.nullable().optional(),
});

export const SaleKotHistoryEntryDTOSchema = z.object({
  kotNumber: z.string().min(1),
  fulfillmentType: SaleServiceModeSchema,
});

export const SaleDetailDTOSchema = SaleSummaryDTOSchema.extend({
  items: z.array(SaleItemDTOSchema),
  payments: z.array(PaymentDTOSchema),
  orderDiscountAmount: moneySchema,
  kotHistory: z.array(SaleKotHistoryEntryDTOSchema).optional(),
});

export const CustomerDueSalesResponseSchema = z.object({
  customer: CustomerDTOSchema,
  sales: z.array(SaleSummaryDTOSchema),
});

export const CreateCustomerSchema = z.object({
  name: nameSchema,
  phone: optionalPhoneSchema,
  isActive: z.boolean().optional(),
});

export const UpdateCustomerSchema = z
  .object({
    name: nameSchema.optional(),
    phone: optionalPhoneSchema,
    isActive: z.boolean().optional(),
    marketingOptedOut: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.phone !== undefined ||
      value.isActive !== undefined ||
      value.marketingOptedOut !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const CustomerListStatusSchema = z.enum([
  "all",
  "active",
  "inactive",
  "due",
  "no_due",
]);
export const CustomerSortSchema = z.enum([
  "newest",
  "oldest",
  "name_asc",
  "name_desc",
  "highest_due",
  "lowest_due",
]);

export const CustomerListQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(255, "Search must be at most 255 characters")
    .optional(),
  status: CustomerListStatusSchema.optional(),
  sort: CustomerSortSchema.optional(),
  cursor: z.string().trim().max(2048, "Cursor is too long").optional(),
  limit: positiveIntLimitSchema.optional(),
});

export const SaleItemAddOnInputSchema = z.object({
  addOnId: z.uuid("Invalid add-on id"),
  quantity: quantitySchema,
});

export const ComboSelectionInputSchema = z.object({
  groupId: z.uuid("Invalid combo choice group id"),
  optionProductId: z.uuid("Invalid combo option product id"),
  quantity: quantitySchema,
  addOns: z.array(SaleItemAddOnInputSchema).optional().default([]),
});

export const SaleItemInputSchema = z.object({
  productId: z.uuid("Invalid product id"),
  quantity: quantitySchema,
  soldQuantity: defaultSellingQuantitySchema.optional(),
  addOns: z.array(SaleItemAddOnInputSchema).optional().default([]),
  comboSelections: z.array(ComboSelectionInputSchema).optional(),
});

const saleKotGenerationSchema = {
  generateKot: z.boolean().optional().default(false),
  kotBatchItems: z.array(SaleItemInputSchema).optional(),
  kotRequestId: z.uuid("Invalid KOT generation request id").optional(),
};

export const CreateDraftSaleSchema = z.object({
  customerId: z
    .union([z.literal(""), z.uuid("Invalid customer id")])
    .nullable()
    .optional(),
  orderDiscountAmount: moneySchema.optional(),
  notes: optionalNotesSchema,
  serviceMode: SaleServiceModeSchema.default("dine_in"),
  items: z.array(SaleItemInputSchema).optional().default([]),
  ...saleKotGenerationSchema,
});

export const UpdateDraftSaleSchema = z
  .object({
    customerId: z
      .union([z.literal(""), z.uuid("Invalid customer id")])
      .nullable()
      .optional(),
    orderDiscountAmount: moneySchema.optional(),
    notes: optionalNotesSchema,
    serviceMode: SaleServiceModeSchema.optional(),
    items: z.array(SaleItemInputSchema).optional(),
    generateKot: z.boolean().optional(),
    kotBatchItems: z.array(SaleItemInputSchema).optional(),
    kotRequestId: z.uuid("Invalid KOT generation request id").optional(),
  })
  .refine(
    (value) =>
      value.customerId !== undefined ||
      value.orderDiscountAmount !== undefined ||
      value.notes !== undefined ||
      value.serviceMode !== undefined ||
      value.items !== undefined ||
      value.generateKot !== undefined ||
      value.kotBatchItems !== undefined ||
      value.kotRequestId !== undefined,
    { message: "At least one field is required" },
  );

export const CreatePaymentSchema = z.object({
  amount: positiveMoneySchema,
  method: PaymentMethodSchema,
  referenceNumber: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .max(255, "Reference number must be at most 255 characters"),
    ])
    .nullable()
    .optional(),
  notes: optionalNotesSchema,
});

export const CommitSaleSchema = z.object({
  customerId: z
    .union([z.literal(""), z.uuid("Invalid customer id")])
    .nullable()
    .optional(),
  orderDiscountAmount: moneySchema.optional(),
  notes: optionalNotesSchema,
  serviceMode: SaleServiceModeSchema.optional(),
  items: z
    .array(SaleItemInputSchema)
    .min(1, "At least one item is required")
    .optional(),
  payments: z.array(CreatePaymentSchema).optional().default([]),
  ...saleKotGenerationSchema,
});

export const CompleteSaleSchema = z.object({
  requestId: z.uuid("Invalid completion request id"),
  customerId: z
    .union([z.literal(""), z.uuid("Invalid customer id")])
    .nullable()
    .optional(),
  orderDiscountAmount: moneySchema.optional(),
  notes: optionalNotesSchema,
  serviceMode: SaleServiceModeSchema,
  items: z.array(SaleItemInputSchema).min(1, "At least one item is required"),
  payments: z.array(CreatePaymentSchema).optional().default([]),
  ...saleKotGenerationSchema,
});

export const ReplaceSaleSchema = CompleteSaleSchema.extend({
  replacementReason: z
    .string()
    .trim()
    .min(1, "Replacement reason is required")
    .max(1000),
});

export const VoidSaleSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(1000, "Reason must be at most 1000 characters"),
});

export const SalesListQuerySchema = z.object({
  status: SaleStatusSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  paymentMethods: SalesPaymentMethodsQuerySchema,
  customerId: z.uuid("Invalid customer id").optional(),
  search: z
    .string()
    .trim()
    .max(255, "Search must be at most 255 characters")
    .optional(),
  createdFrom: z.iso.datetime().optional(),
  createdTo: z.iso.datetime().optional(),
  sort: SalesSortSchema.optional(),
  cursor: z.string().trim().max(2048, "Cursor is too long").optional(),
  limit: positiveIntLimitSchema.optional(),
});

export const SalesListSummarySchema = z.object({
  completedCount: z.number().int().min(0),
  salesTotal: moneySchema,
  collectedTotal: moneySchema,
  dueTotal: moneySchema,
});

export const ProductSalesSummaryQuerySchema = z.object({
  createdFrom: z.iso.datetime().optional(),
  createdTo: z.iso.datetime().optional(),
});

export const ProductSalesSummaryAdminQuerySchema =
  ProductSalesSummaryQuerySchema.extend({
    storeId: z.uuid("Invalid store id").optional(),
  });

export const ProductSalesSummaryDTOSchema = z.object({
  productId: z.uuid("Invalid product id"),
  productName: nameSchema,
  categoryName: nameSchema.nullable(),
  quantitySold: z.number().int().min(0),
});

export const ProductSalesSummaryResponseSchema = z.object({
  products: z.array(ProductSalesSummaryDTOSchema),
});

export const SalesListPageInfoSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const CustomerListPageInfoSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  totalCount: z.number().int().min(0),
});

export const ParentScopedAddOnSalesRollupDTOSchema = z.object({
  productId: z.uuid("Invalid product id"),
  productNameSnapshot: nameSchema,
  addOnId: z.uuid("Invalid add-on id"),
  addOnNameSnapshot: nameSchema,
  totalQuantity: z.number().int().min(0),
  lineSubtotal: moneySchema,
  discountAmount: moneySchema,
  lineTotal: moneySchema,
});

export const AddOnScopedSalesRollupDTOSchema = z.object({
  addOnId: z.uuid("Invalid add-on id"),
  addOnNameSnapshot: nameSchema,
  totalQuantity: z.number().int().min(0),
  lineSubtotal: moneySchema,
  discountAmount: moneySchema,
  lineTotal: moneySchema,
  parentProductCount: z.number().int().min(0),
});

export const AddOnSalesRollupsResponseSchema = z.object({
  parentScoped: z.array(ParentScopedAddOnSalesRollupDTOSchema),
  addOnScoped: z.array(AddOnScopedSalesRollupDTOSchema),
});

export const BundleCommercialSalesRollupDTOSchema = z.object({
  bundleProductId: z.uuid("Invalid bundle product id"),
  bundleProductNameSnapshot: nameSchema,
  saleCount: z.number().int().min(0),
  totalQuantity: z.number().int().min(0),
  lineSubtotal: moneySchema,
  discountAmount: moneySchema,
  lineTotal: moneySchema,
});

export const BundleComponentProductUsageRollupDTOSchema = z.object({
  bundleProductId: z.uuid("Invalid bundle product id"),
  bundleProductNameSnapshot: nameSchema,
  componentProductId: z.uuid("Invalid component product id"),
  componentProductNameSnapshot: nameSchema,
  saleCount: z.number().int().min(0),
  totalQuantity: z.number().int().min(0),
});

export const BundleComponentAddOnUsageRollupDTOSchema = z.object({
  bundleProductId: z.uuid("Invalid bundle product id"),
  bundleProductNameSnapshot: nameSchema,
  componentProductId: z.uuid("Invalid component product id"),
  componentProductNameSnapshot: nameSchema,
  addOnId: z.uuid("Invalid add-on id"),
  addOnNameSnapshot: nameSchema,
  saleCount: z.number().int().min(0),
  totalQuantity: z.number().int().min(0),
});

export const BundleSalesRollupsResponseSchema = z.object({
  commercial: z.array(BundleCommercialSalesRollupDTOSchema),
  componentProductUsage: z.array(BundleComponentProductUsageRollupDTOSchema),
  componentAddOnUsage: z.array(BundleComponentAddOnUsageRollupDTOSchema),
});
