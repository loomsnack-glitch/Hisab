import { z } from "zod";
import { dtoDateSchema } from "../../common";

export const SaleNumberResetPeriodSchema = z.enum([
    "never",
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "half_yearly",
    "yearly",
]);

export const SaleNumberSettingsDTOSchema = z.object({
    storeId: z.uuid("Invalid store id"),
    organizationId: z.uuid("Invalid organization id"),
    resetPeriod: SaleNumberResetPeriodSchema,
    timezone: z.string().min(1).max(64),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const UpdateSaleNumberSettingsSchema = z.object({
    resetPeriod: SaleNumberResetPeriodSchema,
});

const nameSchema = z.string().trim().min(1, "Name is required").max(255, "Name must be at most 255 characters");

const optionalPhoneSchema = z
    .union([z.literal(""), z.string().trim().max(20, "Phone must be at most 20 characters")])
    .nullable()
    .optional();

const optionalNotesSchema = z
    .union([z.literal(""), z.string().trim().max(2000, "Notes must be at most 2000 characters")])
    .nullable()
    .optional();

const moneySchema = z.number({ error: "Amount is required" }).min(0, "Amount must be 0 or more");

const positiveMoneySchema = z.number({ error: "Amount is required" }).gt(0, "Amount must be greater than 0");

const quantitySchema = z
    .number({ error: "Quantity is required" })
    .int("Quantity must be a whole number")
    .gt(0, "Quantity must be greater than 0");

const positiveIntLimitSchema = z.coerce
    .number({ error: "Limit must be a number" })
    .int("Limit must be a whole number")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must be at most 100");

export const SaleStatusSchema = z.enum(["draft", "completed", "voided"]);
export const PaymentStatusSchema = z.enum(["pending", "partial", "paid"]);
export const PaymentMethodSchema = z.enum(["cash", "upi", "card", "bank_transfer", "other"]);
export const SalesSortSchema = z.enum(["newest", "oldest", "highest", "lowest"]);
export const CustomerLedgerEntryTypeSchema = z.enum(["sale", "payment", "void", "adjustment"]);
export const SaleDeviceAuditDTOSchema = z.object({
    id: z.uuid("Invalid device id"),
    name: nameSchema,
});

export const CustomerDTOSchema = z.object({
    id: z.uuid("Invalid customer id"),
    organizationId: z.uuid("Invalid organization id"),
    name: nameSchema,
    phone: z.string().nullable().optional(),
    balance: moneySchema,
    isActive: z.boolean(),
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
    choiceGroupId: z.uuid("Invalid combo choice group id").nullable().optional().default(null),
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
    productNameSnapshot: nameSchema,
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
    customerId: z.uuid("Invalid customer id").nullable().optional(),
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
    replacementSaleId: z.uuid("Invalid replacement sale id").nullable().optional(),
    replacementOfSaleNumber: z.string().nullable().optional(),
    replacementSaleNumber: z.string().nullable().optional(),
    itemCount: z.number().int().min(0),
    itemsSummary: z.string().nullable().optional(),
    paymentMethods: z.string().nullable().optional(),
    customer: CustomerSummaryDTOSchema.nullable(),
    createdByDevice: SaleDeviceAuditDTOSchema.nullable().optional(),
    updatedByDevice: SaleDeviceAuditDTOSchema.nullable().optional(),
});

export const SaleDetailDTOSchema = SaleSummaryDTOSchema.extend({
    items: z.array(SaleItemDTOSchema),
    payments: z.array(PaymentDTOSchema),
    orderDiscountAmount: moneySchema,
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
    })
    .refine((value) => value.name !== undefined || value.phone !== undefined || value.isActive !== undefined, {
        message: "At least one field is required",
    });

export const CustomerListQuerySchema = z.object({
    search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
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
    addOns: z.array(SaleItemAddOnInputSchema).optional().default([]),
    comboSelections: z.array(ComboSelectionInputSchema).optional(),
});

export const CreateDraftSaleSchema = z.object({
    customerId: z
        .union([z.literal(""), z.uuid("Invalid customer id")])
        .nullable()
        .optional(),
    orderDiscountAmount: moneySchema.optional(),
    notes: optionalNotesSchema,
    items: z.array(SaleItemInputSchema).optional().default([]),
});

export const UpdateDraftSaleSchema = z
    .object({
        customerId: z
            .union([z.literal(""), z.uuid("Invalid customer id")])
            .nullable()
            .optional(),
        orderDiscountAmount: moneySchema.optional(),
        notes: optionalNotesSchema,
        items: z.array(SaleItemInputSchema).optional(),
    })
    .refine(
        (value) =>
            value.customerId !== undefined ||
            value.orderDiscountAmount !== undefined ||
            value.notes !== undefined ||
            value.items !== undefined,
        { message: "At least one field is required" },
    );

export const CreatePaymentSchema = z.object({
    amount: positiveMoneySchema,
    method: PaymentMethodSchema,
    referenceNumber: z
        .union([z.literal(""), z.string().trim().max(255, "Reference number must be at most 255 characters")])
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
    payments: z.array(CreatePaymentSchema).optional().default([]),
});

export const CompleteSaleSchema = z.object({
    requestId: z.uuid("Invalid completion request id"),
    customerId: z
        .union([z.literal(""), z.uuid("Invalid customer id")])
        .nullable()
        .optional(),
    orderDiscountAmount: moneySchema.optional(),
    notes: optionalNotesSchema,
    items: z.array(SaleItemInputSchema).min(1, "At least one item is required"),
    payments: z.array(CreatePaymentSchema).optional().default([]),
});

export const ReplaceSaleSchema = CompleteSaleSchema.extend({
    replacementReason: z.string().trim().min(1, "Replacement reason is required").max(1000),
});

export const VoidSaleSchema = z.object({
    reason: z.string().trim().min(1, "Reason is required").max(1000, "Reason must be at most 1000 characters"),
});

export const SalesListQuerySchema = z.object({
    status: SaleStatusSchema.optional(),
    paymentStatus: PaymentStatusSchema.optional(),
    paymentMethod: PaymentMethodSchema.optional(),
    customerId: z.uuid("Invalid customer id").optional(),
    search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
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

export const SalesListPageInfoSchema = z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
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
