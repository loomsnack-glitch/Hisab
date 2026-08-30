import { beforeEach, describe, expect, test } from "bun:test";
import {
    createVendorItemRepo,
    createVendorRepo,
    freshFarmsVendor,
    getOrganizationByIdForUser,
    getUnitById,
    getVendorById,
    getVendorItemById,
    getVendorItemsByOrganizationId,
    getVendorsByOrganizationId,
    inactiveCrateUnit,
    inactiveUnitId,
    inactiveVendorId,
    kilogramUnit,
    millersTomatoItem,
    millersVendor,
    onionItem,
    onionItemId,
    organization,
    organizationId,
    otherOrganizationId,
    tomatoItem,
    unitId,
    updateVendorItemRepo,
    updateVendorRepo,
    userId,
    vendorId,
    vendorItemId,
    vendorsService,
} from "./vendors.service.test-harness";

describe("Organization Vendor service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
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

    test("creates a Vendor as active by default", async () => {
        const response = await vendorsService.createVendor(userId, organizationId, {
            name: "Fresh Farms",
        });

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.vendor.status).toBe("active");
        expect(response.data?.vendor.organizationId).toBe(organizationId);
        expect(createVendorRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId,
                name: "Fresh Farms",
                description: null,
                status: "active",
                createdBy: userId,
            }),
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
        );
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
