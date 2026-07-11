import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const bundleProductId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const burgerProductId = "11111111-1111-4111-8111-111111111111";
const coffeeProductId = "22222222-2222-4222-8222-222222222222";
const addOnId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const burgerComponentId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const coffeeComponentId = "99999999-9999-4999-8999-999999999999";

const now = new Date("2026-07-12T12:00:00.000Z");

const organization = { id: organizationId, name: "Demo Org" };
const store = { id: storeId, organizationId, name: "Main Store" };

const bundleProduct = {
    id: bundleProductId,
    organizationId,
    categoryId: "33333333-3333-4333-8333-333333333333",
    name: "Burger Combo",
    price: 99,
    discount: 9,
    imagePath: null,
    productType: "bundle" as const,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const burgerProduct = {
    id: burgerProductId,
    organizationId,
    categoryId: "33333333-3333-4333-8333-333333333333",
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

const coffeeProduct = {
    id: coffeeProductId,
    organizationId,
    categoryId: "33333333-3333-4333-8333-333333333333",
    name: "Cold Coffee",
    price: 40,
    discount: 5,
    imagePath: null,
    productType: "single" as const,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const cheeseAddOn = {
    id: addOnId,
    organizationId,
    name: "Extra Cheese",
    price: 20,
    discount: 2,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const cheeseAttachment = {
    id: "77777777-7777-4777-8777-777777777777",
    organizationId,
    productId: burgerProductId,
    addOnId,
    selectionCap: 1,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    addOn: cheeseAddOn,
};

const bundleComponents = [
    {
        id: burgerComponentId,
        organizationId,
        bundleProductId,
        componentProductId: burgerProductId,
        quantity: 1,
        createdBy: userId,
        updatedBy: null,
        createdAt: now,
        updatedAt: now,
    },
    {
        id: coffeeComponentId,
        organizationId,
        bundleProductId,
        componentProductId: coffeeProductId,
        quantity: 1,
        createdBy: userId,
        updatedBy: null,
        createdAt: now,
        updatedAt: now,
    },
];

const bundleComponentAddOns = [
    {
        id: "88888888-8888-4888-8888-888888888888",
        organizationId,
        bundleProductComponentId: burgerComponentId,
        addOnId,
        quantity: 1,
        createdBy: userId,
        updatedBy: null,
        createdAt: now,
        updatedAt: now,
    },
];

const createdSales: Array<Record<string, unknown>> = [];
const createdSaleItems: Array<Record<string, unknown>> = [];
const createdSaleItemAddOns: Array<Record<string, unknown>> = [];
const createdSaleItemBundleComponents: Array<Record<string, unknown>> = [];
const createdSaleItemBundleComponentAddOns: Array<Record<string, unknown>> = [];

const createSale = mock(async (data: Record<string, unknown>) => {
    const sale = {
        ...data,
        saleNumber: null,
        paidTotal: 0,
        dueTotal: Number(data.grandTotal ?? 0),
        itemCount: 0,
        itemsSummary: null,
        paymentMethods: null,
        customer: null,
        createdByDevice: null,
        updatedByDevice: null,
        createdAt: now,
        updatedAt: now,
        committedAt: null,
        voidedAt: null,
        voidReason: null,
    };
    createdSales.push(sale);
    return sale;
});

const createSaleItem = mock(async (data: Record<string, unknown>) => {
    const item = {
        ...data,
        addOns: [],
        bundleComponents: [],
        createdAt: now,
        updatedAt: now,
    };
    createdSaleItems.push(item);
    return item;
});

const createSaleItemAddOn = mock(async (data: Record<string, unknown>) => {
    const addOnRow = { ...data, createdAt: now, updatedAt: now };
    createdSaleItemAddOns.push(addOnRow);
    return addOnRow;
});

const createSaleItemBundleComponent = mock(async (data: Record<string, unknown>) => {
    const component = { ...data, createdAt: now, updatedAt: now };
    createdSaleItemBundleComponents.push(component);
    return component;
});

const createSaleItemBundleComponentAddOn = mock(async (data: Record<string, unknown>) => {
    const addOnRow = { ...data, createdAt: now, updatedAt: now };
    createdSaleItemBundleComponentAddOns.push(addOnRow);
    return addOnRow;
});

const getSaleById = mock(async (_organizationId: string, _storeId: string, saleId: string) => {
    const sale = createdSales.find((row) => row.id === saleId);
    if (!sale) {
        return null;
    }

    return {
        ...sale,
        itemCount: createdSaleItems.filter((item) => item.saleId === saleId).length,
        itemsSummary: "Burger Combo",
    };
});

const getSaleItemsBySaleId = mock(async (saleId: string) => {
    return createdSaleItems
        .filter((item) => item.saleId === saleId)
        .map((item) => ({
            ...item,
            addOns: createdSaleItemAddOns.filter((addOnRow) => addOnRow.saleItemId === item.id),
            bundleComponents: createdSaleItemBundleComponents
                .filter((component) => component.saleItemId === item.id)
                .map((component) => ({
                    ...component,
                    addOns: createdSaleItemBundleComponentAddOns.filter(
                        (addOnRow) => addOnRow.saleItemBundleComponentId === component.id,
                    ),
                })),
        }));
});

const getPaymentsBySaleId = mock(async () => []);

const deleteSaleItemsBySaleId = mock(async (_organizationId: string, _storeId: string, saleId: string) => {
    const itemIds = new Set(createdSaleItems.filter((item) => item.saleId === saleId).map((item) => item.id as string));
    for (let index = createdSaleItemBundleComponentAddOns.length - 1; index >= 0; index -= 1) {
        if (itemIds.has(createdSaleItemBundleComponentAddOns[index]?.saleItemId as string)) {
            createdSaleItemBundleComponentAddOns.splice(index, 1);
        }
    }
    for (let index = createdSaleItemBundleComponents.length - 1; index >= 0; index -= 1) {
        if (itemIds.has(createdSaleItemBundleComponents[index]?.saleItemId as string)) {
            createdSaleItemBundleComponents.splice(index, 1);
        }
    }
    for (let index = createdSaleItemAddOns.length - 1; index >= 0; index -= 1) {
        if (itemIds.has(createdSaleItemAddOns[index]?.saleItemId as string)) {
            createdSaleItemAddOns.splice(index, 1);
        }
    }
    for (let index = createdSaleItems.length - 1; index >= 0; index -= 1) {
        if (createdSaleItems[index]?.saleId === saleId) {
            createdSaleItems.splice(index, 1);
        }
    }
});

const updateSale = mock(async (data: Record<string, unknown>) => {
    const index = createdSales.findIndex((row) => row.id === data.id);
    if (index < 0) {
        return null;
    }

    createdSales[index] = {
        ...createdSales[index],
        ...data,
        updatedAt: now,
    };
    return createdSales[index];
});

mock.module("@/config/db", () => ({
    pg: {
        begin: async (callback: (tx: unknown) => Promise<void>) => callback({}),
    },
}));

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser: mock(async () => organization),
    getOrganizationById: mock(async () => organization),
    getStoreById: mock(async () => store),
}));

mock.module("./billing.repository", () => ({
    createSale,
    createSaleItem,
    createSaleItemAddOn,
    createSaleItemBundleComponent,
    createSaleItemBundleComponentAddOn,
    getSaleById,
    getSaleItemsBySaleId,
    getPaymentsBySaleId,
    deleteSaleItemsBySaleId,
    updateSale,
    getCustomerById: mock(async () => null),
    getCustomersByOrganizationId: mock(async () => []),
    createCustomer: mock(async () => null),
    updateCustomer: mock(async () => null),
    customerPhoneExistsInOrganization: mock(async () => false),
    getCustomerLedgerByCustomerId: mock(async () => []),
    getSalesByStore: mock(async () => []),
    createPayment: mock(async (data: Record<string, unknown>) => ({
        ...data,
        createdAt: now,
        updatedAt: now,
    })),
    createCustomerLedgerEntry: mock(async () => null),
    updateCustomerBalance: mock(async () => null),
    incrementStoreSaleCounter: mock(async () => 1),
    getParentScopedAddOnSalesRollups: mock(async () => []),
    getAddOnScopedSalesRollups: mock(async () => []),
}));

const catalogRepository = await import("@/modules/tenant/catalog/catalog.repository");
const billingService = await import("./billing.service");

const resolveProductById = (productId: string) => {
    if (productId === bundleProductId) {
        return bundleProduct;
    }
    if (productId === burgerProductId) {
        return burgerProduct;
    }
    if (productId === coffeeProductId) {
        return coffeeProduct;
    }
    return null;
};

describe("Bundle product billing with trusted snapshots", () => {
    let getProductByIdSpy: ReturnType<typeof spyOn>;
    let getBundleComponentsSpy: ReturnType<typeof spyOn>;
    let getBundleComponentAddOnsSpy: ReturnType<typeof spyOn>;
    let getAddOnByIdSpy: ReturnType<typeof spyOn>;
    let getSelectableAttachmentSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        createdSales.length = 0;
        createdSaleItems.length = 0;
        createdSaleItemAddOns.length = 0;
        createdSaleItemBundleComponents.length = 0;
        createdSaleItemBundleComponentAddOns.length = 0;

        createSale.mockClear();
        createSaleItem.mockClear();
        createSaleItemAddOn.mockClear();
        createSaleItemBundleComponent.mockClear();
        createSaleItemBundleComponentAddOn.mockClear();
        getSaleById.mockClear();
        getSaleItemsBySaleId.mockClear();
        deleteSaleItemsBySaleId.mockClear();
        updateSale.mockClear();

        getProductByIdSpy = spyOn(catalogRepository, "getProductById").mockImplementation(
            async (_organizationId, productId) => resolveProductById(productId) as never,
        );
        getBundleComponentsSpy = spyOn(
            catalogRepository,
            "getBundleProductComponentsByBundleProductId",
        ).mockResolvedValue(bundleComponents as never);
        getBundleComponentAddOnsSpy = spyOn(
            catalogRepository,
            "getBundleProductComponentAddOnsByComponentIds",
        ).mockResolvedValue(bundleComponentAddOns as never);
        getAddOnByIdSpy = spyOn(catalogRepository, "getAddOnById").mockResolvedValue(cheeseAddOn as never);
        getSelectableAttachmentSpy = spyOn(
            catalogRepository,
            "getSelectableProductAddOnAttachmentByProductAndAddOn",
        ).mockResolvedValue(cheeseAttachment as never);
    });

    afterEach(() => {
        getProductByIdSpy.mockRestore();
        getBundleComponentsSpy.mockRestore();
        getBundleComponentAddOnsSpy.mockRestore();
        getAddOnByIdSpy.mockRestore();
        getSelectableAttachmentSpy.mockRestore();
    });

    test("creates a priced bundle sale item from bundle id and quantity only", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [{ productId: bundleProductId, quantity: 2, addOns: [] }],
        });

        expect(response.status).toBe("success");
        expect(createSaleItem).toHaveBeenCalledTimes(1);
        expect(createSaleItemAddOn).not.toHaveBeenCalled();
        expect(createSaleItemBundleComponent).toHaveBeenCalledTimes(2);
        expect(createSaleItemBundleComponentAddOn).toHaveBeenCalledTimes(1);

        const parent = createdSaleItems[0];
        expect(parent?.productNameSnapshot).toBe("Burger Combo");
        expect(parent?.unitPriceSnapshot).toBe(99);
        expect(parent?.discountAmount).toBe(18);
        expect(parent?.lineSubtotal).toBe(198);
        expect(parent?.lineTotal).toBe(180);
        expect(parent?.configurationSignature).toBe("");
    });

    test("charges only the bundle product price and discount while nesting component snapshots", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [{ productId: bundleProductId, quantity: 1, addOns: [] }],
        });

        expect(response.status).toBe("success");

        // Component catalog sum would be Burger 80 + Cheese 20 + Coffee 40 = 140, but billed total is 90.
        expect(response.data?.sale.subtotal).toBe(99);
        expect(response.data?.sale.discountTotal).toBe(9);
        expect(response.data?.sale.grandTotal).toBe(90);

        const item = response.data?.sale.items[0];
        expect(item?.lineTotal).toBe(90);
        expect(item?.addOns).toEqual([]);
        expect(item?.bundleComponents).toHaveLength(2);

        const burgerComponent = item?.bundleComponents.find(
            (component) => component.componentProductId === burgerProductId,
        );
        expect(burgerComponent?.productNameSnapshot).toBe("Burger");
        expect(burgerComponent?.quantityPerBundle).toBe(1);
        expect(burgerComponent?.totalQuantity).toBe(1);
        expect(burgerComponent?.unitPriceSnapshot).toBe(80);
        expect(burgerComponent?.addOns).toHaveLength(1);
        expect(burgerComponent?.addOns[0]?.addOnNameSnapshot).toBe("Extra Cheese");
        expect(burgerComponent?.addOns[0]?.totalQuantity).toBe(1);

        const coffeeComponent = item?.bundleComponents.find(
            (component) => component.componentProductId === coffeeProductId,
        );
        expect(coffeeComponent?.productNameSnapshot).toBe("Cold Coffee");
        expect(coffeeComponent?.unitDiscountSnapshot).toBe(5);
        expect(coffeeComponent?.addOns).toEqual([]);
    });

    test("scales nested bundle component quantities with bundle quantity", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [{ productId: bundleProductId, quantity: 3, addOns: [] }],
        });

        expect(response.status).toBe("success");

        const burgerComponent = response.data?.sale.items[0]?.bundleComponents.find(
            (component) => component.componentProductId === burgerProductId,
        );
        expect(burgerComponent?.quantityPerBundle).toBe(1);
        expect(burgerComponent?.totalQuantity).toBe(3);
        expect(burgerComponent?.addOns[0]?.totalQuantity).toBe(3);

        expect(response.data?.sale.subtotal).toBe(297);
        expect(response.data?.sale.discountTotal).toBe(27);
        expect(response.data?.sale.grandTotal).toBe(270);
    });

    test("rejects add-on selections on bundle products", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId: bundleProductId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("cannot accept add-on selections");
        expect(createSaleItem).not.toHaveBeenCalled();
    });

    test("rejects selling a bundle with no components", async () => {
        getBundleComponentsSpy.mockResolvedValue([]);

        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [{ productId: bundleProductId, quantity: 1, addOns: [] }],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("has no components");
        expect(createSaleItem).not.toHaveBeenCalled();
    });

    test("rejects selling a bundle whose component product is inactive", async () => {
        getProductByIdSpy.mockImplementation(async (_organizationId, productId) => {
            if (productId === burgerProductId) {
                return { ...burgerProduct, status: "inactive" as const } as never;
            }
            return resolveProductById(productId) as never;
        });

        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [{ productId: bundleProductId, quantity: 1, addOns: [] }],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("component product is inactive");
        expect(createSaleItem).not.toHaveBeenCalled();
    });

    test("rejects selling a bundle whose component add-on is no longer selectable", async () => {
        getSelectableAttachmentSpy.mockResolvedValue(null);

        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [{ productId: bundleProductId, quantity: 1, addOns: [] }],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("not selectable");
        expect(createSaleItem).not.toHaveBeenCalled();
    });
});
