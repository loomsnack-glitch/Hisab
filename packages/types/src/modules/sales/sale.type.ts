import { z } from "zod";
import { SALE_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from "./sale.constant";
import {
  SaleDTOSchema,
  CreateSaleDTOSchema,
  UpdateSaleDTOSchema,
} from "./sale.schema";

export type SaleStatusEnum = (typeof SALE_STATUS_OPTIONS)[number]["value"];
export type PaymentStatusEnum = (typeof PAYMENT_STATUS_OPTIONS)[number]["value"];

export type SaleDTO = z.infer<typeof SaleDTOSchema>;
export type CreateSaleDTO = z.infer<typeof CreateSaleDTOSchema>;
export type UpdateSaleDTO = z.infer<typeof UpdateSaleDTOSchema>;
