import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const addOnId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const attachmentId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const now = new Date("2026-07-11T12:00:00.000Z");

const organization = { id: organizationId, name: "Demo Org" };
const store = { id: storeId, organizationId, name: "Main Store" };

const product = {
    id: productId,
    organizationId,
    categoryId: "11111111-1111-4111-8111-111111111111",
    name: "Burger",
    price: 100,
    discount: 10,
    imagePath: null,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const addOn = {
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

const selectableAttachment = {
    id: attachmentId,
    organizationId,
    productId,
    addOnId,
    selectionCap: 2,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    addOn,
};

const createdSales: Array<Record<string, unknown>> = [];
const createdSaleItems: Array<Record<string, unknown>> = [];
const createdSaleItemAddOns: Array<Record<string, unknown>> = [];

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
    const item = { ...data, addOns: [], createdAt: now, updatedAt: now };
    createdSaleItems.push(item);
    return item;
});

const createSaleItemAddOn = mock(async (data: Record<string, unknown>) => {
    const addOnRow = { ...data, createdAt: now, updatedAt: now };
    createdSaleItemAddOns.push(addOnRow);
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
        itemsSummary: "Burger",
    };
});

const getSaleItemsBySaleId = mock(async (saleId: string) => {
    return createdSaleItems
        .filter((item) => item.saleId === saleId)
        .map((item) => ({
            ...item,
            addOns: createdSaleItemAddOns.filter((addOnRow) => addOnRow.saleItemId === item.id),
        }));
});

const getPaymentsBySaleId = mock(async () => []);
const deleteSaleItemsBySaleId = mock(async () => undefined);
const updateSale = mock(async () => null);
const getCustomerById = mock(async () => null);

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
    getSaleById,
    getSaleItemsBySaleId,
    getPaymentsBySaleId,
    deleteSaleItemsBySaleId,
    updateSale,
    getCustomerById,
    getCustomersByOrganizationId: mock(async () => []),
    createCustomer: mock(async () => null),
    updateCustomer: mock(async () => null),
    customerPhoneExistsInOrganization: mock(async () => false),
    getCustomerLedgerByCustomerId: mock(async () => []),
    getSalesByStore: mock(async () => []),
    createPayment: mock(async () => null),
    createCustomerLedgerEntry: mock(async () => null),
    updateCustomerBalance: mock(async () => null),
    incrementStoreSaleCounter: mock(async () => 1),
}));

const catalogRepository = await import("@/modules/tenant/catalog/catalog.repository");
const billingService = await import("./billing.service");

describe("Configured product billing with trusted snapshots", () => {
    let getProductByIdSpy: ReturnType<typeof spyOn>;
    let getSelectableAttachmentSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        createdSales.length = 0;
        createdSaleItems.length = 0;
        createdSaleItemAddOns.length = 0;

        createSale.mockClear();
        createSaleItem.mockClear();
        createSaleItemAddOn.mockClear();
        getSaleById.mockClear();
        getSaleItemsBySaleId.mockClear();

        getProductByIdSpy = spyOn(catalogRepository, "getProductById").mockResolvedValue(product as never);
        getSelectableAttachmentSpy = spyOn(
            catalogRepository,
            "getSelectableProductAddOnAttachmentByProductAndAddOn",
        ).mockResolvedValue(selectableAttachment as never);
    });

    afterEach(() => {
        getProductByIdSpy.mockRestore();
        getSelectableAttachmentSpy.mockRestore();
    });

    test("creates a plain product line with trusted catalog pricing snapshots", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [{ productId, quantity: 2, addOns: [] }],
        });

        expect(response.status).toBe("success");
        expect(createSaleItem).toHaveBeenCalled();
        expect(createSaleItemAddOn).not.toHaveBeenCalled();

        const parent = createdSaleItems[0];
        expect(parent?.productNameSnapshot).toBe("Burger");
        expect(parent?.unitPriceSnapshot).toBe(100);
        expect(parent?.discountAmount).toBe(20);
        expect(parent?.lineSubtotal).toBe(200);
        expect(parent?.lineTotal).toBe(180);
        expect(parent?.configurationSignature).toBe("");

        expect(response.data?.sale.subtotal).toBe(200);
        expect(response.data?.sale.discountTotal).toBe(20);
        expect(response.data?.sale.grandTotal).toBe(180);
        expect(response.data?.sale.items[0]?.addOns).toEqual([]);
    });

    test("creates a configured product line with trusted add-on snapshots from the database", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 2,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
        });

        expect(response.status).toBe("success");
        expect(getSelectableAttachmentSpy).toHaveBeenCalledWith(organizationId, productId, addOnId);
        expect(createSaleItemAddOn).toHaveBeenCalled();

        const parent = createdSaleItems[0];
        const child = createdSaleItemAddOns[0];

        expect(parent?.unitPriceSnapshot).toBe(100);
        expect(parent?.discountAmount).toBe(20);
        expect(parent?.lineSubtotal).toBe(200);
        expect(parent?.lineTotal).toBe(180);
        expect(parent?.configurationSignature).toBe(`${addOnId}:1`);

        expect(child?.addOnNameSnapshot).toBe("Extra Cheese");
        expect(child?.unitPriceSnapshot).toBe(20);
        expect(child?.unitDiscountSnapshot).toBe(2);
        expect(child?.quantityPerParent).toBe(1);
        expect(child?.totalQuantity).toBe(2);
        expect(child?.lineSubtotal).toBe(40);
        expect(child?.discountAmount).toBe(4);
        expect(child?.lineTotal).toBe(36);

        const sale = response.data?.sale;
        expect(sale?.items[0]?.addOns).toHaveLength(1);
        expect(sale?.items[0]?.addOns[0]?.addOnNameSnapshot).toBe("Extra Cheese");
        expect(sale?.subtotal).toBe(240);
        expect(sale?.discountTotal).toBe(24);
        expect(sale?.grandTotal).toBe(216);
    });

    test("sale totals include both parent product rows and child add-on rows", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 2 }],
                },
            ],
        });

        expect(response.status).toBe("success");
        expect(response.data?.sale.subtotal).toBe(140);
        expect(response.data?.sale.discountTotal).toBe(14);
        expect(response.data?.sale.grandTotal).toBe(126);
    });

    test("rejects client-trusted pricing by loading catalog values only", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [{ productId, quantity: 1, addOns: [] }],
        });

        expect(response.status).toBe("success");
        expect(createdSaleItems[0]?.unitPriceSnapshot).toBe(100);
        expect(createdSaleItems[0]?.discountAmount).toBe(10);
    });

    test("returns nested add-ons under the parent product in bill details", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
        });

        expect(response.status).toBe("success");
        const item = response.data?.sale.items[0];
        expect(item?.productNameSnapshot).toBe("Burger");
        expect(item?.addOns[0]).toMatchObject({
            addOnId,
            addOnNameSnapshot: "Extra Cheese",
            quantityPerParent: 1,
            totalQuantity: 1,
            unitPriceSnapshot: 20,
            unitDiscountSnapshot: 2,
        });
    });
});
