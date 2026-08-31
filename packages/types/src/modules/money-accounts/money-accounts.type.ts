import type { z } from "zod";
import type { PaymentMethod } from "../billing/billing.type";
import type {
  CreateMoneyAccountSchema,
  MoneyAccountDTOSchema,
  MoneyAccountHistoryEntrySchema,
  MoneyAccountHistoryResponseSchema,
  MoneyAccountMovementDTOSchema,
  MoneyAccountMovementSourceKindSchema,
  MoneyAccountPaymentRouteDTOSchema,
  MoneyAccountPaymentRouteMethodSchema,
  MoneyAccountScopeSchema,
  MoneyAccountStatusSchema,
  MoneyAccountTypeSchema,
  OrganizationWideMoneyAccountTypeSchema,
  UpdateMoneyAccountSchema,
  UpsertMoneyAccountPaymentRouteSchema,
} from "./money-accounts.schema";

export type MoneyAccountStatus = z.infer<typeof MoneyAccountStatusSchema>;
export type MoneyAccountScope = z.infer<typeof MoneyAccountScopeSchema>;
export type MoneyAccountType = z.infer<typeof MoneyAccountTypeSchema>;
export type OrganizationWideMoneyAccountType = z.infer<
  typeof OrganizationWideMoneyAccountTypeSchema
>;
export type MoneyAccountDTO = z.infer<typeof MoneyAccountDTOSchema>;

export type CreateMoneyAccountJSON = z.infer<typeof CreateMoneyAccountSchema>;
export type CreateMoneyAccountSVC = CreateMoneyAccountJSON;
export type CreateMoneyAccountREPO = Pick<
  MoneyAccountDTO,
  | "id"
  | "organizationId"
  | "name"
  | "type"
  | "scope"
  | "storeId"
  | "notes"
  | "status"
  | "openingBalance"
  | "createdBy"
> & {
  updatedBy?: string | null;
};

export type UpdateMoneyAccountJSON = z.infer<typeof UpdateMoneyAccountSchema>;
export type UpdateMoneyAccountSVC = UpdateMoneyAccountJSON;
export type UpdateMoneyAccountREPO = Pick<
  MoneyAccountDTO,
  | "id"
  | "organizationId"
  | "name"
  | "type"
  | "scope"
  | "storeId"
  | "notes"
  | "status"
  | "openingBalance"
  | "updatedBy"
>;

export type MoneyAccountsListResponse = {
  moneyAccounts: MoneyAccountDTO[];
};

export type MoneyAccountResponse = {
  moneyAccount: MoneyAccountDTO;
};

export type MoneyAccountPaymentRouteMethod = z.infer<typeof MoneyAccountPaymentRouteMethodSchema>;
export type MoneyAccountPaymentRouteDTO = z.infer<typeof MoneyAccountPaymentRouteDTOSchema>;
export type UpsertMoneyAccountPaymentRouteJSON = z.infer<typeof UpsertMoneyAccountPaymentRouteSchema>;
export type UpsertMoneyAccountPaymentRouteSVC = UpsertMoneyAccountPaymentRouteJSON;
export type UpsertMoneyAccountPaymentRouteREPO = Pick<
  MoneyAccountPaymentRouteDTO,
  "id" | "organizationId" | "storeId" | "paymentMethod" | "moneyAccountId" | "createdBy"
> & {
  updatedBy?: string | null;
};

export type MoneyAccountPaymentRoutesResponse = {
  routes: MoneyAccountPaymentRouteDTO[];
};

export type MoneyAccountPaymentRouteResponse = {
  route: MoneyAccountPaymentRouteDTO;
};

export type MoneyAccountMovementSourceKind = z.infer<typeof MoneyAccountMovementSourceKindSchema>;
export type MoneyAccountMovementDTO = z.infer<typeof MoneyAccountMovementDTOSchema>;
export type CreateMoneyAccountMovementREPO = Pick<
  MoneyAccountMovementDTO,
  | "id"
  | "organizationId"
  | "moneyAccountId"
  | "storeId"
  | "amount"
  | "occurredAt"
  | "sourceKind"
  | "paymentId"
  | "reversedMovementId"
> & {
  outgoingPaymentId?: string | null;
};

export type MoneyAccountHistoryEntry = z.infer<typeof MoneyAccountHistoryEntrySchema>;
export type MoneyAccountHistoryResponse = z.infer<typeof MoneyAccountHistoryResponseSchema>;

export type MoneyAccountHistoryMovementREPO = MoneyAccountMovementDTO & {
  saleId: string | null;
  saleNumber: string | null;
  paymentMethod: PaymentMethod | null;
  originalPaymentId: string | null;
  purchaseId: string | null;
  vendorName: string | null;
  expenseId: string | null;
  expenseCategoryName: string | null;
};
