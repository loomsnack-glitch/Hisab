import type { z } from "zod";
import type {
  CreateOutgoingPaymentSchema,
  OutgoingPaymentDTOSchema,
  OutgoingPaymentMethodSchema,
  OutgoingPaymentReversalKindSchema,
  ReverseOutgoingPaymentSchema,
  VendorOutstandingDTOSchema,
} from "./outgoing-payments.schema";

export type OutgoingPaymentMethod = z.infer<typeof OutgoingPaymentMethodSchema>;
export type OutgoingPaymentReversalKind = z.infer<typeof OutgoingPaymentReversalKindSchema>;
export type OutgoingPaymentDTO = z.infer<typeof OutgoingPaymentDTOSchema>;
export type VendorOutstandingDTO = z.infer<typeof VendorOutstandingDTOSchema>;

export type CreateOutgoingPaymentJSON = z.infer<typeof CreateOutgoingPaymentSchema>;
export type CreateOutgoingPaymentSVC = CreateOutgoingPaymentJSON;
export type ReverseOutgoingPaymentJSON = z.infer<typeof ReverseOutgoingPaymentSchema>;
export type ReverseOutgoingPaymentSVC = ReverseOutgoingPaymentJSON;

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
  | "reversalReason"
  | "reversalKind"
  | "createdBy"
>;

export type ReverseOutgoingPaymentREPO = Pick<
  OutgoingPaymentDTO,
  "id" | "organizationId" | "reversedAt" | "reversalReason" | "reversalKind"
> & {
  reversedAt: Date;
  reversalReason: string;
  reversalKind: OutgoingPaymentReversalKind;
};
