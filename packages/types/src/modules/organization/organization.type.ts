import type z from "zod";
import type {
  CreateOrganizationSchema,
  CreateStoreDeviceSchema,
  CreateStoreSchema,
  OrganizationCatalogSettingsDTOSchema,
  OrganizationDTOSchema,
  OrganizationUsernameAvailabilityQuerySchema,
  StoreDevicePosSettingsDTOSchema,
  StoreDeviceDTOSchema,
  StoreDTOSchema,
  StoreMessageLinkSchema,
  UpdateOrganizationSchema,
  UpdateOrganizationCatalogSettingsSchema,
  UpdateStoreDeviceSchema,
  UpdateStoreDevicePosSettingsSchema,
  UpdateStoreSchema,
} from "./organization.schema";

export type OrganizationDTO = z.infer<typeof OrganizationDTOSchema>;
export type StoreDTO = z.infer<typeof StoreDTOSchema>;
export type StoreMessageLink = z.infer<typeof StoreMessageLinkSchema>;
export type StoreDeviceDTO = z.infer<typeof StoreDeviceDTOSchema>;
export type OrganizationCatalogSettingsDTO = z.infer<
  typeof OrganizationCatalogSettingsDTOSchema
>;
export type StoreDevicePosSettingsDTO = z.infer<
  typeof StoreDevicePosSettingsDTOSchema
>;
export type StoreDeviceStatus = StoreDeviceDTO["status"];

export type CreateOrganizationJSON = z.infer<typeof CreateOrganizationSchema>;
export type CreateOrganizationSVC = CreateOrganizationJSON;
export type OrganizationUsernameAvailabilityQuery = z.infer<
  typeof OrganizationUsernameAvailabilityQuerySchema
>;

export type UpdateOrganizationJSON = z.infer<typeof UpdateOrganizationSchema>;
export type UpdateOrganizationSVC = UpdateOrganizationJSON;

export type UpdateOrganizationCatalogSettingsJSON = z.infer<
  typeof UpdateOrganizationCatalogSettingsSchema
>;
export type UpdateOrganizationCatalogSettingsSVC =
  UpdateOrganizationCatalogSettingsJSON;

export type CreateStoreJSON = z.infer<typeof CreateStoreSchema>;
export type CreateStoreSVC = CreateStoreJSON;

export type UpdateStoreJSON = z.infer<typeof UpdateStoreSchema>;
export type UpdateStoreSVC = UpdateStoreJSON;

export type CreateStoreDeviceJSON = z.infer<typeof CreateStoreDeviceSchema>;
export type CreateStoreDeviceSVC = CreateStoreDeviceJSON;

export type UpdateStoreDeviceJSON = z.infer<typeof UpdateStoreDeviceSchema>;
export type UpdateStoreDeviceSVC = UpdateStoreDeviceJSON;

export type UpdateStoreDevicePosSettingsJSON = z.infer<
  typeof UpdateStoreDevicePosSettingsSchema
>;
export type UpdateStoreDevicePosSettingsSVC = UpdateStoreDevicePosSettingsJSON;

export type CreateOrganizationREPO = Pick<
  OrganizationDTO,
  "id" | "name" | "username" | "createdBy"
> & {
  updatedBy?: string | null;
};

export type UpdateOrganizationREPO = Pick<
  OrganizationDTO,
  "id" | "name" | "username"
> & {
  tagline: string | null;
  updatedBy: string;
};

export type CreateStoreREPO = Pick<
  StoreDTO,
  "id" | "organizationId" | "name" | "createdBy"
> & {
  address?: string | null;
  updatedBy?: string | null;
};

export type UpdateStoreREPO = Pick<StoreDTO, "id" | "name"> & {
  address: string | null;
  reviewPlatform: string | null;
  reviewLink: string | null;
  socialMediaName: string | null;
  socialMediaLink: string | null;
  whatsappLinks: StoreMessageLink[];
  updatedBy: string;
};

export type CreateStoreDeviceREPO = Pick<
  StoreDeviceDTO,
  "id" | "storeId" | "organizationId" | "name" | "loginUsername" | "createdBy"
> & {
  deviceSecretEncrypted: string;
  updatedBy?: string | null;
};

export type UpdateStoreDeviceREPO = Pick<
  StoreDeviceDTO,
  "id" | "name" | "status"
> & {
  loginUsername?: string;
  updatedBy: string;
  deviceSecretEncrypted?: string;
};

export type StoreWithDevicesDTO = StoreDTO & {
  devices: StoreDeviceDTO[];
};

export type OrganizationDetailsDTO = OrganizationDTO & {
  stores: StoreWithDevicesDTO[];
};

export type OrganizationsListResponse = {
  organizations: OrganizationDTO[];
};

export type OrganizationDetailsResponse = {
  organization: OrganizationDetailsDTO;
};

export type OrganizationResponse = {
  organization: OrganizationDTO;
};

export type OrganizationUsernameAvailabilityResponse = {
  username: string;
  available: boolean;
};

export type StoresListResponse = {
  stores: StoreDTO[];
};

export type StoreResponse = {
  store: StoreDTO;
};

export type StoreDevicesListResponse = {
  devices: StoreDeviceDTO[];
};

export type StoreDeviceResponse = {
  device: StoreDeviceDTO;
};

export type StoreDeviceSecretResponse = {
  deviceSecret: string;
};

export type OrganizationCatalogSettingsResponse = {
  settings: OrganizationCatalogSettingsDTO;
};

export type PosSettingsResponse = {
  organizationCatalogSettings: OrganizationCatalogSettingsDTO;
  storeDevicePosSettings: StoreDevicePosSettingsDTO;
};
