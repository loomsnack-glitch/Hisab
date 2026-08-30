import { beforeEach, describe, expect, test } from "bun:test";
import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "@/types/hono";
import { authMiddleware } from "@/middlewares/auth.middleware";

const harness = await import("./vendors.service.test-harness");
const { createVendorsRoutes } = await import("./vendors.routes");

const authenticatedUser: MiddlewareHandler<{ Variables: AppVariables }> = async (context, next) => {
    context.set("authUser", { id: harness.userId } as AppVariables["authUser"]);
    await next();
};

const vendorsRoutes = createVendorsRoutes(authenticatedUser);
const unauthenticatedRoutes = createVendorsRoutes(authMiddleware);

describe("Organization Vendor routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getVendorsByOrganizationId.mockClear();
        harness.getVendorById.mockClear();
        harness.createVendorRepo.mockClear();
        harness.updateVendorRepo.mockClear();

        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getVendorsByOrganizationId.mockResolvedValue([
            harness.freshFarmsVendor,
            harness.millersVendor,
        ]);
        harness.getVendorById.mockResolvedValue(harness.freshFarmsVendor);
        harness.createVendorRepo.mockImplementation(async (data) => ({
            ...harness.freshFarmsVendor,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
        harness.updateVendorRepo.mockImplementation(async (data) => ({
            ...harness.freshFarmsVendor,
            ...data,
            createdBy: harness.freshFarmsVendor.createdBy,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
    });

    test("rejects unauthenticated Vendor listing", async () => {
        const response = await unauthenticatedRoutes.request(
            `http://localhost/${harness.organizationId}/vendors`,
        );

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Authentication is required");
    });

    test("lists Organization Vendors for an authenticated administrator", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendors`,
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.vendors).toHaveLength(2);
        expect(body.data.vendors.some((vendor: { name: string }) => vendor.name === "Fresh Farms")).toBe(true);
    });

    test("creates a Vendor at the Organization administrator seam", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendors`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Fresh Farms", description: "Daily produce supplier" }),
            },
        );

        expect(response.status).toBe(201);
        expect(harness.createVendorRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId: harness.organizationId,
                name: "Fresh Farms",
                description: "Daily produce supplier",
                status: "active",
            }),
        );
    });

    test("rejects a Vendor payload that includes Store or Item fields", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendors`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Fresh Farms",
                    storeId: harness.organizationId,
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createVendorRepo).not.toHaveBeenCalled();
    });

    test("rejects a Vendor without a name", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendors`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: "Daily produce" }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createVendorRepo).not.toHaveBeenCalled();
    });

    test("updates Vendor status for the authenticated Organization", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendors/${harness.vendorId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "inactive" }),
            },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.vendor.status).toBe("inactive");
        expect(body.data.vendor.name).toBe("Fresh Farms");
    });

    test("denies Vendor access when the user is not a member of the Organization", async () => {
        harness.getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendors`,
        );

        expect(response.status).toBe(404);
        expect(harness.getVendorsByOrganizationId).not.toHaveBeenCalled();
    });

    test("does not expose a Vendor deletion route", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendors/${harness.vendorId}`,
            { method: "DELETE" },
        );

        expect(response.status).toBe(404);
        expect(harness.updateVendorRepo).not.toHaveBeenCalled();
    });
});

