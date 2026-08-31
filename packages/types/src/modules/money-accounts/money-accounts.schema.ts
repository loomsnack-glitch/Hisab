import { z } from "zod";
import { dtoDateSchema } from "../../common";
import { PaymentMethodSchema } from "../billing/billing.schema";

export const MONEY_ACCOUNT_NAME_MAX_LENGTH = 255;
export const MONEY_ACCOUNT_NOTES_MAX_LENGTH = 1000;

export const ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPES = [
  "bank",
  "upi",
  "card_settlement",
  "petty_cash",
  "other",
] as const;

export const MONEY_ACCOUNT_TYPES = ["cash", ...ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPES] as const;

export const MoneyAccountStatusSchema = z.enum(["active", "inactive"]);
export const MoneyAccountScopeSchema = z.enum(["organization_wide", "store_scoped"]);
export const OrganizationWideMoneyAccountTypeSchema = z.enum(ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPES);
export const MoneyAccountTypeSchema = z.enum(MONEY_ACCOUNT_TYPES);

export const ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS: Record<
  z.infer<typeof OrganizationWideMoneyAccountTypeSchema>,
  string
> = {
  bank: "Bank",
  upi: "UPI",
  card_settlement: "Card Settlement",
  petty_cash: "Petty Cash",
  other: "Other",
};

export const MONEY_ACCOUNT_TYPE_LABELS: Record<z.infer<typeof MoneyAccountTypeSchema>, string> = {
  cash: "Cash",
  ...ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS,
};

export const MONEY_ACCOUNT_SCOPE_LABELS: Record<z.infer<typeof MoneyAccountScopeSchema>, string> = {
  organization_wide: "Organization-wide",
  store_scoped: "Store-scoped",
};

const moneyAccountNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(
    MONEY_ACCOUNT_NAME_MAX_LENGTH,
    `Name must be at most ${MONEY_ACCOUNT_NAME_MAX_LENGTH} characters`,
  );

const moneyAccountNotesSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(
        MONEY_ACCOUNT_NOTES_MAX_LENGTH,
        `Notes must be at most ${MONEY_ACCOUNT_NOTES_MAX_LENGTH} characters`,
      ),
  ])
  .nullable()
  .optional();

const moneyAccountStoreIdSchema = z.uuid("Invalid store id").nullable().optional();

const isAtMostTwoDecimalPlaces = (value: number): boolean =>
  Number.isFinite(value) && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

export const moneyAccountOpeningBalanceSchema = z
  .number({ error: "Opening Balance is required" })
  .min(0, "Opening Balance must be 0 or more")
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Opening Balance must have at most two decimal places",
  });

export const moneyAccountBalanceSchema = z
  .number({ error: "Balance is required" })
  .min(0, "Balance must be 0 or more")
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Balance must have at most two decimal places",
  });

const STORE_REQUIRED_FOR_STORE_SCOPE = "Store is required for a Store-scoped Money Account";
const STORE_FORBIDDEN_FOR_ORGANIZATION_WIDE =
  "An Organization-wide Money Account cannot have a Store assignment";
const CASH_MUST_BE_STORE_SCOPED = "A Cash Money Account must be Store-scoped";

const refineMoneyAccountScopeAndStore = (
  value: {
    scope?: z.infer<typeof MoneyAccountScopeSchema>;
    storeId?: string | null;
  },
  ctx: z.RefinementCtx,
  options?: { defaultScope?: z.infer<typeof MoneyAccountScopeSchema> },
) => {
  const scope = value.scope ?? options?.defaultScope;
  if (scope === "store_scoped" && !value.storeId) {
    ctx.addIssue({
      code: "custom",
      path: ["storeId"],
      message: STORE_REQUIRED_FOR_STORE_SCOPE,
    });
    return;
  }

  if (scope === "organization_wide" && value.storeId) {
    ctx.addIssue({
      code: "custom",
      path: ["storeId"],
      message: STORE_FORBIDDEN_FOR_ORGANIZATION_WIDE,
    });
  }
};

