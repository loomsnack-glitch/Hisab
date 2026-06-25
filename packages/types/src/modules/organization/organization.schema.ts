import { z } from "zod";
import { dtoDateSchema } from "../../common";

const nameSchema = z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters");

const optionalAddressSchema = z
    .union([
        z.literal(""),
        z.string().trim().max(1000, "Address must be at most 1000 characters"),
    ])
    .optional();

const deviceSecretSchema = z
    .string()
    .trim()
    .min(8, "Device secret must be at least 8 characters")
    .max(128, "Device secret must be at most 128 characters");

export const StoreDeviceStatusSchema = z.enum(["active", "inactive", "revoked"]);

export const OrganizationDTOSchema = z.object({
    id: z.uuid("Invalid organization id"),
    name: nameSchema,
    createdBy: z.uuid("Invalid creator id"),
    updatedBy: z.uuid("Invalid updater id").nullable().optional(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const StoreDTOSchema = z.object({
    id: z.uuid("Invalid store id"),
    organizationId: z.uuid("Invalid organization id"),
    name: nameSchema,
    address: z.string().nullable().optional(),
    createdBy: z.uuid("Invalid creator id"),
    updatedBy: z.uuid("Invalid updater id").nullable().optional(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const StoreDeviceDTOSchema = z.object({
    id: z.uuid("Invalid device id"),
    storeId: z.uuid("Invalid store id"),
    organizationId: z.uuid("Invalid organization id"),
    name: nameSchema,
    status: StoreDeviceStatusSchema,
    lastSeenAt: dtoDateSchema.nullable().optional(),
    createdBy: z.uuid("Invalid creator id"),
    updatedBy: z.uuid("Invalid updater id").nullable().optional(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const CreateOrganizationSchema = z.object({
    name: nameSchema,
});

export const UpdateOrganizationSchema = z.object({
    name: nameSchema,
});

export const CreateStoreSchema = z.object({
    name: nameSchema,
    address: optionalAddressSchema,
});

export const CreateStoreDeviceSchema = z.object({
    name: nameSchema,
    deviceSecret: deviceSecretSchema,
});
