import { z } from "zod";
import { LEDGER_ENTRY_TYPE_OPTIONS } from "./customer.constant";
import {
  CustomerDTOSchema,
  CreateCustomerDTOSchema,
  UpdateCustomerDTOSchema,
  CustomerLedgerDTOSchema,
  CreateCustomerLedgerDTOSchema,
} from "./customer.schema";

export type LedgerEntryTypeEnum = (typeof LEDGER_ENTRY_TYPE_OPTIONS)[number]["value"];

export type CustomerDTO = z.infer<typeof CustomerDTOSchema>;
export type CreateCustomerDTO = z.infer<typeof CreateCustomerDTOSchema>;
export type UpdateCustomerDTO = z.infer<typeof UpdateCustomerDTOSchema>;

export type CustomerLedgerDTO = z.infer<typeof CustomerLedgerDTOSchema>;
export type CreateCustomerLedgerDTO = z.infer<typeof CreateCustomerLedgerDTOSchema>;
