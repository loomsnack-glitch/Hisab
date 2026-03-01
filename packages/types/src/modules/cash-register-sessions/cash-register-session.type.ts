import { z } from "zod";
import { SESSION_STATUS_OPTIONS } from "./cash-register-session.constant";
import {
  CashRegisterSessionDTOSchema,
  CreateCashRegisterSessionDTOSchema,
  UpdateCashRegisterSessionDTOSchema,
} from "./cash-register-session.schema";

export type SessionStatusEnum = (typeof SESSION_STATUS_OPTIONS)[number]["value"];

export type CashRegisterSessionDTO = z.infer<typeof CashRegisterSessionDTOSchema>;
export type CreateCashRegisterSessionDTO = z.infer<typeof CreateCashRegisterSessionDTOSchema>;
export type UpdateCashRegisterSessionDTO = z.infer<typeof UpdateCashRegisterSessionDTOSchema>;
