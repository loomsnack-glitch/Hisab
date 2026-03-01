import { z } from "zod";
import {
  PAYMENT_METHOD_OPTIONS,
  TXN_STATUS_OPTIONS,
  PAYMENT_DIRECTION_OPTIONS,
} from "./payment.constant";

const paymentMethodValues = PAYMENT_METHOD_OPTIONS.map((o) => o.value) as [string, ...string[]];
const txnStatusValues = TXN_STATUS_OPTIONS.map((o) => o.value) as [string, ...string[]];
const paymentDirectionValues = PAYMENT_DIRECTION_OPTIONS.map((o) => o.value) as [
  string,
  ...string[],
];

export const PaymentDTOSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  storeId: z.uuid(),
  saleId: z.uuid().nullable().optional(),
  sessionId: z.uuid().nullable().optional(),
  amount: z.number().positive(),
  direction: z.enum(paymentDirectionValues).default("in"),
  method: z.enum(paymentMethodValues),
  status: z.enum(txnStatusValues).default("completed"),
  referenceNumber: z.string().max(255).nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreatePaymentDTOSchema = PaymentDTOSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdatePaymentDTOSchema = PaymentDTOSchema.omit({
  id: true,
  organizationId: true,
  storeId: true,
  createdAt: true,
  updatedAt: true,
}).partial();
