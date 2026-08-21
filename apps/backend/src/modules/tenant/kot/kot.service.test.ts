import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { DeviceSessionDTO } from "@repo/types";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherStoreId = "abababab-abab-4aba-8aba-abababababab";
const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const addOnId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const attachmentId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const deviceId = "17171717-1717-4171-8171-171717171717";
const now = new Date("2026-08-21T12:00:00.000Z");

const organization = { id: organizationId, name: "Demo Org" };
const store = {
    id: storeId,
    organizationId,
    name: "Main Store",
    kotSystemEnabled: true,
    tableManagementEnabled: false,
};
const deviceSession = {
    device: {
        id: deviceId,
        organizationId,
        storeId,
        name: "Counter",
        loginUsername: "counter",
        status: "active",
        lastSeenAt: null,
    },
    store: { ...store, address: null },
    organization: { ...organization, username: "demo", tagline: null },
} satisfies DeviceSessionDTO;

const product = {
    id: productId,
    organizationId,
    categoryId: "11111111-1111-4111-8111-111111111111",
    name: "Burger",
    price: 100,
    discount: 10,
    imagePath: null,
    productType: "single" as const,
    productCode: null,
    productCodeKind: null,
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
const createdPayments: Array<Record<string, unknown>> = [];
const createdKots: Array<Record<string, unknown>> = [];

const createSale = mock(async (data: Record<string, unknown>) => {
    const sale = {
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
        committedAt: now,
        voidedAt: null,
        voidReason: null,
        serviceTableId: null,
        ...data,
        dueTotal: Number(data.grandTotal ?? 0),
    };
    createdSales.push(sale);
    return sale;
});

const createSaleItem = mock(async (data: Record<string, unknown>) => {
    const item = { ...data, addOns: [], bundleComponents: [], createdAt: now, updatedAt: now };
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
    if (!sale) return null;
    return {
        ...sale,
        itemCount: createdSaleItems.filter((item) => item.saleId === saleId).length,
        itemsSummary: "Burger",
    };
});

const getSaleItemsBySaleId = mock(async (saleId: string) =>
    createdSaleItems
        .filter((item) => item.saleId === saleId)
        .map((item) => ({
            ...item,
            addOns: createdSaleItemAddOns.filter((addOnRow) => addOnRow.saleItemId === item.id),
            bundleComponents: [],
        })),
);

const getPaymentsBySaleId = mock(async (saleId: string) =>
    createdPayments.filter((payment) => payment.saleId === saleId),
);
const getSaleIdByCompletionRequestId = mock(
    async (_organizationId: string, _storeId: string, requestId: string) =>
        (createdSales.find((sale) => sale.completionRequestId === requestId)?.id as string | undefined) ?? null,
);
const updateSale = mock(async (data: Record<string, unknown>) => {
    const index = createdSales.findIndex((row) => row.id === data.id);
    if (index < 0) return null;
    createdSales[index] = { ...createdSales[index], ...data, updatedAt: now };
    return createdSales[index];
});
const createPayment = mock(async (data: Record<string, unknown>) => {
    const payment = { ...data, createdAt: now, updatedAt: now };
    createdPayments.push(payment);
    return payment;
});

let saleSequence = 0;
const allocateSaleNumber = mock(async () => {
    saleSequence += 1;
    return {
        saleNumber: String(saleSequence),
        saleSequenceNumber: saleSequence,
        salePeriodKey: "continuous",
        tokenNumber: "001",
        tokenSequenceNumber: 1,
        tokenPeriodKey: "20260821",
    };
});

let kotSequence = 0;
const allocateKotNumber = mock(async () => {
    kotSequence += 1;
    return {
        kotNumber: `KOT-${String(kotSequence).padStart(3, "0")}`,
        kotSequenceNumber: kotSequence,
        kotPeriodKey: "20260821",
    };
});

const getKotBySaleId = mock(async (_organizationId: string, _storeId: string, saleId: string) =>
    createdKots.find((kot) => kot.saleId === saleId) ?? null,
);
const createKot = mock(async (data: Record<string, unknown>) => {
    const kot = { ...data, createdAt: now, updatedAt: now };
    createdKots.push(kot);
    return kot;
});

let kotSystemEnabled = true;
const getStoreById = mock(async (requestedOrganizationId: string, requestedStoreId: string) => {
    if (requestedOrganizationId !== organizationId || requestedStoreId !== storeId) {
        return null;
    }
    return { ...store, kotSystemEnabled };
});

mock.module("@/config/db", () => ({
    pg: {
        begin: async <T>(callback: (tx: unknown) => Promise<T>) => callback({}),
    },
}));

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser: mock(async () => organization),
    getOrganizationById: mock(async () => organization),
    getStoreById,
}));

