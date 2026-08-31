import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import type { DeviceSessionDTO } from "@repo/types";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const addOnId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const addOnId2 = "99999999-9999-4999-8999-999999999999";
const attachmentId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const attachmentId2 = "88888888-8888-4888-8888-888888888888";
const comboProductId = "12121212-1212-4121-8121-121212121212";
const comboOptionProductId = "13131313-1313-4131-8131-131313131313";
const comboChoiceGroupId = "14141414-1414-4141-8141-141414141414";
const comboChoiceOptionId = "15151515-1515-4151-8151-151515151515";

const now = new Date("2026-07-11T12:00:00.000Z");
const amendmentCustomerId = "abababab-abab-4aba-8aba-abababababab";
const tableId = "16161616-1616-4161-8161-161616161616";
const deviceId = "17171717-1717-4171-8171-171717171717";

const organization = { id: organizationId, name: "Demo Org" };
const store = {
  id: storeId,
  organizationId,
  name: "Main Store",
  kotSystemEnabled: true,
  tableManagementEnabled: false,
  moneyAccountTrackingEnabled: false,
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

const comboProduct = {
    ...product,
    id: comboProductId,
    name: "Burger Meal",
    price: 100,
    discount: 0,
    productType: "combo" as const,
};

const comboOptionProduct = {
    ...product,
    id: comboOptionProductId,
    name: "Peri-peri Fries",
    price: 40,
    discount: 0,
};

const comboChoiceGroup = {
    id: comboChoiceGroupId,
    organizationId,
    comboProductId,
    name: "Fries",
    minSelections: 1,
    maxSelections: 1,
    sortOrder: 0,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const comboChoiceOption = {
    id: comboChoiceOptionId,
    organizationId,
    choiceGroupId: comboChoiceGroupId,
    optionProductId: comboOptionProductId,
    maxQuantity: 1,
    priceAdjustment: 10,
    sortOrder: 0,
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
const createdSaleItemBundleComponents: Array<Record<string, unknown>> = [];
const createdSaleItemBundleComponentAddOns: Array<Record<string, unknown>> = [];
const createdPayments: Array<Record<string, unknown>> = [];
const amendmentCustomer = {
    id: amendmentCustomerId,
    organizationId,
    name: "Amendment Customer",
    phone: null,
    balance: 0,
    isActive: true,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

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

const createSaleItemBundleComponent = mock(
  async (data: Record<string, unknown>) => {
    const component = { ...data, createdAt: now, updatedAt: now };
    createdSaleItemBundleComponents.push(component);
    return component;
  },
);

const createSaleItemBundleComponentAddOn = mock(
  async (data: Record<string, unknown>) => {
    const addOnRow = { ...data, createdAt: now, updatedAt: now };
    createdSaleItemBundleComponentAddOns.push(addOnRow);
    return addOnRow;
  },
);

const createSaleItemAddOn = mock(async (data: Record<string, unknown>) => {
    const addOnRow = { ...data, createdAt: now, updatedAt: now };
    createdSaleItemAddOns.push(addOnRow);
    return addOnRow;
});

const getSaleById = mock(
  async (_organizationId: string, _storeId: string, saleId: string) => {
    const sale = createdSales.find((row) => row.id === saleId);
    if (!sale) {
        return null;
    }

    return {
        ...sale,
      itemCount: createdSaleItems.filter((item) => item.saleId === saleId)
        .length,
        itemsSummary: "Burger",
    };
  },
);

const getSaleItemsBySaleId = mock(async (saleId: string) => {
    return createdSaleItems
        .filter((item) => item.saleId === saleId)
        .map((item) => ({
            ...item,
      addOns: createdSaleItemAddOns.filter(
        (addOnRow) => addOnRow.saleItemId === item.id,
      ),
            bundleComponents: createdSaleItemBundleComponents
                .filter((component) => component.saleItemId === item.id)
                .map((component) => ({
                    ...component,
                    addOns: createdSaleItemBundleComponentAddOns.filter(
                        (addOn) => addOn.saleItemBundleComponentId === component.id,
                    ),
                })),
        }));
});

const getPaymentsBySaleId = mock(async (saleId: string) =>
  createdPayments.filter((payment) => payment.saleId === saleId),
);
const getSaleIdByCompletionRequestId = mock(
    async (_organizationId: string, _storeId: string, requestId: string) =>
    (createdSales.find((sale) => sale.completionRequestId === requestId)?.id as
      string | undefined) ?? null,
);

const deleteSaleItemsBySaleId = mock(
  async (_organizationId: string, _storeId: string, saleId: string) => {
    const itemIds = new Set(
      createdSaleItems
        .filter((item) => item.saleId === saleId)
        .map((item) => item.id as string),
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
  },
);

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

const deleteDraftSale = mock(
  async (_organizationId: string, _storeId: string, saleId: string) => {
    const index = createdSales.findIndex(
      (row) => row.id === saleId && row.status === "draft",
    );
    if (index < 0) {
        return false;
    }

    createdSales.splice(index, 1);
    return true;
  },
);

const getCustomerById = mock(
  async (_organizationId: string, customerId: string) =>
    customerId === amendmentCustomerId ? amendmentCustomer : null,
);
const createPayment = mock(async (data: Record<string, unknown>) => {
    const payment = { ...data, createdAt: now, updatedAt: now };
    createdPayments.push(payment);
    return payment;
});
const createCustomerLedgerEntry = mock(
  async (data: Record<string, unknown>) => ({
    ...data,
    createdAt: now,
    updatedAt: now,
  }),
);
const updateCustomerBalance = mock(
  async (_organizationId: string, customerId: string, balance: number) =>
    customerId === amendmentCustomerId
      ? { ...amendmentCustomer, balance }
      : null,
);
const getParentScopedAddOnSalesRollups = mock(async () => []);
const getAddOnScopedSalesRollups = mock(async () => []);
const lockDraftSale = mock(async () => true);
const allocateSaleNumber = mock(async () => ({
    saleNumber: "1",
    saleSequenceNumber: 1,
    salePeriodKey: "continuous",
}));
let serviceTableState: "engaged" | "ready_to_bill" | "payment_due" | "paid" =
  "engaged";
const getServiceTableState = () => serviceTableState;
const markReadyDraftAsEngaged = mock(async () => {
    if (serviceTableState !== "ready_to_bill") return false;
    serviceTableState = "engaged";
    return true;
});
const setCommittedSaleTableState = mock(
    async (
        _organizationId: string,
        _storeId: string,
        _tableId: string,
        _saleId: string,
        state: "payment_due" | "paid",
    ) => {
    if (
      serviceTableState !== "engaged" &&
      serviceTableState !== "ready_to_bill"
    ) {
            return null;
        }
        serviceTableState = state;
        return { id: tableId, state };
    },
);
const lockServiceTableForSale = mock(async () => ({
    id: tableId,
    state: serviceTableState,
    currentSaleId: createdSales[0]?.id,
}));

const standaloneKotsByRequest = new Map<string, { saleId: string }>();
const linkedKots: Array<Record<string, unknown>> = [];
let kotLookupBarrier: {
  arrivals: number;
  promise: Promise<void>;
  release: () => void;
} | null = null;
const armKotLookupBarrier = () => {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  kotLookupBarrier = { arrivals: 0, promise, release };
};
const prepareStandaloneKotBatchForActor = mock(
  async (params: Record<string, unknown>) => ({
    status: "success" as const,
    data: {
      kotId: crypto.randomUUID(),
      fulfillmentType: params.serviceMode === "pick_up" ? "pick_up" : "dine_in",
      generatedAt: new Date(),
      items: [],
      generationRequestId: String(params.generationRequestId),
    },
    message: "prepared",
    code: 201,
  }),
);
const persistPreparedStandaloneKotBatch = mock(
  async (
    params: { saleId: string },
    prepared: { generationRequestId: string },
  ) => {
    const existing = standaloneKotsByRequest.get(prepared.generationRequestId);
    if (existing && existing.saleId !== params.saleId) {
      throw Object.assign(new Error("duplicate KOT generation request"), {
        code: "23505",
      });
    }
    standaloneKotsByRequest.set(prepared.generationRequestId, {
      saleId: params.saleId,
    });
  },
);
const getStandaloneKotByGenerationRequestIdForActor = mock(
  async (params: { generationRequestId: string }) => {
    const barrier = kotLookupBarrier;
    if (barrier) {
      barrier.arrivals += 1;
      if (barrier.arrivals === 2) {
        barrier.release();
      }
      await barrier.promise;
    }
    return standaloneKotsByRequest.get(params.generationRequestId) ?? null;
  },
);
const getKotsBySaleId = mock(async () => linkedKots);
const getKotNumbersBySaleId = mock(async () =>
  linkedKots.map((kot) => String(kot.kotNumber)),
);

mock.module("@/config/db", () => ({
    pg: {
        begin: async <T>(callback: (tx: unknown) => Promise<T>) => callback({}),
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
    getSaleIdByCompletionRequestId,
    deleteSaleItemsBySaleId,
    deleteDraftSale,
    updateSale,
    getCustomerById,
    getCustomersByOrganizationId: mock(async () => []),
    createCustomer: mock(async () => null),
    updateCustomer: mock(async () => null),
    customerPhoneExistsInOrganization: mock(async () => false),
    getCustomerLedgerByCustomerId: mock(async () => []),
    getSalesByStore: mock(async () => []),
    getSalesSummaryByStore: mock(async () => ({
        completedCount: 0,
        salesTotal: 0,
        collectedTotal: 0,
        dueTotal: 0,
    })),
    createPayment,
    createCustomerLedgerEntry,
    updateCustomerBalance,
    lockDraftSale,
    allocateSaleNumber,
    getParentScopedAddOnSalesRollups,
    getAddOnScopedSalesRollups,
}));

mock.module("@/modules/tenant/table-service/table-service.repository", () => ({
    lockServiceTableForSale,
    markReadyDraftAsEngaged,
    setCommittedSaleTableState,
    getServiceTableById: mock(async () => null),
}));

mock.module("./billing-kot-read", () => ({
  getKotNumbersBySaleId,
  getKotsBySaleId,
}));

mock.module("./billing-kot-write", () => ({
  getStandaloneKotByGenerationRequestIdForActor,
  prepareStandaloneKotBatchForActor,
  persistPreparedStandaloneKotBatch,
}));

const catalogRepository =
  await import("@/modules/tenant/catalog/catalog.repository");
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
    let getComboChoiceGroupsSpy: ReturnType<typeof spyOn>;
    let getComboChoiceOptionsSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        createdSales.length = 0;
        createdSaleItems.length = 0;
        createdSaleItemAddOns.length = 0;
        createdSaleItemBundleComponents.length = 0;
        createdSaleItemBundleComponentAddOns.length = 0;
        createdPayments.length = 0;
    standaloneKotsByRequest.clear();
    linkedKots.length = 0;
    kotLookupBarrier = null;
    store.kotSystemEnabled = true;
    prepareStandaloneKotBatchForActor.mockClear();
    persistPreparedStandaloneKotBatch.mockClear();
    getStandaloneKotByGenerationRequestIdForActor.mockClear();
    getKotsBySaleId.mockClear();
    getKotNumbersBySaleId.mockClear();

        createSale.mockClear();
        createSaleItem.mockClear();
        createSaleItemAddOn.mockClear();
        createSaleItemBundleComponent.mockClear();
        createSaleItemBundleComponentAddOn.mockClear();
        getSaleById.mockClear();
        getSaleIdByCompletionRequestId.mockClear();
        getSaleItemsBySaleId.mockClear();
        deleteSaleItemsBySaleId.mockClear();
        deleteDraftSale.mockClear();
        updateSale.mockClear();
        createPayment.mockClear();
        createCustomerLedgerEntry.mockClear();
        updateCustomerBalance.mockClear();
        getParentScopedAddOnSalesRollups.mockClear();
        getAddOnScopedSalesRollups.mockClear();
        lockDraftSale.mockClear();
        lockDraftSale.mockResolvedValue(true);
        allocateSaleNumber.mockClear();
        serviceTableState = "engaged";
        markReadyDraftAsEngaged.mockClear();
        setCommittedSaleTableState.mockClear();
        lockServiceTableForSale.mockClear();
        getParentScopedAddOnSalesRollups.mockResolvedValue([]);
        getAddOnScopedSalesRollups.mockResolvedValue([]);

    getProductByIdSpy = spyOn(
      catalogRepository,
      "getProductById",
    ).mockResolvedValue(product as never);
        getSelectableAttachmentSpy = spyOn(
            catalogRepository,
            "getSelectableProductAddOnAttachmentByProductAndAddOn",
        ).mockImplementation(
            async (_organizationId, _productId, requestedAddOnId) =>
                resolveSelectableAttachment(requestedAddOnId) as never,
        );
    getComboChoiceGroupsSpy = spyOn(
      catalogRepository,
      "getComboChoiceGroupsByProductId",
    ).mockResolvedValue([] as never);
    getComboChoiceOptionsSpy = spyOn(
      catalogRepository,
      "getComboChoiceOptionsByGroupIds",
    ).mockResolvedValue([] as never);
    });

    afterEach(() => {
        getProductByIdSpy.mockRestore();
        getSelectableAttachmentSpy.mockRestore();
        getComboChoiceGroupsSpy.mockRestore();
        getComboChoiceOptionsSpy.mockRestore();
    });

    test("creates a plain product line with trusted catalog pricing snapshots", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [{ productId, quantity: 2, addOns: [] }],
      },
    );

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

    test("completes a POS sale atomically and is safe to retry", async () => {
        const requestId = "77777777-7777-4777-8777-777777777777";
        const payload = {
            requestId,
            items: [{ productId, quantity: 1, addOns: [] }],
            payments: [{ amount: 90, method: "cash" as const, notes: null }],
        };

    const firstResponse = await billingService.completeSale(
      userId,
      organizationId,
      storeId,
      payload,
    );
    const secondResponse = await billingService.completeSale(
      userId,
      organizationId,
      storeId,
      payload,
    );

        expect(firstResponse.status).toBe("success");
        expect(secondResponse.status).toBe("success");
        expect(firstResponse.data?.sale.id).toBe(secondResponse.data?.sale.id);
        expect(createdSales).toHaveLength(1);
        expect(createPayment).toHaveBeenCalledTimes(1);
    });

  test("creates a direct Draft Sale and KOT once when the generation request is retried", async () => {
    const payload = {
      items: [{ productId, quantity: 1, addOns: [] }],
      generateKot: true,
      kotBatchItems: [{ productId, quantity: 1, addOns: [] }],
      kotRequestId: "18181818-1818-4181-8181-181818181818",
      serviceMode: "dine_in" as const,
    };

    const first = await billingService.createDraftSaleForDevice(
      deviceSession,
      payload,
    );
    const second = await billingService.createDraftSaleForDevice(
      deviceSession,
      payload,
    );

    expect(first.status).toBe("success");
    expect(second.data?.sale.id).toBe(first.data?.sale.id);
    expect(createdSales).toHaveLength(1);
    expect(persistPreparedStandaloneKotBatch).toHaveBeenCalledTimes(1);
    expect(persistPreparedStandaloneKotBatch.mock.calls[0]?.[2]).toBe(
      createSale.mock.calls[0]?.[1],
    );
  });

  test("returns one Sale when the same Draft KOT request arrives concurrently", async () => {
    const payload = {
      items: [{ productId, quantity: 1, addOns: [] }],
      generateKot: true,
      kotBatchItems: [{ productId, quantity: 1, addOns: [] }],
      kotRequestId: "25252525-2525-4252-8252-252525252525",
      serviceMode: "dine_in" as const,
    };
    armKotLookupBarrier();

    const [first, second] = await Promise.all([
      billingService.createDraftSaleForDevice(deviceSession, payload),
      billingService.createDraftSaleForDevice(deviceSession, payload),
    ]);

    expect(first.status).toBe("success");
    expect(second.status).toBe("success");
    expect(second.data?.sale.id).toBe(first.data?.sale.id);
    expect(standaloneKotsByRequest.size).toBe(1);
  });

  test("returns every linked KOT fulfillment in bill history", async () => {
    const draft = await billingService.createDraftSaleForDevice(deviceSession, {
      items: [{ productId, quantity: 1, addOns: [] }],
      serviceMode: "dine_in",
    });
    const saleId = draft.data!.sale.id;
    linkedKots.push(
      { kotType: "table", kotNumber: "KOT-001", fulfillmentType: "dine_in" },
      { kotType: "table", kotNumber: "KOT-002", fulfillmentType: "pick_up" },
    );

    const details = await billingService.getSaleDetailsForDevice(
      deviceSession,
      saleId,
    );

    expect(details.status).toBe("success");
    expect(details.data?.sale.serviceMode).toBe("dine_in");
    expect(details.data?.sale.kotHistory).toEqual([
      { kotNumber: "KOT-001", fulfillmentType: "dine_in" },
      { kotNumber: "KOT-002", fulfillmentType: "pick_up" },
    ]);
    expect(details.data?.sale.standaloneKots).toBeUndefined();
  });

  test("saves and places a KOT-backed Draft with no pending KOT items", async () => {
    const draft = await billingService.createDraftSaleForDevice(deviceSession, {
      items: [{ productId, quantity: 1, addOns: [] }],
      serviceMode: "dine_in",
    });
    const saleId = draft.data!.sale.id;
    linkedKots.push({
      kotType: "parcel",
      kotNumber: "KOT-001",
      fulfillmentType: "dine_in",
      items: [],
    });

    const saved = await billingService.updateDraftSaleForDevice(
      deviceSession,
      saleId,
      {
        items: [{ productId, quantity: 1, addOns: [] }],
        generateKot: true,
        kotBatchItems: [],
        serviceMode: "dine_in",
      },
    );
    const placed = await billingService.commitSaleForDevice(
      deviceSession,
      saleId,
      {
        items: [{ productId, quantity: 1, addOns: [] }],
        payments: [],
        generateKot: true,
        kotBatchItems: [],
        serviceMode: "dine_in",
      },
    );

    expect(saved.status).toBe("success");
    expect(placed.status).toBe("success");
    expect(placed.data?.sale.status).toBe("completed");
    expect(persistPreparedStandaloneKotBatch).not.toHaveBeenCalled();
  });

  test("places a Pick-Up direct Sale and KOT atomically while the no-KOT path creates none", async () => {
    const requestId = "19191919-1919-4191-8191-191919191919";
    const placed = await billingService.completeSaleForDevice(deviceSession, {
      requestId,
      items: [{ productId, quantity: 1, addOns: [] }],
      payments: [],
      generateKot: true,
      kotBatchItems: [{ productId, quantity: 1, addOns: [] }],
      kotRequestId: requestId,
      serviceMode: "pick_up",
    });
    const retried = await billingService.completeSaleForDevice(deviceSession, {
      requestId,
      items: [{ productId, quantity: 1, addOns: [] }],
      payments: [],
      generateKot: true,
      kotBatchItems: [{ productId, quantity: 1, addOns: [] }],
      kotRequestId: requestId,
      serviceMode: "pick_up",
    });

    expect(placed.status).toBe("success");
    expect(retried.data?.sale.id).toBe(placed.data?.sale.id);
    expect(placed.data?.sale.serviceMode).toBe("pick_up");
    expect(prepareStandaloneKotBatchForActor.mock.calls[0]?.[0]).toMatchObject({
      serviceMode: "pick_up",
    });
    expect(persistPreparedStandaloneKotBatch).toHaveBeenCalledTimes(1);
    expect(persistPreparedStandaloneKotBatch.mock.calls[0]?.[2]).toBe(
      createSale.mock.calls[0]?.[1],
    );

    await billingService.completeSaleForDevice(deviceSession, {
      requestId: "20202020-2020-4202-8202-202020202020",
      items: [{ productId, quantity: 1, addOns: [] }],
      payments: [],
      generateKot: false,
      serviceMode: "dine_in",
    });
    expect(persistPreparedStandaloneKotBatch).toHaveBeenCalledTimes(1);
  });

  test("deduplicates KOT generation when updating and committing a direct Draft Sale", async () => {
    const draft = await billingService.createDraftSaleForDevice(deviceSession, {
      items: [{ productId, quantity: 1, addOns: [] }],
      serviceMode: "dine_in",
    });
    const saleId = draft.data!.sale.id;
    const updatePayload = {
      items: [{ productId, quantity: 2, addOns: [] }],
      generateKot: true,
      kotBatchItems: [{ productId, quantity: 1, addOns: [] }],
      kotRequestId: "21212121-2121-4212-8212-212121212121",
      serviceMode: "dine_in" as const,
    };

    await billingService.updateDraftSaleForDevice(
      deviceSession,
      saleId,
      updatePayload,
    );
    await billingService.updateDraftSaleForDevice(
      deviceSession,
      saleId,
      updatePayload,
    );
    expect(persistPreparedStandaloneKotBatch).toHaveBeenCalledTimes(1);

    const commitPayload = {
      items: [{ productId, quantity: 2, addOns: [] }],
      payments: [],
      generateKot: true,
      kotBatchItems: [{ productId, quantity: 1, addOns: [] }],
      kotRequestId: "22222222-2222-4222-8222-222222222222",
      serviceMode: "dine_in" as const,
    };
    const committed = await billingService.commitSaleForDevice(
      deviceSession,
      saleId,
      commitPayload,
    );
    const retried = await billingService.commitSaleForDevice(
      deviceSession,
      saleId,
      commitPayload,
    );

    expect(committed.status).toBe("success");
    expect(retried.data?.sale.id).toBe(saleId);
    expect(persistPreparedStandaloneKotBatch).toHaveBeenCalledTimes(2);
  });

  test("enforces the Store KOT feature and generation request id on the server", async () => {
    const withoutRequest = await billingService.createDraftSaleForDevice(
      deviceSession,
      {
        items: [{ productId, quantity: 1, addOns: [] }],
        generateKot: true,
        kotBatchItems: [{ productId, quantity: 1, addOns: [] }],
      },
    );
    expect(withoutRequest.status).toBe("error");
    expect(withoutRequest.code).toBe(400);

    const outsideSaleDelta = await billingService.createDraftSaleForDevice(
      deviceSession,
      {
        items: [{ productId, quantity: 1, addOns: [] }],
        generateKot: true,
        kotBatchItems: [{ productId, quantity: 2, addOns: [] }],
        kotRequestId: "24242424-2424-4242-8242-242424242424",
      },
    );
    expect(outsideSaleDelta.status).toBe("error");
    expect(outsideSaleDelta.code).toBe(409);

    store.kotSystemEnabled = false;
    const disabled = await billingService.createDraftSaleForDevice(
      deviceSession,
      {
        items: [{ productId, quantity: 1, addOns: [] }],
        generateKot: true,
        kotBatchItems: [{ productId, quantity: 1, addOns: [] }],
        kotRequestId: "23232323-2323-4232-8232-232323232323",
      },
    );
    store.kotSystemEnabled = true;

    expect(disabled.status).toBe("error");
    expect(disabled.code).toBe(403);
    expect(createSale).not.toHaveBeenCalled();
  });

    test("completes a customerless due sale and collects later without ledger effects", async () => {
        const requestId = "78787878-7878-4787-8787-787878787878";

    const completed = await billingService.completeSale(
      userId,
      organizationId,
      storeId,
      {
            requestId,
            items: [{ productId, quantity: 1, addOns: [] }],
            payments: [],
      },
    );

        expect(completed.status).toBe("success");
        expect(completed.data?.sale.paymentStatus).toBe("pending");
        expect(completed.data?.sale.customer).toBeNull();
        expect(createdPayments).toHaveLength(0);
        expect(createCustomerLedgerEntry).not.toHaveBeenCalled();
        expect(updateCustomerBalance).not.toHaveBeenCalled();

        const collected = await billingService.collectPayment(
            userId,
            organizationId,
            storeId,
            completed.data?.sale.id!,
            { amount: 90, method: "cash" },
        );

        expect(collected.status).toBe("success");
        expect(collected.data?.payment.amount).toBe(90);
        expect(collected.data?.payment.method).toBe("cash");
        expect(collected.data?.sale.paymentStatus).toBe("paid");
        expect(createdPayments).toHaveLength(1);
        expect(createCustomerLedgerEntry).not.toHaveBeenCalled();
        expect(updateCustomerBalance).not.toHaveBeenCalled();
    });

    test("completes a customerless partial sale without creating ledger effects", async () => {
    const response = await billingService.completeSale(
      userId,
      organizationId,
      storeId,
      {
            requestId: "79797979-7979-4797-8797-797979797979",
            items: [{ productId, quantity: 1, addOns: [] }],
            payments: [{ amount: 45, method: "cash" }],
      },
    );

        expect(response.status).toBe("success");
        expect(response.data?.sale.paymentStatus).toBe("partial");
        expect(response.data?.sale.customer).toBeNull();
        expect(createdPayments).toHaveLength(1);
        expect(createCustomerLedgerEntry).not.toHaveBeenCalled();
        expect(updateCustomerBalance).not.toHaveBeenCalled();
    });

    test("keeps customer ledger effects for customer-linked Due and partial sales", async () => {
    const dueDraft = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            customerId: amendmentCustomerId,
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );
    const dueSale = await billingService.commitSale(
      userId,
      organizationId,
      storeId,
      dueDraft.data?.sale.id!,
      {
            payments: [],
      },
    );

        expect(dueSale.status).toBe("success");
        expect(createCustomerLedgerEntry).toHaveBeenCalledTimes(1);
        expect(updateCustomerBalance).toHaveBeenCalledTimes(1);
        expect(createCustomerLedgerEntry.mock.calls[0]?.[0]).toMatchObject({
            customerId: amendmentCustomerId,
            entryType: "sale",
            amount: 90,
        });

        createCustomerLedgerEntry.mockClear();
        updateCustomerBalance.mockClear();

    const partialDraft = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            customerId: amendmentCustomerId,
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );
        const partialSale = await billingService.commitSale(
            userId,
            organizationId,
            storeId,
            partialDraft.data?.sale.id!,
            { payments: [{ amount: 45, method: "cash" }] },
        );

        expect(partialSale.status).toBe("success");
        expect(createCustomerLedgerEntry).toHaveBeenCalledTimes(2);
        expect(updateCustomerBalance).toHaveBeenCalledTimes(2);
    expect(
      createCustomerLedgerEntry.mock.calls.map(([entry]) => entry.amount),
    ).toEqual([90, -45]);
    });

    test("keeps later collection guards for overpayment, fully paid, and draft sales", async () => {
    const due = await billingService.completeSale(
      userId,
      organizationId,
      storeId,
      {
            requestId: "80808080-8080-4808-8808-808080808080",
            items: [{ productId, quantity: 1, addOns: [] }],
            payments: [],
      },
    );
        const dueSaleId = due.data?.sale.id!;

    const overpayment = await billingService.collectPayment(
      userId,
      organizationId,
      storeId,
      dueSaleId,
      {
            amount: 91,
            method: "cash",
      },
    );
        expect(overpayment.status).toBe("error");
        expect(overpayment.code).toBe(409);
        expect(createdPayments).toHaveLength(0);

    const paid = await billingService.collectPayment(
      userId,
      organizationId,
      storeId,
      dueSaleId,
      {
            amount: 90,
            method: "cash",
      },
    );
        expect(paid.status).toBe("success");

    const alreadyPaid = await billingService.collectPayment(
      userId,
      organizationId,
      storeId,
      dueSaleId,
      {
            amount: 1,
            method: "cash",
      },
    );
        expect(alreadyPaid.status).toBe("error");
        expect(alreadyPaid.code).toBe(409);

    const draft = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );
        const draftPayment = await billingService.collectPayment(
            userId,
            organizationId,
            storeId,
            draft.data?.sale.id!,
            { amount: 1, method: "cash" },
        );
        expect(draftPayment.status).toBe("error");
        expect(draftPayment.code).toBe(409);
    });

    test("does not allocate a number when the draft is already committed", async () => {
    const created = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );
        const saleId = created.data?.sale.id;
        expect(created.status).toBe("success");
        expect(saleId).toBeTruthy();

        lockDraftSale.mockResolvedValue(false);

    const response = await billingService.commitSale(
      userId,
      organizationId,
      storeId,
      saleId!,
      {
            payments: [],
      },
    );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(allocateSaleNumber).not.toHaveBeenCalled();
        expect(createdSales[0]?.status).toBe("draft");
    });

    test("places an engaged table order after an ordinary draft edit", async () => {
    const created = await billingService.createDraftSaleForDevice(
      deviceSession,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );
        const saleId = created.data?.sale.id;
        expect(created.status).toBe("success");
        expect(saleId).toBeTruthy();

        createdSales[0]!.serviceTableId = tableId;
        serviceTableState = "engaged";

    const saved = await billingService.updateDraftSaleForDevice(
      deviceSession,
      saleId!,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );
        expect(saved.status).toBe("success");

    const committed = await billingService.commitSaleForDevice(
      deviceSession,
      saleId!,
      {
            payments: [],
      },
    );

        expect(committed.status).toBe("success");
        expect(committed.data?.sale.status).toBe("completed");
        expect(getServiceTableState()).toBe("payment_due");
    });

    test("atomically saves the final cart while committing an engaged table order", async () => {
    const created = await billingService.createDraftSaleForDevice(
      deviceSession,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );
        const saleId = created.data?.sale.id;
        expect(saleId).toBeTruthy();

        createdSales[0]!.serviceTableId = tableId;
        serviceTableState = "engaged";

    const committed = await billingService.commitSaleForDevice(
      deviceSession,
      saleId!,
      {
            items: [{ productId, quantity: 2, addOns: [] }],
            payments: [],
      },
    );

        expect(committed.status).toBe("success");
        expect(committed.data?.sale.status).toBe("completed");
        expect(committed.data?.sale.items[0]?.quantity).toBe(2);
        expect(committed.data?.sale.grandTotal).toBe(180);
        expect(getServiceTableState()).toBe("payment_due");
    });

    test("still places a leftover Ready to bill table order", async () => {
    const created = await billingService.createDraftSaleForDevice(
      deviceSession,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );
        const saleId = created.data?.sale.id;
        expect(saleId).toBeTruthy();

        createdSales[0]!.serviceTableId = tableId;
        serviceTableState = "ready_to_bill";

    const committed = await billingService.commitSaleForDevice(
      deviceSession,
      saleId!,
      {
            payments: [],
      },
    );

        expect(committed.status).toBe("success");
        expect(committed.data?.sale.status).toBe("completed");
        expect(getServiceTableState()).toBe("payment_due");
    });

    test("creates a configured product line with trusted add-on snapshots from the database", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 2,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
      },
    );

        expect(response.status).toBe("success");
    expect(getSelectableAttachmentSpy).toHaveBeenCalledWith(
      organizationId,
      productId,
      addOnId,
    );
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

    test("prices Combo option adjustments and nested add-ons in the sale total", async () => {
    getProductByIdSpy.mockImplementation(
      async (_organizationId, requestedProductId) => {
            if (requestedProductId === comboProductId) return comboProduct as never;
        if (requestedProductId === comboOptionProductId)
          return comboOptionProduct as never;
            return product as never;
      },
    );
        getComboChoiceGroupsSpy.mockResolvedValue([comboChoiceGroup] as never);
        getComboChoiceOptionsSpy.mockResolvedValue([comboChoiceOption] as never);

    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId: comboProductId,
                    quantity: 2,
                    addOns: [],
                    comboSelections: [
                        {
                            groupId: comboChoiceGroupId,
                            optionProductId: comboOptionProductId,
                            quantity: 1,
                            addOns: [{ addOnId, quantity: 1 }],
                        },
                    ],
                },
            ],
      },
    );

        expect(response.status).toBe("success");
        expect(createdSaleItemBundleComponents).toHaveLength(1);
        expect(createdSaleItemBundleComponentAddOns).toHaveLength(1);
        expect(createdSaleItems[0]?.lineSubtotal).toBe(260);
        expect(createdSaleItems[0]?.discountAmount).toBe(4);
        expect(createdSaleItems[0]?.lineTotal).toBe(256);
        expect(response.data?.sale.subtotal).toBe(260);
        expect(response.data?.sale.discountTotal).toBe(4);
        expect(response.data?.sale.grandTotal).toBe(256);
        expect(response.data?.sale.orderDiscountAmount).toBe(0);
    });

    test("sale totals include both parent product rows and child add-on rows", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 2 }],
                },
            ],
      },
    );

        expect(response.status).toBe("success");
        expect(response.data?.sale.subtotal).toBe(140);
        expect(response.data?.sale.discountTotal).toBe(14);
        expect(response.data?.sale.grandTotal).toBe(126);
    });

    test("rejects client-trusted pricing by loading catalog values only", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );

        expect(response.status).toBe("success");
        expect(createdSaleItems[0]?.unitPriceSnapshot).toBe(100);
        expect(createdSaleItems[0]?.discountAmount).toBe(10);
    });

    test("returns nested add-ons under the parent product in bill details", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
      },
    );

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

    getProductByIdSpy = spyOn(
      catalogRepository,
      "getProductById",
    ).mockResolvedValue(product as never);
        getSelectableAttachmentSpy = spyOn(
            catalogRepository,
            "getSelectableProductAddOnAttachmentByProductAndAddOn",
        ).mockImplementation(
            async (_organizationId, _productId, requestedAddOnId) =>
                resolveSelectableAttachment(requestedAddOnId) as never,
        );
    });

    afterEach(() => {
        getProductByIdSpy.mockRestore();
        getSelectableAttachmentSpy.mockRestore();
    });

    test("deletes a draft sale and rejects a second deletion", async () => {
    const created = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );
        const saleId = created.data?.sale.id;
        expect(created.status).toBe("success");
        expect(saleId).toBeDefined();

        const session = {
            organization: { id: organizationId },
            store: { id: storeId },
            device: { id: "66666666-6666-4666-8666-666666666666" },
        } as Parameters<typeof billingService.deleteDraftSaleForDevice>[0];

    const deleted = await billingService.deleteDraftSaleForDevice(
      session,
      saleId!,
    );
        expect(deleted).toMatchObject({ status: "success", data: null });
        expect(createdSales).toHaveLength(0);

    const missing = await billingService.deleteDraftSaleForDevice(
      session,
      saleId!,
    );
        expect(missing).toMatchObject({ status: "error", code: 404 });
    });

    test("replaces a paid bill with a new normal sale and preserves the old payment state", async () => {
        const originalSaleId = "44444444-4444-4444-8444-444444444444";
        const replacementRequestId = "55555555-5555-4555-8555-555555555555";
        createdSales.push({
            id: originalSaleId,
            organizationId,
            storeId,
            customerId: amendmentCustomerId,
            status: "completed",
            paymentStatus: "paid",
            subtotal: 100,
            discountTotal: 10,
            grandTotal: 90,
            paidTotal: 90,
            dueTotal: 0,
            notes: null,
            saleNumber: "21",
            committedAt: now,
            updatedAt: now,
            voidedAt: null,
            voidReason: null,
            replacementSaleId: null,
        });
        createdPayments.push({
            id: "old-payment-id",
            saleId: originalSaleId,
            amount: 90,
            method: "cash",
        });

        const session = {
            organization: { id: organizationId },
            store: { id: storeId },
            device: { id: "66666666-6666-4666-8666-666666666666" },
        } as Parameters<typeof billingService.replaceSaleForDevice>[0];

    const replaced = await billingService.replaceSaleForDevice(
      session,
      originalSaleId,
      {
            requestId: replacementRequestId,
            customerId: amendmentCustomerId,
            orderDiscountAmount: 0,
            notes: "Corrected order",
            items: [{ productId, quantity: 2, addOns: [] }],
        payments: [
          { amount: 180, method: "cash", referenceNumber: null, notes: null },
        ],
            replacementReason: "Customer changed the order",
      },
    );

        expect(replaced.status).toBe("success");
        expect(createdSales).toHaveLength(2);
        expect(createdSales[0]).toMatchObject({
            id: originalSaleId,
            status: "voided",
            paymentStatus: "paid",
            saleNumber: "21",
            voidReason: "Customer changed the order",
        });
        expect(createdSales[1]).toMatchObject({
            status: "completed",
            paymentStatus: "paid",
            replacementOfSaleId: originalSaleId,
            grandTotal: 180,
        });
    expect(
      createdPayments.filter((payment) => payment.saleId === originalSaleId),
    ).toHaveLength(1);
    expect(
      createdPayments.filter(
        (payment) => payment.saleId === createdSales[1]?.id,
      ),
    ).toHaveLength(1);

    const retried = await billingService.replaceSaleForDevice(
      session,
      originalSaleId,
      {
            requestId: replacementRequestId,
            customerId: amendmentCustomerId,
            orderDiscountAmount: 0,
            notes: "Corrected order",
            items: [{ productId, quantity: 2, addOns: [] }],
        payments: [
          { amount: 180, method: "cash", referenceNumber: null, notes: null },
        ],
            replacementReason: "Customer changed the order",
      },
    );

        expect(retried.status).toBe("success");
        expect(createdSales).toHaveLength(2);
    });

    test("merges identical configurations by quantity", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
                {
                    productId,
                    quantity: 2,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
      },
    );

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
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                { productId, quantity: 1, addOns: [] },
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 2 }],
                },
            ],
      },
    );

        expect(response.status).toBe("success");
        expect(createdSaleItems).toHaveLength(3);

    const signatures = createdSaleItems
      .map((item) => item.configurationSignature)
      .sort();
        expect(signatures).toEqual(["", `${addOnId}:1`, `${addOnId}:2`]);
        expect(response.data?.sale.items).toHaveLength(3);
    });

    test("normalized signature ignores add-on selection order", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
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
      },
    );

        expect(response.status).toBe("success");
        expect(createdSaleItems).toHaveLength(1);
        expect(createdSaleItems[0]?.quantity).toBe(2);

        const sortedSignature = [`${addOnId}:1`, `${addOnId2}:2`].sort().join("|");
        expect(createdSaleItems[0]?.configurationSignature).toBe(sortedSignature);
        expect(createdSaleItemAddOns).toHaveLength(2);
    });

    test("customize with no selected add-ons merges into the plain product line", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                { productId, quantity: 1, addOns: [] },
                { productId, quantity: 2 },
                { productId, quantity: 1, addOns: [] },
            ],
      },
    );

        expect(response.status).toBe("success");
        expect(createdSaleItems).toHaveLength(1);
        expect(createdSaleItems[0]?.quantity).toBe(4);
        expect(createdSaleItems[0]?.configurationSignature).toBe("");
        expect(createdSaleItemAddOns).toHaveLength(0);
    });

    test("rejects decimal product quantities", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [{ productId, quantity: 1.5, addOns: [] }],
      },
    );

        expect(response.status).toBe("error");
        expect(response.message).toContain("whole number");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
    });

    test("rejects negative add-on quantities in backend validation", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: -1 }],
                },
            ],
      },
    );

        expect(response.status).toBe("error");
        expect(response.message).toContain("whole number");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
    });

    test("rejects decimal add-on quantities", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1.5 }],
                },
            ],
      },
    );

        expect(response.status).toBe("error");
        expect(response.message).toContain("whole number");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
    });

    test("rejects add-on quantity above the selection cap", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 3 }],
                },
            ],
      },
    );

        expect(response.status).toBe("error");
        expect(response.message).toContain("selection cap");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
        expect(createSaleItemAddOn).not.toHaveBeenCalled();
    });

    test("rejects invalid configured selections atomically", async () => {
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
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
      },
    );

        expect(response.status).toBe("error");
        expect(response.message).toContain("Duplicate add-ons");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
        expect(createSaleItemAddOn).not.toHaveBeenCalled();
    });

    test("rejects inactive or unattached add-ons atomically without partial save", async () => {
    getSelectableAttachmentSpy.mockImplementation(
      async (_organizationId, _productId, requestedAddOnId) => {
            if (requestedAddOnId === addOnId) {
                return selectableAttachment as never;
            }
            return null;
      },
    );

    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
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
      },
    );

        expect(response.status).toBe("error");
        expect(response.message).toContain("not selectable");
        expect(createSale).not.toHaveBeenCalled();
        expect(createSaleItem).not.toHaveBeenCalled();
        expect(createSaleItemAddOn).not.toHaveBeenCalled();
    });

    test("quantity updates scale the frozen configuration without changing add-on selection", async () => {
    const created = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
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
      },
    );

        expect(created.status).toBe("success");
        const saleId = created.data?.sale.id;
        expect(saleId).toBeTruthy();

        const originalSignature = createdSaleItems[0]?.configurationSignature;
        expect(
            createdSaleItemAddOns.map((row) => ({
                addOnId: row.addOnId,
                quantityPerParent: row.quantityPerParent,
            })),
        ).toEqual(
            expect.arrayContaining([
                { addOnId, quantityPerParent: 1 },
                { addOnId: addOnId2, quantityPerParent: 2 },
            ]),
        );

    const updated = await billingService.updateDraftSale(
      userId,
      organizationId,
      storeId,
      saleId!,
      {
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
      },
    );

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
    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
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
      },
    );

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

    const response = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
      },
    );

        expect(response.status).toBe("error");
        expect(response.message).toContain("not available for new sale selections");
        expect(createSale).not.toHaveBeenCalled();
    });

    test("keeps frozen configured draft lines readable and updatable after catalog deactivation", async () => {
    const created = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
      },
    );

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

    const updated = await billingService.updateDraftSale(
      userId,
      organizationId,
      storeId,
      saleId!,
      {
            items: [
                {
                    productId,
                    quantity: 2,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
      },
    );

        expect(updated.status).toBe("success");
        expect(updated.data?.sale.items).toHaveLength(1);
        expect(updated.data?.sale.items[0]?.productNameSnapshot).toBe("Burger");
    expect(updated.data?.sale.items[0]?.unitPriceSnapshot).toBe(
      originalUnitPrice,
    );
        expect(updated.data?.sale.items[0]?.quantity).toBe(2);
    expect(updated.data?.sale.items[0]?.addOns[0]?.addOnNameSnapshot).toBe(
      originalAddOnName,
    );
    expect(updated.data?.sale.items[0]?.addOns[0]?.unitPriceSnapshot).toBe(
      originalAddOnUnitPrice,
    );
        expect(updated.data?.sale.items[0]?.addOns[0]?.totalQuantity).toBe(2);
        expect(getProductByIdSpy).toHaveBeenCalledTimes(1);
    });

    test("commits a draft with frozen configured lines after later catalog deactivation", async () => {
    const created = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
      },
    );

        expect(created.status).toBe("success");
        const saleId = created.data?.sale.id!;
        const grandTotal = Number(created.data?.sale.grandTotal);

        getProductByIdSpy.mockResolvedValue({
            ...product,
            status: "inactive",
        } as never);
        getSelectableAttachmentSpy.mockResolvedValue(null);

    const committed = await billingService.commitSale(
      userId,
      organizationId,
      storeId,
      saleId,
      {
            payments: [
                {
                    amount: grandTotal,
                    method: "cash",
                },
            ],
      },
    );

        expect(committed.status).toBe("success");
        expect(committed.data?.sale.status).toBe("completed");
        expect(committed.data?.sale.items[0]?.addOns).toHaveLength(1);
        expect(committed.data?.sale.items[0]?.productNameSnapshot).toBe("Burger");
    expect(committed.data?.sale.items[0]?.addOns[0]?.addOnNameSnapshot).toBe(
      "Extra Cheese",
    );
        expect(createPayment).toHaveBeenCalled();
    });

    test("commits a walk-in due sale without a customer", async () => {
    const created = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );

        expect(created.status).toBe("success");

    const committed = await billingService.commitSale(
      userId,
      organizationId,
      storeId,
      created.data?.sale.id!,
      {
            payments: [],
      },
    );

        expect(committed.status).toBe("success");
        expect(committed.data?.sale.status).toBe("completed");
        expect(committed.data?.sale.paymentStatus).toBe("pending");
        expect(committed.data?.sale.customer).toBeNull();
    });

    test("commits a walk-in partial sale without a customer", async () => {
    const created = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );

        expect(created.status).toBe("success");
        const grandTotal = Number(created.data?.sale.grandTotal);

    const committed = await billingService.commitSale(
      userId,
      organizationId,
      storeId,
      created.data?.sale.id!,
      {
            payments: [{ amount: grandTotal / 2, method: "cash" }],
      },
    );

        expect(committed.status).toBe("success");
        expect(committed.data?.sale.status).toBe("completed");
        expect(committed.data?.sale.paymentStatus).toBe("partial");
        expect(committed.data?.sale.customer).toBeNull();
    });

    test("blocks new configured selections after deactivation while preserving existing frozen lines", async () => {
    const created = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
      },
    );

        expect(created.status).toBe("success");
        const saleId = created.data?.sale.id!;

        getSelectableAttachmentSpy.mockResolvedValue(null);

    const updated = await billingService.updateDraftSale(
      userId,
      organizationId,
      storeId,
      saleId,
      {
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
      },
    );

        expect(updated.status).toBe("error");
        expect(updated.message).toContain("not selectable");
    });

    test("exposes nested add-ons in receipt-like bill detail output after commit", async () => {
    const created = await billingService.createDraftSale(
      userId,
      organizationId,
      storeId,
      {
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
      },
    );

        expect(created.status).toBe("success");
        const saleId = created.data?.sale.id!;
        const grandTotal = Number(created.data?.sale.grandTotal);

    const committed = await billingService.commitSale(
      userId,
      organizationId,
      storeId,
      saleId,
      {
            payments: [{ amount: grandTotal, method: "cash" }],
      },
    );

        expect(committed.status).toBe("success");
        const parent = committed.data?.sale.items[0];
        expect(parent?.productNameSnapshot).toBe("Burger");
        expect(
            parent?.addOns.map((addOn) => ({
                name: addOn.addOnNameSnapshot,
                quantityPerParent: addOn.quantityPerParent,
                lineTotal: addOn.lineTotal,
            })),
        ).toEqual(
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

    const response = await billingService.getAddOnSalesRollups(
      userId,
      organizationId,
      storeId,
    );

        expect(response.status).toBe("success");
        expect(response.data?.rollups.parentScoped).toEqual(parentScoped);
        expect(response.data?.rollups.addOnScoped).toEqual(addOnScoped);
    expect(getParentScopedAddOnSalesRollups).toHaveBeenCalledWith(
      organizationId,
      storeId,
    );
    expect(getAddOnScopedSalesRollups).toHaveBeenCalledWith(
      organizationId,
      storeId,
    );
    });
});
