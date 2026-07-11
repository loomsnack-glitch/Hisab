import { beforeEach, describe, expect, mock, test } from "bun:test";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const categoryId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const burgerId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const coffeeId = "11111111-1111-4111-8111-111111111111";
const bundleId = "22222222-2222-4222-8222-222222222222";
const otherBundleId = "33333333-3333-4333-8333-333333333333";

const now = new Date("2026-07-12T12:00:00.000Z");

const organization = { id: organizationId, name: "Demo Org" };

const category = {
    id: categoryId,
    organizationId,
    name: "Combos",
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const burger = {
    id: burgerId,
    organizationId,
    categoryId,
    name: "Burger",
    price: 80,
    discount: 0,
    imagePath: null,
    productType: "single" as const,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const coffee = {
    id: coffeeId,
    organizationId,
    categoryId,
    name: "Cold Coffee",
    price: 40,
    discount: 0,
    imagePath: null,
    productType: "single" as const,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const existingBundle = {
    id: otherBundleId,
    organizationId,
    categoryId,
    name: "Existing Bundle",
    price: 99,
    discount: 0,
    imagePath: null,
    productType: "bundle" as const,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const getOrganizationByIdForUser = mock(async () => organization);
const getCategoryById = mock(async () => category);
const productNameExistsInCategory = mock(async () => false);
const getProductById = mock(async (_organizationId: string, productId: string) => {
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
const createProductRepo = mock(async (data: typeof burger) => data);
const updateProductRepo = mock(async (data: typeof burger) => data);
const createBundleProductComponentRepo = mock(async (data: {
    id: string;
    organizationId: string;
    bundleProductId: string;
    componentProductId: string;
    quantity: number;
    createdBy: string;
}) => ({
    id: data.id,
    organizationId: data.organizationId,
    bundleProductId: data.bundleProductId,
    componentProductId: data.componentProductId,
    quantity: data.quantity,
    createdBy: data.createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
}));
const getBundleProductComponentsByBundleProductId = mock(async () => [
    {
        id: "44444444-4444-4444-8444-444444444444",
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
const deleteBundleProductComponentsByBundleProductId = mock(async () => undefined);
const begin = mock(async (callback: (tx: unknown) => Promise<void>) => callback({}));

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
}));

mock.module("@/services/storage", () => ({
    deleteObject: mock(async () => undefined),
    generateSignedUrl: mock(async () => null),
}));

mock.module("@/config/db", () => ({
    pg: { begin },
}));

mock.module("./catalog.repository", () => ({
    getCategoryById,
    productNameExistsInCategory,
    getProductById,
    createProduct: createProductRepo,
    updateProduct: updateProductRepo,
    createBundleProductComponent: createBundleProductComponentRepo,
    getBundleProductComponentsByBundleProductId,
    deleteBundleProductComponentsByBundleProductId,
}));

const catalogService = await import("./catalog.service");

describe("Bundle Product catalog service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getCategoryById.mockClear();
        productNameExistsInCategory.mockClear();
        getProductById.mockClear();
        createProductRepo.mockClear();
        updateProductRepo.mockClear();
        createBundleProductComponentRepo.mockClear();
        getBundleProductComponentsByBundleProductId.mockClear();
        deleteBundleProductComponentsByBundleProductId.mockClear();
        begin.mockClear();

        getOrganizationByIdForUser.mockResolvedValue(organization);
        getCategoryById.mockResolvedValue(category);
        productNameExistsInCategory.mockResolvedValue(false);
        createProductRepo.mockImplementation(async (data) => data);
        updateProductRepo.mockImplementation(async (data) => ({
            ...burger,
            ...data,
            productType: "bundle" as const,
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

    test("preserves repeated product components for future distinct bundle configurations", async () => {
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
        expect(createBundleProductComponentRepo).toHaveBeenCalledTimes(2);
        expect(createBundleProductComponentRepo.mock.calls[0]?.[0]).toMatchObject({
            componentProductId: burgerId,
            quantity: 1,
        });
        expect(createBundleProductComponentRepo.mock.calls[1]?.[0]).toMatchObject({
            componentProductId: burgerId,
            quantity: 1,
        });
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
                { productId: burgerId, quantity: 1 },
                { productId: coffeeId, quantity: 2 },
            ],
        });

        expect(response.status).toBe("success");
        expect(response.data?.product.name).toBe("Burger Combo Plus");
        expect(response.data?.product.price).toBe(109);
        expect(deleteBundleProductComponentsByBundleProductId).toHaveBeenCalled();
        expect(createBundleProductComponentRepo).toHaveBeenCalled();
    });
});
