import { beforeEach, describe, expect, test } from "bun:test";
import {
    catalogService,
    categoryId,
    createProductRepo,
    foreignUnit,
    foreignUnitId,
    getOrganizationByIdForUser,
    getProductById,
    getUnitById,
    getUnitByPredefinedKey,
    gramUnit,
    gramUnitId,
    inactiveUnit,
    inactiveUnitId,
    organization,
    organizationId,
    pieceUnit,
    pieceUnitId,
    product,
    productId,
    productNameExistsInCategory,
    updateProductRepo,
    userId,
} from "./catalog.service.test-harness";

describe("Default Product selling units", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getOrganizationByIdForUser.mockResolvedValue(organization);
        productNameExistsInCategory.mockClear();
        productNameExistsInCategory.mockResolvedValue(false);
        getProductById.mockClear();
        getProductById.mockResolvedValue({ ...product });
        getUnitById.mockClear();
        getUnitById.mockImplementation(async (_organizationId: string, unitId: string) => {
            if (unitId === gramUnitId) return gramUnit;
            if (unitId === inactiveUnitId) return inactiveUnit;
            if (unitId === pieceUnitId) return pieceUnit;
            return null;
        });
        getUnitByPredefinedKey.mockClear();
        getUnitByPredefinedKey.mockResolvedValue(pieceUnit);
        createProductRepo.mockClear();
        createProductRepo.mockImplementation(async (data) => ({
            ...product,
            ...data,
            unitLabel: data.unitId === gramUnitId ? "g" : "pc",
        }));
        updateProductRepo.mockClear();
        updateProductRepo.mockImplementation(async (data) => ({
            ...product,
            ...data,
            productType: product.productType,
            createdAt: product.createdAt,
            createdBy: product.createdBy,
            updatedAt: product.updatedAt,
            unitLabel: data.unitId === gramUnitId ? "g" : "pc",
        }));
    });

    test("create product defaults to the Organization Piece Unit at quantity 1 with custom quantity disabled", async () => {
        const response = await catalogService.createProduct(userId, organizationId, {
            categoryId,
            name: "Water Bottle",
            price: 20,
        });

        expect(response.status).toBe("success");
        expect(createProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Water Bottle",
                price: 20,
                unitId: pieceUnitId,
                defaultSellingQuantity: 1,
                allowCustomSellingQuantity: false,
            }),
        );
        expect(response.data?.product.unitId).toBe(pieceUnitId);
        expect(response.data?.product.defaultSellingQuantity).toBe(1);
        expect(response.data?.product.allowCustomSellingQuantity).toBe(false);
        expect(response.data?.product.unitLabel).toBe("pc");
        expect(response.data?.product.name).toBe("Water Bottle");
    });

    test("create product stores an active Organization Unit and Default Selling Quantity", async () => {
        const response = await catalogService.createProduct(userId, organizationId, {
            categoryId,
            name: "Cake",
            price: 250,
            unitId: gramUnitId,
            defaultSellingQuantity: 250,
        });

        expect(response.status).toBe("success");
        expect(createProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Cake",
                price: 250,
                unitId: gramUnitId,
                defaultSellingQuantity: 250,
                allowCustomSellingQuantity: false,
            }),
        );
        expect(response.data?.product.unitLabel).toBe("g");
        expect(response.data?.product.defaultSellingQuantity).toBe(250);
    });

    test("create product can enable Custom Selling Quantity for an eligible single Product", async () => {
        const response = await catalogService.createProduct(userId, organizationId, {
            categoryId,
            name: "Cake",
            price: 250,
            unitId: gramUnitId,
            defaultSellingQuantity: 250,
            allowCustomSellingQuantity: true,
        });

        expect(response.status).toBe("success");
        expect(createProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Cake",
                allowCustomSellingQuantity: true,
            }),
        );
        expect(response.data?.product.allowCustomSellingQuantity).toBe(true);
    });

    test("create product rejects a Unit from another Organization", async () => {
        getUnitById.mockResolvedValue(null);

        const response = await catalogService.createProduct(userId, organizationId, {
            categoryId,
            name: "Cake",
            price: 250,
            unitId: foreignUnitId,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(response.message).toBe("Unit not found");
        expect(createProductRepo).not.toHaveBeenCalled();
        expect(foreignUnit.organizationId).not.toBe(organizationId);
    });

    test("create product rejects an inactive Unit", async () => {
        const response = await catalogService.createProduct(userId, organizationId, {
            categoryId,
            name: "Cake",
            price: 250,
            unitId: inactiveUnitId,
            defaultSellingQuantity: 1,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Inactive Units cannot be assigned");
        expect(createProductRepo).not.toHaveBeenCalled();
    });

    test("update product can change Unit and Default Selling Quantity without renaming the Product", async () => {
        const response = await catalogService.updateProduct(
            userId,
            organizationId,
            productId,
            {
                unitId: gramUnitId,
                defaultSellingQuantity: 250.5,
            },
        );

        expect(response.status).toBe("success");
        expect(updateProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Burger",
                unitId: gramUnitId,
                defaultSellingQuantity: 250.5,
                allowCustomSellingQuantity: false,
            }),
        );
        expect(response.data?.product.name).toBe("Burger");
        expect(response.data?.product.unitLabel).toBe("g");
    });

    test("update product can enable or disable Custom Selling Quantity without renaming the Product", async () => {
        const enabled = await catalogService.updateProduct(
            userId,
            organizationId,
            productId,
            { allowCustomSellingQuantity: true },
        );

        expect(enabled.status).toBe("success");
        expect(updateProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Burger",
                allowCustomSellingQuantity: true,
            }),
        );
        expect(enabled.data?.product.allowCustomSellingQuantity).toBe(true);

        getProductById.mockResolvedValue({
            ...product,
            allowCustomSellingQuantity: true,
        });

        const disabled = await catalogService.updateProduct(
            userId,
            organizationId,
            productId,
            { allowCustomSellingQuantity: false },
        );

        expect(disabled.status).toBe("success");
        expect(updateProductRepo).toHaveBeenLastCalledWith(
            expect.objectContaining({
                name: "Burger",
                allowCustomSellingQuantity: false,
            }),
        );
    });

    test("update product rejects assigning an inactive Unit that is not already on the Product", async () => {
        const response = await catalogService.updateProduct(
            userId,
            organizationId,
            productId,
            { unitId: inactiveUnitId },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toBe("Inactive Units cannot be assigned");
        expect(updateProductRepo).not.toHaveBeenCalled();
    });

    test("update product keeps a currently assigned inactive Unit", async () => {
        getProductById.mockResolvedValue({
            ...product,
            unitId: inactiveUnitId,
            unitLabel: "slice",
        });

        const response = await catalogService.updateProduct(
            userId,
            organizationId,
            productId,
            { name: "Burger" },
        );

        expect(response.status).toBe("success");
        expect(updateProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Burger",
                unitId: inactiveUnitId,
                allowCustomSellingQuantity: false,
            }),
        );
    });
});