const refineCashMustBeStoreScoped = (
  value: {
    type?: z.infer<typeof MoneyAccountTypeSchema>;
    scope?: z.infer<typeof MoneyAccountScopeSchema>;
    storeId?: string | null;
  },
  ctx: z.RefinementCtx,
  options?: { defaultScope?: z.infer<typeof MoneyAccountScopeSchema> },
) => {
  if (value.type !== "cash") {
    return;
  }

  const scope = value.scope ?? options?.defaultScope;
  if (scope === "organization_wide") {
    ctx.addIssue({
      code: "custom",
      path: ["scope"],
      message: CASH_MUST_BE_STORE_SCOPED,
    });
  }
};

export const MoneyAccountDTOSchema = z
  .object({
    id: z.uuid("Invalid money account id"),
    organizationId: z.uuid("Invalid organization id"),
    name: moneyAccountNameSchema,
    type: MoneyAccountTypeSchema,
    scope: MoneyAccountScopeSchema,
    storeId: z.uuid("Invalid store id").nullable(),
    notes: z.string().nullable(),
    status: MoneyAccountStatusSchema,
    openingBalance: moneyAccountOpeningBalanceSchema,
    balance: moneyAccountBalanceSchema,
    hasMovements: z.boolean(),
    createdBy: z.uuid("Invalid creator id"),
    updatedBy: z.uuid("Invalid updater id").nullable().optional(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
  })
  .superRefine((value, ctx) => {
    refineMoneyAccountScopeAndStore(value, ctx);
    refineCashMustBeStoreScoped(value, ctx);
  });

export const CreateMoneyAccountSchema = z
  .object({
    name: moneyAccountNameSchema,
    type: MoneyAccountTypeSchema,
    scope: MoneyAccountScopeSchema.optional(),
    storeId: moneyAccountStoreIdSchema,
    notes: moneyAccountNotesSchema,
    status: MoneyAccountStatusSchema.optional(),
    openingBalance: moneyAccountOpeningBalanceSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    refineMoneyAccountScopeAndStore(value, ctx, { defaultScope: "organization_wide" });
    refineCashMustBeStoreScoped(value, ctx, { defaultScope: "organization_wide" });
  });

export const UpdateMoneyAccountSchema = z
  .object({
    name: moneyAccountNameSchema.optional(),
    type: MoneyAccountTypeSchema.optional(),
    scope: MoneyAccountScopeSchema.optional(),
    storeId: moneyAccountStoreIdSchema,
    notes: moneyAccountNotesSchema,
    status: MoneyAccountStatusSchema.optional(),
    openingBalance: moneyAccountOpeningBalanceSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.type !== undefined ||
      value.scope !== undefined ||
      value.storeId !== undefined ||
      value.notes !== undefined ||
      value.status !== undefined ||
      value.openingBalance !== undefined,
    { message: "At least one field is required" },
  )
  .superRefine((value, ctx) => {
    refineMoneyAccountScopeAndStore(value, ctx);
    refineCashMustBeStoreScoped(value, ctx);
  });

export const MONEY_ACCOUNT_PAYMENT_ROUTE_METHODS = ["upi", "card"] as const;

export const MoneyAccountPaymentRouteMethodSchema = z.enum(MONEY_ACCOUNT_PAYMENT_ROUTE_METHODS);

export const MONEY_ACCOUNT_PAYMENT_ROUTE_METHOD_LABELS: Record<
  z.infer<typeof MoneyAccountPaymentRouteMethodSchema>,
  string
> = {
  upi: "UPI",
  card: "Card",
};

export const MONEY_ACCOUNT_MOVEMENT_SOURCE_KINDS = [
  "pos_payment",
  "sale_replacement_reversal",
  "outgoing_purchase_payment",
  "outgoing_purchase_payment_reversal",
  "outgoing_purchase_void_reversal",
  "outgoing_expense_payment",
  "outgoing_expense_payment_reversal",
  "outgoing_expense_void_reversal",
] as const;

export const MoneyAccountMovementSourceKindSchema = z.enum(MONEY_ACCOUNT_MOVEMENT_SOURCE_KINDS);

export const MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS: Record<
  z.infer<typeof MoneyAccountMovementSourceKindSchema>,
  string
> = {
  pos_payment: "POS Payment",
  sale_replacement_reversal: "Bill edit reversal",
  outgoing_purchase_payment: "Purchase payment",
  outgoing_purchase_payment_reversal: "Purchase payment reversal",
  outgoing_purchase_void_reversal: "Purchase void reversal",
  outgoing_expense_payment: "Expense payment",
  outgoing_expense_payment_reversal: "Expense payment reversal",
  outgoing_expense_void_reversal: "Expense void reversal",
};

export const moneyAccountMovementAmountSchema = z
  .number({ error: "Amount is required" })
  .gt(0, "Amount must be greater than 0")
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Amount must have at most two decimal places",
  });

