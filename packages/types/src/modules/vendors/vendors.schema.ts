import { z } from "zod";
import { dtoDateSchema } from "../../common";
import { UnitStatusSchema } from "../units/units.schema";

export const VENDOR_NAME_MAX_LENGTH = 255;
export const VENDOR_DESCRIPTION_MAX_LENGTH = 1000;
export const VENDOR_ITEM_NAME_MAX_LENGTH = 255;

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

export const VendorItemStatusSchema = z.enum(["active", "inactive"]);

const vendorItemNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(
    VENDOR_ITEM_NAME_MAX_LENGTH,
    `Name must be at most ${VENDOR_ITEM_NAME_MAX_LENGTH} characters`,
  );

const isAtMostTwoDecimalPlaces = (value: number): boolean =>
  Number.isFinite(value) && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

export const vendorItemDefaultPurchasePriceSchema = z
  .number({ error: "Default purchase price is required" })
  .min(0, "Default purchase price must be 0 or more")
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Default purchase price must have at most two decimal places",
  });

export const isVendorItemAvailableForFutureSelection = (input: {
  itemStatus: z.infer<typeof VendorItemStatusSchema>;
  vendorStatus: z.infer<typeof VendorStatusSchema>;
}): boolean => input.itemStatus === "active" && input.vendorStatus === "active";

export const canAssignUnitToVendorItem = (input: {
  unitStatus: z.infer<typeof UnitStatusSchema>;
  currentlyAssigned?: boolean;
}): boolean => input.currentlyAssigned === true || input.unitStatus === "active";

export const VendorItemDTOSchema = z.object({
  id: z.uuid("Invalid vendor item id"),
  organizationId: z.uuid("Invalid organization id"),
  vendorId: z.uuid("Invalid vendor id"),
  name: vendorItemNameSchema,
  unitId: z.uuid("Invalid unit id"),
  defaultPurchasePrice: vendorItemDefaultPurchasePriceSchema,
  status: VendorItemStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateVendorItemSchema = z
  .object({
    vendorId: z.uuid("Invalid vendor id"),
    name: vendorItemNameSchema,
    unitId: z.uuid("Invalid unit id"),
    defaultPurchasePrice: vendorItemDefaultPurchasePriceSchema,
    status: VendorItemStatusSchema.optional(),
  })
  .strict();

export const UpdateVendorItemSchema = z
  .object({
    name: vendorItemNameSchema.optional(),
    unitId: z.uuid("Invalid unit id").optional(),
    defaultPurchasePrice: vendorItemDefaultPurchasePriceSchema.optional(),
    status: VendorItemStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.unitId !== undefined ||
      value.defaultPurchasePrice !== undefined ||
      value.status !== undefined,
    { message: "At least one field is required" },
  );
