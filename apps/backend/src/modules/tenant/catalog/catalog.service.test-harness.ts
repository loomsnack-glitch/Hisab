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
    productCode: null as string | null,
    productCodeKind: null as "manufacturer" | "internal_rcn" | null,
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
    productCode: null as string | null,
    productCodeKind: null as "manufacturer" | "internal_rcn" | null,
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
    productCode: null as string | null,
    productCodeKind: null as "manufacturer" | "internal_rcn" | null,
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

export const getOrganizationByIdForUser = mock(async (): Promise<typeof organization | null> => organization);
export const getCategoryById = mock(async () => category);
export const productNameExistsInCategory = mock(async () => false);
export const getProductById = mock(async (): Promise<typeof product | null> => product);
export const getProductByCode = mock(
    async (
        _organizationId?: string,
        _productCode?: string,
        _excludeId?: string,
    ): Promise<{
        id: string;
        organizationId: string;
        categoryId: string;
        name: string;
        price: number;
        discount: number;
        imagePath: string | null;
        productType: "single" | "bundle" | "combo";
        productCode: string | null;
        productCodeKind: "manufacturer" | "internal_rcn" | null;
        status: "active" | "inactive";
        createdBy: string;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null> => null,
);
export const allocateNextInternalProductCodeSequence = mock(async (): Promise<number | null> => 0);
export const isReleasedInternalProductCode = mock(async () => false);
export const releaseInternalProductCode = mock(async () => undefined);
export const claimReleasedInternalProductCode = mock(async () => false);
export const assignInternalProductCodeToUncodedProduct = mock(
    async (_organizationId: string, _productId: string, productCode: string) => ({
        ...product,
        productCode,
        productCodeKind: "internal_rcn" as const,
        updatedBy: userId,
    }),
);
export const createProductRepo = mock(async (data: typeof product) => data);
export const updateProductRepo = mock(async (data: typeof product) => data);
export const deleteProductRepo = mock(async () => product);
export const createBundleProductComponentRepo = mock(
    async (data: {
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
    }),
);
export const createBundleProductComponentAddOnRepo = mock(
    async (data: {
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
    }),
);
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
export const createProductAddOnAttachmentRepo = mock(
    async (data: {
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
    }),
);
export const getProductAddOnAttachmentById = mock(async () => attachmentResponse);
export const updateProductAddOnAttachmentRepo = mock(
    async (data: { id: string; selectionCap: number; status: "active" | "inactive" }) => ({
        ...attachmentResponse,
        selectionCap: data.selectionCap,
        status: data.status,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
    }),
);
export const getSelectableProductAddOnAttachmentsByOrganizationId = mock(async () => [attachmentResponse]);
export const getActiveAddOnsByOrganizationId = mock(async () => [addOn]);
export const getActiveProductsByOrganizationId = mock(async () => [product]);
export const getProductsByOrganizationId = mock(async () => [product]);
export const getActiveProductAddOnCountsByOrganizationId = mock(async () => new Map<string, number>());
export const getProductsByIds = mock(async () => [product]);
export const getAddOnsByOrganizationId = mock(async () => [addOn]);
export const getProductAddOnAttachmentsByProductId = mock(async () => [attachmentResponse]);
export const countAttachmentsByAddOnId = mock(async () => 0);
export const countSaleItemAddOnsByAddOnId = mock(async () => 0);
export const countBundleProductComponentsByComponentProductId = mock(async () => 0);
export const countActiveCombosByOptionProductId = mock(async () => 0);
export const countComboChoiceOptionsByProductId = mock(async () => 0);
export const countSaleItemsByProductId = mock(async () => 0);
export const countSaleItemBundleComponentsByComponentProductId = mock(async () => 0);
export const countBundleProductComponentAddOnsByAddOnId = mock(async () => 0);
export const countSaleItemBundleComponentAddOnsByAddOnId = mock(async () => 0);
export const createComboChoiceGroupRepo = mock(async (data: unknown) => data);
export const createComboChoiceOptionRepo = mock(async (data: unknown) => data);
export const getComboChoiceGroupsByProductId = mock(async () => []);
export const getComboChoiceGroupsByProductIds = mock(async () => []);
export const getComboChoiceOptionsByGroupIds = mock(async () => []);
export const deleteComboChoiceGroupsByProductId = mock(async () => undefined);
export const deleteAddOnRepo = mock(async () => addOn);
export const deleteProductAddOnAttachmentRepo = mock(async () => attachmentResponse);
export const labelTemplateId = "88888888-8888-4888-8888-888888888888";
export const thermalLabelTemplateId = "99999999-9999-4999-8999-999999999999";

export const a4LabelTemplate = {
    id: labelTemplateId,
    organizationId,
    name: "A4 sheet (3 × 8 labels)",
    status: "active" as const,
    stock: {
        widthMm: 70,
        heightMm: 35,
        labelsPerRow: 3,
        horizontalGapMm: 0,
        verticalGapMm: 0,
        media: "sheet" as const,
        sheet: {
            pageWidthMm: 210,
            pageHeightMm: 297,
            columns: 3,
            rows: 8,
        },
    },
    keepOuts: [] as Array<{ xMm: number; yMm: number; widthMm: number; heightMm: number }>,
    elements: [
        {
            id: "product-name",
            type: "text" as const,
            xMm: 2,
            yMm: 1,
            widthMm: 66,
            heightMm: 5,
            rotationDeg: 0 as const,
            text: {
                source: "binding" as const,
                binding: "product.name" as const,
                fontSizeMm: 2.5,
                fontWeight: "bold" as const,
                align: "center" as const,
            },
        },
    ],
    createdBy: userId,
    updatedBy: null as string | null,
    createdAt: now,
    updatedAt: now,
};

export const thermalLabelTemplate = {
    ...a4LabelTemplate,
    id: thermalLabelTemplateId,
    name: "Thermal label (58 × 40 mm)",
    stock: {
        widthMm: 58,
        heightMm: 40,
        labelsPerRow: 1,
        horizontalGapMm: 0,
        verticalGapMm: 0,
        media: "roll" as const,
    },
};

export const getLabelTemplatesByOrganizationId = mock(async () => [a4LabelTemplate, thermalLabelTemplate]);
export const getLabelTemplateById = mock(async (): Promise<typeof a4LabelTemplate | null> => a4LabelTemplate);
export const labelTemplateNameExistsInOrganization = mock(async () => false);
export const createLabelTemplateRepo = mock(async (data: typeof a4LabelTemplate) => data);
export const updateLabelTemplateRepo = mock(async (data: typeof a4LabelTemplate) => data);
export const deleteLabelTemplateRepo = mock(async () => a4LabelTemplate);
export const seedDefaultLabelTemplatesRepo = mock(async () => [a4LabelTemplate, thermalLabelTemplate]);
export const getProductLabelProfileByProductId = mock(async () => null);
export const getProductLabelProfilesByProductIds = mock(async () => new Map());
export const upsertProductLabelProfileRepo = mock(async (data: {
    productId: string;
    organizationId: string;
    ingredients?: string | null;
    nutrition?: Array<{ name: string; quantity: string; unit: string }> | null;
    netWeight?: string | null;
    unitSellingPriceText?: string | null;
    mrp?: number | null;
    shelfLifeDays?: number | null;
}) => ({
    ingredients: data.ingredients ?? null,
    nutrition: data.nutrition ?? null,
    netWeight: data.netWeight ?? null,
    unitSellingPriceText: data.unitSellingPriceText ?? null,
    mrp: data.mrp ?? null,
    shelfLifeDays: data.shelfLifeDays ?? null,
}));
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
    getProductByCode,
    allocateNextInternalProductCodeSequence,
    isReleasedInternalProductCode,
    releaseInternalProductCode,
    claimReleasedInternalProductCode,
    assignInternalProductCodeToUncodedProduct,
    createProduct: createProductRepo,
    updateProduct: updateProductRepo,
    deleteProduct: deleteProductRepo,
    createBundleProductComponent: createBundleProductComponentRepo,
    createBundleProductComponentAddOn: createBundleProductComponentAddOnRepo,
    getBundleProductComponentsByBundleProductId,
    getBundleProductComponentAddOnsByComponentIds,
    deleteBundleProductComponentsByBundleProductId,
    getSelectableProductAddOnAttachmentByProductAndAddOn,
    countActiveBundlesByComponentProductId,
    countActiveCombosByOptionProductId,
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
    getProductsByOrganizationId,
    getActiveProductAddOnCountsByOrganizationId,
    getProductsByIds,
    getAddOnsByOrganizationId,
    getProductAddOnAttachmentsByProductId,
    countAttachmentsByAddOnId,
    countSaleItemAddOnsByAddOnId,
    countBundleProductComponentsByComponentProductId,
    countComboChoiceOptionsByProductId,
    countSaleItemsByProductId,
    countSaleItemBundleComponentsByComponentProductId,
    countBundleProductComponentAddOnsByAddOnId,
    countSaleItemBundleComponentAddOnsByAddOnId,
    createComboChoiceGroup: createComboChoiceGroupRepo,
    createComboChoiceOption: createComboChoiceOptionRepo,
    getComboChoiceGroupsByProductId,
    getComboChoiceGroupsByProductIds,
    getComboChoiceOptionsByGroupIds,
    deleteComboChoiceGroupsByProductId,
    deleteAddOn: deleteAddOnRepo,
    deleteProductAddOnAttachment: deleteProductAddOnAttachmentRepo,
    getLabelTemplatesByOrganizationId,
    getLabelTemplateById,
    labelTemplateNameExistsInOrganization,
    createLabelTemplate: createLabelTemplateRepo,
    updateLabelTemplate: updateLabelTemplateRepo,
    deleteLabelTemplate: deleteLabelTemplateRepo,
    seedDefaultLabelTemplates: seedDefaultLabelTemplatesRepo,
    getProductLabelProfileByProductId,
    getProductLabelProfilesByProductIds,
    upsertProductLabelProfile: upsertProductLabelProfileRepo,
}));

export const catalogService = await import("./catalog.service");