export const moneyAccountMovementSignedAmountSchema = z
  .number({ error: "Amount is required" })
  .refine((value) => value !== 0, {
    message: "Amount cannot be zero",
  })
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Amount must have at most two decimal places",
  });

export const moneyAccountMovementReversalAmountSchema = z
  .number({ error: "Amount is required" })
  .lt(0, "Reversal amount must be less than 0")
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Amount must have at most two decimal places",
  });

export const moneyAccountMovementCompensatingAmountSchema = z
  .number({ error: "Amount is required" })
  .gt(0, "Compensating reversal amount must be greater than 0")
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Amount must have at most two decimal places",
  });

export const UpsertMoneyAccountPaymentRouteSchema = z
  .object({
    paymentMethod: MoneyAccountPaymentRouteMethodSchema,
    moneyAccountId: z.uuid("Invalid money account id"),
  })
  .strict();

export const MoneyAccountPaymentRouteDTOSchema = z.object({
  id: z.uuid("Invalid payment route id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  paymentMethod: MoneyAccountPaymentRouteMethodSchema,
  moneyAccountId: z.uuid("Invalid money account id"),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const MoneyAccountMovementDTOSchema = z
  .object({
    id: z.uuid("Invalid money account movement id"),
    organizationId: z.uuid("Invalid organization id"),
    moneyAccountId: z.uuid("Invalid money account id"),
    storeId: z.uuid("Invalid store id"),
    amount: moneyAccountMovementSignedAmountSchema,
    occurredAt: dtoDateSchema,
    sourceKind: MoneyAccountMovementSourceKindSchema,
    paymentId: z.uuid("Invalid payment id").nullable(),
    outgoingPaymentId: z.uuid("Invalid outgoing payment id").nullable(),
    reversedMovementId: z.uuid("Invalid reversed money account movement id").nullable(),
    createdAt: dtoDateSchema,
  })
  .superRefine((value, ctx) => {
    if (value.sourceKind === "pos_payment") {
      if (!(value.amount > 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Amount must be greater than 0",
        });
      }
      if (!value.paymentId) {
        ctx.addIssue({
          code: "custom",
          path: ["paymentId"],
          message: "A POS Payment Movement must link a Payment",
        });
      }
      if (value.outgoingPaymentId) {
        ctx.addIssue({
          code: "custom",
          path: ["outgoingPaymentId"],
          message: "A POS Payment Movement cannot link an Outgoing Payment",
        });
      }
      if (value.reversedMovementId) {
        ctx.addIssue({
          code: "custom",
          path: ["reversedMovementId"],
          message: "A POS Payment Movement cannot reverse another Movement",
        });
      }
      return;
    }

    if (
      value.sourceKind === "outgoing_purchase_payment" ||
      value.sourceKind === "outgoing_expense_payment"
    ) {
      const label =
        value.sourceKind === "outgoing_purchase_payment" ? "Purchase payment" : "Expense payment";
      if (!(value.amount < 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: `A ${label} Movement must be negative`,
        });
      }
      if (!value.outgoingPaymentId) {
        ctx.addIssue({
          code: "custom",
          path: ["outgoingPaymentId"],
          message: `A ${label} Movement must link an Outgoing Payment`,
        });
      }
      if (value.paymentId) {
        ctx.addIssue({
          code: "custom",
          path: ["paymentId"],
          message: `A ${label} Movement cannot reuse a POS Payment id`,
        });
      }
      if (value.reversedMovementId) {
        ctx.addIssue({
          code: "custom",
          path: ["reversedMovementId"],
          message: `A ${label} Movement cannot reverse another Movement`,
        });
      }
      return;
    }

    if (
      value.sourceKind === "outgoing_purchase_payment_reversal" ||
      value.sourceKind === "outgoing_purchase_void_reversal" ||
      value.sourceKind === "outgoing_expense_payment_reversal" ||
      value.sourceKind === "outgoing_expense_void_reversal"
    ) {
      const label = MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS[value.sourceKind];
      if (!(value.amount > 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: `A ${label} Movement must be positive`,
        });
      }
      if (value.paymentId) {
        ctx.addIssue({
          code: "custom",
          path: ["paymentId"],
          message: `A ${label} cannot reuse a POS Payment id`,
        });
      }
      if (value.outgoingPaymentId) {
        ctx.addIssue({
          code: "custom",
          path: ["outgoingPaymentId"],
          message: `A ${label} cannot reuse an Outgoing Payment id`,
        });
      }
      if (!value.reversedMovementId) {
        ctx.addIssue({
          code: "custom",
          path: ["reversedMovementId"],
          message: `A ${label} must reference the original Movement`,
        });
      }
      return;
    }

    if (!(value.amount < 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Reversal amount must be less than 0",
      });
    }
    if (value.paymentId) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentId"],
        message: "A bill-edit reversal cannot reuse a Payment id",
      });
    }
    if (value.outgoingPaymentId) {
      ctx.addIssue({
        code: "custom",
        path: ["outgoingPaymentId"],
        message: "A bill-edit reversal cannot link an Outgoing Payment",
      });
    }
    if (!value.reversedMovementId) {
      ctx.addIssue({
        code: "custom",
        path: ["reversedMovementId"],
        message: "A bill-edit reversal must reference the original Movement",
      });
    }
  });

