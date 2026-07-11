import { mock } from "bun:test";

export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const categoryId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
export const productId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const burgerId = productId;
export const coffeeId = "11111111-1111-4111-8111-111111111111";
export const bundleId = "22222222-2222-4222-8222-222222222222";
export const otherBundleId = "33333333-3333-4333-8333-333333333333";
export const addOnId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const cheeseAddOnId = addOnId;
export const sauceAddOnId = "55555555-5555-4555-8555-555555555555";
export const attachmentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
export const cheeseAttachmentId = "66666666-6666-4666-8666-666666666666";
export const componentId = "44444444-4444-4444-8444-444444444444";

export const now = new Date("2026-07-12T12:00:00.000Z");

export const organization = { id: organizationId, name: "Demo Org" };

export const category = {
    id: categoryId,
    organizationId,
    name: "Combos",
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const product = {
    id: productId,
    organizationId,
    categoryId,
    name: "Burger",
    price: 100,
    discount: 0,
    imagePath: null,
    productType: "single" as const,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const burger = {
    ...product,
    name: "Burger",
    price: 80,
};

export const coffee = {
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

export const existingBundle = {
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

export const addOn = {
    id: addOnId,
    organizationId,
    name: "Extra Cheese",
    price: 20,
    discount: 0,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const cheeseAddOn = addOn;

export const sauceAddOn = {
    id: sauceAddOnId,
    organizationId,
    name: "Special Sauce",
    price: 15,
    discount: 0,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const attachmentResponse = {
    id: attachmentId,
    organizationId,
    productId,
    addOnId,
    selectionCap: 1,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    addOn,
};

export const cheeseAttachment = {
    id: cheeseAttachmentId,
    organizationId,
    productId: burgerId,
    addOnId: cheeseAddOnId,
    selectionCap: 2,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    addOn: cheeseAddOn,
};

export const sauceAttachment = {
    id: "77777777-7777-4777-8777-777777777777",
    organizationId,
    productId: burgerId,
    addOnId: sauceAddOnId,
    selectionCap: 1,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    addOn: sauceAddOn,
};

export const getOrganizationByIdForUser = mock(async () => organization);
export const getCategoryById = mock(async () => category);
export const productNameExistsInCategory = mock(async () => false);
export const getProductById = mock(async () => product);
export const createProductRepo = mock(async (data: typeof product) => data);
export const updateProductRepo = mock(async (data: typeof product) => data);
export const createBundleProductComponentRepo = mock(async (data: {
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
export const createBundleProductComponentAddOnRepo = mock(async (data: {
    id: string;
    organizationId: string;
    bundleProductComponentId: string;
    addOnId: string;
    quantity: number;
    createdBy: string;
}) => ({
    id: data.id,
    organizationId: data.organizationId,
    bundleProductComponentId: data.bundleProductComponentId,
    addOnId: data.addOnId,
    quantity: data.quantity,
    createdBy: data.createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
}));
export const getBundleProductComponentsByBundleProductId = mock(async () => []);
export const getBundleProductComponentAddOnsByComponentIds = mock(async () => []);
export const deleteBundleProductComponentsByBundleProductId = mock(async () => undefined);
export const getSelectableProductAddOnAttachmentByProductAndAddOn = mock(async () => null);
export const countActiveBundlesByComponentProductId = mock(async () => 0);
export const countActiveBundlesByComponentAddOnId = mock(async () => 0);
export const countActiveBundlesByProductAddOnPair = mock(async () => 0);
export const countActiveBundlesByProductAddOnPairAboveQuantity = mock(async () => 0);
export const addOnNameExistsInOrganization = mock(async () => false);
export const createAddOnRepo = mock(async (data: typeof addOn) => data);
export const getAddOnById = mock(async () => addOn);
export const updateAddOnRepo = mock(async (data: typeof addOn) => data);
export const productAddOnAttachmentExists = mock(async () => false);
export const createProductAddOnAttachmentRepo = mock(async (data: {
    id: string;
    organizationId: string;
    productId: string;
    addOnId: string;
    selectionCap: number;
    status: "active" | "inactive";
    createdBy: string;
}) => ({
    id: data.id,
    organizationId: data.organizationId,
    productId: data.productId,
    addOnId: data.addOnId,
    selectionCap: data.selectionCap,
    status: data.status,
    createdBy: data.createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
}));
export const getProductAddOnAttachmentById = mock(async () => attachmentResponse);
export const updateProductAddOnAttachmentRepo = mock(async (data: {
    id: string;
    selectionCap: number;
    status: "active" | "inactive";
}) => ({
    ...attachmentResponse,
    selectionCap: data.selectionCap,
    status: data.status,
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
}));
export const getSelectableProductAddOnAttachmentsByOrganizationId = mock(async () => [attachmentResponse]);
export const getActiveAddOnsByOrganizationId = mock(async () => [addOn]);
export const getActiveProductsByOrganizationId = mock(async () => [product]);
export const getAddOnsByOrganizationId = mock(async () => [addOn]);
export const getProductAddOnAttachmentsByProductId = mock(async () => [attachmentResponse]);
export const countAttachmentsByAddOnId = mock(async () => 0);
export const countSaleItemAddOnsByAddOnId = mock(async () => 0);
export const deleteAddOnRepo = mock(async () => addOn);
export const deleteProductAddOnAttachmentRepo = mock(async () => attachmentResponse);
export const begin = mock(async (callback: (tx: unknown) => Promise<void>) => callback({}));

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
    createBundleProductComponentAddOn: createBundleProductComponentAddOnRepo,
    getBundleProductComponentsByBundleProductId,
    getBundleProductComponentAddOnsByComponentIds,
    deleteBundleProductComponentsByBundleProductId,
    getSelectableProductAddOnAttachmentByProductAndAddOn,
    countActiveBundlesByComponentProductId,
    countActiveBundlesByComponentAddOnId,
    countActiveBundlesByProductAddOnPair,
    countActiveBundlesByProductAddOnPairAboveQuantity,
    addOnNameExistsInOrganization,
    createAddOn: createAddOnRepo,
    getAddOnById,
    updateAddOn: updateAddOnRepo,
    productAddOnAttachmentExists,
    createProductAddOnAttachment: createProductAddOnAttachmentRepo,
    getProductAddOnAttachmentById,
    updateProductAddOnAttachment: updateProductAddOnAttachmentRepo,
    getSelectableProductAddOnAttachmentsByOrganizationId,
    getActiveAddOnsByOrganizationId,
    getActiveProductsByOrganizationId,
    getAddOnsByOrganizationId,
    getProductAddOnAttachmentsByProductId,
    countAttachmentsByAddOnId,
    countSaleItemAddOnsByAddOnId,
    deleteAddOn: deleteAddOnRepo,
    deleteProductAddOnAttachment: deleteProductAddOnAttachmentRepo,
}));

export const catalogService = await import("./catalog.service");