mock.module("@/modules/tenant/billing/billing.repository", () => ({
    createSale,
    createSaleItem,
    createSaleItemAddOn,
    createSaleItemBundleComponent: mock(async (data: Record<string, unknown>) => ({
        ...data,
        addOns: [],
        createdAt: now,
        updatedAt: now,
    })),
    createSaleItemBundleComponentAddOn: mock(async (data: Record<string, unknown>) => ({
        ...data,
        createdAt: now,
        updatedAt: now,
    })),
    getSaleById,
    getSaleItemsBySaleId,
    getPaymentsBySaleId,
    getSaleIdByCompletionRequestId,
    deleteSaleItemsBySaleId: mock(async () => undefined),
    deleteDraftSale: mock(async () => false),
    updateSale,
    getCustomerById: mock(async () => null),
    createPayment,
    createCustomerLedgerEntry: mock(async (data: Record<string, unknown>) => data),
    updateCustomerBalance: mock(async () => null),
    lockDraftSale: mock(async () => true),
    lockCommittedSale: mock(async () => true),
    allocateSaleNumber,
}));

mock.module("@/modules/tenant/table-service/table-service.repository", () => ({
    lockServiceTableForSale: mock(async () => null),
    markReadyDraftAsEngaged: mock(async () => false),
    setCommittedSaleTableState: mock(async () => null),
    syncCommittedSalePaymentState: mock(async () => null),
}));

mock.module("./kot.repository", () => ({
    allocateKotNumber,
    createKot,
    getKotBySaleId,
    getKotById: mock(async () => null),
}));

const catalogRepository = await import("@/modules/tenant/catalog/catalog.repository");
const billingService = await import("@/modules/tenant/billing/billing.service");
const kotService = await import("./kot.service");