export const MoneyAccountHistoryOpeningEntrySchema = z.object({
  kind: z.literal("opening_balance"),
  amount: moneyAccountOpeningBalanceSchema,
  occurredAt: dtoDateSchema,
});

export const MoneyAccountHistoryMovementEntrySchema = z.object({
  kind: z.literal("pos_payment"),
  id: z.uuid("Invalid money account movement id"),
  amount: moneyAccountMovementAmountSchema,
  occurredAt: dtoDateSchema,
  storeId: z.uuid("Invalid store id"),
  paymentId: z.uuid("Invalid payment id"),
  saleId: z.uuid("Invalid sale id"),
  saleNumber: z.string().nullable(),
  paymentMethod: PaymentMethodSchema,
});

export const MoneyAccountHistoryReversalEntrySchema = z.object({
  kind: z.literal("sale_replacement_reversal"),
  id: z.uuid("Invalid money account movement id"),
  amount: moneyAccountMovementReversalAmountSchema,
  occurredAt: dtoDateSchema,
  storeId: z.uuid("Invalid store id"),
  reversedMovementId: z.uuid("Invalid reversed money account movement id"),
  originalPaymentId: z.uuid("Invalid payment id").nullable(),
  saleId: z.uuid("Invalid sale id").nullable(),
  saleNumber: z.string().nullable(),
  paymentMethod: PaymentMethodSchema.nullable(),
});

export const MoneyAccountHistoryOutgoingPurchasePaymentEntrySchema = z.object({
  kind: z.literal("outgoing_purchase_payment"),
  id: z.uuid("Invalid money account movement id"),
  amount: moneyAccountMovementReversalAmountSchema,
  occurredAt: dtoDateSchema,
  storeId: z.uuid("Invalid store id"),
  outgoingPaymentId: z.uuid("Invalid outgoing payment id"),
  purchaseId: z.uuid("Invalid purchase id"),
  vendorName: z.string().min(1),
  paymentMethod: PaymentMethodSchema,
});

export const MoneyAccountHistoryOutgoingExpensePaymentEntrySchema = z.object({
  kind: z.literal("outgoing_expense_payment"),
  id: z.uuid("Invalid money account movement id"),
  amount: moneyAccountMovementReversalAmountSchema,
  occurredAt: dtoDateSchema,
  storeId: z.uuid("Invalid store id"),
  outgoingPaymentId: z.uuid("Invalid outgoing payment id"),
  expenseId: z.uuid("Invalid expense id"),
  expenseCategoryName: z.string().min(1),
  paymentMethod: PaymentMethodSchema,
});

