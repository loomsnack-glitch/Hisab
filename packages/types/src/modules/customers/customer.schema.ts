import { z } from "zod";
import { CUSTOMER_CONSTANTS, LEDGER_ENTRY_TYPE_OPTIONS } from "./customer.constant";

export const CustomerDTOSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  phone: z.string().min(1).max(CUSTOMER_CONSTANTS.MAX_PHONE_LENGTH),
  name: z.string().max(CUSTOMER_CONSTANTS.MAX_NAME_LENGTH).nullable().optional(),
  loyaltyPoints: z.number().int().default(0),
  balance: z.number().default(0),
  isActive: z.boolean().default(true),
  syncId: z.uuid().optional(),
  syncVersion: z.number().int().default(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateCustomerDTOSchema = CustomerDTOSchema.omit({
  id: true,
  loyaltyPoints: true,
  balance: true,
  isActive: true,
  syncId: true,
  syncVersion: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCustomerDTOSchema = CustomerDTOSchema.omit({
  id: true,
  organizationId: true,
  syncId: true,
  syncVersion: true,
  createdAt: true,
  updatedAt: true,
}).partial();

const ledgerEntryTypeValues = LEDGER_ENTRY_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const CustomerLedgerDTOSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  customerId: z.uuid(),
  type: z.enum(ledgerEntryTypeValues),
  amount: z.number(),
  balanceAfter: z.number(),
  referenceType: z.string().max(50).nullable().optional(),
  referenceId: z.uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});

export const CreateCustomerLedgerDTOSchema = CustomerLedgerDTOSchema.omit({
  id: true,
  balanceAfter: true,
  createdAt: true,
});
