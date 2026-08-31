import type { z } from "zod";
import type {
  CreateDraftExpenseSchema,
  ExpenseDTOSchema,
  ExpenseLifecycleSchema,
  ExpensePayableStatusSchema,
  UpdateDraftExpenseSchema,
} from "./expenses.schema";

export type ExpenseLifecycle = z.infer<typeof ExpenseLifecycleSchema>;
export type ExpensePayableStatus = z.infer<typeof ExpensePayableStatusSchema>;
export type ExpenseDTO = z.infer<typeof ExpenseDTOSchema>;

export type CreateDraftExpenseJSON = z.infer<typeof CreateDraftExpenseSchema>;
export type CreateDraftExpenseSVC = CreateDraftExpenseJSON;
export type UpdateDraftExpenseJSON = z.infer<typeof UpdateDraftExpenseSchema>;
export type UpdateDraftExpenseSVC = UpdateDraftExpenseJSON;

export type CreateExpenseREPO = Pick<
  ExpenseDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "expenseCategoryId"
  | "expenseCategoryName"
  | "lifecycle"
  | "payableStatus"
  | "effectiveDate"
  | "invoiceReference"
  | "notes"
  | "total"
  | "paidTotal"
  | "dueAmount"
  | "recordedAt"
  | "createdBy"
> & {
  updatedBy?: string | null;
};

export type UpdateExpenseREPO = Pick<
  ExpenseDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "expenseCategoryId"
  | "expenseCategoryName"
  | "lifecycle"
  | "payableStatus"
  | "effectiveDate"
  | "invoiceReference"
  | "notes"
  | "total"
  | "paidTotal"
  | "dueAmount"
  | "recordedAt"
  | "updatedBy"
>;

export type ExpensesListResponse = {
  expenses: ExpenseDTO[];
};

export type ExpenseResponse = {
  expense: ExpenseDTO;
};
