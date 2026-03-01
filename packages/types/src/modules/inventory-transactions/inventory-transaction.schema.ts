import { z } from "zod";
import {
  INVENTORY_TRANSACTION_TYPE_OPTIONS,
  INVENTORY_REFERENCE_TYPE_OPTIONS,
} from "./inventory-transaction.constant";

const transactionTypeValues = INVENTORY_TRANSACTION_TYPE_OPTIONS.map((o) => o.value) as [
  string,
  ...string[],
];
const referenceTypeValues = INVENTORY_REFERENCE_TYPE_OPTIONS.map((o) => o.value) as [
  string,
  ...string[],
];

export const InventoryTransactionDTOSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  storeId: z.uuid(),
  productId: z.uuid(),
  userId: z.uuid(),
  type: z.enum(transactionTypeValues),
  quantity: z.number().refine((val) => val !== 0, { message: "Quantity cannot be 0" }),
  referenceType: z.enum(referenceTypeValues),
  referenceId: z.uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});

export const CreateInventoryTransactionDTOSchema = InventoryTransactionDTOSchema.omit({
  id: true,
  createdAt: true,
});
