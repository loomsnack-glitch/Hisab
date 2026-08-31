import { z } from "zod";
import { dtoDateSchema } from "../../common";

export const EXPENSE_CATEGORY_NAME_MAX_LENGTH = 255;

export const ExpenseCategoryStatusSchema = z.enum(["active", "inactive"]);
export const ExpenseCategoryKindSchema = z.enum(["predefined", "custom"]);

const expenseCategoryNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(
    EXPENSE_CATEGORY_NAME_MAX_LENGTH,
    `Name must be at most ${EXPENSE_CATEGORY_NAME_MAX_LENGTH} characters`,
  );

export const normalizeExpenseCategoryName = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export const isExpenseCategoryAvailableForAssignment = (category: {
  status: z.infer<typeof ExpenseCategoryStatusSchema>;
}): boolean => category.status === "active";

export const ExpenseCategoryDTOSchema = z.object({
  id: z.uuid("Invalid expense category id"),
  organizationId: z.uuid("Invalid organization id"),
  name: expenseCategoryNameSchema,
  kind: ExpenseCategoryKindSchema,
  predefinedKey: z.string().min(1).nullable(),
  status: ExpenseCategoryStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateExpenseCategorySchema = z
  .object({
    name: expenseCategoryNameSchema,
    status: ExpenseCategoryStatusSchema.optional(),
  })
  .strict();

export const UpdateExpenseCategorySchema = z
  .object({
    name: expenseCategoryNameSchema.optional(),
    status: ExpenseCategoryStatusSchema.optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.status !== undefined, {
    message: "At least one field is required",
  });
