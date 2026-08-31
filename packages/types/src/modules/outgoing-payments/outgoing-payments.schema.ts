import { z } from "zod";
import { dtoDateSchema } from "../../common";
import type { MoneyAccountType } from "../money-accounts/money-accounts.type";

export const OUTGOING_PAYMENT_REFERENCE_MAX_LENGTH = 255;
export const OUTGOING_PAYMENT_NOTES_MAX_LENGTH = 1000;
export const OUTGOING_PAYMENT_REVERSAL_REASON_MAX_LENGTH = 1000;

export const OUTGOING_PAYMENT_REVERSAL_KINDS = ["payment_reversal", "payable_void"] as const;
export const OutgoingPaymentReversalKindSchema = z.enum(OUTGOING_PAYMENT_REVERSAL_KINDS);

export const OUTGOING_PAYMENT_REVERSAL_KIND_LABELS: Record<
  z.infer<typeof OutgoingPaymentReversalKindSchema>,
  string
> = {
  payment_reversal: "Payment reversal",
  payable_void: "Payable Void reversal",
};

export const UNTRACKED_OUTGOING_PAYMENT_METHODS = ["cash", "upi", "card"] as const;
export const TRACKED_OUTGOING_PAYMENT_METHODS = [
  "cash",
  "upi",
  "card",
  "bank_transfer",
  "other",
] as const;
export const OUTGOING_PAYMENT_METHODS = TRACKED_OUTGOING_PAYMENT_METHODS;

export const OutgoingPaymentMethodSchema = z.enum(OUTGOING_PAYMENT_METHODS);

export const OUTGOING_PAYMENT_METHOD_LABELS: Record<
  z.infer<typeof OutgoingPaymentMethodSchema>,
  string
> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

export const OUTGOING_PAYMENT_ELIGIBLE_MONEY_ACCOUNT_TYPES: Record<
  z.infer<typeof OutgoingPaymentMethodSchema>,
  readonly MoneyAccountType[]
> = {
  cash: ["cash", "petty_cash"],
  upi: ["upi"],
  card: ["card_settlement"],
  bank_transfer: ["bank"],
  other: ["other"],
};

const isAtMostTwoDecimalPlaces = (value: number): boolean =>
  Number.isFinite(value) && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

export const roundOutgoingPaymentMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const outgoingPaymentAmountSchema = z
  .number({ error: "Amount is required" })
  .gt(0, "Amount must be greater than 0")
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Amount must have at most two decimal places",
  });

const referenceSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(
        OUTGOING_PAYMENT_REFERENCE_MAX_LENGTH,
        `Reference must be at most ${OUTGOING_PAYMENT_REFERENCE_MAX_LENGTH} characters`,
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
      .max(
        OUTGOING_PAYMENT_NOTES_MAX_LENGTH,
        `Notes must be at most ${OUTGOING_PAYMENT_NOTES_MAX_LENGTH} characters`,
      ),
  ])
  .nullable()
  .optional();

export const CreateOutgoingPaymentSchema = z
  .object({
    amount: outgoingPaymentAmountSchema,
    paymentMethod: OutgoingPaymentMethodSchema,
    moneyAccountId: z.uuid("Invalid money account id").nullable().optional(),
    reference: referenceSchema,
    notes: notesSchema,
  })
  .strict();

const correctionReasonSchema = z
  .string({ error: "Reason is required" })
  .trim()
  .min(1, "Reason is required")
  .max(
    OUTGOING_PAYMENT_REVERSAL_REASON_MAX_LENGTH,
    `Reason must be at most ${OUTGOING_PAYMENT_REVERSAL_REASON_MAX_LENGTH} characters`,
  );

export const ReverseOutgoingPaymentSchema = z
  .object({
    reason: correctionReasonSchema,
  })
  .strict();