describe("Organization Vendor Item routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getVendorsByOrganizationId.mockClear();
        harness.getVendorById.mockClear();
        harness.getUnitById.mockClear();
        harness.getVendorItemsByOrganizationId.mockClear();
        harness.getVendorItemById.mockClear();
        harness.createVendorRepo.mockClear();
        harness.updateVendorRepo.mockClear();
        harness.createVendorItemRepo.mockClear();
        harness.updateVendorItemRepo.mockClear();

        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getVendorById.mockResolvedValue(harness.freshFarmsVendor);
        harness.getUnitById.mockResolvedValue(harness.kilogramUnit);
        harness.getVendorItemsByOrganizationId.mockResolvedValue([
            harness.tomatoItem,
            harness.millersTomatoItem,
            harness.onionItem,
        ]);
        harness.getVendorItemById.mockResolvedValue(harness.tomatoItem);
        harness.createVendorItemRepo.mockImplementation(async (data) => ({
            ...harness.tomatoItem,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
        harness.updateVendorItemRepo.mockImplementation(async (data) => ({
            ...harness.tomatoItem,
            ...data,
            vendorId: harness.tomatoItem.vendorId,
            createdBy: harness.tomatoItem.createdBy,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
    });

    test("rejects unauthenticated Vendor Item listing", async () => {
        const response = await unauthenticatedRoutes.request(
            `http://localhost/${harness.organizationId}/vendor-items`,
        );

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Authentication is required");
    });

    test("lists Organization Vendor Items for an authenticated administrator", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendor-items`,
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.vendorItems).toHaveLength(3);
        expect(body.data.vendorItems.filter((item: { name: string }) => item.name === "Tomato")).toHaveLength(2);
    });

    test("creates a Vendor Item at the Organization administrator seam", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendor-items`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendorId: harness.vendorId,
                    name: "Tomato",
                    unitId: harness.unitId,
                    defaultPurchasePrice: 40.5,
                }),
            },
        );

        expect(response.status).toBe(201);
        expect(harness.createVendorItemRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId: harness.organizationId,
                vendorId: harness.vendorId,
                name: "Tomato",
                unitId: harness.unitId,
                defaultPurchasePrice: 40.5,
                status: "active",
            }),
        );
    });

    test("rejects a Vendor Item payload with a negative or three-decimal price", async () => {
        const negative = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendor-items`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendorId: harness.vendorId,
                    name: "Tomato",
                    unitId: harness.unitId,
                    defaultPurchasePrice: -1,
                }),
            },
        );
        const extraDecimals = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendor-items`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendorId: harness.vendorId,
                    name: "Tomato",
                    unitId: harness.unitId,
                    defaultPurchasePrice: 10.999,
                }),
            },
        );

        expect(negative.status).toBe(400);
        expect(extraDecimals.status).toBe(400);
        expect(harness.createVendorItemRepo).not.toHaveBeenCalled();
    });

    test("rejects Product, inventory, and Store fields on Vendor Item create", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendor-items`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendorId: harness.vendorId,
                    name: "Tomato",
                    unitId: harness.unitId,
                    defaultPurchasePrice: 40.5,
                    productId: harness.vendorItemId,
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createVendorItemRepo).not.toHaveBeenCalled();
    });

    test("rejects assigning an inactive Unit through the Vendor Item route", async () => {
        harness.getUnitById.mockResolvedValue(harness.inactiveCrateUnit);

        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendor-items`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendorId: harness.vendorId,
                    name: "Tomato",
                    unitId: harness.inactiveUnitId,
                    defaultPurchasePrice: 40.5,
                }),
            },
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Inactive Units cannot be assigned");
        expect(harness.createVendorItemRepo).not.toHaveBeenCalled();
    });

    test("updates Vendor Item status for the authenticated Organization", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendor-items/${harness.vendorItemId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "inactive" }),
            },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.vendorItem.status).toBe("inactive");
        expect(body.data.vendorItem.name).toBe("Tomato");
        expect(body.data.vendorItem.vendorId).toBe(harness.vendorId);
    });

    test("denies Vendor Item access when the user is not a member of the Organization", async () => {
        harness.getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendor-items`,
        );

        expect(response.status).toBe(404);
        expect(harness.getVendorItemsByOrganizationId).not.toHaveBeenCalled();
    });

    test("does not expose a Vendor Item deletion route", async () => {
        const response = await vendorsRoutes.request(
            `http://localhost/${harness.organizationId}/vendor-items/${harness.vendorItemId}`,
            { method: "DELETE" },
        );

        expect(response.status).toBe(404);
        expect(harness.updateVendorItemRepo).not.toHaveBeenCalled();
        expect(harness.createVendorItemRepo).not.toHaveBeenCalled();
    });
});
