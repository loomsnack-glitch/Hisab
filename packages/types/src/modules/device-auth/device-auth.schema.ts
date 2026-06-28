import { z } from "zod";
import { OrganizationDTOSchema, StoreDTOSchema, StoreDeviceDTOSchema } from "../organization";

const deviceSecretSchema = z
    .string()
    .trim()
    .min(8, "Device secret must be at least 8 characters")
    .max(128, "Device secret must be at most 128 characters");

export const DeviceLoginSchema = z.object({
    deviceId: z.uuid("Invalid device id"),
    deviceSecret: deviceSecretSchema,
});

export const DeviceSessionDeviceDTOSchema = StoreDeviceDTOSchema.pick({
    id: true,
    organizationId: true,
    storeId: true,
    name: true,
    status: true,
    lastSeenAt: true,
});

export const DeviceSessionStoreDTOSchema = StoreDTOSchema.pick({
    id: true,
    organizationId: true,
    name: true,
    address: true,
});

export const DeviceSessionOrganizationDTOSchema = OrganizationDTOSchema.pick({
    id: true,
    name: true,
});

export const DeviceSessionDTOSchema = z.object({
    device: DeviceSessionDeviceDTOSchema,
    store: DeviceSessionStoreDTOSchema,
    organization: DeviceSessionOrganizationDTOSchema,
});
