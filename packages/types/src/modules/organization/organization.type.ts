import type z from "zod";
import type {
    CreateOrganizationSchema,
    CreateStoreDeviceSchema,
    CreateStoreSchema,
    OrganizationDTOSchema,
    StoreDeviceDTOSchema,
    StoreDTOSchema,
    UpdateOrganizationSchema,
} from "./organization.schema";

export type OrganizationDTO = z.infer<typeof OrganizationDTOSchema>;
export type StoreDTO = z.infer<typeof StoreDTOSchema>;
export type StoreDeviceDTO = z.infer<typeof StoreDeviceDTOSchema>;
export type StoreDeviceStatus = StoreDeviceDTO["status"];

export type CreateOrganizationJSON = z.infer<typeof CreateOrganizationSchema>;
export type CreateOrganizationSVC = CreateOrganizationJSON;

export type UpdateOrganizationJSON = z.infer<typeof UpdateOrganizationSchema>;
export type UpdateOrganizationSVC = UpdateOrganizationJSON;

export type CreateStoreJSON = z.infer<typeof CreateStoreSchema>;
export type CreateStoreSVC = CreateStoreJSON;

export type CreateStoreDeviceJSON = z.infer<typeof CreateStoreDeviceSchema>;
export type CreateStoreDeviceSVC = CreateStoreDeviceJSON;

export type CreateOrganizationREPO = Pick<OrganizationDTO, "id" | "name" | "createdBy"> & {
    updatedBy?: string | null;
};

export type UpdateOrganizationREPO = Pick<OrganizationDTO, "id" | "name"> & {
    updatedBy: string;
};

export type CreateStoreREPO = Pick<StoreDTO, "id" | "organizationId" | "name" | "createdBy"> & {
    address?: string | null;
    updatedBy?: string | null;
};

export type CreateStoreDeviceREPO = Pick<
    StoreDeviceDTO,
    "id" | "storeId" | "organizationId" | "name" | "createdBy"
> & {
    deviceSecretEncrypted: string;
    updatedBy?: string | null;
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
