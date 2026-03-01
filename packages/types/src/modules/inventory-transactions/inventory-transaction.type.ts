import { z } from "zod";
import {
  INVENTORY_TRANSACTION_TYPE_OPTIONS,
  INVENTORY_REFERENCE_TYPE_OPTIONS,
} from "./inventory-transaction.constant";
import {
  InventoryTransactionDTOSchema,
  CreateInventoryTransactionDTOSchema,
} from "./inventory-transaction.schema";

export type InventoryTransactionTypeEnum =
  (typeof INVENTORY_TRANSACTION_TYPE_OPTIONS)[number]["value"];
export type InventoryReferenceTypeEnum =
  (typeof INVENTORY_REFERENCE_TYPE_OPTIONS)[number]["value"];

export type InventoryTransactionDTO = z.infer<typeof InventoryTransactionDTOSchema>;
export type CreateInventoryTransactionDTO = z.infer<typeof CreateInventoryTransactionDTOSchema>;
