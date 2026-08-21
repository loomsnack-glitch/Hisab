import { z } from "zod";
import { OrganizationDTOSchema, StoreDTOSchema, StoreDeviceDTOSchema } from "../organization";

const deviceSecretSchema = z
    .string()
    .trim()
    .min(8, "Device secret must be at least 8 characters")
    .max(128, "Device secret must be at most 128 characters");

const organizationUsernameSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Organization username must be at least 2 characters")
    .max(64, "Organization username must be at most 64 characters");

const deviceUsernameSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Device username must be at least 2 characters")
    .max(64, "Device username must be at most 64 characters");

export const DeviceLoginSchema = z.object({
    organizationUsername: organizationUsernameSchema,
    deviceUsername: deviceUsernameSchema,
    deviceSecret: deviceSecretSchema,
});

export const DeviceSessionDeviceDTOSchema = StoreDeviceDTOSchema.pick({
    id: true,
    organizationId: true,
    storeId: true,
    name: true,
    loginUsername: true,
    status: true,
    lastSeenAt: true,
});

export const DeviceSessionStoreDTOSchema = StoreDTOSchema.pick({
    id: true,
    organizationId: true,
    name: true,
    address: true,
    kotSystemEnabled: true,
    tableManagementEnabled: true,
});

export const DeviceSessionOrganizationDTOSchema = OrganizationDTOSchema.pick({
    id: true,
    name: true,
    username: true,
    tagline: true,
});

export const DeviceSessionDTOSchema = z.object({
    device: DeviceSessionDeviceDTOSchema,
    store: DeviceSessionStoreDTOSchema,
    organization: DeviceSessionOrganizationDTOSchema,
});