export const OutgoingPaymentDTOSchema = z
  .object({
    id: z.uuid("Invalid outgoing payment id"),
    organizationId: z.uuid("Invalid organization id"),
    purchaseId: z.uuid("Invalid purchase id").nullable(),
    expenseId: z.uuid("Invalid expense id").nullable(),
    amount: outgoingPaymentAmountSchema,
    paymentMethod: OutgoingPaymentMethodSchema,
    moneyAccountId: z.uuid("Invalid money account id").nullable(),
    moneyAccountName: z.string().min(1).nullable(),
    reference: z.string().nullable(),
    notes: z.string().nullable(),
    paidAt: dtoDateSchema,
    reversedAt: dtoDateSchema.nullable(),
    reversalReason: z.string().nullable(),
    reversalKind: OutgoingPaymentReversalKindSchema.nullable(),
    createdBy: z.uuid("Invalid creator id"),
    createdAt: dtoDateSchema,
  })
  .superRefine((value, ctx) => {
    const hasPurchase = value.purchaseId != null;
    const hasExpense = value.expenseId != null;
    if (hasPurchase === hasExpense) {
      ctx.addIssue({
        code: "custom",
        path: hasPurchase ? ["expenseId"] : ["purchaseId"],
        message: "An Outgoing Payment must belong to exactly one Purchase or Expense",
      });
    }

    const isReversed = value.reversedAt != null;
    if (isReversed) {
      if (!value.reversalReason) {
        ctx.addIssue({
          code: "custom",
          path: ["reversalReason"],
          message: "A reversed Outgoing Payment must include a reason",
        });
      }
      if (!value.reversalKind) {
        ctx.addIssue({
          code: "custom",
          path: ["reversalKind"],
          message: "A reversed Outgoing Payment must record whether it was reversed individually or by Payable Void",
        });
      }
      return;
    }

    if (value.reversalReason) {
      ctx.addIssue({
        code: "custom",
        path: ["reversalReason"],
        message: "An active Outgoing Payment cannot have a reversal reason",
      });
    }
    if (value.reversalKind) {
      ctx.addIssue({
        code: "custom",
        path: ["reversalKind"],
        message: "An active Outgoing Payment cannot have a reversal kind",
      });
    }
  });

export const VendorOutstandingDTOSchema = z.object({
  vendorId: z.uuid("Invalid vendor id"),
  vendorName: z.string().min(1),
  outstandingAmount: z
    .number()
    .min(0, "Vendor Outstanding must be 0 or more")
    .refine(isAtMostTwoDecimalPlaces, {
      message: "Vendor Outstanding must have at most two decimal places",
    }),
});

export const isOutgoingPaymentActive = (payment: {
  reversedAt: Date | string | null;
}): boolean => payment.reversedAt == null;

export const isUntrackedOutgoingPaymentMethod = (
  method: z.infer<typeof OutgoingPaymentMethodSchema>,
): boolean =>
  (UNTRACKED_OUTGOING_PAYMENT_METHODS as readonly string[]).includes(method);

export const isOutgoingPaymentMethodAllowed = (
  method: z.infer<typeof OutgoingPaymentMethodSchema>,
  trackingActive: boolean,
): boolean => (trackingActive ? true : isUntrackedOutgoingPaymentMethod(method));

export const isMoneyAccountAvailableToStore = (
  account: {
    status: string;
    scope: string;
    storeId: string | null;
  },
  storeId: string,
): boolean => {
  if (account.status !== "active") {
    return false;
  }
  if (account.scope === "organization_wide") {
    return account.storeId === null;
  }
  return account.scope === "store_scoped" && account.storeId === storeId;
};

export const isMoneyAccountEligibleForOutgoingMethod = (
  account: { type: MoneyAccountType },
  method: z.infer<typeof OutgoingPaymentMethodSchema>,
): boolean => OUTGOING_PAYMENT_ELIGIBLE_MONEY_ACCOUNT_TYPES[method].includes(account.type);

export const isOutgoingPaymentFundingValid = (input: {
  trackingActive: boolean;
  paymentMethod: z.infer<typeof OutgoingPaymentMethodSchema>;
  moneyAccountId?: string | null;
  moneyAccount?: {
    id: string;
    status: string;
    scope: string;
    storeId: string | null;
    type: MoneyAccountType;
  } | null;
  storeId: string;
}): boolean => {
  if (!isOutgoingPaymentMethodAllowed(input.paymentMethod, input.trackingActive)) {
    return false;
  }

  if (!input.trackingActive) {
    return !input.moneyAccountId;
  }

  if (!input.moneyAccountId || !input.moneyAccount) {
    return false;
  }

  return (
    input.moneyAccount.id === input.moneyAccountId &&
    isMoneyAccountAvailableToStore(input.moneyAccount, input.storeId) &&
    isMoneyAccountEligibleForOutgoingMethod(input.moneyAccount, input.paymentMethod)
  );
};

export const sumActiveOutgoingPayments = (
  payments: Array<{ amount: number; reversedAt: Date | string | null }>,
): number =>
  roundOutgoingPaymentMoney(
    payments.reduce(
      (sum, payment) => (isOutgoingPaymentActive(payment) ? sum + payment.amount : sum),
      0,
    ),
  );
