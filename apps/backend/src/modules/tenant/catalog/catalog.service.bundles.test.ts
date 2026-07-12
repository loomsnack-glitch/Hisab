import { beforeEach, describe, expect, test } from "bun:test";
import {
    begin,
    burger,
    burgerId,
    bundleId,
    catalogService,
    category,
    categoryId,
    cheeseAddOn,
    cheeseAddOnId,
    cheeseAttachment,
    cheeseAttachmentId,
    coffee,
    coffeeId,
    componentId,
    countActiveBundlesByComponentAddOnId,
    countActiveBundlesByComponentProductId,
    countActiveBundlesByProductAddOnPair,
    countActiveBundlesByProductAddOnPairAboveQuantity,
    countBundleProductComponentsByComponentProductId,
    countSaleItemBundleComponentsByComponentProductId,
    countSaleItemsByProductId,
    createBundleProductComponentAddOnRepo,
    createBundleProductComponentRepo,
    createProductRepo,
    deleteProductRepo,
    deleteProductAddOnAttachmentRepo,
    deleteBundleProductComponentsByBundleProductId,
    existingBundle,
    getAddOnById,
    getBundleProductComponentAddOnsByComponentIds,
    getBundleProductComponentsByBundleProductId,
    getCategoryById,
    getOrganizationByIdForUser,
    getProductAddOnAttachmentById,
    getProductById,
    getSelectableProductAddOnAttachmentByProductAndAddOn,
    now,
    organization,
    organizationId,
    otherBundleId,
    productNameExistsInCategory,
    sauceAddOnId,
    sauceAttachment,
    updateAddOnRepo,
    updateProductAddOnAttachmentRepo,
    updateProductRepo,
    userId,
} from "./catalog.service.test-harness";