describe("Parcel KOT generation", () => {
    let getProductByIdSpy: ReturnType<typeof spyOn>;
    let getSelectableAttachmentSpy: ReturnType<typeof spyOn>;
    let getComboChoiceGroupsSpy: ReturnType<typeof spyOn>;
    let getComboChoiceOptionsSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        createdSales.length = 0;
        createdSaleItems.length = 0;
        createdSaleItemAddOns.length = 0;
        createdPayments.length = 0;
        createdKots.length = 0;
        saleSequence = 0;
        kotSequence = 0;
        kotSystemEnabled = true;
        createSale.mockClear();
        createSaleItem.mockClear();
        createSaleItemAddOn.mockClear();
        createPayment.mockClear();
        allocateSaleNumber.mockClear();
        allocateKotNumber.mockClear();
        createKot.mockClear();
        getKotBySaleId.mockClear();
        getStoreById.mockClear();

        getProductByIdSpy = spyOn(catalogRepository, "getProductById").mockResolvedValue(product as never);
        getSelectableAttachmentSpy = spyOn(
            catalogRepository,
            "getSelectableProductAddOnAttachmentByProductAndAddOn",
        ).mockResolvedValue(selectableAttachment as never);
        getComboChoiceGroupsSpy = spyOn(catalogRepository, "getComboChoiceGroupsByProductId").mockResolvedValue(
            [] as never,
        );
        getComboChoiceOptionsSpy = spyOn(catalogRepository, "getComboChoiceOptionsByGroupIds").mockResolvedValue(
            [] as never,
        );
    });

    afterEach(() => {
        getProductByIdSpy.mockRestore();
        getSelectableAttachmentSpy.mockRestore();
        getComboChoiceGroupsSpy.mockRestore();
        getComboChoiceOptionsSpy.mockRestore();
    });

    test("is available only when the KOT System is enabled", async () => {
        kotSystemEnabled = false;

        const response = await kotService.createParcelKotForDevice(deviceSession, {
            requestId: "77777777-7777-4777-8777-777777777777",
            items: [{ productId, quantity: 1, addOns: [] }],
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(403);
        expect(response.message).toContain("KOT System");
        expect(createSale).not.toHaveBeenCalled();
        expect(createKot).not.toHaveBeenCalled();
    });

    test("creates a tableless pending Sale with an independent KOT Number", async () => {
        const response = await kotService.createParcelKotForDevice(deviceSession, {
            requestId: "78787878-7878-4787-8787-787878787878",
            items: [{ productId, quantity: 1, addOns: [] }],
        });

        expect(response.status).toBe("success");
        expect(response.data?.sale.paymentStatus).toBe("pending");
        expect(response.data?.sale.status).toBe("completed");
        expect(response.data?.sale.serviceTableId ?? null).toBe(null);
        expect(response.data?.sale.saleNumber).toBe("1");
        expect(response.data?.sale.tokenNumber).toBe("001");
        expect(response.data?.kot.kotType).toBe("parcel");
        expect(response.data?.kot.kotNumber).toBe("KOT-001");
        expect(response.data?.kot.saleId).toBe(response.data?.sale.id);
        expect(response.data?.kot.storeId).toBe(storeId);
        expect(createdPayments).toHaveLength(0);
        expect(getStoreById).toHaveBeenCalledWith(organizationId, storeId);
    });

    test("keeps a second Parcel KOT on the shared KOT sequence and a new Sale Number", async () => {
        const first = await kotService.createParcelKotForDevice(deviceSession, {
            requestId: "79797979-7979-4797-8797-797979797979",
            items: [{ productId, quantity: 1, addOns: [] }],
        });
        const second = await kotService.createParcelKotForDevice(deviceSession, {
            requestId: "80808080-8080-4808-8808-808080808080",
            items: [{ productId, quantity: 1, addOns: [] }],
        });

        expect(first.data?.kot.kotNumber).toBe("KOT-001");
        expect(second.data?.kot.kotNumber).toBe("KOT-002");
        expect(first.data?.sale.saleNumber).toBe("1");
        expect(second.data?.sale.saleNumber).toBe("2");
        expect(second.data?.sale.id).not.toBe(first.data?.sale.id);
    });

    test("retains trusted add-on snapshots after a later catalog price change", async () => {
        const response = await kotService.createParcelKotForDevice(deviceSession, {
            requestId: "81818181-8181-4818-8818-818181818181",
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
        });

        expect(response.status).toBe("success");
        expect(response.data?.sale.items[0]?.unitPriceSnapshot).toBe(100);
        expect(response.data?.sale.items[0]?.addOns[0]?.addOnNameSnapshot).toBe("Extra Cheese");
        expect(response.data?.sale.items[0]?.addOns[0]?.unitPriceSnapshot).toBe(20);
        expect(response.data?.kot.items[0]?.unitPriceSnapshot).toBe(100);
        expect(response.data?.kot.items[0]?.addOns[0]?.unitPriceSnapshot).toBe(20);

        getProductByIdSpy.mockResolvedValue({ ...product, price: 500, discount: 0 } as never);
        const laterSale = await billingService.getSaleDetailsForDevice(deviceSession, response.data?.sale.id!);
        expect(laterSale.data?.sale.items[0]?.unitPriceSnapshot).toBe(100);
        expect(laterSale.data?.sale.grandTotal).toBe(response.data?.sale.grandTotal);
    });

    test("rejects a client-chosen Store and stays locked to the device Store", async () => {
        const foreignSession = {
            ...deviceSession,
            store: { ...deviceSession.store, id: otherStoreId },
            device: { ...deviceSession.device, storeId: otherStoreId },
        } satisfies DeviceSessionDTO;

        const response = await kotService.createParcelKotForDevice(foreignSession, {
            requestId: "82828282-8282-4828-8828-828282828282",
            items: [{ productId, quantity: 1, addOns: [] }],
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(createKot).not.toHaveBeenCalled();
    });

    test("retries with the same request return the original Parcel KOT and Sale", async () => {
        const payload = {
            requestId: "83838383-8383-4838-8838-838383838383",
            items: [{ productId, quantity: 1, addOns: [] }],
        };

        const first = await kotService.createParcelKotForDevice(deviceSession, payload);
        const second = await kotService.createParcelKotForDevice(deviceSession, payload);

        expect(first.status).toBe("success");
        expect(second.status).toBe("success");
        expect(second.data?.sale.id).toBe(first.data?.sale.id);
        expect(second.data?.kot.kotNumber).toBe("KOT-001");
        expect(createKot).toHaveBeenCalledTimes(1);
        expect(allocateKotNumber).toHaveBeenCalledTimes(1);
    });

    test("collects payment later through the existing payment workflow", async () => {
        const created = await kotService.createParcelKotForDevice(deviceSession, {
            requestId: "84848484-8484-4848-8848-848484848484",
            items: [{ productId, quantity: 1, addOns: [] }],
        });

        expect(created.data?.sale.paymentStatus).toBe("pending");
        expect(created.data?.sale.grandTotal).toBe(90);

        const collected = await billingService.collectPaymentForDevice(
            deviceSession,
            created.data?.sale.id!,
            { amount: 90, method: "cash" },
        );

        expect(collected.status).toBe("success");
        expect(collected.data?.sale.paymentStatus).toBe("paid");
        expect(createdPayments).toHaveLength(1);
    });
});
