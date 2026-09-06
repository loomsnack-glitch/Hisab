import {
    STATUS_CODES,
    canAssignUnitToVendorItem,
    type CreateVendorItemSVC,
    type CreateVendorSVC,
    type ServiceResponse,
    type StoreVendorAvailabilitiesListResponse,
    type StoreVendorAvailabilityDTO,
    type StoreVendorAvailabilityResponse,
    type StoreVendorItemOfferingDTO,
    type StoreVendorItemOfferingResponse,
    type StoreVendorItemOfferingsListResponse,
    type UpdateStoreVendorAvailabilitySVC,
    type UpdateStoreVendorItemOfferingSVC,
    type VendorItemDTO,
    type VendorItemResponse,
    type VendorItemsListResponse,
    type VendorResponse,
    type VendorsListResponse,
    type UpdateVendorItemSVC,
    type UpdateVendorSVC,
} from "@repo/types";
import { pg } from "@/config/db";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import { requireOrganizationFeatureEntitlement } from "@/modules/tenant/commercial-licensing/feature-entitlement-guard";
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

const storeNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Store not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const unitNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Unit not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const availabilityNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Store Vendor Availability not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const offeringNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Store Vendor Item Offering not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const inactiveUnitCannotBeAssigned = (): ServiceResponse<null> => ({
    status: "error",
    message: "Inactive Units cannot be assigned",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const denyUnlessVendorsEntitled = async (
    organizationId: string,
): Promise<ServiceResponse<null> | null> =>
    requireOrganizationFeatureEntitlement(organizationId, "vendors");

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

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
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

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
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

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
    }

    let vendor = null as Awaited<ReturnType<typeof vendorsRepository.createVendor>>;
    await pg.begin(async (tx) => {
        await vendorsRepository.lockStoreVendorAvailabilityTopology(organizationId, tx);
        const stores = await organizationRepository.getStoresByOrganizationId(organizationId, tx);
        vendor = await vendorsRepository.createVendor(
            {
                id: crypto.randomUUID(),
                organizationId,
                name: vendorData.name,
                description: normalizeDescription(vendorData.description),
                status: vendorData.status ?? "active",
                createdBy: userId,
            },
            tx,
        );
        if (!vendor) {
            throw new Error("Failed to create vendor");
        }

        for (const store of stores) {
            const availability = await vendorsRepository.createStoreVendorAvailability(
                {
                    id: crypto.randomUUID(),
                    organizationId,
                    storeId: store.id,
                    vendorId: vendor.id,
                    status: "active",
                    createdBy: userId,
                },
                tx,
            );
            if (!availability) {
                throw new Error("Failed to create Store Vendor Availability");
            }
        }
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

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
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

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
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

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
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

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
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

    let vendorItem = null as VendorItemDTO | null;
    await pg.begin(async (tx) => {
        await vendorsRepository.lockStoreVendorAvailabilityTopology(organizationId, tx);
        vendorItem = await vendorsRepository.createVendorItem(
            {
                id: crypto.randomUUID(),
                organizationId,
                vendorId: vendorItemData.vendorId,
                name: vendorItemData.name,
                unitId: vendorItemData.unitId,
                defaultPurchasePrice: vendorItemData.defaultPurchasePrice,
                status: vendorItemData.status ?? "active",
                createdBy: userId,
            },
            tx,
        );
        if (!vendorItem) {
            throw new Error("Failed to create vendor item");
        }

        const availabilities = await vendorsRepository.getStoreVendorAvailabilitiesByVendorId(
            organizationId,
            vendorItem.vendorId,
            tx,
        );
        for (const availability of availabilities) {
            const offering = await vendorsRepository.createStoreVendorItemOffering(
                {
                    id: crypto.randomUUID(),
                    organizationId,
                    storeId: availability.storeId,
                    vendorId: vendorItem.vendorId,
                    vendorItemId: vendorItem.id,
                    defaultPurchasePrice: vendorItem.defaultPurchasePrice,
                    createdBy: userId,
                },
                tx,
            );
            if (!offering) {
                throw new Error("Failed to create Store Vendor Item Offering");
            }
        }
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

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
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

const persistOfferingsForVendorItems = async (
    tx: Bun.TransactionSQL,
    input: {
        organizationId: string;
        storeId: string;
        vendorId: string;
        vendorItems: VendorItemDTO[];
        createdBy: string;
    },
) => {
    for (const vendorItem of input.vendorItems) {
        const offering = await vendorsRepository.createStoreVendorItemOffering(
            {
                id: crypto.randomUUID(),
                organizationId: input.organizationId,
                storeId: input.storeId,
                vendorId: input.vendorId,
                vendorItemId: vendorItem.id,
                defaultPurchasePrice: vendorItem.defaultPurchasePrice,
                createdBy: input.createdBy,
            },
            tx,
        );
        if (!offering) {
            throw new Error("Failed to create Store Vendor Item Offering");
        }
    }
};

const toStoreVendorAvailabilityResponse = async (
    availability: StoreVendorAvailabilityDTO,
): Promise<StoreVendorAvailabilityResponse["availability"] | null> => {
    const vendor = await vendorsRepository.getVendorById(
        availability.organizationId,
        availability.vendorId,
    );
    if (!vendor) {
        return null;
    }

    return { ...availability, vendor };
};

const toStoreVendorItemOfferingResponse = async (
    offering: StoreVendorItemOfferingDTO,
): Promise<StoreVendorItemOfferingResponse["offering"] | null> => {
    const vendorItem = await vendorsRepository.getVendorItemById(
        offering.organizationId,
        offering.vendorItemId,
    );
    if (!vendorItem) {
        return null;
    }

    return { ...offering, vendorItem };
};

const requireStoreInOrganization = async (
    organizationId: string,
    storeId: string,
) => organizationRepository.getStoreById(organizationId, storeId);

export const seedInactiveAvailabilitiesForNewStore = async (
    tx: Bun.TransactionSQL,
    input: {
        organizationId: string;
        storeId: string;
        createdBy: string;
    },
) => {
    const vendors = await vendorsRepository.getVendorsByOrganizationId(input.organizationId, tx);
    for (const vendor of vendors) {
        const availability = await vendorsRepository.createStoreVendorAvailability(
            {
                id: crypto.randomUUID(),
                organizationId: input.organizationId,
                storeId: input.storeId,
                vendorId: vendor.id,
                status: "inactive",
                createdBy: input.createdBy,
            },
            tx,
        );
        if (!availability) {
            throw new Error("Failed to create Store Vendor Availability");
        }

        const vendorItems = await vendorsRepository.getVendorItemsByVendorId(
            input.organizationId,
            vendor.id,
            tx,
        );
        await persistOfferingsForVendorItems(tx, {
            organizationId: input.organizationId,
            storeId: input.storeId,
            vendorId: vendor.id,
            vendorItems,
            createdBy: input.createdBy,
        });
    }
};

export const getStoreVendorAvailabilities = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<StoreVendorAvailabilitiesListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
    }

    const store = await requireStoreInOrganization(organizationId, storeId);
    if (!store) {
        return storeNotFound();
    }

    const availabilities = await vendorsRepository.getStoreVendorAvailabilitiesByStoreId(
        organizationId,
        storeId,
    );
    const resolved = (
        await Promise.all(availabilities.map((availability) => toStoreVendorAvailabilityResponse(availability)))
    ).filter((availability): availability is StoreVendorAvailabilityResponse["availability"] => availability !== null);

    return {
        status: "success",
        data: { availabilities: resolved },
        message: "Store Vendor Availabilities fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const updateStoreVendorAvailability = async (
    userId: string,
    organizationId: string,
    storeId: string,
    availabilityId: string,
    availabilityData: UpdateStoreVendorAvailabilitySVC,
): Promise<ServiceResponse<StoreVendorAvailabilityResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
    }

    const store = await requireStoreInOrganization(organizationId, storeId);
    if (!store) {
        return storeNotFound();
    }

    const existing = await vendorsRepository.getStoreVendorAvailabilityById(
        organizationId,
        storeId,
        availabilityId,
    );
    if (!existing) {
        return availabilityNotFound();
    }

    const updated = await vendorsRepository.updateStoreVendorAvailability({
        id: availabilityId,
        organizationId,
        storeId,
        status: availabilityData.status,
        updatedBy: userId,
    });
    if (!updated) {
        return {
            status: "error",
            message: "Failed to update Store Vendor Availability",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    const response = await toStoreVendorAvailabilityResponse(updated);
    if (!response) {
        return vendorNotFound();
    }

    return {
        status: "success",
        data: { availability: response },
        message:
            availabilityData.status === "inactive"
                ? "Vendor deactivated at Store successfully"
                : "Vendor activated at Store successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getStoreVendorItemOfferings = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<StoreVendorItemOfferingsListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
    }

    const store = await requireStoreInOrganization(organizationId, storeId);
    if (!store) {
        return storeNotFound();
    }

    const offerings = await vendorsRepository.getStoreVendorItemOfferingsByStoreId(
        organizationId,
        storeId,
    );
    const resolved = (
        await Promise.all(offerings.map((offering) => toStoreVendorItemOfferingResponse(offering)))
    ).filter((offering): offering is StoreVendorItemOfferingResponse["offering"] => offering !== null);

    return {
        status: "success",
        data: { offerings: resolved },
        message: "Store Vendor Item Offerings fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const updateStoreVendorItemOffering = async (
    userId: string,
    organizationId: string,
    storeId: string,
    offeringId: string,
    offeringData: UpdateStoreVendorItemOfferingSVC,
): Promise<ServiceResponse<StoreVendorItemOfferingResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const vendorsEntitlementError = await denyUnlessVendorsEntitled(organizationId);
    if (vendorsEntitlementError) {
        return vendorsEntitlementError;
    }

    const store = await requireStoreInOrganization(organizationId, storeId);
    if (!store) {
        return storeNotFound();
    }

    const existing = await vendorsRepository.getStoreVendorItemOfferingById(
        organizationId,
        storeId,
        offeringId,
    );
    if (!existing) {
        return offeringNotFound();
    }

    const updated = await vendorsRepository.updateStoreVendorItemOffering({
        id: offeringId,
        organizationId,
        storeId,
        defaultPurchasePrice: offeringData.defaultPurchasePrice,
        updatedBy: userId,
    });
    if (!updated) {
        return {
            status: "error",
            message: "Failed to update Store Vendor Item Offering",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    const response = await toStoreVendorItemOfferingResponse(updated);
    if (!response) {
        return offeringNotFound();
    }

    return {
        status: "success",
        data: { offering: response },
        message: "Store Vendor Item Offering updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};
