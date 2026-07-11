import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const addOnId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const addOnId2 = "99999999-9999-4999-8999-999999999999";
const attachmentId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const attachmentId2 = "88888888-8888-4888-8888-888888888888";

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

const addOn2 = {
    id: addOnId2,
    organizationId,
    name: "Mayo",
    price: 5,
    discount: 0,
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

const selectableAttachment2 = {
    id: attachmentId2,
    organizationId,
    productId,
    addOnId: addOnId2,
    selectionCap: 3,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    addOn: addOn2,
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

const deleteSaleItemsBySaleId = mock(async (_organizationId: string, _storeId: string, saleId: string) => {
    const itemIds = new Set(
        createdSaleItems.filter((item) => item.saleId === saleId).map((item) => item.id as string),
    );
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

const getCustomerById = mock(async () => null);
const createPayment = mock(async (data: Record<string, unknown>) => ({
    ...data,
    createdAt: now,
    updatedAt: now,
}));
const getParentScopedAddOnSalesRollups = mock(async () => []);
const getAddOnScopedSalesRollups = mock(async () => []);

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
    createPayment,
    createCustomerLedgerEntry: mock(async () => null),
    updateCustomerBalance: mock(async () => null),
    incrementStoreSaleCounter: mock(async () => 1),
    getParentScopedAddOnSalesRollups,
    getAddOnScopedSalesRollups,
}));

const catalogRepository = await import("@/modules/tenant/catalog/catalog.repository");
const billingService = await import("./billing.service");

const resolveSelectableAttachment = (requestedAddOnId: string) => {
    if (requestedAddOnId === addOnId) {
        return selectableAttachment;
    }
    if (requestedAddOnId === addOnId2) {
        return selectableAttachment2;
    }
    return null;
};

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
        deleteSaleItemsBySaleId.mockClear();
        updateSale.mockClear();
        createPayment.mockClear();
        getParentScopedAddOnSalesRollups.mockClear();
        getAddOnScopedSalesRollups.mockClear();
        getParentScopedAddOnSalesRollups.mockResolvedValue([]);
        getAddOnScopedSalesRollups.mockResolvedValue([]);

        getProductByIdSpy = spyOn(catalogRepository, "getProductById").mockResolvedValue(product as never);
        getSelectableAttachmentSpy = spyOn(
            catalogRepository,
            "getSelectableProductAddOnAttachmentByProductAndAddOn",
        ).mockImplementation(async (_organizationId, _productId, requestedAddOnId) =>
            resolveSelectableAttachment(requestedAddOnId) as never,
        );
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

describe("Configuration-aware Draft Sale behavior", () => {
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
        deleteSaleItemsBySaleId.mockClear();
        updateSale.mockClear();

        getProductByIdSpy = spyOn(catalogRepository, "getProductById").mockResolvedValue(product as never);
        getSelectableAttachmentSpy = spyOn(
            catalogRepository,
            "getSelectableProductAddOnAttachmentByProductAndAddOn",
        ).mockImplementation(async (_organizationId, _productId, requestedAddOnId) =>
            resolveSelectableAttachment(requestedAddOnId) as never,
        );
    });

    afterEach(() => {
        getProductByIdSpy.mockRestore();
        getSelectableAttachmentSpy.mockRestore();
    });

    test("merges identical configurations by quantity", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                { productId, quantity: 1, addOns: [{ addOnId, quantity: 1 }] },
                { productId, quantity: 2, addOns: [{ addOnId, quantity: 1 }] },
            ],
        });

        expect(response.status).toBe("success");
        expect(createdSaleItems).toHaveLength(1);
        expect(createdSaleItems[0]?.quantity).toBe(3);
        expect(createdSaleItems[0]?.configurationSignature).toBe(`${addOnId}:1`);
        expect(createdSaleItemAddOns).toHaveLength(1);
        expect(createdSaleItemAddOns[0]?.quantityPerParent).toBe(1);
        expect(createdSaleItemAddOns[0]?.totalQuantity).toBe(3);
        expect(response.data?.sale.items).toHaveLength(1);
        expect(response.data?.sale.items[0]?.quantity).toBe(3);
    });

    test("keeps different configurations of the same product on separate lines", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                { productId, quantity: 1, addOns: [] },
                { productId, quantity: 1, addOns: [{ addOnId, quantity: 1 }] },
                { productId, quantity: 1, addOns: [{ addOnId, quantity: 2 }] },
            ],
        });

        expect(response.status).toBe("success");
        expect(createdSaleItems).toHaveLength(3);

        const signatures = createdSaleItems.map((item) => item.configurationSignature).sort();
        expect(signatures).toEqual(["", `${addOnId}:1`, `${addOnId}:2`]);
        expect(response.data?.sale.items).toHaveLength(3);
    });

    test("normalized signature ignores add-on selection order", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [
                        { addOnId, quantity: 1 },
                        { addOnId: addOnId2, quantity: 2 },
                    ],
                },
                {
                    productId,
                    quantity: 1,
                    addOns: [
                        { addOnId: addOnId2, quantity: 2 },
                        { addOnId, quantity: 1 },
                    ],
                },
            ],
        });

        expect(response.status).toBe("success");
        expect(createdSaleItems).toHaveLength(1);
        expect(createdSaleItems[0]?.quantity).toBe(2);

        const sortedSignature = [`${addOnId}:1`, `${addOnId2}:2`].sort().join("|");
        expect(createdSaleItems[0]?.configurationSignature).toBe(sortedSignature);
        expect(createdSaleItemAddOns).toHaveLength(2);
    });

    test("customize with no selected add-ons merges into the plain product line", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                { productId, quantity: 1, addOns: [] },
                { productId, quantity: 2 },
                { productId, quantity: 1, addOns: [] },
            ],
        });

        expect(response.status).toBe("success");
        expect(createdSaleItems).toHaveLength(1);
        expect(createdSaleItems[0]?.quantity).toBe(4);
        expect(createdSaleItems[0]?.configurationSignature).toBe("");
        expect(createdSaleItemAddOns).toHaveLength(0);
    });

    test("rejects decimal product quantities", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [{ productId, quantity: 1.5, addOns: [] }],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("whole number");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
    });

    test("rejects negative add-on quantities in backend validation", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: -1 }],
                },
            ],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("whole number");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
    });

    test("rejects decimal add-on quantities", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1.5 }],
                },
            ],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("whole number");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
    });

    test("rejects add-on quantity above the selection cap", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 3 }],
                },
            ],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("selection cap");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
        expect(createSaleItemAddOn).not.toHaveBeenCalled();
    });

    test("rejects invalid configured selections atomically", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [
                        { addOnId, quantity: 1 },
                        { addOnId, quantity: 1 },
                    ],
                },
            ],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("Duplicate add-ons");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
        expect(createSaleItemAddOn).not.toHaveBeenCalled();
    });

    test("rejects inactive or unattached add-ons atomically without partial save", async () => {
        getSelectableAttachmentSpy.mockImplementation(async (_organizationId, _productId, requestedAddOnId) => {
            if (requestedAddOnId === addOnId) {
                return selectableAttachment as never;
            }
            return null;
        });

        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [
                        { addOnId, quantity: 1 },
                        { addOnId: addOnId2, quantity: 1 },
                    ],
                },
            ],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("not selectable");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
        expect(createSaleItemAddOn).not.toHaveBeenCalled();
    });

    test("quantity updates scale the frozen configuration without changing add-on selection", async () => {
        const created = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [
                        { addOnId, quantity: 1 },
                        { addOnId: addOnId2, quantity: 2 },
                    ],
                },
            ],
        });

        expect(created.status).toBe("success");
        const saleId = created.data?.sale.id;
        expect(saleId).toBeTruthy();

        const originalSignature = createdSaleItems[0]?.configurationSignature;
        expect(createdSaleItemAddOns.map((row) => ({
            addOnId: row.addOnId,
            quantityPerParent: row.quantityPerParent,
        }))).toEqual(
            expect.arrayContaining([
                { addOnId, quantityPerParent: 1 },
                { addOnId: addOnId2, quantityPerParent: 2 },
            ]),
        );

        const updated = await billingService.updateDraftSale(userId, organizationId, storeId, saleId!, {
            items: [
                {
                    productId,
                    quantity: 3,
                    addOns: [
                        { addOnId: addOnId2, quantity: 2 },
                        { addOnId, quantity: 1 },
                    ],
                },
            ],
        });

        expect(updated.status).toBe("success");
        expect(createdSaleItems).toHaveLength(1);
        expect(createdSaleItems[0]?.quantity).toBe(3);
        expect(createdSaleItems[0]?.configurationSignature).toBe(originalSignature);
        expect(createdSaleItemAddOns).toHaveLength(2);

        const cheese = createdSaleItemAddOns.find((row) => row.addOnId === addOnId);
        const mayo = createdSaleItemAddOns.find((row) => row.addOnId === addOnId2);
        expect(cheese?.quantityPerParent).toBe(1);
        expect(cheese?.totalQuantity).toBe(3);
        expect(mayo?.quantityPerParent).toBe(2);
        expect(mayo?.totalQuantity).toBe(6);
    });

    test("accepts multiple different add-ons on one configured product line", async () => {
        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 2,
                    addOns: [
                        { addOnId, quantity: 1 },
                        { addOnId: addOnId2, quantity: 2 },
                    ],
                },
            ],
        });

        expect(response.status).toBe("success");
        expect(createdSaleItems).toHaveLength(1);
        expect(createdSaleItemAddOns).toHaveLength(2);
        expect(response.data?.sale.items[0]?.addOns).toHaveLength(2);
        // parent: 2*(100)=200, cheese: 2*1*20=40, mayo: 2*2*5=20 => 260
        expect(response.data?.sale.subtotal).toBe(260);
    });

    test("rejects inactive products for new selections", async () => {
        getProductByIdSpy.mockResolvedValue({
            ...product,
            status: "inactive",
        } as never);

        const response = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
        });

        expect(response.status).toBe("error");
        expect(response.message).toContain("not available for new sale selections");
        expect(createSale).not.toHaveBeenCalled();
    });

    test("keeps frozen configured draft lines readable and updatable after catalog deactivation", async () => {
        const created = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
        });

        expect(created.status).toBe("success");
        const saleId = created.data?.sale.id;
        expect(saleId).toBeTruthy();

        const originalUnitPrice = createdSaleItems[0]?.unitPriceSnapshot;
        const originalAddOnUnitPrice = createdSaleItemAddOns[0]?.unitPriceSnapshot;
        const originalAddOnName = createdSaleItemAddOns[0]?.addOnNameSnapshot;

        getProductByIdSpy.mockResolvedValue({
            ...product,
            status: "inactive",
            price: 999,
            name: "Retired Burger",
        } as never);
        getSelectableAttachmentSpy.mockResolvedValue(null);

        const updated = await billingService.updateDraftSale(userId, organizationId, storeId, saleId!, {
            items: [
                {
                    productId,
                    quantity: 2,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
        });

        expect(updated.status).toBe("success");
        expect(updated.data?.sale.items).toHaveLength(1);
        expect(updated.data?.sale.items[0]?.productNameSnapshot).toBe("Burger");
        expect(updated.data?.sale.items[0]?.unitPriceSnapshot).toBe(originalUnitPrice);
        expect(updated.data?.sale.items[0]?.quantity).toBe(2);
        expect(updated.data?.sale.items[0]?.addOns[0]?.addOnNameSnapshot).toBe(originalAddOnName);
        expect(updated.data?.sale.items[0]?.addOns[0]?.unitPriceSnapshot).toBe(originalAddOnUnitPrice);
        expect(updated.data?.sale.items[0]?.addOns[0]?.totalQuantity).toBe(2);
        expect(getProductByIdSpy).toHaveBeenCalledTimes(1);
    });

    test("commits a draft with frozen configured lines after later catalog deactivation", async () => {
        const created = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
        });

        expect(created.status).toBe("success");
        const saleId = created.data?.sale.id!;
        const grandTotal = Number(created.data?.sale.grandTotal);

        getProductByIdSpy.mockResolvedValue({
            ...product,
            status: "inactive",
        } as never);
        getSelectableAttachmentSpy.mockResolvedValue(null);

        const committed = await billingService.commitSale(userId, organizationId, storeId, saleId, {
            payments: [
                {
                    amount: grandTotal,
                    method: "cash",
                },
            ],
        });

        expect(committed.status).toBe("success");
        expect(committed.data?.sale.status).toBe("completed");
        expect(committed.data?.sale.items[0]?.addOns).toHaveLength(1);
        expect(committed.data?.sale.items[0]?.productNameSnapshot).toBe("Burger");
        expect(committed.data?.sale.items[0]?.addOns[0]?.addOnNameSnapshot).toBe("Extra Cheese");
        expect(createPayment).toHaveBeenCalled();
    });

    test("blocks new configured selections after deactivation while preserving existing frozen lines", async () => {
        const created = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
        });

        expect(created.status).toBe("success");
        const saleId = created.data?.sale.id!;

        getSelectableAttachmentSpy.mockResolvedValue(null);

        const updated = await billingService.updateDraftSale(userId, organizationId, storeId, saleId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId: addOnId2, quantity: 1 }],
                },
            ],
        });

        expect(updated.status).toBe("error");
        expect(updated.message).toContain("not selectable");
    });

    test("exposes nested add-ons in receipt-like bill detail output after commit", async () => {
        const created = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [
                        { addOnId, quantity: 1 },
                        { addOnId: addOnId2, quantity: 2 },
                    ],
                },
            ],
        });

        expect(created.status).toBe("success");
        const saleId = created.data?.sale.id!;
        const grandTotal = Number(created.data?.sale.grandTotal);

        const committed = await billingService.commitSale(userId, organizationId, storeId, saleId, {
            payments: [{ amount: grandTotal, method: "cash" }],
        });

        expect(committed.status).toBe("success");
        const parent = committed.data?.sale.items[0];
        expect(parent?.productNameSnapshot).toBe("Burger");
        expect(parent?.addOns.map((addOn) => ({
            name: addOn.addOnNameSnapshot,
            quantityPerParent: addOn.quantityPerParent,
            lineTotal: addOn.lineTotal,
        }))).toEqual(
            expect.arrayContaining([
                { name: "Extra Cheese", quantityPerParent: 1, lineTotal: 18 },
                { name: "Mayo", quantityPerParent: 2, lineTotal: 10 },
            ]),
        );
    });

    test("returns parent-scoped and add-on-scoped sales rollups", async () => {
        const parentScoped = [
            {
                productId,
                productNameSnapshot: "Burger",
                addOnId,
                addOnNameSnapshot: "Extra Cheese",
                totalQuantity: 3,
                lineSubtotal: 60,
                discountAmount: 6,
                lineTotal: 54,
            },
            {
                productId: "12121212-1212-4121-8121-121212121212",
                productNameSnapshot: "Pizza",
                addOnId,
                addOnNameSnapshot: "Extra Cheese",
                totalQuantity: 2,
                lineSubtotal: 40,
                discountAmount: 4,
                lineTotal: 36,
            },
        ];
        const addOnScoped = [
            {
                addOnId,
                addOnNameSnapshot: "Extra Cheese",
                totalQuantity: 5,
                lineSubtotal: 100,
                discountAmount: 10,
                lineTotal: 90,
                parentProductCount: 2,
            },
        ];

        getParentScopedAddOnSalesRollups.mockResolvedValue(parentScoped as never);
        getAddOnScopedSalesRollups.mockResolvedValue(addOnScoped as never);

        const response = await billingService.getAddOnSalesRollups(userId, organizationId, storeId);

        expect(response.status).toBe("success");
        expect(response.data?.rollups.parentScoped).toEqual(parentScoped);
        expect(response.data?.rollups.addOnScoped).toEqual(addOnScoped);
        expect(getParentScopedAddOnSalesRollups).toHaveBeenCalledWith(organizationId, storeId);
        expect(getAddOnScopedSalesRollups).toHaveBeenCalledWith(organizationId, storeId);
    });
});
