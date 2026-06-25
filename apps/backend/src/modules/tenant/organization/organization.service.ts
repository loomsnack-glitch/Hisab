import {
    STATUS_CODES,
    type CreateOrganizationSVC,
    type CreateStoreDeviceSVC,
    type CreateStoreSVC,
    type OrganizationDetailsResponse,
    type OrganizationResponse,
    type OrganizationsListResponse,
    type ServiceResponse,
    type StoreDeviceResponse,
    type StoreDevicesListResponse,
    type StoreResponse,
    type StoresListResponse,
} from "@repo/types";
import * as organizationRepository from "./organization.repository";

const normalizeOptionalText = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const getOrganizationForUser = async (organizationId: string, userId: string) => {
    return organizationRepository.getOrganizationByIdForUser(organizationId, userId);
};

const getStoreForOrganization = async (organizationId: string, storeId: string) => {
    return organizationRepository.getStoreById(organizationId, storeId);
};

export const getOrganizations = async (userId: string): Promise<ServiceResponse<OrganizationsListResponse>> => {
    const organizations = await organizationRepository.getOrganizationsByUserId(userId);

    return {
        status: "success",
        data: { organizations },
        message: "Organizations fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createOrganization = async (
    userId: string,
    organizationData: CreateOrganizationSVC,
): Promise<ServiceResponse<OrganizationResponse | null>> => {
    const alreadyExists = await organizationRepository.organizationNameExistsForUser(userId, organizationData.name);
    if (alreadyExists) {
        return {
            status: "error",
            message: "Organization with the same name already exists",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const organization = await organizationRepository.createOrganization({
        id: crypto.randomUUID(),
        name: organizationData.name,
        createdBy: userId,
    });

    if (!organization) {
        return {
            status: "error",
            message: "Failed to create organization",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { organization },
        message: "Organization created successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const getOrganizationDetails = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<OrganizationDetailsResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const stores = await organizationRepository.getStoresByOrganizationId(organizationId);
    const devices = await organizationRepository.getStoreDevicesByOrganizationId(organizationId);

    const devicesByStoreId = new Map<string, typeof devices>();
    for (const device of devices) {
        const existingDevices = devicesByStoreId.get(device.storeId) ?? [];
        existingDevices.push(device);
        devicesByStoreId.set(device.storeId, existingDevices);
    }

    return {
        status: "success",
        data: {
            organization: {
                ...organization,
                stores: stores.map((store) => ({
                    ...store,
                    devices: devicesByStoreId.get(store.id) ?? [],
                })),
            },
        },
        message: "Organization details fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getStores = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<StoresListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const stores = await organizationRepository.getStoresByOrganizationId(organizationId);
    return {
        status: "success",
        data: { stores },
        message: "Stores fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createStore = async (
    userId: string,
    organizationId: string,
    storeData: CreateStoreSVC,
): Promise<ServiceResponse<StoreResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const alreadyExists = await organizationRepository.storeNameExistsInOrganization(organizationId, storeData.name);
    if (alreadyExists) {
        return {
            status: "error",
            message: "Store with the same name already exists in this organization",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const store = await organizationRepository.createStore({
        id: crypto.randomUUID(),
        organizationId,
        name: storeData.name,
        address: normalizeOptionalText(storeData.address),
        createdBy: userId,
    });

    if (!store) {
        return {
            status: "error",
            message: "Failed to create store",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { store },
        message: "Store created successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const getStoreDevices = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<StoreDevicesListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const store = await getStoreForOrganization(organizationId, storeId);
    if (!store) {
        return {
            status: "error",
            message: "Store not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const devices = await organizationRepository.getStoreDevicesByStoreId(organizationId, storeId);
    return {
        status: "success",
        data: { devices },
        message: "Devices fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createStoreDevice = async (
    userId: string,
    organizationId: string,
    storeId: string,
    deviceData: CreateStoreDeviceSVC,
): Promise<ServiceResponse<StoreDeviceResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const store = await getStoreForOrganization(organizationId, storeId);
    if (!store) {
        return {
            status: "error",
            message: "Store not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const alreadyExists = await organizationRepository.deviceNameExistsInStore(storeId, deviceData.name);
    if (alreadyExists) {
        return {
            status: "error",
            message: "Device with the same name already exists in this store",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const deviceSecret = crypto.randomUUID();
    const deviceSecretHash = await Bun.password.hash(deviceSecret);
    const device = await organizationRepository.createStoreDevice({
        id: crypto.randomUUID(),
        organizationId,
        storeId,
        name: deviceData.name,
        deviceSecretHash,
        createdBy: userId,
    });

    if (!device) {
        return {
            status: "error",
            message: "Failed to create device",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: {
            device,
            deviceSecret,
        },
        message: "Device created successfully",
        code: STATUS_CODES.CREATED,
    };
};
