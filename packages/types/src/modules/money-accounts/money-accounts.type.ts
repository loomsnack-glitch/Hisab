import type { z } from "zod";
import type {
  CreateMoneyAccountSchema,
  MoneyAccountDTOSchema,
  MoneyAccountScopeSchema,
  MoneyAccountStatusSchema,
  MoneyAccountTypeSchema,
  OrganizationWideMoneyAccountTypeSchema,
  UpdateMoneyAccountSchema,
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
  "id" | "organizationId" | "name" | "type" | "scope" | "notes" | "status" | "createdBy"
> & {
  updatedBy?: string | null;
};

export type UpdateMoneyAccountJSON = z.infer<typeof UpdateMoneyAccountSchema>;
export type UpdateMoneyAccountSVC = UpdateMoneyAccountJSON;
export type UpdateMoneyAccountREPO = Pick<
  MoneyAccountDTO,
  "id" | "organizationId" | "name" | "type" | "scope" | "notes" | "status" | "updatedBy"
>;

export type MoneyAccountsListResponse = {
  moneyAccounts: MoneyAccountDTO[];
};

export type MoneyAccountResponse = {
  moneyAccount: MoneyAccountDTO;
};
