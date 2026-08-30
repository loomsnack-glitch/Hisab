import { z } from "zod";
import { dtoDateSchema } from "../../common";

export const UNIT_NAME_MAX_LENGTH = 255;
export const UNIT_LABEL_MAX_LENGTH = 32;

export const UnitStatusSchema = z.enum(["active", "inactive"]);
export const UnitKindSchema = z.enum(["predefined", "custom"]);

const unitNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(UNIT_NAME_MAX_LENGTH, `Name must be at most ${UNIT_NAME_MAX_LENGTH} characters`);

const unitLabelSchema = z
  .string()
  .trim()
  .min(1, "Short label is required")
  .max(UNIT_LABEL_MAX_LENGTH, `Short label must be at most ${UNIT_LABEL_MAX_LENGTH} characters`);

export const normalizeUnitToken = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export const isUnitAvailableForAssignment = (unit: {
  status: z.infer<typeof UnitStatusSchema>;
}): boolean => unit.status === "active";

export const UnitDTOSchema = z.object({
  id: z.uuid("Invalid unit id"),
  organizationId: z.uuid("Invalid organization id"),
  name: unitNameSchema,
  label: unitLabelSchema,
  kind: UnitKindSchema,
  predefinedKey: z.string().min(1).nullable(),
  status: UnitStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateUnitSchema = z
  .object({
    name: unitNameSchema,
    label: unitLabelSchema,
    status: UnitStatusSchema.optional(),
  })
  .strict();

export const UpdateUnitSchema = z
  .object({
    name: unitNameSchema.optional(),
    label: unitLabelSchema.optional(),
    status: UnitStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.label !== undefined ||
      value.status !== undefined,
    { message: "At least one field is required" },
  );
