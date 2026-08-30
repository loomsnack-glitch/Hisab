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

export const MoneyAccountStatusSchema = z.enum(["active", "inactive"]);
export const MoneyAccountScopeSchema = z.enum(["organization_wide"]);
export const OrganizationWideMoneyAccountTypeSchema = z.enum(ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPES);
export const MoneyAccountTypeSchema = OrganizationWideMoneyAccountTypeSchema;

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

export const MONEY_ACCOUNT_SCOPE_LABELS: Record<z.infer<typeof MoneyAccountScopeSchema>, string> = {
  organization_wide: "Organization-wide",
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

export const MoneyAccountDTOSchema = z.object({
  id: z.uuid("Invalid money account id"),
  organizationId: z.uuid("Invalid organization id"),
  name: moneyAccountNameSchema,
  type: MoneyAccountTypeSchema,
  scope: MoneyAccountScopeSchema,
  notes: z.string().nullable(),
  status: MoneyAccountStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateMoneyAccountSchema = z
  .object({
    name: moneyAccountNameSchema,
    type: OrganizationWideMoneyAccountTypeSchema,
    notes: moneyAccountNotesSchema,
    status: MoneyAccountStatusSchema.optional(),
  })
  .strict();

export const UpdateMoneyAccountSchema = z
  .object({
    name: moneyAccountNameSchema.optional(),
    type: OrganizationWideMoneyAccountTypeSchema.optional(),
    notes: moneyAccountNotesSchema,
    status: MoneyAccountStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.type !== undefined ||
      value.notes !== undefined ||
      value.status !== undefined,
    { message: "At least one field is required" },
  );
