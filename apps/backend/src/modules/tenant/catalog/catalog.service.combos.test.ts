import { beforeEach, describe, expect, test } from "bun:test";
import {
    begin,
    burger,
    burgerId,
    bundleId,
    category,
    categoryId,
    coffee,
    coffeeId,
    catalogService,
    createComboChoiceGroupRepo,
    createComboChoiceOptionRepo,
    createProductRepo,
    updateProductRepo,
    getCategoryById,
    getComboChoiceGroupsByProductId,
    getComboChoiceGroupsByProductIds,
    getComboChoiceOptionsByGroupIds,
    getActiveProductsByOrganizationId,
    getProductsByIds,
    getOrganizationByIdForUser,
    getProductById,
    organization,
    organizationId,
    pieceUnitId,
    productNameExistsInCategory,
    userId,
} from "./catalog.service.test-harness";

describe("Combo Product catalog service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getCategoryById.mockClear();
        productNameExistsInCategory.mockClear();
        createProductRepo.mockClear();
        updateProductRepo.mockClear();
        createComboChoiceGroupRepo.mockClear();
        createComboChoiceOptionRepo.mockClear();
        getComboChoiceGroupsByProductId.mockClear();
        getComboChoiceGroupsByProductIds.mockClear();
        getComboChoiceOptionsByGroupIds.mockClear();
        getActiveProductsByOrganizationId.mockClear();
        getProductsByIds.mockClear();
        getProductById.mockClear();
        begin.mockClear();
        getOrganizationByIdForUser.mockResolvedValue(organization);
        getCategoryById.mockResolvedValue(category);
        productNameExistsInCategory.mockResolvedValue(false);
        createProductRepo.mockImplementation(async (data) => data);
        createComboChoiceGroupRepo.mockImplementation(async (data) => data);
        createComboChoiceOptionRepo.mockImplementation(async (data) => data);
        getComboChoiceGroupsByProductId.mockResolvedValue([]);
        getComboChoiceGroupsByProductIds.mockResolvedValue([]);
        getComboChoiceOptionsByGroupIds.mockResolvedValue([]);
        getActiveProductsByOrganizationId.mockResolvedValue([burger]);
        getProductsByIds.mockResolvedValue([burger]);
        getProductById.mockImplementation((async (_organizationId: string, productId: string) => {
            if (productId === burgerId) return burger;
            if (productId === coffeeId) return coffee;
            return null;
        }) as never);
        begin.mockImplementation(async (callback) => callback({}));
    });

    test("creates a Combo with configurable choice groups and option adjustments", async () => {
        const response = await catalogService.createComboProduct(userId, organizationId, {
            categoryId,
            name: "Lunch Combo",
            price: 150,
            discount: 0,
            choiceGroups: [{
                name: "Choose a drink",
                minSelections: 1,
                maxSelections: 2,
                options: [
                    { productId: burgerId, maxQuantity: 1, priceAdjustment: 0 },
                    { productId: coffeeId, maxQuantity: 2, priceAdjustment: 10 },
                ],
            }],
        });

        expect(response.status).toBe("success");
        expect(response.data?.product.productType).toBe("combo");
        expect(createProductRepo).toHaveBeenCalledWith(expect.objectContaining({
            productType: "combo",
            unitId: pieceUnitId,
            defaultSellingQuantity: 1,
            allowCustomSellingQuantity: false,
        }), expect.anything());
        expect(createComboChoiceGroupRepo).toHaveBeenCalledWith(expect.objectContaining({ minSelections: 1, maxSelections: 2 }), expect.anything());
        expect(createComboChoiceOptionRepo).toHaveBeenCalledTimes(2);
    });

    test("rejects duplicate options in one choice group before creating the product", async () => {
        const response = await catalogService.createComboProduct(userId, organizationId, {
            categoryId,
            name: "Invalid Combo",
            price: 100,
            choiceGroups: [{
                name: "Choose",
                minSelections: 1,
                maxSelections: 1,
                options: [
                    { productId: burgerId, maxQuantity: 1, priceAdjustment: 0 },
                    { productId: burgerId, maxQuantity: 1, priceAdjustment: 0 },
                ],
            }],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("cannot repeat");
        expect(createProductRepo).not.toHaveBeenCalled();
    });

    test("rejects reactivating a Combo when one of its stored options is inactive", async () => {
        const inactiveCombo = {
            ...burger,
            id: bundleId,
            name: "Retired lunch Combo",
            productType: "combo" as const,
            status: "inactive" as const,
        };
        const groupId = "99999999-9999-4999-8999-999999999999";
        getProductById.mockImplementation((async (_organizationId: string, requestedProductId: string) => {
            if (requestedProductId === bundleId) return inactiveCombo;
            if (requestedProductId === burgerId) return { ...burger, status: "inactive" as const };
            return null;
        }) as never);
        getComboChoiceGroupsByProductId.mockResolvedValue([{
            id: groupId,
            organizationId,
            comboProductId: bundleId,
            name: "Choose a main",
            minSelections: 1,
            maxSelections: 1,
            sortOrder: 0,
            createdBy: userId,
            updatedBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }]);
        getComboChoiceOptionsByGroupIds.mockResolvedValue([{
            id: "88888888-8888-4888-8888-888888888888",
            organizationId,
            choiceGroupId: groupId,
            optionProductId: burgerId,
            maxQuantity: 1,
            priceAdjustment: 0,
            sortOrder: 0,
            createdBy: userId,
            updatedBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }]);

        const response = await catalogService.updateComboProduct(userId, organizationId, bundleId, { status: "active" });

        expect(response.status).toBe("error");
        expect(response.message).toContain("must be active");
        expect(updateProductRepo).not.toHaveBeenCalled();
    });

    test("loads active Combo details in bulk without per-Combo lookups", async () => {
        const combo = { ...burger, id: bundleId, productType: "combo" as const };
        const groupId = "99999999-9999-4999-8999-999999999999";
        getActiveProductsByOrganizationId.mockResolvedValue([combo]);
        getComboChoiceGroupsByProductIds.mockResolvedValue([{
            id: groupId, organizationId, comboProductId: bundleId, name: "Choose a main", minSelections: 1, maxSelections: 1,
            sortOrder: 0, createdBy: userId, updatedBy: null, createdAt: new Date(), updatedAt: new Date(),
        }]);
        getComboChoiceOptionsByGroupIds.mockResolvedValue([{
            id: "88888888-8888-4888-8888-888888888888", organizationId, choiceGroupId: groupId, optionProductId: burgerId,
            maxQuantity: 1, priceAdjustment: 0, sortOrder: 0, createdBy: userId, updatedBy: null, createdAt: new Date(), updatedAt: new Date(),
        }]);

        const response = await catalogService.getComboProductDetailsForDeviceBulk({ organization: { id: organizationId } } as never);

        expect(response.data?.combos).toHaveLength(1);
        expect(getComboChoiceGroupsByProductIds).toHaveBeenCalledTimes(1);
        expect(getComboChoiceGroupsByProductId).not.toHaveBeenCalled();
        expect(getProductsByIds).toHaveBeenCalledWith(organizationId, [burgerId]);
    });
});
