import type { z } from "zod";
import type {
  CreateOutgoingPaymentSchema,
  OutgoingPaymentDTOSchema,
  OutgoingPaymentMethodSchema,
  VendorOutstandingDTOSchema,
} from "./outgoing-payments.schema";

export type OutgoingPaymentMethod = z.infer<typeof OutgoingPaymentMethodSchema>;
export type OutgoingPaymentDTO = z.infer<typeof OutgoingPaymentDTOSchema>;
export type VendorOutstandingDTO = z.infer<typeof VendorOutstandingDTOSchema>;

export type CreateOutgoingPaymentJSON = z.infer<typeof CreateOutgoingPaymentSchema>;
export type CreateOutgoingPaymentSVC = CreateOutgoingPaymentJSON;

export type CreateOutgoingPaymentREPO = Pick<
  OutgoingPaymentDTO,
  | "id"
  | "organizationId"
  | "purchaseId"
  | "expenseId"
  | "amount"
  | "paymentMethod"
  | "moneyAccountId"
  | "reference"
  | "notes"
  | "paidAt"
  | "reversedAt"
  | "createdBy"
>;
