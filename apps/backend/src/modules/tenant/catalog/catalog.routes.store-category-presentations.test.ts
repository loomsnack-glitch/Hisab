import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("@/middlewares/auth.middleware", () => ({
    authMiddleware: async (context: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
        context.set("authUser", { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
        await next();
    },
}));

const harness = await import("./catalog.service.test-harness");

const { default: catalogRoutes } = await import("./catalog.routes");

const presentationsPath = `http://localhost/${harness.organizationId}/stores/${harness.store.id}/category-presentations`;

describe("Store Category Presentation catalog routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getStoreById.mockClear();
        harness.getStoreById.mockResolvedValue(harness.store);
        harness.getStoreCategoryPresentationsByStoreId.mockClear();
        harness.getStoreCategoryPresentationsByStoreId.mockResolvedValue([
            harness.storeCategoryPresentation,
            harness.drinksStoreCategoryPresentation,
        ]);
        harness.getStoreCategoryPresentationById.mockClear();
        harness.getStoreCategoryPresentationById.mockResolvedValue(harness.storeCategoryPresentation);
        harness.updateStoreCategoryPresentationRepo.mockClear();
        harness.updateStoreCategoryPresentationRepo.mockImplementation(async (data) => ({
            ...harness.storeCategoryPresentation,
            ...data,
        }));
        harness.reorderStoreCategoryPresentationsRepo.mockClear();
        harness.createStoreCategoryPresentationRepo.mockClear();
        harness.createCategoryRepo.mockClear();
    });

    test("lists Store Category Presentations for a Store in the Organization", async () => {
        const response = await catalogRoutes.request(presentationsPath);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.presentations[0]?.category.name).toBe(harness.category.name);
        expect(body.data.presentations[1]?.visible).toBe(false);
        expect(harness.getStoreCategoryPresentationsByStoreId).toHaveBeenCalledWith(
            harness.organizationId,
            harness.store.id,
        );
    });

    test("updates local visibility without changing shared Category details", async () => {
        const response = await catalogRoutes.request(
            `${presentationsPath}/${harness.presentationId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visible: false }),
            },
        );

        expect(response.status).toBe(200);
        expect(harness.updateStoreCategoryPresentationRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: harness.presentationId,
                storeId: harness.store.id,
                visible: false,
            }),
        );
        expect(harness.createCategoryRepo).not.toHaveBeenCalled();
    });

    test("reorders Store browse categories for one Store", async () => {
        const response = await catalogRoutes.request(`${presentationsPath}/order`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                categoryIds: [harness.drinksCategory.id, harness.categoryId],
            }),
        });

        expect(response.status).toBe(200);
        expect(harness.reorderStoreCategoryPresentationsRepo).toHaveBeenCalledWith(
            harness.organizationId,
            harness.store.id,
            [harness.drinksCategory.id, harness.categoryId],
            "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            expect.anything(),
        );
    });

    test("does not create a Store Category Presentation through POST", async () => {
        const response = await catalogRoutes.request(presentationsPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: harness.categoryId, visible: true }),
        });

        expect(response.status).toBe(404);
        expect(harness.createStoreCategoryPresentationRepo).not.toHaveBeenCalled();
    });
});
