import type { z } from "zod";
import type {
  CreateExpenseCategorySchema,
  ExpenseCategoryDTOSchema,
  ExpenseCategoryKindSchema,
  ExpenseCategoryStatusSchema,
  UpdateExpenseCategorySchema,
} from "./expense-categories.schema";

export type ExpenseCategoryStatus = z.infer<typeof ExpenseCategoryStatusSchema>;
export type ExpenseCategoryKind = z.infer<typeof ExpenseCategoryKindSchema>;
export type ExpenseCategoryDTO = z.infer<typeof ExpenseCategoryDTOSchema>;

export type CreateExpenseCategoryJSON = z.infer<typeof CreateExpenseCategorySchema>;
export type CreateExpenseCategorySVC = CreateExpenseCategoryJSON;
export type CreateExpenseCategoryREPO = Pick<
  ExpenseCategoryDTO,
  | "id"
  | "organizationId"
  | "name"
  | "kind"
  | "predefinedKey"
  | "status"
  | "createdBy"
> & {
  updatedBy?: string | null;
};

export type UpdateExpenseCategoryJSON = z.infer<typeof UpdateExpenseCategorySchema>;
export type UpdateExpenseCategorySVC = UpdateExpenseCategoryJSON;
export type UpdateExpenseCategoryREPO = Pick<
  ExpenseCategoryDTO,
  "id" | "organizationId" | "name" | "status" | "updatedBy"
>;

export type ExpenseCategoriesListResponse = {
  expenseCategories: ExpenseCategoryDTO[];
};

export type ExpenseCategoryResponse = {
  expenseCategory: ExpenseCategoryDTO;
};