export const MoneyAccountHistoryOutgoingPurchasePaymentReversalEntrySchema = z.object({
  kind: z.literal("outgoing_purchase_payment_reversal"),
  id: z.uuid("Invalid money account movement id"),
  amount: moneyAccountMovementCompensatingAmountSchema,
  occurredAt: dtoDateSchema,
  storeId: z.uuid("Invalid store id"),
  reversedMovementId: z.uuid("Invalid reversed money account movement id"),
  originalOutgoingPaymentId: z.uuid("Invalid outgoing payment id"),
  purchaseId: z.uuid("Invalid purchase id"),
  vendorName: z.string().min(1),
  paymentMethod: PaymentMethodSchema,
});

export const MoneyAccountHistoryOutgoingPurchaseVoidReversalEntrySchema = z.object({
  kind: z.literal("outgoing_purchase_void_reversal"),
  id: z.uuid("Invalid money account movement id"),
  amount: moneyAccountMovementCompensatingAmountSchema,
  occurredAt: dtoDateSchema,
  storeId: z.uuid("Invalid store id"),
  reversedMovementId: z.uuid("Invalid reversed money account movement id"),
  originalOutgoingPaymentId: z.uuid("Invalid outgoing payment id"),
  purchaseId: z.uuid("Invalid purchase id"),
  vendorName: z.string().min(1),
  paymentMethod: PaymentMethodSchema,
});

export const MoneyAccountHistoryOutgoingExpensePaymentReversalEntrySchema = z.object({
  kind: z.literal("outgoing_expense_payment_reversal"),
  id: z.uuid("Invalid money account movement id"),
  amount: moneyAccountMovementCompensatingAmountSchema,
  occurredAt: dtoDateSchema,
  storeId: z.uuid("Invalid store id"),
  reversedMovementId: z.uuid("Invalid reversed money account movement id"),
  originalOutgoingPaymentId: z.uuid("Invalid outgoing payment id"),
  expenseId: z.uuid("Invalid expense id"),
  expenseCategoryName: z.string().min(1),
  paymentMethod: PaymentMethodSchema,
});

export const MoneyAccountHistoryOutgoingExpenseVoidReversalEntrySchema = z.object({
  kind: z.literal("outgoing_expense_void_reversal"),
  id: z.uuid("Invalid money account movement id"),
  amount: moneyAccountMovementCompensatingAmountSchema,
  occurredAt: dtoDateSchema,
  storeId: z.uuid("Invalid store id"),
  reversedMovementId: z.uuid("Invalid reversed money account movement id"),
  originalOutgoingPaymentId: z.uuid("Invalid outgoing payment id"),
  expenseId: z.uuid("Invalid expense id"),
  expenseCategoryName: z.string().min(1),
  paymentMethod: PaymentMethodSchema,
});

export const MoneyAccountHistoryEntrySchema = z.discriminatedUnion("kind", [
  MoneyAccountHistoryOpeningEntrySchema,
  MoneyAccountHistoryMovementEntrySchema,
  MoneyAccountHistoryReversalEntrySchema,
  MoneyAccountHistoryOutgoingPurchasePaymentEntrySchema,
  MoneyAccountHistoryOutgoingExpensePaymentEntrySchema,
  MoneyAccountHistoryOutgoingPurchasePaymentReversalEntrySchema,
  MoneyAccountHistoryOutgoingPurchaseVoidReversalEntrySchema,
  MoneyAccountHistoryOutgoingExpensePaymentReversalEntrySchema,
  MoneyAccountHistoryOutgoingExpenseVoidReversalEntrySchema,
]);

export const MoneyAccountHistoryResponseSchema = z.object({
  moneyAccount: MoneyAccountDTOSchema,
  openingBalance: moneyAccountOpeningBalanceSchema,
  balance: moneyAccountBalanceSchema,
  entries: z.array(MoneyAccountHistoryEntrySchema),
});

export const MoneyAccountHistoryQuerySchema = z.object({
  occurredFrom: z.iso.datetime().optional(),
  occurredTo: z.iso.datetime().optional(),
});
