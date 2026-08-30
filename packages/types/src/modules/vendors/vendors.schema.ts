import { z } from "zod";
import { dtoDateSchema } from "../../common";

export const VENDOR_NAME_MAX_LENGTH = 255;
export const VENDOR_DESCRIPTION_MAX_LENGTH = 1000;

export const VendorStatusSchema = z.enum(["active", "inactive"]);

const vendorNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(VENDOR_NAME_MAX_LENGTH, `Name must be at most ${VENDOR_NAME_MAX_LENGTH} characters`);

const vendorDescriptionSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(
        VENDOR_DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${VENDOR_DESCRIPTION_MAX_LENGTH} characters`,
      ),
  ])
  .nullable()
  .optional();

export const VendorDTOSchema = z.object({
  id: z.uuid("Invalid vendor id"),
  organizationId: z.uuid("Invalid organization id"),
  name: vendorNameSchema,
  description: z.string().nullable(),
  status: VendorStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateVendorSchema = z
  .object({
    name: vendorNameSchema,
    description: vendorDescriptionSchema,
    status: VendorStatusSchema.optional(),
  })
  .strict();

export const UpdateVendorSchema = z
  .object({
    name: vendorNameSchema.optional(),
    description: vendorDescriptionSchema,
    status: VendorStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.status !== undefined,
    { message: "At least one field is required" },
  );
