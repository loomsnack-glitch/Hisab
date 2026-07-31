import { z } from "zod";
import { dtoDateSchema } from "../../common";

const nameSchema = z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters");

const optionalTextSchema = z.union([
    z.literal(""),
    z.string().trim().max(2000, "Text must be at most 2000 characters"),
]).nullable().optional();

const optionalInvoiceNumberSchema = z.union([
    z.literal(""),
    z.string().trim().max(255, "Invoice number must be at most 255 characters"),
]).nullable().optional();

const MAX_MONEY_AMOUNT = 9_999_999_999.99;
const moneySchema = z
    .number({ error: "Amount is required" })
    .finite("Amount must be a valid number")
    .min(0, "Amount must be 0 or more")
    .max(MAX_MONEY_AMOUNT, "Amount is too large");
const positiveQuantitySchema = z
    .number({ error: "Quantity is required" })
    .gt(0, "Quantity must be greater than 0")
    .max(1_000_000_000, "Quantity is too large")
    .refine(
        (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-9,
        "Quantity supports at most 3 decimal places",
    );

export const PurchaseStatusSchema = z.enum(["recorded", "voided"]);

export const PurchaseItemInputSchema = z.object({
    itemName: nameSchema,
    description: optionalTextSchema,
    quantity: positiveQuantitySchema,
    rate: moneySchema,
}).superRefine((item, ctx) => {
    const lineTotal = item.quantity * item.rate;
    if (!Number.isFinite(lineTotal) || lineTotal > MAX_MONEY_AMOUNT) {
        ctx.addIssue({
            code: "custom",
            path: ["rate"],
            message: "Quantity multiplied by rate is too large",
        });
    }
});

export const CreatePurchaseSchema = z.object({
    purchaseDate: z.string().date("Enter a valid purchase date"),
    supplierName: nameSchema,
    invoiceNumber: optionalInvoiceNumberSchema,
    notes: optionalTextSchema,
    items: z.array(PurchaseItemInputSchema).min(1, "Add at least one purchase item"),
}).superRefine((purchase, ctx) => {
    const total = purchase.items.reduce((sum, item) => sum + Math.round((item.quantity * item.rate + Number.EPSILON) * 100) / 100, 0);
    if (!Number.isFinite(total) || total > MAX_MONEY_AMOUNT) {
        ctx.addIssue({
            code: "custom",
            path: ["items"],
            message: "Purchase total is too large",
        });
    }
});

export const UpdatePurchaseSchema = CreatePurchaseSchema;

export const VoidPurchaseSchema = z.object({
    reason: z.string().trim().min(1, "Void reason is required").max(500, "Reason must be at most 500 characters"),
});

export const PurchaseListQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
    status: PurchaseStatusSchema.optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
}).refine(
    (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    { message: "Start date must be before or equal to end date", path: ["dateFrom"] },
);

export const PurchaseItemDTOSchema = z.object({
    id: z.uuid("Invalid purchase item id"),
    purchaseId: z.uuid("Invalid purchase id"),
    itemName: nameSchema,
    description: z.string().nullable().optional(),
    quantity: positiveQuantitySchema,
    rate: moneySchema,
    lineTotal: moneySchema,
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const PurchaseSummaryDTOSchema = z.object({
    id: z.uuid("Invalid purchase id"),
    organizationId: z.uuid("Invalid organization id"),
    storeId: z.uuid("Invalid store id"),
    purchaseDate: z.string(),
    supplierName: nameSchema,
    invoiceNumber: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    totalAmount: moneySchema,
    status: PurchaseStatusSchema,
    itemCount: z.number().int().min(0),
    itemsSummary: z.string().nullable().optional(),
    createdByUserId: z.uuid("Invalid creator id").nullable().optional(),
    createdByDeviceId: z.uuid("Invalid creator device id").nullable().optional(),
    updatedByUserId: z.uuid("Invalid updater id").nullable().optional(),
    updatedByDeviceId: z.uuid("Invalid updater device id").nullable().optional(),
    voidedAt: dtoDateSchema.nullable().optional(),
    voidReason: z.string().nullable().optional(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const PurchaseDetailDTOSchema = PurchaseSummaryDTOSchema.extend({
    items: z.array(PurchaseItemDTOSchema),
});
