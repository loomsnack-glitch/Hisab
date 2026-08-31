import type { z } from "zod";
import type {
  CreateDraftExpenseSchema,
  ExpenseDTOSchema,
  ExpenseLifecycleSchema,
  ExpensePayableStatusSchema,
  RecordExpenseSchema,
  UpdateDraftExpenseSchema,
  VoidExpenseSchema,
} from "./expenses.schema";

export type ExpenseLifecycle = z.infer<typeof ExpenseLifecycleSchema>;
export type ExpensePayableStatus = z.infer<typeof ExpensePayableStatusSchema>;
export type ExpenseDTO = z.infer<typeof ExpenseDTOSchema>;

export type CreateDraftExpenseJSON = z.infer<typeof CreateDraftExpenseSchema>;
export type CreateDraftExpenseSVC = CreateDraftExpenseJSON;
export type UpdateDraftExpenseJSON = z.infer<typeof UpdateDraftExpenseSchema>;
export type UpdateDraftExpenseSVC = UpdateDraftExpenseJSON;
export type VoidExpenseJSON = z.infer<typeof VoidExpenseSchema>;
export type VoidExpenseSVC = VoidExpenseJSON;
export type RecordExpenseJSON = z.infer<typeof RecordExpenseSchema>;
export type RecordExpenseSVC = RecordExpenseJSON;

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
  voidedAt?: Date | string | null;
  voidReason?: string | null;
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
  | "voidedAt"
  | "voidReason"
  | "updatedBy"
>;

export type ExpensesListResponse = {
  expenses: ExpenseDTO[];
};

export type ExpenseResponse = {
  expense: ExpenseDTO;
};
