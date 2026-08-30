import {
    STATUS_CODES,
    canAssignUnitToVendorItem,
    type CreateVendorItemSVC,
    type CreateVendorSVC,
    type ServiceResponse,
    type VendorItemResponse,
    type VendorItemsListResponse,
    type VendorResponse,
    type VendorsListResponse,
    type UpdateVendorItemSVC,
    type UpdateVendorSVC,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as unitsRepository from "@/modules/tenant/units/units.repository";
import * as vendorsRepository from "./vendors.repository";

const getOrganizationForUser = async (organizationId: string, userId: string) =>
    organizationRepository.getOrganizationByIdForUser(organizationId, userId);

const organizationNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Organization not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const vendorNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Vendor not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const vendorItemNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Vendor Item not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const unitNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Unit not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const inactiveUnitCannotBeAssigned = (): ServiceResponse<null> => ({
    status: "error",
    message: "Inactive Units cannot be assigned",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const normalizeDescription = (description: string | null | undefined): string | null => {
    if (description === undefined || description === null) {
        return null;
    }
    const trimmed = description.trim();
    return trimmed.length === 0 ? null : trimmed;
};

export const getVendors = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<VendorsListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const vendors = await vendorsRepository.getVendorsByOrganizationId(organizationId);
    return {
        status: "success",
        data: { vendors },
        message: "Vendors fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getVendorDetails = async (
    userId: string,
    organizationId: string,
    vendorId: string,
): Promise<ServiceResponse<VendorResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const vendor = await vendorsRepository.getVendorById(organizationId, vendorId);
    if (!vendor) {
        return vendorNotFound();
    }

    return {
        status: "success",
        data: { vendor },
        message: "Vendor fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createVendor = async (
    userId: string,
    organizationId: string,
    vendorData: CreateVendorSVC,
): Promise<ServiceResponse<VendorResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const vendor = await vendorsRepository.createVendor({
        id: crypto.randomUUID(),
        organizationId,
        name: vendorData.name,
        description: normalizeDescription(vendorData.description),
        status: vendorData.status ?? "active",
        createdBy: userId,
    });

    if (!vendor) {
        return {
            status: "error",
            message: "Failed to create vendor",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { vendor },
        message: "Vendor created successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const updateVendor = async (
    userId: string,
    organizationId: string,
    vendorId: string,
    vendorData: UpdateVendorSVC,
): Promise<ServiceResponse<VendorResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await vendorsRepository.getVendorById(organizationId, vendorId);
    if (!existing) {
        return vendorNotFound();
    }

    const vendor = await vendorsRepository.updateVendor({
        id: vendorId,
        organizationId,
        name: vendorData.name ?? existing.name,
        description:
            vendorData.description === undefined
                ? existing.description
                : normalizeDescription(vendorData.description),
        status: vendorData.status ?? existing.status,
        updatedBy: userId,
    });

    if (!vendor) {
        return {
            status: "error",
            message: "Failed to update vendor",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { vendor },
        message: "Vendor updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getVendorItems = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<VendorItemsListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const vendorItems = await vendorsRepository.getVendorItemsByOrganizationId(organizationId);
    return {
        status: "success",
        data: { vendorItems },
        message: "Vendor Items fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getVendorItemDetails = async (
    userId: string,
    organizationId: string,
    vendorItemId: string,
): Promise<ServiceResponse<VendorItemResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const vendorItem = await vendorsRepository.getVendorItemById(organizationId, vendorItemId);
    if (!vendorItem) {
        return vendorItemNotFound();
    }

    return {
        status: "success",
        data: { vendorItem },
        message: "Vendor Item fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createVendorItem = async (
    userId: string,
    organizationId: string,
    vendorItemData: CreateVendorItemSVC,
): Promise<ServiceResponse<VendorItemResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const vendor = await vendorsRepository.getVendorById(organizationId, vendorItemData.vendorId);
    if (!vendor) {
        return vendorNotFound();
    }

    const unit = await unitsRepository.getUnitById(organizationId, vendorItemData.unitId);
    if (!unit) {
        return unitNotFound();
    }

    if (!canAssignUnitToVendorItem({ unitStatus: unit.status })) {
        return inactiveUnitCannotBeAssigned();
    }

    const vendorItem = await vendorsRepository.createVendorItem({
        id: crypto.randomUUID(),
        organizationId,
        vendorId: vendorItemData.vendorId,
        name: vendorItemData.name,
        unitId: vendorItemData.unitId,
        defaultPurchasePrice: vendorItemData.defaultPurchasePrice,
        status: vendorItemData.status ?? "active",
        createdBy: userId,
    });

    if (!vendorItem) {
        return {
            status: "error",
            message: "Failed to create vendor item",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { vendorItem },
        message: "Vendor Item created successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const updateVendorItem = async (
    userId: string,
    organizationId: string,
    vendorItemId: string,
    vendorItemData: UpdateVendorItemSVC,
): Promise<ServiceResponse<VendorItemResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await vendorsRepository.getVendorItemById(organizationId, vendorItemId);
    if (!existing) {
        return vendorItemNotFound();
    }

    const nextUnitId = vendorItemData.unitId ?? existing.unitId;
    if (vendorItemData.unitId !== undefined) {
        const unit = await unitsRepository.getUnitById(organizationId, nextUnitId);
        if (!unit) {
            return unitNotFound();
        }

        if (
            !canAssignUnitToVendorItem({
                unitStatus: unit.status,
                currentlyAssigned: nextUnitId === existing.unitId,
            })
        ) {
            return inactiveUnitCannotBeAssigned();
        }
    }

    const vendorItem = await vendorsRepository.updateVendorItem({
        id: vendorItemId,
        organizationId,
        name: vendorItemData.name ?? existing.name,
        unitId: nextUnitId,
        defaultPurchasePrice: vendorItemData.defaultPurchasePrice ?? existing.defaultPurchasePrice,
        status: vendorItemData.status ?? existing.status,
        updatedBy: userId,
    });

    if (!vendorItem) {
        return {
            status: "error",
            message: "Failed to update vendor item",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { vendorItem },
        message: "Vendor Item updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};
