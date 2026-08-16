import { z } from "zod";
import { dtoDateSchema } from "../../common";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(255, "Name must be at most 255 characters");

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9_-]{1,63}$/,
    "Username must be 2-64 characters: lowercase letters, numbers, hyphens, underscores. Must start with a letter or number.",
  )
  .min(2, "Username must be at least 2 characters")
  .max(64, "Username must be at most 64 characters");

const taglineSchema = z
  .union([
    z.literal(""),
    z.string().trim().max(255, "Tagline must be at most 255 characters"),
  ])
  .optional();

const optionalAddressSchema = z
  .union([
    z.literal(""),
    z.string().trim().max(1000, "Address must be at most 1000 characters"),
  ])
  .optional();

const optionalEngagementNameSchema = z
  .union([
    z.literal(""),
    z.string().trim().max(100, "Name must be at most 100 characters"),
  ])
  .optional();

const optionalEngagementLinkSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(2048, "Link must be at most 2048 characters")
      .url("Enter a valid link"),
  ])
  .optional();

const deviceSecretSchema = z
  .string()
  .trim()
  .min(8, "Device secret must be at least 8 characters")
  .max(128, "Device secret must be at most 128 characters");

export const StoreDeviceStatusSchema = z.enum([
  "active",
  "inactive",
  "revoked",
]);

export const OrganizationCatalogSettingsDTOSchema = z.object({
  organizationId: z.uuid("Invalid organization id"),
  barcodeScanningEnabled: z.boolean(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const StoreDevicePosSettingsDTOSchema = z.object({
  deviceId: z.uuid("Invalid device id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  directBarcodeScanEnabled: z.boolean(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const OrganizationDTOSchema = z.object({
  id: z.uuid("Invalid organization id"),
  name: nameSchema,
  username: usernameSchema,
  tagline: z
    .string()
    .max(255, "Tagline must be at most 255 characters")
    .nullable()
    .optional(),
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
  reviewPlatform: z.string().max(100).nullable().optional(),
  reviewLink: z.string().max(2048).nullable().optional(),
  socialMediaName: z.string().max(100).nullable().optional(),
  socialMediaLink: z.string().max(2048).nullable().optional(),
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
  loginUsername: usernameSchema,
  status: StoreDeviceStatusSchema,
  lastSeenAt: dtoDateSchema.nullable().optional(),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateOrganizationSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
});

export const OrganizationUsernameAvailabilityQuerySchema = z.object({
  username: usernameSchema,
});

export const UpdateOrganizationSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  tagline: taglineSchema,
});

export const CreateStoreSchema = z.object({
  name: nameSchema,
  address: optionalAddressSchema,
});

export const UpdateStoreSchema = z
  .object({
    name: nameSchema,
    address: optionalAddressSchema,
    reviewPlatform: optionalEngagementNameSchema,
    reviewLink: optionalEngagementLinkSchema,
    socialMediaName: optionalEngagementNameSchema,
    socialMediaLink: optionalEngagementLinkSchema,
  })
  .superRefine((store, context) => {
    if (Boolean(store.reviewPlatform) !== Boolean(store.reviewLink)) {
      context.addIssue({
        code: "custom",
        path: [store.reviewPlatform ? "reviewLink" : "reviewPlatform"],
        message: "Review platform and link must be provided together",
      });
    }
    if (Boolean(store.socialMediaName) !== Boolean(store.socialMediaLink)) {
      context.addIssue({
        code: "custom",
        path: [store.socialMediaName ? "socialMediaLink" : "socialMediaName"],
        message: "Social media name and link must be provided together",
      });
    }
  });

export const CreateStoreDeviceSchema = z.object({
  name: nameSchema,
  loginUsername: usernameSchema,
  deviceSecret: deviceSecretSchema,
});

export const UpdateStoreDeviceSchema = z.object({
  name: nameSchema,
  loginUsername: usernameSchema.optional(),
  status: StoreDeviceStatusSchema,
  deviceSecret: z.union([z.literal(""), deviceSecretSchema]).optional(),
});

export const UpdateOrganizationCatalogSettingsSchema = z
  .object({
    barcodeScanningEnabled: z.boolean(),
  })
  .strict();

export const UpdateStoreDevicePosSettingsSchema = z
  .object({
    directBarcodeScanEnabled: z.boolean(),
  })
  .strict();
