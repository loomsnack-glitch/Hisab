import {
    STATUS_CODES,
    type CreateVendorSVC,
    type ServiceResponse,
    type VendorResponse,
    type VendorsListResponse,
    type UpdateVendorSVC,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
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
