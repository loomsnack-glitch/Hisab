import { z } from "zod";
import { dtoDateSchema } from "../../common";

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
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.type !== undefined ||
      value.scope !== undefined ||
      value.storeId !== undefined ||
      value.notes !== undefined ||
      value.status !== undefined,
    { message: "At least one field is required" },
  )
  .superRefine((value, ctx) => {
    refineMoneyAccountScopeAndStore(value, ctx);
    refineCashMustBeStoreScoped(value, ctx);
  });
