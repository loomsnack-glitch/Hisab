import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("@/middlewares/auth.middleware", () => ({
    authMiddleware: async (context: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
        context.set("authUser", { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
        await next();
    },
}));

const harness = await import("./catalog.service.test-harness");

const { default: catalogRoutes } = await import("./catalog.routes");

const offeringsPath = `http://localhost/${harness.organizationId}/stores/${harness.store.id}/product-offerings`;
const productPath = `http://localhost/${harness.organizationId}/products/${harness.productId}`;

describe("Store Product Offering catalog routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getStoreById.mockClear();
        harness.getStoreById.mockResolvedValue(harness.store);
        harness.getProductById.mockClear();
        harness.getProductById.mockResolvedValue(harness.product);
        harness.getStoreProductOfferingsByStoreId.mockClear();
        harness.getStoreProductOfferingsByStoreId.mockResolvedValue([harness.storeProductOffering]);
        harness.getStoreProductOfferingById.mockClear();
        harness.getStoreProductOfferingById.mockResolvedValue(harness.storeProductOffering);
        harness.createStoreProductOfferingRepo.mockClear();
        harness.deleteStoreProductOfferingRepo.mockClear();
        harness.updateStoreProductOfferingRepo.mockClear();
        harness.updateStoreProductOfferingRepo.mockImplementation(async (data) => ({
            ...harness.storeProductOffering,
            ...data,
        }));
        harness.getProductLabelProfileByProductId.mockResolvedValue(null);
        harness.updateProductRepo.mockClear();
    });

    test("lists Store Product Offerings for a Store in the Organization, including inactive ones", async () => {
        harness.getStoreProductOfferingsByStoreId.mockResolvedValue([
            { ...harness.storeProductOffering, status: "inactive" as "active" | "inactive" },
        ]);

        const response = await catalogRoutes.request(offeringsPath);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.offerings[0]?.product.name).toBe(harness.product.name);
        expect(body.data.offerings[0]?.status).toBe("inactive");
        expect(harness.getStoreProductOfferingsByStoreId).toHaveBeenCalledWith(
            harness.organizationId,
            harness.store.id,
        );
    });

    test("does not create a Store Product Offering through POST", async () => {
        const response = await catalogRoutes.request(offeringsPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                productId: harness.productId,
                price: 135,
            }),
        });

        expect(response.status).toBe(404);
        expect(harness.createStoreProductOfferingRepo).not.toHaveBeenCalled();
    });

    test("updates Offering price, discount, and status without changing shared Catalog Product details", async () => {
        const response = await catalogRoutes.request(
            `${offeringsPath}/${harness.offeringId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ price: 180, discount: 20, status: "inactive" }),
            },
        );

        expect(response.status).toBe(200);
        expect(harness.updateStoreProductOfferingRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: harness.offeringId,
                storeId: harness.store.id,
                price: 180,
                discount: 20,
                status: "inactive",
            }),
        );
        expect(harness.updateProductRepo).not.toHaveBeenCalled();
    });

    test("rejects changing global Product commercial fields", async () => {
        const response = await catalogRoutes.request(productPath, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ price: 180 }),
        });

        expect(response.status).toBe(400);
        expect(harness.updateProductRepo).not.toHaveBeenCalled();
    });

    test("does not delete a Store Product Offering", async () => {
        const response = await catalogRoutes.request(
            `${offeringsPath}/${harness.offeringId}`,
            { method: "DELETE" },
        );

        expect(response.status).toBe(404);
        expect(harness.deleteStoreProductOfferingRepo).not.toHaveBeenCalled();
    });
});
