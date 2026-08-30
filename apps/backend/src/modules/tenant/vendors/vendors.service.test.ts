import { beforeEach, describe, expect, test } from "bun:test";
import {
    createVendorRepo,
    freshFarmsVendor,
    getOrganizationByIdForUser,
    getVendorById,
    getVendorsByOrganizationId,
    inactiveVendorId,
    millersVendor,
    organization,
    organizationId,
    otherOrganizationId,
    updateVendorRepo,
    userId,
    vendorId,
    vendorsService,
} from "./vendors.service.test-harness";

describe("Organization Vendor service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getVendorsByOrganizationId.mockClear();
        getVendorById.mockClear();
        createVendorRepo.mockClear();
        updateVendorRepo.mockClear();

        getOrganizationByIdForUser.mockResolvedValue(organization);
        getVendorsByOrganizationId.mockResolvedValue([freshFarmsVendor, millersVendor]);
        getVendorById.mockResolvedValue(freshFarmsVendor);
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
