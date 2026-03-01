import { z } from "zod";
import {
  SaleItemDTOSchema,
  CreateSaleItemDTOSchema,
} from "./sale-item.schema";

export type SaleItemDTO = z.infer<typeof SaleItemDTOSchema>;
export type CreateSaleItemDTO = z.infer<typeof CreateSaleItemDTOSchema>;