describe("Bundle Product catalog service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getCategoryById.mockClear();
        productNameExistsInCategory.mockClear();
        getProductById.mockClear();
        createProductRepo.mockClear();
        updateProductRepo.mockClear();
        createBundleProductComponentRepo.mockClear();
        createBundleProductComponentAddOnRepo.mockClear();
        getBundleProductComponentsByBundleProductId.mockClear();
        getBundleProductComponentAddOnsByComponentIds.mockClear();
        deleteBundleProductComponentsByBundleProductId.mockClear();
        getSelectableProductAddOnAttachmentByProductAndAddOn.mockClear();
        countActiveBundlesByComponentProductId.mockClear();
        countActiveBundlesByComponentAddOnId.mockClear();
        countActiveBundlesByProductAddOnPair.mockClear();
        countActiveBundlesByProductAddOnPairAboveQuantity.mockClear();
        countBundleProductComponentsByComponentProductId.mockClear();
        countSaleItemsByProductId.mockClear();
        countSaleItemBundleComponentsByComponentProductId.mockClear();
        deleteProductRepo.mockClear();
        updateAddOnRepo.mockClear();
        getProductAddOnAttachmentById.mockClear();
        updateProductAddOnAttachmentRepo.mockClear();
        deleteProductAddOnAttachmentRepo.mockClear();
        begin.mockClear();

        getOrganizationByIdForUser.mockResolvedValue(organization);
        getCategoryById.mockResolvedValue(category);
        productNameExistsInCategory.mockResolvedValue(false);
        createProductRepo.mockImplementation(async (data) => data);
        updateProductRepo.mockImplementation(async (data) => ({
            ...burger,
            ...data,
            productType: data.productType ?? "single",
            createdBy: userId,
            updatedBy: userId,
            createdAt: now,
            updatedAt: now,
            imagePath: null,
        }));
        begin.mockImplementation(async (callback) => callback({}));
        getProductById.mockImplementation(async (_organizationId: string, productId: string) => {
            if (productId === burgerId) return burger;
            if (productId === coffeeId) return coffee;
            if (productId === otherBundleId) return existingBundle;
            if (productId === bundleId) {
                return {
                    ...existingBundle,
                    id: bundleId,
                    name: "Burger Combo",
                };
            }
            return null;
        });
        getSelectableProductAddOnAttachmentByProductAndAddOn.mockImplementation(
            async (_organizationId: string, productId: string, addOnId: string) => {
                if (productId === burgerId && addOnId === cheeseAddOnId) return cheeseAttachment;
                if (productId === burgerId && addOnId === sauceAddOnId) return sauceAttachment;
                return null;
            },
        );
        getBundleProductComponentsByBundleProductId.mockResolvedValue([
            {
                id: componentId,
                organizationId,
                bundleProductId: bundleId,
                componentProductId: burgerId,
                quantity: 1,
                createdBy: userId,
                updatedBy: null,
                createdAt: now,
                updatedAt: now,
            },
        ]);
        getBundleProductComponentAddOnsByComponentIds.mockResolvedValue([]);
        countActiveBundlesByComponentProductId.mockResolvedValue(0);
        countActiveBundlesByComponentAddOnId.mockResolvedValue(0);
        countActiveBundlesByProductAddOnPair.mockResolvedValue(0);
        countActiveBundlesByProductAddOnPairAboveQuantity.mockResolvedValue(0);
        countBundleProductComponentsByComponentProductId.mockResolvedValue(0);
        countSaleItemsByProductId.mockResolvedValue(0);
        countSaleItemBundleComponentsByComponentProductId.mockResolvedValue(0);
        deleteProductRepo.mockResolvedValue(burger);
        getAddOnById.mockResolvedValue(cheeseAddOn);
        updateAddOnRepo.mockImplementation(async (data) => data);
        getProductAddOnAttachmentById.mockResolvedValue(cheeseAttachment);
        updateProductAddOnAttachmentRepo.mockImplementation(async (data) => ({
            ...cheeseAttachment,
            selectionCap: data.selectionCap,
            status: data.status,
            updatedBy: userId,
        }));
    });

    test("creates a typed bundle product with top-level product components", async () => {
        const response = await catalogService.createBundleProduct(userId, organizationId, {
            categoryId,
            name: "Burger Combo",
            price: 99,
            discount: 0,
            components: [
                { productId: burgerId, quantity: 1 },
                { productId: coffeeId, quantity: 1 },
            ],
        });

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.product.productType).toBe("bundle");
        expect(response.data?.product.name).toBe("Burger Combo");
        expect(response.data?.product.price).toBe(99);
        expect(response.data?.components).toHaveLength(2);
        expect(createProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                productType: "bundle",
                name: "Burger Combo",
                price: 99,
            }),
            expect.anything(),
        );
    });

    test("creates a bundle with one product plus nested add-ons", async () => {
        const response = await catalogService.createBundleProduct(userId, organizationId, {
            categoryId,
            name: "Cheese Burger Combo",
            price: 99,
            components: [
                {
                    productId: burgerId,
                    quantity: 1,
                    addOns: [{ addOnId: cheeseAddOnId, quantity: 1 }],
                },
            ],
        });

        expect(response.status).toBe("success");
        expect(createBundleProductComponentRepo).toHaveBeenCalledTimes(1);
        expect(createBundleProductComponentAddOnRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                addOnId: cheeseAddOnId,
                quantity: 1,
            }),
            expect.anything(),
        );
        expect(response.data?.components[0]?.addOns).toHaveLength(1);
    });

    test("rejects bundle creation without product components", async () => {
        const response = await catalogService.createBundleProduct(userId, organizationId, {
            categoryId,
            name: "Empty Bundle",
            price: 99,
            components: [],
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("at least one product component");
        expect(createProductRepo).not.toHaveBeenCalled();
    });

    test("rejects bundle-in-bundle composition", async () => {
        const response = await catalogService.createBundleProduct(userId, organizationId, {
            categoryId,
            name: "Nested Bundle",
            price: 120,
            components: [{ productId: otherBundleId, quantity: 1 }],
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("cannot contain other bundles");
        expect(createProductRepo).not.toHaveBeenCalled();
    });

    test("rejects inactive product components during authoring", async () => {
        getProductById.mockImplementation(async (_organizationId: string, productId: string) => {
            if (productId === burgerId) return { ...burger, status: "inactive" as const };
            return null;
        });

        const response = await catalogService.createBundleProduct(userId, organizationId, {
            categoryId,
            name: "Inactive Product Bundle",
            price: 99,
            components: [{ productId: burgerId, quantity: 1 }],
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("active products");
        expect(createProductRepo).not.toHaveBeenCalled();
    });

    test("rejects bundle add-ons without an active product attachment", async () => {
        getSelectableProductAddOnAttachmentByProductAndAddOn.mockResolvedValue(null);

        const response = await catalogService.createBundleProduct(userId, organizationId, {
            categoryId,
            name: "Invalid Add-On Bundle",
            price: 99,
            components: [
                {
                    productId: burgerId,
                    quantity: 1,
                    addOns: [{ addOnId: cheeseAddOnId, quantity: 1 }],
                },
            ],
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("active product add-on attachment");
        expect(createProductRepo).not.toHaveBeenCalled();
    });

    test("rejects bundle add-on quantity above selection cap", async () => {
        const response = await catalogService.createBundleProduct(userId, organizationId, {
            categoryId,
            name: "Over Cap Bundle",
            price: 99,
            components: [
                {
                    productId: burgerId,
                    quantity: 1,
                    addOns: [{ addOnId: cheeseAddOnId, quantity: 3 }],
                },
            ],
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("selection cap");
        expect(createProductRepo).not.toHaveBeenCalled();
    });

    test("merges identical repeated components by quantity", async () => {
        const response = await catalogService.createBundleProduct(userId, organizationId, {
            categoryId,
            name: "Double Burger Combo",
            price: 140,
            components: [
                { productId: burgerId, quantity: 1 },
                { productId: burgerId, quantity: 1 },
            ],
        });

        expect(response.status).toBe("success");
        expect(createBundleProductComponentRepo).toHaveBeenCalledTimes(1);
        expect(createBundleProductComponentRepo.mock.calls[0]?.[0]).toMatchObject({
            componentProductId: burgerId,
            quantity: 2,
        });
    });

    test("keeps same-product components separate when add-on shapes differ", async () => {
        const response = await catalogService.createBundleProduct(userId, organizationId, {
            categoryId,
            name: "Mixed Burger Bundle",
            price: 150,
            components: [
                { productId: burgerId, quantity: 1 },
                {
                    productId: burgerId,
                    quantity: 1,
                    addOns: [{ addOnId: cheeseAddOnId, quantity: 1 }],
                },
            ],
        });

        expect(response.status).toBe("success");
        expect(createBundleProductComponentRepo).toHaveBeenCalledTimes(2);
        expect(createBundleProductComponentAddOnRepo).toHaveBeenCalledTimes(1);
    });

    test("merges identical configured components including nested add-ons", async () => {
        const response = await catalogService.createBundleProduct(userId, organizationId, {
            categoryId,
            name: "Twin Cheese Burgers",
            price: 160,
            components: [
                {
                    productId: burgerId,
                    quantity: 1,
                    addOns: [{ addOnId: cheeseAddOnId, quantity: 1 }],
                },
                {
                    productId: burgerId,
                    quantity: 1,
                    addOns: [{ addOnId: cheeseAddOnId, quantity: 1 }],
                },
            ],
        });

        expect(response.status).toBe("success");
        expect(createBundleProductComponentRepo).toHaveBeenCalledTimes(1);
        expect(createBundleProductComponentRepo.mock.calls[0]?.[0]).toMatchObject({
            componentProductId: burgerId,
            quantity: 2,
        });
        expect(createBundleProductComponentAddOnRepo).toHaveBeenCalledTimes(1);
    });

    test("retires a bundle product through status update", async () => {
        const response = await catalogService.updateBundleProduct(userId, organizationId, bundleId, {
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(response.data?.product.status).toBe("inactive");
        expect(updateProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: bundleId,
                status: "inactive",
            }),
            expect.anything(),
        );
    });

    test("allows in-place bundle edits for future sales", async () => {
        const response = await catalogService.updateBundleProduct(userId, organizationId, bundleId, {
            name: "Burger Combo Plus",
            price: 109,
            components: [
                {
                    productId: burgerId,
                    quantity: 1,
                    addOns: [{ addOnId: cheeseAddOnId, quantity: 1 }],
                },
                { productId: coffeeId, quantity: 2 },
            ],
        });

        expect(response.status).toBe("success");
        expect(response.data?.product.name).toBe("Burger Combo Plus");
        expect(response.data?.product.price).toBe(109);
        expect(deleteBundleProductComponentsByBundleProductId).toHaveBeenCalled();
        expect(createBundleProductComponentRepo).toHaveBeenCalled();
        expect(createBundleProductComponentAddOnRepo).toHaveBeenCalled();
    });

    test("blocks product inactivation while an active bundle depends on it", async () => {
        countActiveBundlesByComponentProductId.mockResolvedValue(1);

        const response = await catalogService.updateProduct(userId, organizationId, burgerId, {
            status: "inactive",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("used by an active bundle");
        expect(updateProductRepo).not.toHaveBeenCalled();
    });

    test("allows product inactivation after dependent active bundles are gone", async () => {
        countActiveBundlesByComponentProductId.mockResolvedValue(0);

        const response = await catalogService.updateProduct(userId, organizationId, burgerId, {
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(response.data?.product.status).toBe("inactive");
        expect(updateProductRepo).toHaveBeenCalled();
    });

    test("blocks add-on inactivation while an active bundle depends on it", async () => {
        countActiveBundlesByComponentAddOnId.mockResolvedValue(1);

        const response = await catalogService.updateAddOn(userId, organizationId, cheeseAddOnId, {
            status: "inactive",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("used by an active bundle");
        expect(updateAddOnRepo).not.toHaveBeenCalled();
    });

    test("allows add-on inactivation after dependent active bundles are gone", async () => {
        countActiveBundlesByComponentAddOnId.mockResolvedValue(0);

        const response = await catalogService.updateAddOn(userId, organizationId, cheeseAddOnId, {
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(response.data?.addOn.status).toBe("inactive");
        expect(updateAddOnRepo).toHaveBeenCalled();
    });

    test("blocks attachment deactivation while an active bundle depends on it", async () => {
        countActiveBundlesByProductAddOnPair.mockResolvedValue(1);

        const response = await catalogService.updateProductAddOnAttachment(
            userId,
            organizationId,
            burgerId,
            cheeseAttachmentId,
            { status: "inactive" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("used by an active bundle");
        expect(updateProductAddOnAttachmentRepo).not.toHaveBeenCalled();
    });

    test("allows attachment deactivation after dependent active bundles are gone", async () => {
        countActiveBundlesByProductAddOnPair.mockResolvedValue(0);
        getProductAddOnAttachmentById.mockResolvedValueOnce(cheeseAttachment).mockResolvedValueOnce({
            ...cheeseAttachment,
            status: "inactive" as const,
        });

        const response = await catalogService.updateProductAddOnAttachment(
            userId,
            organizationId,
            burgerId,
            cheeseAttachmentId,
            { status: "inactive" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.attachment.status).toBe("inactive");
        expect(updateProductAddOnAttachmentRepo).toHaveBeenCalled();
    });

    test("revalidates stored components before reactivating a bundle", async () => {
        getProductById.mockImplementation(async (_organizationId: string, productId: string) => {
            if (productId === burgerId) return { ...burger, status: "inactive" as const };
            if (productId === bundleId) {
                return {
                    ...existingBundle,
                    id: bundleId,
                    name: "Burger Combo",
                    status: "inactive" as const,
                };
            }
            return null;
        });

        const response = await catalogService.updateBundleProduct(userId, organizationId, bundleId, {
            status: "active",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("active products");
        expect(updateProductRepo).not.toHaveBeenCalled();
    });

    test("revalidates stored add-on quantities before reactivating a bundle", async () => {
        getProductById.mockImplementation(async (_organizationId: string, productId: string) => {
            if (productId === burgerId) return burger;
            if (productId === bundleId) {
                return {
                    ...existingBundle,
                    id: bundleId,
                    name: "Burger Combo",
                    status: "inactive" as const,
                };
            }
            return null;
        });
        getBundleProductComponentAddOnsByComponentIds.mockResolvedValue([
            {
                id: cheeseAttachmentId,
                organizationId,
                bundleProductComponentId: componentId,
                addOnId: cheeseAddOnId,
                quantity: 2,
                createdBy: userId,
                updatedBy: null,
                createdAt: now,
                updatedAt: now,
            },
        ]);
        getSelectableProductAddOnAttachmentByProductAndAddOn.mockResolvedValue({
            ...cheeseAttachment,
            selectionCap: 1,
        });

        const response = await catalogService.updateBundleProduct(userId, organizationId, bundleId, {
            status: "active",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("selection cap");
        expect(updateProductRepo).not.toHaveBeenCalled();
    });

    test("requires bundle products to use the bundle update workflow", async () => {
        const response = await catalogService.updateProduct(userId, organizationId, bundleId, {
            status: "inactive",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("bundle update workflow");
        expect(updateProductRepo).not.toHaveBeenCalled();
    });

    test("does not delete a bundle product with a persisted composition", async () => {
        const response = await catalogService.deleteProduct(userId, organizationId, bundleId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("Bundle products cannot be deleted");
        expect(deleteProductRepo).not.toHaveBeenCalled();
    });

    test("does not delete a product referenced by a bundle", async () => {
        countBundleProductComponentsByComponentProductId.mockResolvedValue(1);

        const response = await catalogService.deleteProduct(userId, organizationId, burgerId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("used by a bundle");
        expect(deleteProductRepo).not.toHaveBeenCalled();
    });

    test("does not delete a product with bundle sales history", async () => {
        countSaleItemBundleComponentsByComponentProductId.mockResolvedValue(1);

        const response = await catalogService.deleteProduct(userId, organizationId, burgerId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("sales history");
        expect(deleteProductRepo).not.toHaveBeenCalled();
    });

    test("blocks attachment selection cap reduction below quantities used by active bundles", async () => {
        countActiveBundlesByProductAddOnPairAboveQuantity.mockResolvedValue(1);

        const response = await catalogService.updateProductAddOnAttachment(
            userId,
            organizationId,
            burgerId,
            cheeseAttachmentId,
            { selectionCap: 1 },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("selection cap cannot be reduced");
        expect(updateProductAddOnAttachmentRepo).not.toHaveBeenCalled();
    });

    test("allows attachment selection cap reduction when no active bundle exceeds the next cap", async () => {
        countActiveBundlesByProductAddOnPairAboveQuantity.mockResolvedValue(0);
        getProductAddOnAttachmentById.mockResolvedValueOnce(cheeseAttachment).mockResolvedValueOnce({
            ...cheeseAttachment,
            selectionCap: 1,
        });

        const response = await catalogService.updateProductAddOnAttachment(
            userId,
            organizationId,
            burgerId,
            cheeseAttachmentId,
            { selectionCap: 1 },
        );

        expect(response.status).toBe("success");
        expect(response.data?.attachment.selectionCap).toBe(1);
        expect(updateProductAddOnAttachmentRepo).toHaveBeenCalled();
    });

    test("blocks attachment deletion while an active bundle depends on it", async () => {
        countActiveBundlesByProductAddOnPair.mockResolvedValue(1);

        const response = await catalogService.deleteProductAddOnAttachment(
            userId,
            organizationId,
            burgerId,
            cheeseAttachmentId,
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("used by an active bundle");
        expect(deleteProductAddOnAttachmentRepo).not.toHaveBeenCalled();
    });

    test("allows attachment deletion after dependent active bundles are gone", async () => {
        countActiveBundlesByProductAddOnPair.mockResolvedValue(0);

        const response = await catalogService.deleteProductAddOnAttachment(
            userId,
            organizationId,
            burgerId,
            cheeseAttachmentId,
        );

        expect(response.status).toBe("success");
        expect(response.data?.attachment.id).toBe(cheeseAttachmentId);
        expect(deleteProductAddOnAttachmentRepo).toHaveBeenCalled();
    });
});
