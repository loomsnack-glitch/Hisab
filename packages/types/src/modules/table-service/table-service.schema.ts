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
  serviceAreaId: z.uuid("Invalid area id").nullable(),
  tableLabel: tableLabelSchema,
  capacity: z.number().int().positive().nullable(),
  position: ServiceTablePositionSchema,
  state: ServiceTableStateSchema,
  currentSaleId: z.uuid("Invalid current sale id").nullable(),
  currentSaleTotal: z.number().nullable(),
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
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one table field is required",
  );

const areaTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(128, "Title must be at most 128 characters")
  .regex(/^[^\r\n]+$/, "Title cannot contain line breaks");

const areaDescriptionSchema = z
  .union([
    z.literal(""),
    z.string().trim().max(1000, "Description must be at most 1000 characters"),
  ])
  .nullable()
  .optional();

export const ServiceAreaDTOSchema = z.object({
  id: z.uuid("Invalid area id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  title: areaTitleSchema,
  description: z.string().nullable(),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateServiceAreaSchema = z
  .object({
    title: areaTitleSchema,
    description: areaDescriptionSchema,
  })
  .strict();

export const UpdateServiceAreaSchema = z
  .object({
    title: areaTitleSchema.optional(),
    description: areaDescriptionSchema,
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one area field is required",
  );

export const AssignServiceTablesToAreaSchema = z
  .object({
    tableIds: z
      .array(z.uuid("Invalid table id"))
      .min(1, "Select at least one table"),
  })
  .strict();
