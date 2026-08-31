import { z } from "zod";
import { dtoDateSchema } from "../../common";
import { isExpenseCategoryAvailableForAssignment } from "../expense-categories/expense-categories.schema";
import { OutgoingPaymentDTOSchema } from "../outgoing-payments/outgoing-payments.schema";
import {
  PAYABLE_STATUS_LABELS,
  PURCHASE_VOID_REASON_MAX_LENGTH,
  PayableStatusSchema,
  PurchaseLifecycleSchema,
  VoidPurchaseSchema,
  calendarDateInTimeZone,
  canAcceptOutgoingPayment,
  canReverseOutgoingPayment,
  canVoidPurchase,
  derivePurchasePayableState,
  derivePurchasePayableStateFromPayments,
  isPurchaseEffectiveDateAllowed,
  purchaseEffectiveDateSchema,
  roundMoney,
} from "../purchases/purchases.schema";

export const EXPENSE_INVOICE_REFERENCE_MAX_LENGTH = 255;
export const EXPENSE_NOTES_MAX_LENGTH = 1000;
export const EXPENSE_VOID_REASON_MAX_LENGTH = PURCHASE_VOID_REASON_MAX_LENGTH;
export const EXPENSE_EFFECTIVE_DATE_TIME_ZONE = "Asia/Kolkata";

export const ExpenseLifecycleSchema = PurchaseLifecycleSchema;
export const ExpensePayableStatusSchema = PayableStatusSchema;

export const EXPENSE_LIFECYCLE_LABELS: Record<z.infer<typeof ExpenseLifecycleSchema>, string> = {
  draft: "Draft",
  recorded: "Recorded",
  voided: "Voided",
};

export const EXPENSE_PAYABLE_STATUS_LABELS = PAYABLE_STATUS_LABELS;

const isAtMostTwoDecimalPlaces = (value: number): boolean => {
  const factor = 100;
  return Number.isFinite(value) && Math.abs(Math.round(value * factor) - value * factor) < 1e-6;
};

export const expenseTotalSchema = z
  .number({ error: "Payable total is required" })
  .gt(0, "Payable total must be greater than 0")
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Payable total must have at most two decimal places",
  });

export const expenseMoneySchema = z
  .number({ error: "Amount is required" })
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Amount must have at most two decimal places",
  });

const isoDateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be YYYY-MM-DD");

export const expenseCalendarDateInTimeZone = calendarDateInTimeZone;
export const isExpenseEffectiveDateAllowed = isPurchaseEffectiveDateAllowed;
export const expenseEffectiveDateSchema = purchaseEffectiveDateSchema;

const invoiceReferenceSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(
        EXPENSE_INVOICE_REFERENCE_MAX_LENGTH,
        `Invoice/reference must be at most ${EXPENSE_INVOICE_REFERENCE_MAX_LENGTH} characters`,
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
      .max(EXPENSE_NOTES_MAX_LENGTH, `Notes must be at most ${EXPENSE_NOTES_MAX_LENGTH} characters`),
  ])
  .nullable()
  .optional();

export const roundExpenseMoney = roundMoney;

export const deriveExpensePayableState = (input: {
  lifecycle: z.infer<typeof ExpenseLifecycleSchema>;
  total: number;
  paidTotal: number;
}): {
  payableStatus: z.infer<typeof ExpensePayableStatusSchema> | null;
  dueAmount: number | null;
} => derivePurchasePayableState(input);

export const deriveExpensePayableStateFromPayments = (input: {
  lifecycle: z.infer<typeof ExpenseLifecycleSchema>;
  total: number;
  outgoingPayments: Array<{ amount: number; reversedAt: Date | string | null }>;
}): {
  payableStatus: z.infer<typeof ExpensePayableStatusSchema> | null;
  paidTotal: number;
  dueAmount: number | null;
} => derivePurchasePayableStateFromPayments(input);

export const canAcceptOutgoingExpensePayment = (input: {
  lifecycle: z.infer<typeof ExpenseLifecycleSchema>;
  total: number;
  outgoingPayments: Array<{ amount: number; reversedAt: Date | string | null }>;
  amount: number;
}): boolean => canAcceptOutgoingPayment(input);

export const canReverseOutgoingExpensePayment = canReverseOutgoingPayment;
export const canVoidExpense = canVoidPurchase;
export const VoidExpenseSchema = VoidPurchaseSchema;

export const isExpenseCategorySelectableForDraftExpense = isExpenseCategoryAvailableForAssignment;

export const CreateDraftExpenseSchema = z
  .object({
    storeId: z.uuid("Invalid store id"),
    expenseCategoryId: z.uuid("Invalid expense category id"),
    effectiveDate: expenseEffectiveDateSchema.optional(),
    invoiceReference: invoiceReferenceSchema,
    notes: notesSchema,
    total: expenseTotalSchema,
  })
  .strict();

export const UpdateDraftExpenseSchema = z
  .object({
    storeId: z.uuid("Invalid store id").optional(),
    expenseCategoryId: z.uuid("Invalid expense category id").optional(),
    effectiveDate: expenseEffectiveDateSchema.optional(),
    invoiceReference: invoiceReferenceSchema,
    notes: notesSchema,
    total: expenseTotalSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.storeId !== undefined ||
      value.expenseCategoryId !== undefined ||
      value.effectiveDate !== undefined ||
      value.invoiceReference !== undefined ||
      value.notes !== undefined ||
      value.total !== undefined,
    { message: "At least one field is required" },
  );

export const ExpenseDTOSchema = z.object({
  id: z.uuid("Invalid expense id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  storeName: z.string().min(1),
  expenseCategoryId: z.uuid("Invalid expense category id"),
  expenseCategoryName: z.string().min(1),
  lifecycle: ExpenseLifecycleSchema,
  payableStatus: ExpensePayableStatusSchema.nullable(),
  effectiveDate: isoDateOnlySchema,
  invoiceReference: z.string().nullable(),
  notes: z.string().nullable(),
  total: expenseTotalSchema,
  paidTotal: expenseMoneySchema,
  dueAmount: expenseMoneySchema.nullable(),
  recordedAt: dtoDateSchema.nullable(),
  voidedAt: dtoDateSchema.nullable(),
  voidReason: z.string().nullable(),
  outgoingPayments: z.array(OutgoingPaymentDTOSchema),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});
