import { beforeEach, describe, expect, test } from "bun:test";
import {
    createStoreVendorAvailabilityRepo,
    createStoreVendorItemOfferingRepo,
    createVendorItemRepo,
    createVendorRepo,
    freshFarmsVendor,
    getOrganizationByIdForUser,
    getStoreById,
    getStoreVendorAvailabilitiesByStoreId,
    getStoreVendorAvailabilitiesByVendorId,
    getStoreVendorAvailabilityById,
    getStoreVendorAvailabilityByStoreAndVendor,
    getStoreVendorItemOfferingById,
    getStoreVendorItemOfferingsByStoreId,
    getStoresByOrganizationId,
    getUnitById,
    getVendorById,
    getVendorItemById,
    getVendorItemsByOrganizationId,
    getVendorItemsByVendorId,
    getVendorsByOrganizationId,
    inactiveCrateUnit,
    inactiveUnitId,
    inactiveVendorId,
    kilogramUnit,
    lockStoreVendorAvailabilityTopology,
    millersTomatoItem,
    millersVendor,
    onionItem,
    onionItemId,
    organization,
    organizationId,
    otherOrganizationId,
    resolveFeatureEntitlement,
    store,
    storeId,
    storeVendorAvailability,
    tomatoItem,
    tomatoOffering,
    unitId,
    updateStoreVendorAvailabilityRepo,
    updateStoreVendorItemOfferingRepo,
    updateVendorItemRepo,
    updateVendorRepo,
    userId,
    vendorId,
    vendorItemId,
    vendorsService,
    vesuStore,
    vesuStoreId,
    vesuTomatoOffering,
} from "./vendors.service.test-harness";

