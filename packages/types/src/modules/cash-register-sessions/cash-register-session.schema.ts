import { z } from "zod";
import { SESSION_STATUS_OPTIONS } from "./cash-register-session.constant";

const sessionStatusValues = SESSION_STATUS_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const CashRegisterSessionDTOSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  storeId: z.uuid(),
  openedBy: z.uuid(),
  closedBy: z.uuid().nullable().optional(),
  openedAt: z.coerce.date(),
  closedAt: z.coerce.date().nullable().optional(),
  openingBalance: z.number().nonnegative().default(0),
  closingBalance: z.number().nonnegative().nullable().optional(),
  expectedBalance: z.number().nonnegative().nullable().optional(),
  status: z.enum(sessionStatusValues).default("open"),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateCashRegisterSessionDTOSchema = CashRegisterSessionDTOSchema.omit({
  id: true,
  closedBy: true,
  closedAt: true,
  closingBalance: true,
  expectedBalance: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCashRegisterSessionDTOSchema = CashRegisterSessionDTOSchema.omit({
  id: true,
  organizationId: true,
  storeId: true,
  openedBy: true,
  openedAt: true,
  createdAt: true,
  updatedAt: true,
}).partial();
