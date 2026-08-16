import { z } from "zod";
import { dtoDateSchema } from "../../common";

const tableLabelSchema = z
  .string()
  .trim()
  .min(1, "Table no is required")
  .max(64, "Table no must be at most 64 characters")
  .regex(/^[^\r\n]+$/, "Table no cannot contain line breaks");

const normalizedCoordinateSchema = z
  .number()
  .finite("Position must be a finite number")
  .min(0, "Position cannot be less than 0")
  .max(1, "Position cannot be greater than 1");

export const ServiceTableStateSchema = z.enum([
  "free",
  "allocated",
  "engaged",
  "ready_to_bill",
  "payment_due",
  "paid",
]);

export const ServiceTablePositionSchema = z
  .object({
    x: normalizedCoordinateSchema,
    y: normalizedCoordinateSchema,
  })
  .strict();

export const ServiceTableDTOSchema = z.object({
  id: z.uuid("Invalid table id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  tableLabel: tableLabelSchema,
  capacity: z.number().int().positive().nullable(),
  position: ServiceTablePositionSchema,
  state: ServiceTableStateSchema,
  currentSaleId: z.uuid("Invalid current sale id").nullable(),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateServiceTableSchema = z
  .object({
    tableLabel: tableLabelSchema,
    capacity: z.number().int().positive().nullable().optional(),
    position: ServiceTablePositionSchema.optional(),
  })
  .strict();

export const UpdateServiceTableSchema = z
  .object({
    tableLabel: tableLabelSchema.optional(),
    capacity: z.number().int().positive().nullable().optional(),
    position: ServiceTablePositionSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one table field is required");