describe("Organization Vendor service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getStoresByOrganizationId.mockClear();
        resolveFeatureEntitlement.mockClear();
        getVendorsByOrganizationId.mockClear();
        getVendorById.mockClear();
        getUnitById.mockClear();
        getVendorItemsByOrganizationId.mockClear();
        getVendorItemById.mockClear();
        createVendorRepo.mockClear();
        updateVendorRepo.mockClear();
        createVendorItemRepo.mockClear();
        updateVendorItemRepo.mockClear();
        lockStoreVendorAvailabilityTopology.mockClear();
        createStoreVendorAvailabilityRepo.mockClear();
        createStoreVendorItemOfferingRepo.mockClear();
        getStoreVendorAvailabilitiesByStoreId.mockClear();
        getStoreVendorAvailabilitiesByVendorId.mockClear();
        getStoreVendorAvailabilityById.mockClear();
        getStoreVendorAvailabilityByStoreAndVendor.mockClear();
        getStoreVendorItemOfferingsByStoreId.mockClear();
        getStoreVendorItemOfferingById.mockClear();
        getVendorItemsByVendorId.mockClear();
        updateStoreVendorAvailabilityRepo.mockClear();
        updateStoreVendorItemOfferingRepo.mockClear();

        getOrganizationByIdForUser.mockResolvedValue(organization);
        getStoresByOrganizationId.mockResolvedValue([store, vesuStore]);
        getStoreById.mockImplementation(async (_organizationId: string, id: string) => {
            if (id === store.id) return store;
            if (id === vesuStore.id) return vesuStore;
            return null;
        });
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: true,
            featureKey,
            evidence: [],
        }));
        getVendorsByOrganizationId.mockResolvedValue([freshFarmsVendor, millersVendor]);
        getVendorById.mockResolvedValue(freshFarmsVendor);
        getUnitById.mockResolvedValue(kilogramUnit);
        getVendorItemsByOrganizationId.mockResolvedValue([tomatoItem, millersTomatoItem, onionItem]);
        getVendorItemById.mockResolvedValue(tomatoItem);
        createVendorRepo.mockImplementation(async (data) => ({
            ...freshFarmsVendor,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: freshFarmsVendor.createdAt,
            updatedAt: freshFarmsVendor.updatedAt,
        }));
        updateVendorRepo.mockImplementation(async (data) => ({
            ...freshFarmsVendor,
            ...data,
            createdBy: freshFarmsVendor.createdBy,
            createdAt: freshFarmsVendor.createdAt,
            updatedAt: freshFarmsVendor.updatedAt,
        }));
        createStoreVendorAvailabilityRepo.mockImplementation(async (data) => ({
            ...storeVendorAvailability,
            ...data,
        }));
        createStoreVendorItemOfferingRepo.mockImplementation(async (data) => ({
            ...tomatoOffering,
            ...data,
        }));
        getStoreVendorAvailabilitiesByStoreId.mockResolvedValue([storeVendorAvailability]);
        getStoreVendorAvailabilitiesByVendorId.mockResolvedValue([storeVendorAvailability]);
        getStoreVendorAvailabilityById.mockResolvedValue(storeVendorAvailability);
        getStoreVendorAvailabilityByStoreAndVendor.mockResolvedValue(null);
        getStoreVendorItemOfferingsByStoreId.mockResolvedValue([tomatoOffering]);
        getStoreVendorItemOfferingById.mockResolvedValue(tomatoOffering);
        getVendorItemsByVendorId.mockResolvedValue([tomatoItem, onionItem]);
        updateStoreVendorAvailabilityRepo.mockImplementation(async (data) => ({
            ...storeVendorAvailability,
            ...data,
        }));
        updateStoreVendorItemOfferingRepo.mockImplementation(async (data) => ({
            ...tomatoOffering,
            ...data,
        }));
    });

    test("lists Organization Vendors for a member", async () => {
        const response = await vendorsService.getVendors(userId, organizationId);

        expect(response.status).toBe("success");
        expect(response.data?.vendors).toHaveLength(2);
        expect(response.data?.vendors.some((vendor) => vendor.name === "Fresh Farms" && vendor.status === "active")).toBe(true);
        expect(response.data?.vendors.some((vendor) => vendor.name === "Miller Spices" && vendor.status === "inactive")).toBe(true);
        expect(getVendorsByOrganizationId).toHaveBeenCalledWith(organizationId);
    });

    test("denies Vendor listing when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await vendorsService.getVendors(userId, otherOrganizationId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(getVendorsByOrganizationId).not.toHaveBeenCalled();
    });

    test("creates a Vendor as active by default with an active Availability at every current Store", async () => {
        const response = await vendorsService.createVendor(userId, organizationId, {
            name: "Fresh Farms",
        });

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.vendor.status).toBe("active");
        expect(response.data?.vendor.organizationId).toBe(organizationId);
        expect(getStoresByOrganizationId).toHaveBeenCalledWith(
            organizationId,
            expect.anything(),
        );
        expect(createVendorRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId,
                name: "Fresh Farms",
                description: null,
                status: "active",
                createdBy: userId,
            }),
            expect.anything(),
        );
        expect(createStoreVendorAvailabilityRepo).toHaveBeenCalledTimes(2);
        expect(createStoreVendorAvailabilityRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                storeId,
                organizationId,
                status: "active",
            }),
            expect.anything(),
        );
        expect(createStoreVendorAvailabilityRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                storeId: vesuStoreId,
                organizationId,
                status: "active",
            }),
            expect.anything(),
        );
    });

    test("creates a Vendor with an optional description and explicit status", async () => {
        const response = await vendorsService.createVendor(userId, organizationId, {
            name: "Fresh Farms",
            description: "Daily produce supplier",
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(createVendorRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Fresh Farms",
                description: "Daily produce supplier",
                status: "inactive",
            }),
            expect.anything(),
        );
        expect(createStoreVendorAvailabilityRepo).toHaveBeenCalledTimes(2);
    });

    test("stores a blank description as null", async () => {
        const response = await vendorsService.createVendor(userId, organizationId, {
            name: "Fresh Farms",
            description: "",
        });

        expect(response.status).toBe("success");
        expect(createVendorRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                description: null,
            }),
            expect.anything(),
        );
    });

    test("updates a Vendor name, description, and status", async () => {
        const response = await vendorsService.updateVendor(userId, organizationId, vendorId, {
            name: "Fresh Farms Co",
            description: "Updated notes",
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(response.data?.vendor.name).toBe("Fresh Farms Co");
        expect(response.data?.vendor.description).toBe("Updated notes");
        expect(response.data?.vendor.status).toBe("inactive");
        expect(updateVendorRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: vendorId,
                organizationId,
                name: "Fresh Farms Co",
                description: "Updated notes",
                status: "inactive",
                updatedBy: userId,
            }),
        );
    });

    test("reactivates an inactive Vendor", async () => {
        getVendorById.mockResolvedValue(millersVendor);
        updateVendorRepo.mockImplementation(async (data) => ({
            ...millersVendor,
            ...data,
            createdBy: millersVendor.createdBy,
            createdAt: millersVendor.createdAt,
            updatedAt: millersVendor.updatedAt,
        }));

        const response = await vendorsService.updateVendor(userId, organizationId, inactiveVendorId, {
            status: "active",
        });

        expect(response.status).toBe("success");
        expect(response.data?.vendor.status).toBe("active");
        expect(response.data?.vendor.name).toBe("Miller Spices");
    });

    test("does not expose a Vendor deletion command", () => {
        expect("deleteVendor" in vendorsService).toBe(false);
    });

    test("returns not found when updating a Vendor from another Organization", async () => {
        getVendorById.mockResolvedValue(null);

        const response = await vendorsService.updateVendor(userId, organizationId, vendorId, {
            status: "inactive",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(updateVendorRepo).not.toHaveBeenCalled();
    });
});
describe("Organization Vendor Item service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getStoresByOrganizationId.mockClear();
        resolveFeatureEntitlement.mockClear();
        getVendorsByOrganizationId.mockClear();
        getVendorById.mockClear();
        getUnitById.mockClear();
        getVendorItemsByOrganizationId.mockClear();
        getVendorItemById.mockClear();
        createVendorRepo.mockClear();
        updateVendorRepo.mockClear();
        createVendorItemRepo.mockClear();
        updateVendorItemRepo.mockClear();

        getOrganizationByIdForUser.mockResolvedValue(organization);
        getStoresByOrganizationId.mockResolvedValue([store, vesuStore]);
        getStoreById.mockImplementation(async (_organizationId: string, id: string) => {
            if (id === store.id) return store;
            if (id === vesuStore.id) return vesuStore;
            return null;
        });
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: true,
            featureKey,
            evidence: [],
        }));
        getVendorsByOrganizationId.mockResolvedValue([freshFarmsVendor, millersVendor]);
        getVendorById.mockResolvedValue(freshFarmsVendor);
        getUnitById.mockResolvedValue(kilogramUnit);
        getVendorItemsByOrganizationId.mockResolvedValue([tomatoItem, millersTomatoItem, onionItem]);
        getVendorItemById.mockResolvedValue(tomatoItem);
        createVendorItemRepo.mockImplementation(async (data) => ({
            ...tomatoItem,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: tomatoItem.createdAt,
            updatedAt: tomatoItem.updatedAt,
        }));
        updateVendorItemRepo.mockImplementation(async (data) => ({
            ...tomatoItem,
            ...data,
            vendorId: tomatoItem.vendorId,
            createdBy: tomatoItem.createdBy,
            createdAt: tomatoItem.createdAt,
            updatedAt: tomatoItem.updatedAt,
        }));
        createStoreVendorItemOfferingRepo.mockImplementation(async (data) => ({
            ...tomatoOffering,
            ...data,
        }));
        getStoreVendorAvailabilitiesByVendorId.mockResolvedValue([storeVendorAvailability]);
        getVendorItemsByVendorId.mockResolvedValue([tomatoItem, onionItem]);
    });

    test("lists Organization Vendor Items for a member", async () => {
        const response = await vendorsService.getVendorItems(userId, organizationId);

        expect(response.status).toBe("success");
        expect(response.data?.vendorItems).toHaveLength(3);
        expect(response.data?.vendorItems.some((item) => item.vendorId === vendorId && item.name === "Tomato")).toBe(true);
        expect(response.data?.vendorItems.some((item) => item.vendorId === inactiveVendorId && item.name === "Tomato")).toBe(true);
        expect(getVendorItemsByOrganizationId).toHaveBeenCalledWith(organizationId);
    });

    test("denies Vendor Item listing when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await vendorsService.getVendorItems(userId, otherOrganizationId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(getVendorItemsByOrganizationId).not.toHaveBeenCalled();
    });

    test("creates a Vendor Item as active by default", async () => {
        const response = await vendorsService.createVendorItem(userId, organizationId, {
            vendorId,
            name: "Tomato",
            unitId,
            defaultPurchasePrice: 40.5,
        });

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.vendorItem.status).toBe("active");
        expect(response.data?.vendorItem.organizationId).toBe(organizationId);
        expect(response.data?.vendorItem.vendorId).toBe(vendorId);
        expect(createVendorItemRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId,
                vendorId,
                name: "Tomato",
                unitId,
                defaultPurchasePrice: 40.5,
                status: "active",
                createdBy: userId,
            }),
            expect.anything(),
        );
        expect(createStoreVendorItemOfferingRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                storeId,
                vendorItemId: expect.any(String),
                defaultPurchasePrice: 40.5,
            }),
            expect.anything(),
        );
    });

    test("allows the same Vendor Item name under different Vendors", async () => {
        getVendorById.mockResolvedValue(millersVendor);
        createVendorItemRepo.mockImplementation(async (data) => ({
            ...millersTomatoItem,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: millersTomatoItem.createdAt,
            updatedAt: millersTomatoItem.updatedAt,
        }));

        const response = await vendorsService.createVendorItem(userId, organizationId, {
            vendorId: inactiveVendorId,
            name: "Tomato",
            unitId,
            defaultPurchasePrice: 55,
        });

        expect(response.status).toBe("success");
        expect(response.data?.vendorItem.name).toBe("Tomato");
        expect(response.data?.vendorItem.vendorId).toBe(inactiveVendorId);
        expect(createVendorItemRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                vendorId: inactiveVendorId,
                name: "Tomato",
            }),
            expect.anything(),
        );
    });

    test("rejects creating a Vendor Item for a Vendor outside the Organization", async () => {
        getVendorById.mockResolvedValue(null);

        const response = await vendorsService.createVendorItem(userId, organizationId, {
            vendorId,
            name: "Tomato",
            unitId,
            defaultPurchasePrice: 40.5,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(createVendorItemRepo).not.toHaveBeenCalled();
    });

    test("rejects assigning an inactive Unit to a new Vendor Item", async () => {
        getUnitById.mockResolvedValue(inactiveCrateUnit);

        const response = await vendorsService.createVendorItem(userId, organizationId, {
            vendorId,
            name: "Tomato",
            unitId: inactiveUnitId,
            defaultPurchasePrice: 40.5,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Inactive Units cannot be assigned");
        expect(createVendorItemRepo).not.toHaveBeenCalled();
    });

    test("rejects creating a Vendor Item with a Unit outside the Organization", async () => {
        getUnitById.mockResolvedValue(null);

        const response = await vendorsService.createVendorItem(userId, organizationId, {
            vendorId,
            name: "Tomato",
            unitId,
            defaultPurchasePrice: 40.5,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(createVendorItemRepo).not.toHaveBeenCalled();
    });

    test("updates a Vendor Item name, Unit, price, and status", async () => {
        const response = await vendorsService.updateVendorItem(userId, organizationId, vendorItemId, {
            name: "Roma Tomato",
            unitId,
            defaultPurchasePrice: 12.25,
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(response.data?.vendorItem.name).toBe("Roma Tomato");
        expect(response.data?.vendorItem.defaultPurchasePrice).toBe(12.25);
        expect(response.data?.vendorItem.status).toBe("inactive");
        expect(updateVendorItemRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: vendorItemId,
                organizationId,
                name: "Roma Tomato",
                unitId,
                defaultPurchasePrice: 12.25,
                status: "inactive",
                updatedBy: userId,
            }),
        );
    });

    test("keeps a currently assigned inactive Unit when editing other Vendor Item fields", async () => {
        getVendorItemById.mockResolvedValue({ ...tomatoItem, unitId: inactiveUnitId });
        getUnitById.mockResolvedValue(inactiveCrateUnit);

        const response = await vendorsService.updateVendorItem(userId, organizationId, vendorItemId, {
            unitId: inactiveUnitId,
            defaultPurchasePrice: 41,
        });

        expect(response.status).toBe("success");
        expect(updateVendorItemRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                unitId: inactiveUnitId,
                defaultPurchasePrice: 41,
            }),
        );
    });

    test("rejects assigning a different inactive Unit while editing a Vendor Item", async () => {
        getUnitById.mockResolvedValue(inactiveCrateUnit);

        const response = await vendorsService.updateVendorItem(userId, organizationId, vendorItemId, {
            unitId: inactiveUnitId,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Inactive Units cannot be assigned");
        expect(updateVendorItemRepo).not.toHaveBeenCalled();
    });

    test("reactivates an inactive Vendor Item without changing its Vendor", async () => {
        getVendorItemById.mockResolvedValue(onionItem);
        updateVendorItemRepo.mockImplementation(async (data) => ({
            ...onionItem,
            ...data,
            vendorId: onionItem.vendorId,
            createdBy: onionItem.createdBy,
            createdAt: onionItem.createdAt,
            updatedAt: onionItem.updatedAt,
        }));

        const response = await vendorsService.updateVendorItem(userId, organizationId, onionItemId, {
            status: "active",
        });

        expect(response.status).toBe("success");
        expect(response.data?.vendorItem.status).toBe("active");
        expect(response.data?.vendorItem.name).toBe("Onion");
        expect(response.data?.vendorItem.vendorId).toBe(vendorId);
    });

    test("deactivating a Vendor does not change its Vendor Item statuses", async () => {
        const response = await vendorsService.updateVendor(userId, organizationId, vendorId, {
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(response.data?.vendor.status).toBe("inactive");
        expect(updateVendorItemRepo).not.toHaveBeenCalled();
        expect(getVendorItemsByOrganizationId).not.toHaveBeenCalled();
    });

    test("does not expose a Vendor Item deletion command", () => {
        expect("deleteVendorItem" in vendorsService).toBe(false);
    });

    test("returns not found when updating a Vendor Item from another Organization", async () => {
        getVendorItemById.mockResolvedValue(null);

        const response = await vendorsService.updateVendorItem(userId, organizationId, vendorItemId, {
            status: "inactive",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(updateVendorItemRepo).not.toHaveBeenCalled();
    });
});
describe("Store Vendor Availability service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockResolvedValue(organization);
        getStoresByOrganizationId.mockResolvedValue([store, vesuStore]);
        getStoreById.mockImplementation(async (_organizationId: string, id: string) => {
            if (id === store.id) return store;
            if (id === vesuStore.id) return vesuStore;
            return null;
        });
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: true,
            featureKey,
            evidence: [],
        }));
        getVendorById.mockResolvedValue(freshFarmsVendor);
        getVendorItemById.mockResolvedValue(tomatoItem);
        getVendorItemsByVendorId.mockResolvedValue([tomatoItem, onionItem]);
        createStoreVendorAvailabilityRepo.mockImplementation(async (data) => ({
            ...storeVendorAvailability,
            ...data,
        }));
        createStoreVendorItemOfferingRepo.mockImplementation(async (data) => ({
            ...tomatoOffering,
            ...data,
        }));
        getStoreVendorAvailabilitiesByStoreId.mockResolvedValue([storeVendorAvailability]);
        getStoreVendorAvailabilityById.mockResolvedValue(storeVendorAvailability);
        getStoreVendorAvailabilityByStoreAndVendor.mockResolvedValue(null);
        getStoreVendorItemOfferingsByStoreId.mockResolvedValue([tomatoOffering, vesuTomatoOffering]);
        getStoreVendorItemOfferingById.mockResolvedValue(tomatoOffering);
        updateStoreVendorItemOfferingRepo.mockImplementation(async (data) => ({
            ...tomatoOffering,
            ...data,
        }));
        updateStoreVendorAvailabilityRepo.mockImplementation(async (data) => ({
            ...storeVendorAvailability,
            ...data,
        }));
        createVendorRepo.mockClear();
        createStoreVendorAvailabilityRepo.mockClear();
        createStoreVendorItemOfferingRepo.mockClear();
        lockStoreVendorAvailabilityTopology.mockClear();
        getStoreVendorAvailabilitiesByStoreId.mockClear();
        getStoreVendorAvailabilitiesByStoreId.mockResolvedValue([storeVendorAvailability]);
        getStoreVendorItemOfferingsByStoreId.mockClear();
        getStoreVendorItemOfferingsByStoreId.mockResolvedValue([tomatoOffering, vesuTomatoOffering]);
        updateVendorItemRepo.mockClear();
        updateStoreVendorAvailabilityRepo.mockClear();
        getVendorsByOrganizationId.mockResolvedValue([freshFarmsVendor, millersVendor]);
    });

    test("creating a Store seeds inactive Availabilities and Item Offerings for every existing Vendor", async () => {
        await vendorsService.seedInactiveAvailabilitiesForNewStore({} as never, {
            organizationId,
            storeId: vesuStoreId,
            createdBy: userId,
        });

        expect(getVendorsByOrganizationId).toHaveBeenCalledWith(organizationId, expect.anything());
        expect(createStoreVendorAvailabilityRepo).toHaveBeenCalledTimes(2);
        expect(createStoreVendorAvailabilityRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                storeId: vesuStoreId,
                vendorId,
                status: "inactive",
            }),
            expect.anything(),
        );
        expect(createStoreVendorItemOfferingRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                storeId: vesuStoreId,
                vendorId,
                vendorItemId,
                defaultPurchasePrice: 40.5,
            }),
            expect.anything(),
        );
        expect(createVendorRepo).not.toHaveBeenCalled();
    });

    test("does not create a private Vendor from the Store availability seam", async () => {
        expect("createStoreVendor" in vendorsService).toBe(false);
        expect("createStoreVendorItem" in vendorsService).toBe(false);
        expect("assignStoreVendorAvailability" in vendorsService).toBe(false);
        expect("unassignStoreVendorAvailability" in vendorsService).toBe(false);
        expect("deleteStoreVendorAvailability" in vendorsService).toBe(false);
    });

    test("deactivating a Store Vendor Availability leaves it listed and retains Store Item Offering prices", async () => {
        const response = await vendorsService.updateStoreVendorAvailability(
            userId,
            organizationId,
            storeId,
            storeVendorAvailability.id,
            { status: "inactive" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.availability.status).toBe("inactive");
        expect(response.data?.availability.id).toBe(storeVendorAvailability.id);
        expect(updateStoreVendorAvailabilityRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: storeVendorAvailability.id,
                storeId,
                status: "inactive",
                updatedBy: userId,
            }),
        );
        expect(createStoreVendorItemOfferingRepo).not.toHaveBeenCalled();
        expect(createVendorRepo).not.toHaveBeenCalled();
    });

    test("reactivating a Store Vendor Availability restores purchasing eligibility without rewriting prices", async () => {
        getStoreVendorAvailabilityById.mockResolvedValue({
            ...storeVendorAvailability,
            status: "inactive",
        });
        updateStoreVendorAvailabilityRepo.mockImplementation(async (data) => ({
            ...storeVendorAvailability,
            ...data,
            status: data.status,
        }));

        const response = await vendorsService.updateStoreVendorAvailability(
            userId,
            organizationId,
            storeId,
            storeVendorAvailability.id,
            { status: "active" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.availability.status).toBe("active");
        expect(updateStoreVendorAvailabilityRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "active",
            }),
        );
        expect(createStoreVendorItemOfferingRepo).not.toHaveBeenCalled();
    });

    test("rejects updating Store Vendor Availability for a missing Availability", async () => {
        getStoreVendorAvailabilityById.mockResolvedValue(null);

        const response = await vendorsService.updateStoreVendorAvailability(
            userId,
            organizationId,
            storeId,
            storeVendorAvailability.id,
            { status: "inactive" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(updateStoreVendorAvailabilityRepo).not.toHaveBeenCalled();
    });

    test("a Store can change its Vendor Item default purchase price independently", async () => {
        const response = await vendorsService.updateStoreVendorItemOffering(
            userId,
            organizationId,
            storeId,
            tomatoOffering.id,
            { defaultPurchasePrice: 38 },
        );

        expect(response.status).toBe("success");
        expect(updateStoreVendorItemOfferingRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: tomatoOffering.id,
                storeId,
                defaultPurchasePrice: 38,
            }),
        );
        expect(response.data?.offering.defaultPurchasePrice).toBe(38);
        expect(updateVendorItemRepo).not.toHaveBeenCalled();
    });

    test("lists Store Vendor Availabilities and Offerings for a Store in the Organization", async () => {
        const availabilityResponse = await vendorsService.getStoreVendorAvailabilities(
            userId,
            organizationId,
            storeId,
        );
        const offeringResponse = await vendorsService.getStoreVendorItemOfferings(
            userId,
            organizationId,
            storeId,
        );

        expect(availabilityResponse.status).toBe("success");
        expect(availabilityResponse.data?.availabilities[0]?.vendor.name).toBe("Fresh Farms");
        expect(offeringResponse.status).toBe("success");
        expect(offeringResponse.data?.offerings.some((offering) => offering.defaultPurchasePrice === 40.5)).toBe(true);
    });

    test("rejects Store Vendor Availability for a Store outside the Organization", async () => {
        getStoreById.mockResolvedValue(null);

        const response = await vendorsService.getStoreVendorAvailabilities(
            userId,
            organizationId,
            vesuStoreId,
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(getStoreVendorAvailabilitiesByStoreId).not.toHaveBeenCalled();
    });

    test("lists inactive Store Vendor Availabilities so a Store Vendor never disappears", async () => {
        getStoreVendorAvailabilitiesByStoreId.mockResolvedValue([
            { ...storeVendorAvailability, status: "inactive" },
        ]);

        const response = await vendorsService.getStoreVendorAvailabilities(
            userId,
            organizationId,
            storeId,
        );

        expect(response.status).toBe("success");
        expect(response.data?.availabilities).toEqual([
            expect.objectContaining({
                vendorId,
                status: "inactive",
                vendor: expect.objectContaining({ name: "Fresh Farms" }),
            }),
        ]);
    });
});
