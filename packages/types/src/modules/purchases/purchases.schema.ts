import { z } from "zod";
import { dtoDateSchema } from "../../common";
import {
  OutgoingPaymentDTOSchema,
  VendorOutstandingDTOSchema,
  isOutgoingPaymentActive,
  roundOutgoingPaymentMoney,
  sumActiveOutgoingPayments,
} from "../outgoing-payments/outgoing-payments.schema";
import { VendorItemStatusSchema, VendorStatusSchema } from "../vendors/vendors.schema";

export const PURCHASE_INVOICE_REFERENCE_MAX_LENGTH = 255;
export const PURCHASE_NOTES_MAX_LENGTH = 1000;
export const PURCHASE_EFFECTIVE_DATE_TIME_ZONE = "Asia/Kolkata";

export const PurchaseLifecycleSchema = z.enum(["draft", "recorded", "voided"]);
export const PayableStatusSchema = z.enum(["due", "partial", "paid"]);

export const PURCHASE_LIFECYCLE_LABELS: Record<z.infer<typeof PurchaseLifecycleSchema>, string> = {
  draft: "Draft",
  recorded: "Recorded",
  voided: "Voided",
};

export const PAYABLE_STATUS_LABELS: Record<z.infer<typeof PayableStatusSchema>, string> = {
  due: "Due",
  partial: "Partial",
  paid: "Paid",
};

const isAtMostDecimalPlaces = (value: number, places: number): boolean => {
  const factor = 10 ** places;
  return Number.isFinite(value) && Math.abs(Math.round(value * factor) - value * factor) < 1e-6;
};

const isAtMostTwoDecimalPlaces = (value: number): boolean => isAtMostDecimalPlaces(value, 2);
const isAtMostThreeDecimalPlaces = (value: number): boolean => isAtMostDecimalPlaces(value, 3);

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const purchaseQuantitySchema = z
  .number({ error: "Quantity is required" })
  .gt(0, "Quantity must be greater than 0")
  .refine(isAtMostThreeDecimalPlaces, {
    message: "Quantity must have at most three decimal places",
  });

export const purchaseAgreedUnitPriceSchema = z
  .number({ error: "Agreed unit price is required" })
  .min(0, "Agreed unit price must be 0 or more")
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Agreed unit price must have at most two decimal places",
  });

export const purchaseAdjustmentSchema = z
  .number({ error: "Purchase Adjustment is required" })
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Purchase Adjustment must have at most two decimal places",
  });

export const purchaseMoneySchema = z
  .number({ error: "Amount is required" })
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Amount must have at most two decimal places",
  });

const isoDateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be YYYY-MM-DD");

export const calendarDateInTimeZone = (
  value: Date = new Date(),
  timeZone: string = PURCHASE_EFFECTIVE_DATE_TIME_ZONE,
): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

export const isPurchaseEffectiveDateAllowed = (
  effectiveDate: string,
  today: string = calendarDateInTimeZone(),
): boolean => /^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) && effectiveDate <= today;

export const purchaseEffectiveDateSchema = isoDateOnlySchema.refine(
  (value) => isPurchaseEffectiveDateAllowed(value),
  { message: "Effective date cannot be in the future" },
);

const invoiceReferenceSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(
        PURCHASE_INVOICE_REFERENCE_MAX_LENGTH,
        `Invoice/reference must be at most ${PURCHASE_INVOICE_REFERENCE_MAX_LENGTH} characters`,
      ),
  ])
  .nullable()
  .optional();

const notesSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(PURCHASE_NOTES_MAX_LENGTH, `Notes must be at most ${PURCHASE_NOTES_MAX_LENGTH} characters`),
  ])
  .nullable()
  .optional();

export const calculatePurchaseLineTotal = (quantity: number, agreedUnitPrice: number): number =>
  roundMoney(quantity * agreedUnitPrice);

export const calculatePurchaseTotals = (
  lines: Array<{ quantity: number; agreedUnitPrice: number }>,
  adjustment = 0,
): { linesTotal: number; total: number } => {
  const linesTotal = roundMoney(
    lines.reduce((sum, line) => sum + calculatePurchaseLineTotal(line.quantity, line.agreedUnitPrice), 0),
  );
  return {
    linesTotal,
    total: roundMoney(linesTotal + adjustment),
  };
};

export const derivePurchasePayableState = (input: {
  lifecycle: z.infer<typeof PurchaseLifecycleSchema>;
  total: number;
  paidTotal: number;
}): {
  payableStatus: z.infer<typeof PayableStatusSchema> | null;
  dueAmount: number | null;
} => {
  if (input.lifecycle !== "recorded") {
    return { payableStatus: null, dueAmount: null };
  }

  const paidTotal = roundMoney(input.paidTotal);
  const total = roundMoney(input.total);
  const dueAmount = roundMoney(Math.max(0, total - paidTotal));

  if (paidTotal <= 0) {
    return { payableStatus: "due", dueAmount };
  }
  if (dueAmount <= 0) {
    return { payableStatus: "paid", dueAmount: 0 };
  }
  return { payableStatus: "partial", dueAmount };
};

