import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("@/middlewares/auth.middleware", () => ({
    authMiddleware: async (context: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
        context.set("authUser", { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
        await next();
    },
}));

const harness = await import("./catalog.service.test-harness");

const { default: catalogRoutes } = await import("./catalog.routes");

describe("Bundle product catalog routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getCategoryById.mockClear();
        harness.getProductById.mockClear();
        harness.createProductRepo.mockClear();
        harness.updateProductRepo.mockClear();
        harness.createBundleProductComponentRepo.mockClear();
        harness.getBundleProductComponentsByBundleProductId.mockClear();
        harness.getBundleProductComponentAddOnsByComponentIds.mockClear();
        harness.begin.mockClear();

        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getCategoryById.mockResolvedValue(harness.category);
        harness.getProductById.mockImplementation(
            (async (_organizationId: string, productId: string) => {
                if (productId === harness.bundleId) {
                    return { ...harness.existingBundle, id: harness.bundleId };
                }
                return harness.burger;
            }) as never,
        );
        harness.createProductRepo.mockImplementation(async (data) => ({
            ...data,
            createdBy: harness.userId,
            updatedBy: null,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
        harness.updateProductRepo.mockImplementation(
            (async (data: Record<string, unknown>) => ({
                ...harness.existingBundle,
                ...data,
                createdBy: harness.userId,
                updatedBy: harness.userId,
                createdAt: harness.now,
                updatedAt: harness.now,
            })) as never,
        );
        harness.getBundleProductComponentsByBundleProductId.mockResolvedValue([]);
        harness.getBundleProductComponentAddOnsByComponentIds.mockResolvedValue([]);
        harness.begin.mockImplementation(async (callback) => callback({}));
    });

    test("accepts a typed bundle authoring payload at the API seam", async () => {
        const response = await catalogRoutes.request(
            `http://localhost/${harness.organizationId}/bundle-products`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoryId: harness.categoryId,
                    name: "Burger Combo",
                    price: 99,
                    discount: 9,
                    components: [{ productId: harness.burgerId, quantity: 1 }],
                }),
            },
        );

        expect(response.status).toBe(201);
        expect(harness.createProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId: harness.organizationId,
                name: "Burger Combo",
                productType: "bundle",
            }),
            expect.anything(),
        );
        expect(harness.createBundleProductComponentRepo).toHaveBeenCalledWith(
            expect.objectContaining({ componentProductId: harness.burgerId, quantity: 1 }),
            expect.anything(),
        );
    });

    test("rejects a bundle payload without product components before it reaches the service", async () => {
        const response = await catalogRoutes.request(
            `http://localhost/${harness.organizationId}/bundle-products`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoryId: harness.categoryId,
                    name: "Empty Combo",
                    price: 99,
                    components: [],
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createProductRepo).not.toHaveBeenCalled();
    });

    test("routes bundle retirement through the bundle-specific lifecycle endpoint", async () => {
        const response = await catalogRoutes.request(
            `http://localhost/${harness.organizationId}/bundle-products/${harness.bundleId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "inactive" }),
            },
        );

        expect(response.status).toBe(200);
        expect(harness.updateProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: harness.bundleId,
                organizationId: harness.organizationId,
                status: "inactive",
            }),
            expect.anything(),
        );
    });
});
