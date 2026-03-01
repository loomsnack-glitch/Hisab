import { z } from "zod";
import {
  PAYMENT_METHOD_OPTIONS,
  TXN_STATUS_OPTIONS,
  PAYMENT_DIRECTION_OPTIONS,
} from "./payment.constant";
import {
  PaymentDTOSchema,
  CreatePaymentDTOSchema,
  UpdatePaymentDTOSchema,
} from "./payment.schema";

export type PaymentMethodEnum = (typeof PAYMENT_METHOD_OPTIONS)[number]["value"];
export type TxnStatusEnum = (typeof TXN_STATUS_OPTIONS)[number]["value"];
export type PaymentDirectionEnum = (typeof PAYMENT_DIRECTION_OPTIONS)[number]["value"];

export type PaymentDTO = z.infer<typeof PaymentDTOSchema>;
export type CreatePaymentDTO = z.infer<typeof CreatePaymentDTOSchema>;
export type UpdatePaymentDTO = z.infer<typeof UpdatePaymentDTOSchema>;