export const calculateVendorOutstanding = (
  purchases: Array<{
    vendorId: string;
    vendorName: string;
    lifecycle: z.infer<typeof PurchaseLifecycleSchema>;
    dueAmount: number | null;
  }>,
): z.infer<typeof VendorOutstandingDTOSchema>[] => {
  const byVendor = new Map<
    string,
    z.infer<typeof VendorOutstandingDTOSchema>
  >();

  for (const purchase of purchases) {
    if (purchase.lifecycle !== "recorded" || purchase.dueAmount == null || purchase.dueAmount <= 0) {
      continue;
    }

    const current = byVendor.get(purchase.vendorId) ?? {
      vendorId: purchase.vendorId,
      vendorName: purchase.vendorName,
      outstandingAmount: 0,
    };
    current.outstandingAmount = roundOutgoingPaymentMoney(
      current.outstandingAmount + purchase.dueAmount,
    );
    byVendor.set(purchase.vendorId, current);
  }

  return [...byVendor.values()];
};

export const derivePurchasePayableStateFromPayments = (input: {
  lifecycle: z.infer<typeof PurchaseLifecycleSchema>;
  total: number;
  outgoingPayments: Array<{ amount: number; reversedAt: Date | string | null }>;
}): {
  payableStatus: z.infer<typeof PayableStatusSchema> | null;
  paidTotal: number;
  dueAmount: number | null;
} => {
  const paidTotal = sumActiveOutgoingPayments(input.outgoingPayments);
  const payable = derivePurchasePayableState({
    lifecycle: input.lifecycle,
    total: input.total,
    paidTotal,
  });
  return {
    payableStatus: payable.payableStatus,
    paidTotal,
    dueAmount: payable.dueAmount,
  };
};

export const canAcceptOutgoingPayment = (input: {
  lifecycle: z.infer<typeof PurchaseLifecycleSchema>;
  total: number;
  outgoingPayments: Array<{ amount: number; reversedAt: Date | string | null }>;
  amount: number;
}): boolean => {
  if (input.lifecycle !== "recorded") {
    return false;
  }
  if (input.amount <= 0) {
    return false;
  }
  const { dueAmount } = derivePurchasePayableStateFromPayments(input);
  return dueAmount != null && roundOutgoingPaymentMoney(input.amount) <= dueAmount;
};

export { isOutgoingPaymentActive, sumActiveOutgoingPayments };

export const isVendorSelectableForDraftPurchase = (vendor: {
  status: z.infer<typeof VendorStatusSchema>;
}): boolean => vendor.status === "active";

export const isVendorItemSelectableForDraftPurchase = (input: {
  vendorStatus: z.infer<typeof VendorStatusSchema>;
  itemStatus: z.infer<typeof VendorItemStatusSchema>;
  vendorId: string;
  selectedVendorId: string;
}): boolean =>
  input.vendorStatus === "active" &&
  input.itemStatus === "active" &&
  input.vendorId === input.selectedVendorId;

export const PurchaseLineInputSchema = z
  .object({
    vendorItemId: z.uuid("Invalid vendor item id"),
    quantity: purchaseQuantitySchema,
    agreedUnitPrice: purchaseAgreedUnitPriceSchema.optional(),
  })
  .strict();

export const CreateDraftPurchaseSchema = z
  .object({
    storeId: z.uuid("Invalid store id"),
    vendorId: z.uuid("Invalid vendor id"),
    effectiveDate: purchaseEffectiveDateSchema.optional(),
    invoiceReference: invoiceReferenceSchema,
    notes: notesSchema,
    adjustment: purchaseAdjustmentSchema.optional(),
    lines: z.array(PurchaseLineInputSchema).optional(),
  })
  .strict();

export const UpdateDraftPurchaseSchema = z
  .object({
    storeId: z.uuid("Invalid store id").optional(),
    vendorId: z.uuid("Invalid vendor id").optional(),
    effectiveDate: purchaseEffectiveDateSchema.optional(),
    invoiceReference: invoiceReferenceSchema,
    notes: notesSchema,
    adjustment: purchaseAdjustmentSchema.optional(),
    lines: z.array(PurchaseLineInputSchema).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.storeId !== undefined ||
      value.vendorId !== undefined ||
      value.effectiveDate !== undefined ||
      value.invoiceReference !== undefined ||
      value.notes !== undefined ||
      value.adjustment !== undefined ||
      value.lines !== undefined,
    { message: "At least one field is required" },
  );

export const PurchaseLineDTOSchema = z.object({
  id: z.uuid("Invalid purchase line id"),
  organizationId: z.uuid("Invalid organization id"),
  purchaseId: z.uuid("Invalid purchase id"),
  vendorItemId: z.uuid("Invalid vendor item id"),
  vendorItemName: z.string().min(1),
  unitId: z.uuid("Invalid unit id"),
  unitLabel: z.string().min(1),
  quantity: purchaseQuantitySchema,
  agreedUnitPrice: purchaseAgreedUnitPriceSchema,
  lineTotal: purchaseMoneySchema,
});

export const PurchaseDTOSchema = z.object({
  id: z.uuid("Invalid purchase id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  storeName: z.string().min(1),
  vendorId: z.uuid("Invalid vendor id"),
  vendorName: z.string().min(1),
  lifecycle: PurchaseLifecycleSchema,
  payableStatus: PayableStatusSchema.nullable(),
  effectiveDate: isoDateOnlySchema,
  invoiceReference: z.string().nullable(),
  notes: z.string().nullable(),
  adjustment: purchaseAdjustmentSchema,
  linesTotal: purchaseMoneySchema,
  total: purchaseMoneySchema,
  paidTotal: purchaseMoneySchema,
  dueAmount: purchaseMoneySchema.nullable(),
  recordedAt: dtoDateSchema.nullable(),
  lines: z.array(PurchaseLineDTOSchema),
  outgoingPayments: z.array(OutgoingPaymentDTOSchema),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});
