import { z } from "zod";
import { SALE_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from "./sale.constant";

const saleStatusValues = SALE_STATUS_OPTIONS.map((o) => o.value) as [string, ...string[]];
const paymentStatusValues = PAYMENT_STATUS_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const SaleDTOSchema = z.object({
  id: z.uuid(),
  saleNumber: z.number().int().positive(),
  organizationId: z.uuid(),
  storeId: z.uuid(),
  sessionId: z.uuid().nullable().optional(),
  customerId: z.uuid().nullable().optional(),
  userId: z.uuid(),
  status: z.enum(saleStatusValues).default("draft"),
  subtotal: z.number().nonnegative().default(0),
  taxTotal: z.number().nonnegative().default(0),
  discountTotal: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative().default(0),
  paymentStatus: z.enum(paymentStatusValues).default("pending"),
  voidedAt: z.coerce.date().nullable().optional(),
  voidReason: z.string().nullable().optional(),
  cancelledBy: z.uuid().nullable().optional(),
  syncId: z.uuid().optional(),
  syncVersion: z.number().int().default(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateSaleDTOSchema = SaleDTOSchema.omit({
  id: true,
  saleNumber: true,
  subtotal: true,
  taxTotal: true,
  discountTotal: true,
  grandTotal: true,
  voidedAt: true,
  voidReason: true,
  cancelledBy: true,
  syncId: true,
  syncVersion: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateSaleDTOSchema = SaleDTOSchema.omit({
  id: true,
  saleNumber: true,
  organizationId: true,
  storeId: true,
  syncId: true,
  syncVersion: true,
  createdAt: true,
  updatedAt: true,
}).partial();
