import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import type { CreateTableKotSVC, DeviceSessionDTO } from "@repo/types";

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
    tableManagementEnabled: true,
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
const createdTableOrders: Array<Record<string, unknown>> = [];
const tableId = "99999999-9999-4999-8999-999999999999";
let serviceTable = {
    id: tableId,
    organizationId,
    storeId,
    serviceAreaId: null,
    tableLabel: "A1",
    capacity: 4,
    state: "allocated" as const,
    currentSaleId: null as string | null,
    currentTableOrderId: null as string | null,
    currentSaleTotal: null as number | null,
    createdBy: userId,
    updatedBy: null as string | null,
    createdAt: now,
    updatedAt: now,
};

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

const getSaleById = mock(
  async (_organizationId: string, _storeId: string, saleId: string) => {
    const sale = createdSales.find((row) => row.id === saleId);
    if (!sale) return null;
    return {
        ...sale,
      itemCount: createdSaleItems.filter((item) => item.saleId === saleId)
        .length,
        itemsSummary: "Burger",
    };
  },
);

const getSaleItemsBySaleId = mock(async (saleId: string) =>
    createdSaleItems
        .filter((item) => item.saleId === saleId)
        .map((item) => ({
            ...item,
      addOns: createdSaleItemAddOns.filter(
        (addOnRow) => addOnRow.saleItemId === item.id,
      ),
            bundleComponents: [],
        })),
);

const getPaymentsBySaleId = mock(async (saleId: string) =>
    createdPayments.filter((payment) => payment.saleId === saleId),
);
const getSaleIdByCompletionRequestId = mock(
    async (_organizationId: string, _storeId: string, requestId: string) =>
    (createdSales.find((sale) => sale.completionRequestId === requestId)?.id as
      string | undefined) ?? null,
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

const getKotBySaleId = mock(
  async (_organizationId: string, _storeId: string, saleId: string) =>
    createdKots
      .filter((kot) => kot.saleId === saleId)
      .sort(
        (left, right) =>
          Number(left.saleBatchSequence ?? Number.MAX_SAFE_INTEGER) -
          Number(right.saleBatchSequence ?? Number.MAX_SAFE_INTEGER),
      )[0] ?? null,
);
const getKotsBySaleId = mock(
  async (_organizationId: string, _storeId: string, saleId: string) =>
    createdKots
      .filter((kot) => kot.saleId === saleId)
      .sort(
        (left, right) =>
          Number(left.saleBatchSequence ?? Number.MAX_SAFE_INTEGER) -
          Number(right.saleBatchSequence ?? Number.MAX_SAFE_INTEGER),
      ),
);
const allocateSaleBatchSequence = mock(
  async (_organizationId: string, _storeId: string, saleId: string) => {
    const existing = createdKots.filter(
      (kot) => kot.saleId === saleId && kot.kotType === "parcel",
    );
    return existing.length + 1;
  },
);
const getKotById = mock(
  async (_organizationId: string, _storeId: string, kotId: string) =>
    createdKots.find((kot) => kot.id === kotId) ?? null,
);
let tableKotLookupBarrier: {
  arrivals: number;
  promise: Promise<void>;
  release: () => void;
} | null = null;
const armTableKotLookupBarrier = () => {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  tableKotLookupBarrier = { arrivals: 0, promise, release };
};
const getKotByGenerationRequestId = mock(
  async (
    _organizationId: string,
    _storeId: string,
    generationRequestId: string,
  ) => {
    const barrier = tableKotLookupBarrier;
    if (barrier) {
      barrier.arrivals += 1;
      if (barrier.arrivals === 2) {
        barrier.release();
      }
      await barrier.promise;
    }
    return (
      createdKots.find(
        (kot) => kot.generationRequestId === generationRequestId,
      ) ?? null
    );
  },
);
const createKot = mock(async (data: Record<string, unknown>) => {
  if (
    data.generationRequestId &&
    createdKots.some(
      (kot) => kot.generationRequestId === data.generationRequestId,
    )
  ) {
    throw Object.assign(new Error("duplicate KOT generation request"), {
      code: "23505",
    });
  }
  const kot = {
    ...data,
    createdAt: now,
    updatedAt: now,
    items: data.items ?? [],
  };
    createdKots.push(kot);
    return kot;
});
const remainingTotals = (kots: Array<Record<string, unknown>>) => {
    const remainingSubtotal = kots.reduce((sum, kot) => {
    const items =
      (kot.items as Array<{
        lineSubtotal?: number;
        addOns?: Array<{ lineSubtotal?: number }>;
      }>) ?? [];
        return (
            sum +
            items.reduce(
                (itemSum, item) =>
                    itemSum +
                    Number(item.lineSubtotal ?? 0) +
          (item.addOns ?? []).reduce(
            (addOnSum, addOn) => addOnSum + Number(addOn.lineSubtotal ?? 0),
            0,
          ),
                0,
            )
        );
    }, 0);
    const remainingDiscountTotal = kots.reduce((sum, kot) => {
    const items =
      (kot.items as Array<{
        discountAmount?: number;
        addOns?: Array<{ discountAmount?: number }>;
      }>) ?? [];
        return (
            sum +
            items.reduce(
                (itemSum, item) =>
                    itemSum +
                    Number(item.discountAmount ?? 0) +
          (item.addOns ?? []).reduce(
            (addOnSum, addOn) => addOnSum + Number(addOn.discountAmount ?? 0),
            0,
          ),
                0,
            )
        );
    }, 0);
    return {
        remainingSubtotal,
        remainingDiscountTotal,
        remainingGrandTotal: remainingSubtotal - remainingDiscountTotal,
    };
};
const hydrateTableOrder = (order: Record<string, unknown>) => {
    const kots = createdKots.filter((kot) => kot.tableOrderId === order.id);
    return { ...order, kots, ...remainingTotals(kots) };
};
const createTableOrder = mock(async (data: Record<string, unknown>) => {
  const order = {
    ...data,
    saleId: null,
    notes: data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
    createdTableOrders.push(order);
    return hydrateTableOrder(order);
});
const getTableOrderById = mock(
  async (_organizationId: string, _storeId: string, tableOrderId: string) => {
    const order = createdTableOrders.find((row) => row.id === tableOrderId);
    return order ? hydrateTableOrder(order) : null;
  },
);
const lockActiveTableOrderForTable = mock(
  async (
    _organizationId: string,
    _storeId: string,
    requestedTableId: string,
  ) => {
    const order = createdTableOrders.find(
      (row) =>
        row.serviceTableId === requestedTableId && row.status === "active",
    );
    return order ? hydrateTableOrder(order) : null;
  },
);
const updateTableOrderCustomer = mock(
    async (
        _organizationId: string,
        _storeId: string,
        tableOrderId: string,
        customerId: string | null,
        notes: string | null | undefined,
    ) => {
        const order = createdTableOrders.find((row) => row.id === tableOrderId);
        if (!order) return null;
        order.customerId = customerId;
        if (notes !== undefined) order.notes = notes;
        return hydrateTableOrder(order);
    },
);
const markTableOrderCheckedOut = mock(
  async (
    _organizationId: string,
    _storeId: string,
    tableOrderId: string,
    saleId: string,
  ) => {
        const order = createdTableOrders.find((row) => row.id === tableOrderId);
        if (!order) return null;
        order.status = "checked_out";
        order.saleId = saleId;
        return hydrateTableOrder(order);
    },
);
const discardTableOrder = mock(
  async (_organizationId: string, _storeId: string, tableOrderId: string) => {
    const order = createdTableOrders.find((row) => row.id === tableOrderId);
    if (!order || order.status !== "active") return false;
    order.status = "discarded";
    return true;
  },
);
const linkKotsToSale = mock(
  async (
    _organizationId: string,
    _storeId: string,
    tableOrderId: string,
    saleId: string,
  ) => {
    for (const kot of createdKots.filter(
      (row) => row.tableOrderId === tableOrderId,
    )) {
        kot.saleId = saleId;
    }
  },
);
const replaceKotItems = mock(async (kotId: string, items: unknown[]) => {
    const kot = createdKots.find((row) => row.id === kotId);
    if (!kot) return null;
    kot.items = items;
    return kot;
});
const lockServiceTableForDevice = mock(async () => ({ ...serviceTable }));
const getServiceTableById = mock(async () => ({ ...serviceTable }));
const attachTableOrder = mock(
  async (_o: string, _s: string, _t: string, tableOrderId: string) => {
    serviceTable = {
        ...serviceTable,
        state: "engaged",
        currentTableOrderId: tableOrderId,
        currentSaleId: null,
        currentSaleTotal: 0,
    };
    return { ...serviceTable };
  },
);
const clearTableOrder = mock(async () => {
    serviceTable = {
        ...serviceTable,
        state: "free",
        currentTableOrderId: null,
        currentSaleId: null,
        currentSaleTotal: null,
    };
    return { ...serviceTable };
});
const attachCheckedOutSale = mock(
    async (
        _o: string,
        _s: string,
        _t: string,
        _tableOrderId: string,
        saleId: string,
        state: "payment_due" | "paid",
    ) => {
        serviceTable = {
            ...serviceTable,
            state,
            currentSaleId: saleId,
            currentTableOrderId: null,
            currentSaleTotal: 90,
        };
        return { ...serviceTable };
    },
);

let kotSystemEnabled = true;
let tableManagementEnabled = true;
const getStoreById = mock(
  async (requestedOrganizationId: string, requestedStoreId: string) => {
    if (
      requestedOrganizationId !== organizationId ||
      requestedStoreId !== storeId
    ) {
        return null;
    }
    return { ...store, kotSystemEnabled, tableManagementEnabled };
  },
);

mock.module("@/config/db", () => ({
    pg: {
    begin: async <T>(callback: (tx: unknown) => Promise<T>) => {
      const salesSnapshot = structuredClone(createdSales);
      const saleItemsSnapshot = structuredClone(createdSaleItems);
      const kotsSnapshot = structuredClone(createdKots);
      try {
        return await callback({});
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: unknown }).code === "23505"
        ) {
          throw error;
        }
        createdSales.splice(0, createdSales.length, ...salesSnapshot);
        createdSaleItems.splice(
          0,
          createdSaleItems.length,
          ...saleItemsSnapshot,
        );
        createdKots.splice(0, createdKots.length, ...kotsSnapshot);
        throw error;
      }
    },
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
  createSaleItemBundleComponent: mock(
    async (data: Record<string, unknown>) => ({
        ...data,
        addOns: [],
        createdAt: now,
        updatedAt: now,
    }),
  ),
  createSaleItemBundleComponentAddOn: mock(
    async (data: Record<string, unknown>) => ({
        ...data,
        createdAt: now,
        updatedAt: now,
    }),
  ),
    getSaleById,
    getSaleItemsBySaleId,
    getPaymentsBySaleId,
    getSaleIdByCompletionRequestId,
    deleteSaleItemsBySaleId: mock(async () => undefined),
    deleteDraftSale: mock(async () => false),
    updateSale,
    getCustomerById: mock(async () => null),
    createPayment,
  createCustomerLedgerEntry: mock(
    async (data: Record<string, unknown>) => data,
  ),
    updateCustomerBalance: mock(async () => null),
    lockDraftSale: mock(async () => true),
    lockCommittedSale: mock(async () => true),
    allocateSaleNumber,
}));

mock.module("@/modules/tenant/table-service/table-service.repository", () => ({
    lockServiceTableForSale: mock(async () => null),
    lockServiceTableForDevice,
    getServiceTableById,
    attachTableOrder,
    clearTableOrder,
    attachCheckedOutSale,
    markReadyDraftAsEngaged: mock(async () => false),
    setCommittedSaleTableState: mock(async () => null),
    syncCommittedSalePaymentState: mock(async () => null),
}));

mock.module("./kot.repository", () => ({
    allocateKotNumber,
    createKot,
    getKotBySaleId,
    getKotById,
  getKotByGenerationRequestId,
    getKotNumbersBySaleId: mock(
        async (_organizationId: string, _storeId: string, saleId: string) =>
            createdKots
                .filter((kot) => kot.saleId === saleId)
        .sort(
          (left, right) =>
            Number(left.saleBatchSequence ?? Number.MAX_SAFE_INTEGER) -
            Number(right.saleBatchSequence ?? Number.MAX_SAFE_INTEGER),
        )
                .map((kot) => String(kot.kotNumber)),
    ),
  getKotsBySaleId,
  allocateSaleBatchSequence,
    createTableOrder,
    getTableOrderById,
    lockActiveTableOrderForTable,
    updateTableOrderCustomer,
    markTableOrderCheckedOut,
    discardTableOrder,
    linkKotsToSale,
    replaceKotItems,
  getKotsByTableOrderId: mock(
    async (_organizationId: string, _storeId: string, tableOrderId: string) =>
        createdKots.filter((kot) => kot.tableOrderId === tableOrderId),
    ),
}));

const catalogRepository =
  await import("@/modules/tenant/catalog/catalog.repository");
const billingService = await import("@/modules/tenant/billing/billing.service");
const kotService = await import("./kot.service");

const createTableKot = (
  session: DeviceSessionDTO,
  tableId: string,
  data: Omit<CreateTableKotSVC, "requestId"> & { requestId?: string },
) =>
  kotService.createTableKotForDevice(session, tableId, {
    requestId: data.requestId ?? crypto.randomUUID(),
    ...data,
  });

describe("Table Order KOT workflow", () => {
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
    tableKotLookupBarrier = null;
        createdTableOrders.length = 0;
        saleSequence = 0;
        kotSequence = 0;
        kotSystemEnabled = true;
        tableManagementEnabled = true;
        serviceTable = {
            ...serviceTable,
            state: "allocated",
            currentSaleId: null,
            currentTableOrderId: null,
            currentSaleTotal: null,
        };
        createSale.mockClear();
        createKot.mockClear();
        allocateKotNumber.mockClear();
        createTableOrder.mockClear();

    getProductByIdSpy = spyOn(
      catalogRepository,
      "getProductById",
    ).mockResolvedValue(product as never);
        getSelectableAttachmentSpy = spyOn(
            catalogRepository,
            "getSelectableProductAddOnAttachmentByProductAndAddOn",
        ).mockResolvedValue(selectableAttachment as never);
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

    test("starts one Active Table Order without a Customer or Draft Sale", async () => {
    const response = await kotService.startActiveTableOrderForDevice(
      deviceSession,
      tableId,
    );

        expect(response.status).toBe("success");
        expect(response.data?.sale ?? null).toBe(null);
        expect(response.data?.tableOrder?.status).toBe("active");
        expect(response.data?.tableOrder?.customerId ?? null).toBe(null);
        expect(response.data?.tableOrder?.serviceTableId).toBe(tableId);
        expect(response.data?.table.state).toBe("engaged");
    expect(response.data?.table.currentTableOrderId).toBe(
      response.data?.tableOrder?.id,
    );
        expect(createSale).not.toHaveBeenCalled();
    });

    test("rejects a second Active Table Order on the same Service Table", async () => {
        await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
    const second = await kotService.startActiveTableOrderForDevice(
      deviceSession,
      tableId,
    );

        expect(second.status).toBe("error");
        expect(second.code).toBe(409);
        expect(createTableOrder).toHaveBeenCalledTimes(1);
    });

  test("requires a generation request id at the service boundary", async () => {
    await kotService.startActiveTableOrderForDevice(deviceSession, tableId);

    const response = await kotService.createTableKotForDevice(
      deviceSession,
      tableId,
      {
        items: [{ productId, quantity: 1, addOns: [] }],
      } as CreateTableKotSVC,
    );

    expect(response.status).toBe("error");
    expect(response.code).toBe(400);
    expect(response.message).toContain("request id");
    expect(createKot).not.toHaveBeenCalled();
  });

    test("requires both the KOT System and Table Management to generate a Table KOT", async () => {
        await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
        tableManagementEnabled = false;

    const response = await createTableKot(
      deviceSession,
      tableId,
      {
            items: [{ productId, quantity: 1, addOns: [] }],
      },
    );

        expect(response.status).toBe("error");
        expect(response.code).toBe(403);
        expect(response.message).toContain("Table Management");
        expect(createKot).not.toHaveBeenCalled();
    });

    test("generates the first Table KOT with a Store-local KOT Number and trusted snapshots", async () => {
        await kotService.startActiveTableOrderForDevice(deviceSession, tableId);

    const response = await createTableKot(
      deviceSession,
      tableId,
      {
            items: [{ productId, quantity: 1, addOns: [{ addOnId, quantity: 1 }] }],
      },
    );

        expect(response.status).toBe("success");
        expect(response.data?.tableOrder?.kots).toHaveLength(1);
        expect(response.data?.tableOrder?.kots[0]?.kotType).toBe("table");
    expect(response.data?.tableOrder?.kots[0]?.fulfillmentType).toBe("dine_in");
    expect(response.data?.tableOrder?.kots[0]?.saleBatchSequence ?? null).toBe(
      null,
    );
        expect(response.data?.tableOrder?.kots[0]?.kotNumber).toBe("KOT-001");
        expect(response.data?.tableOrder?.kots[0]?.saleId ?? null).toBe(null);
    expect(
      response.data?.tableOrder?.kots[0]?.items[0]?.unitPriceSnapshot,
    ).toBe(100);
    expect(
      response.data?.tableOrder?.kots[0]?.items[0]?.addOns[0]
        ?.unitPriceSnapshot,
    ).toBe(20);
        expect(response.data?.table.state).toBe("engaged");
        expect(createSale).not.toHaveBeenCalled();
    });

  test("returns one Table KOT when a generation request is retried concurrently", async () => {
    await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
    const payload = {
      requestId: "19191919-1919-4191-8191-191919191919",
      items: [{ productId, quantity: 1, addOns: [] }],
    };
    armTableKotLookupBarrier();

    const [first, second] = await Promise.all([
      createTableKot(deviceSession, tableId, payload),
      createTableKot(deviceSession, tableId, payload),
    ]);
    const retried = await createTableKot(
      deviceSession,
      tableId,
      payload,
    );

    expect(first.status).toBe("success");
    expect(second.status).toBe("success");
    expect(retried.status).toBe("success");
    expect(createdKots).toHaveLength(1);
    expect(first.data?.tableOrder?.kots[0]?.id).toBe(
      second.data?.tableOrder?.kots[0]?.id,
    );
    expect(retried.data?.tableOrder?.kots[0]?.id).toBe(
      first.data?.tableOrder?.kots[0]?.id,
    );
  });

    test("lets another same-Store device continue the Active Table Order", async () => {
        await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
        await createTableKot(deviceSession, tableId, {
            items: [{ productId, quantity: 1, addOns: [] }],
        });

        const otherDevice = {
            ...deviceSession,
      device: {
        ...deviceSession.device,
        id: "18181818-1818-4181-8181-181818181818",
        name: "Floor",
      },
        } satisfies DeviceSessionDTO;

    const response = await kotService.getActiveTableOrderForDevice(
      otherDevice,
      tableId,
    );

        expect(response.status).toBe("success");
        expect(response.data?.tableOrder?.kots).toHaveLength(1);
        expect(response.data?.tableOrder?.kots[0]?.kotNumber).toBe("KOT-001");
        expect(response.data?.sale ?? null).toBe(null);
    });

    test("checks out one table-linked Sale from remaining KOT snapshots without repricing", async () => {
        await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
        await createTableKot(deviceSession, tableId, {
            items: [{ productId, quantity: 1, addOns: [] }],
        });
    getProductByIdSpy.mockResolvedValue({
      ...product,
      price: 500,
      discount: 0,
    } as never);

    const response = await kotService.checkoutTableOrderForDevice(
      deviceSession,
      tableId,
      {
            requestId: "91919191-9191-4919-8919-919191919191",
            payments: [],
      },
    );

        expect(response.status).toBe("success");
        expect(response.data?.sale?.status).toBe("completed");
        expect(response.data?.sale?.paymentStatus).toBe("pending");
        expect(response.data?.sale?.serviceTableId).toBe(tableId);
        expect(response.data?.sale?.items[0]?.unitPriceSnapshot).toBe(100);
        expect(response.data?.sale?.grandTotal).toBe(90);
        expect(response.data?.table.state).toBe("payment_due");
        expect(response.data?.table.currentSaleId).toBe(response.data?.sale?.id);
        expect(response.data?.tableOrder?.status).toBe("checked_out");
    });

    test("preserves paid table-release after a fully paid table checkout", async () => {
        await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
        await createTableKot(deviceSession, tableId, {
            items: [{ productId, quantity: 1, addOns: [] }],
        });

    const response = await kotService.checkoutTableOrderForDevice(
      deviceSession,
      tableId,
      {
            requestId: "92929292-9292-4929-8929-929292929292",
            payments: [{ amount: 90, method: "cash" }],
      },
    );

        expect(response.status).toBe("success");
        expect(response.data?.sale?.paymentStatus).toBe("paid");
        expect(response.data?.table.state).toBe("paid");
        expect(createdPayments).toHaveLength(1);
    });

    test("edits a selected KOT so a removed item is excluded from the final Sale", async () => {
        const misalId = "12121212-1212-4121-8121-121212121212";
    getProductByIdSpy.mockImplementation(
      async (_organizationId: string, requestedProductId: string) => {
            if (requestedProductId === misalId) {
          return {
            ...product,
            id: misalId,
            name: "Misal Pav",
            price: 80,
            discount: 0,
          };
            }
            return { ...product, name: "Pav Bhaji" };
      },
    );

        await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
        await createTableKot(deviceSession, tableId, {
            items: [{ productId, quantity: 1, addOns: [] }],
        });
        const kotId = createdKots[0]?.id as string;

    const edited = await kotService.updateTableKotForDevice(
      deviceSession,
      tableId,
      kotId,
      {
            items: [{ productId: misalId, quantity: 1, addOns: [] }],
      },
    );

        expect(edited.status).toBe("success");
        expect(edited.data?.tableOrder?.kots[0]?.items).toHaveLength(1);
    expect(
      edited.data?.tableOrder?.kots[0]?.items[0]?.productNameSnapshot,
    ).toBe("Misal Pav");

    const checkedOut = await kotService.checkoutTableOrderForDevice(
      deviceSession,
      tableId,
      {
            requestId: "93939393-9393-4939-8939-939393939393",
            payments: [],
      },
    );

        expect(checkedOut.data?.sale?.items).toHaveLength(1);
    expect(checkedOut.data?.sale?.items[0]?.productNameSnapshot).toBe(
      "Misal Pav",
    );
        expect(checkedOut.data?.sale?.items[0]?.unitPriceSnapshot).toBe(80);
        expect(checkedOut.data?.sale?.grandTotal).toBe(80);
    });

    test("creates a later Table KOT and aggregates remaining snapshot items into one Sale", async () => {
        const misalId = "13131313-1313-4131-8131-131313131313";
    getProductByIdSpy.mockImplementation(
      async (_organizationId: string, requestedProductId: string) => {
            if (requestedProductId === misalId) {
          return {
            ...product,
            id: misalId,
            name: "Misal Pav",
            price: 80,
            discount: 0,
          };
            }
            return product;
      },
    );

        await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
        await createTableKot(deviceSession, tableId, {
            items: [{ productId, quantity: 1, addOns: [] }],
        });
    const second = await createTableKot(
      deviceSession,
      tableId,
      {
            items: [{ productId: misalId, quantity: 1, addOns: [] }],
      },
    );

        expect(second.data?.tableOrder?.kots).toHaveLength(2);
        expect(second.data?.tableOrder?.kots[0]?.kotNumber).toBe("KOT-001");
        expect(second.data?.tableOrder?.kots[1]?.kotNumber).toBe("KOT-002");
    expect(
      second.data?.tableOrder?.kots[1]?.items[0]?.productNameSnapshot,
    ).toBe("Misal Pav");

    getProductByIdSpy.mockResolvedValue({
      ...product,
      price: 500,
      discount: 0,
    } as never);

    const checkedOut = await kotService.checkoutTableOrderForDevice(
      deviceSession,
      tableId,
      {
            requestId: "94949494-9494-4949-8949-949494949494",
            payments: [],
      },
    );

        expect(checkedOut.data?.sale?.items).toHaveLength(2);
    expect(
      checkedOut.data?.sale?.items.map((item) => item.unitPriceSnapshot),
    ).toEqual([100, 80]);
        expect(checkedOut.data?.sale?.grandTotal).toBe(170);
        expect(createdSales).toHaveLength(1);
    });

    test("merges same product and configuration across KOTs and lists all KOT Numbers on the Sale", async () => {
        await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
        await createTableKot(deviceSession, tableId, {
            items: [{ productId, quantity: 2, addOns: [] }],
        });
        await createTableKot(deviceSession, tableId, {
            items: [{ productId, quantity: 3, addOns: [] }],
        });

    const checkedOut = await kotService.checkoutTableOrderForDevice(
      deviceSession,
      tableId,
      {
            requestId: "95959595-9595-4959-8959-959595959595",
            payments: [],
      },
    );

        expect(checkedOut.status).toBe("success");
        expect(checkedOut.data?.sale?.items).toHaveLength(1);
        expect(checkedOut.data?.sale?.items[0]?.productId).toBe(productId);
        expect(checkedOut.data?.sale?.items[0]?.quantity).toBe(5);
        expect(checkedOut.data?.sale?.items[0]?.lineTotal).toBe(450);
        expect(checkedOut.data?.sale?.grandTotal).toBe(450);
        expect(checkedOut.data?.sale?.kotNumbers).toEqual(["KOT-001", "KOT-002"]);
    });

    test("keeps the same product on separate Sale lines when configurations differ", async () => {
        await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
        await createTableKot(deviceSession, tableId, {
            items: [{ productId, quantity: 1, addOns: [] }],
        });
        await createTableKot(deviceSession, tableId, {
            items: [
                {
                    productId,
                    quantity: 1,
                    addOns: [{ addOnId, quantity: 1 }],
                },
            ],
        });

    const checkedOut = await kotService.checkoutTableOrderForDevice(
      deviceSession,
      tableId,
      {
            requestId: "96969696-9696-4969-8969-969696969696",
            payments: [],
      },
    );

        expect(checkedOut.status).toBe("success");
        expect(checkedOut.data?.sale?.items).toHaveLength(2);
    expect(checkedOut.data?.sale?.items.map((item) => item.quantity)).toEqual([
      1, 1,
    ]);
        expect(checkedOut.data?.sale?.kotNumbers).toEqual(["KOT-001", "KOT-002"]);
    });

  test("stores pick-up fulfillment on a table-linked KOT without changing the table order", async () => {
    await kotService.startActiveTableOrderForDevice(deviceSession, tableId);

    const response = await createTableKot(
      deviceSession,
      tableId,
      {
        items: [{ productId, quantity: 1, addOns: [] }],
        fulfillmentType: "pick_up",
      },
    );

    expect(response.status).toBe("success");
    expect(response.data?.tableOrder?.kots[0]?.kotType).toBe("table");
    expect(response.data?.tableOrder?.kots[0]?.fulfillmentType).toBe("pick_up");
    expect(response.data?.tableOrder?.kots[0]?.saleBatchSequence ?? null).toBe(
      null,
    );
  });

  test("keeps mixed dine-in and pick-up table KOTs on one sequence with their own labels", async () => {
    await kotService.startActiveTableOrderForDevice(deviceSession, tableId);

    const dineIn = await createTableKot(
      deviceSession,
      tableId,
      {
        items: [{ productId, quantity: 1, addOns: [] }],
        fulfillmentType: "dine_in",
      },
    );
    const pickUp = await createTableKot(
      deviceSession,
      tableId,
      {
        items: [{ productId, quantity: 1, addOns: [] }],
        fulfillmentType: "pick_up",
      },
    );

    expect(dineIn.data?.tableOrder?.kots[0]?.kotNumber).toBe("KOT-001");
    expect(dineIn.data?.tableOrder?.kots[0]?.fulfillmentType).toBe("dine_in");
    expect(pickUp.data?.tableOrder?.kots).toHaveLength(2);
    expect(pickUp.data?.tableOrder?.kots[1]?.kotNumber).toBe("KOT-002");
    expect(pickUp.data?.tableOrder?.kots[1]?.fulfillmentType).toBe("pick_up");
  });

  test("checks out mixed-fulfillment table KOTs into one dine-in Table-Linked Sale", async () => {
    await kotService.startActiveTableOrderForDevice(deviceSession, tableId);
    await createTableKot(deviceSession, tableId, {
      items: [{ productId, quantity: 1, addOns: [] }],
      fulfillmentType: "dine_in",
    });
    await createTableKot(deviceSession, tableId, {
      items: [{ productId, quantity: 1, addOns: [] }],
      fulfillmentType: "pick_up",
    });

    kotSystemEnabled = false;
    tableManagementEnabled = false;

    const checkedOut = await kotService.checkoutTableOrderForDevice(
      deviceSession,
      tableId,
      {
        requestId: "97979797-9797-4979-8979-979797979797",
        payments: [],
      },
    );

    expect(checkedOut.status).toBe("success");
    expect(checkedOut.data?.sale?.serviceMode).toBe("dine_in");
    expect(checkedOut.data?.sale?.items).toHaveLength(1);
    expect(checkedOut.data?.sale?.items[0]?.quantity).toBe(2);
    expect(checkedOut.data?.sale?.kotNumbers).toEqual(["KOT-001", "KOT-002"]);
    expect(
      checkedOut.data?.tableOrder?.kots.map((kot) => kot.fulfillmentType),
    ).toEqual(["dine_in", "pick_up"]);
    expect(createKot).toHaveBeenCalledTimes(2);
  });

  test("rejects final table checkout when no KOT batches exist", async () => {
    await kotService.startActiveTableOrderForDevice(deviceSession, tableId);

    const checkedOut = await kotService.checkoutTableOrderForDevice(
      deviceSession,
      tableId,
      {
        requestId: "98989898-9898-4989-8989-989898989898",
        payments: [],
      },
    );

    expect(checkedOut.status).toBe("error");
    expect(checkedOut.code).toBe(400);
    expect(checkedOut.message).toContain("billable item");
    expect(createSale).not.toHaveBeenCalled();
    expect(createKot).not.toHaveBeenCalled();
  });
});

describe("KOT fulfillment and standalone batches", () => {
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
    createdTableOrders.length = 0;
    saleSequence = 0;
    kotSequence = 0;
    kotSystemEnabled = true;
    tableManagementEnabled = true;
    createSale.mockClear();
    createKot.mockClear();
    allocateKotNumber.mockClear();
    allocateSaleBatchSequence.mockClear();
    getKotsBySaleId.mockClear();
    replaceKotItems.mockClear();

    getProductByIdSpy = spyOn(
      catalogRepository,
      "getProductById",
    ).mockResolvedValue(product as never);
    getSelectableAttachmentSpy = spyOn(
      catalogRepository,
      "getSelectableProductAddOnAttachmentByProductAndAddOn",
    ).mockResolvedValue(selectableAttachment as never);
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

  test("keeps multiple ordered standalone KOT batches on one Sale", async () => {
    const saleId = "abababab-abab-4aba-8aba-abababababab";
    createdSales.push({
      id: saleId,
      organizationId,
      storeId,
      status: "draft",
      paymentStatus: "pending",
      grandTotal: 90,
      serviceTableId: null,
      committedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await createKot({
      id: "11111111-1111-4111-8111-111111111111",
      organizationId,
      storeId,
      saleId,
      kotType: "parcel",
      fulfillmentType: "pick_up",
      saleBatchSequence: 1,
      kotNumber: "KOT-001",
      kotSequenceNumber: 1,
      kotPeriodKey: "20260821",
      items: [],
    });
    await createKot({
      id: "22222222-2222-4222-8222-222222222222",
      organizationId,
      storeId,
      saleId,
      kotType: "parcel",
      fulfillmentType: "dine_in",
      saleBatchSequence: 2,
      kotNumber: "KOT-002",
      kotSequenceNumber: 2,
      kotPeriodKey: "20260821",
      items: [],
    });

    const batches = await getKotsBySaleId(organizationId, storeId, saleId);

    expect(batches).toHaveLength(2);
    expect(batches[0]?.saleBatchSequence).toBe(1);
    expect(batches[0]?.fulfillmentType).toBe("pick_up");
    expect(batches[1]?.saleBatchSequence).toBe(2);
    expect(batches[1]?.fulfillmentType).toBe("dine_in");
    expect(
      await allocateSaleBatchSequence(organizationId, storeId, saleId),
    ).toBe(3);
  });

  test("generates dine-in and pick-up fulfillment on standalone batches", async () => {
    const saleId = "abababab-abab-4aba-8aba-abababababab";
    createdSales.push({
      id: saleId,
      organizationId,
      storeId,
      status: "draft",
      paymentStatus: "pending",
      grandTotal: 90,
      serviceTableId: null,
      committedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const dineIn = await kotService.generateStandaloneKotBatchForActor({
      organizationId,
      storeId,
      deviceId,
      saleId,
      batchItems: [{ productId, quantity: 1, addOns: [] }],
      serviceMode: "dine_in",
    });
    const pickUp = await kotService.generateStandaloneKotBatchForActor({
      organizationId,
      storeId,
      deviceId,
      saleId,
      batchItems: [{ productId, quantity: 2, addOns: [] }],
      serviceMode: "pick_up",
    });

    expect(dineIn.status).toBe("success");
    expect(pickUp.status).toBe("success");
    expect(createdKots[0]?.fulfillmentType).toBe("dine_in");
    expect(createdKots[0]?.saleBatchSequence).toBe(1);
    expect(createdKots[1]?.fulfillmentType).toBe("pick_up");
    expect(createdKots[1]?.saleBatchSequence).toBe(2);
    expect(createdKots[1]?.items[0]?.quantity).toBe(2);
  });

  test("edits a selected standalone KOT only while its Sale is a draft", async () => {
    const saleId = "abababab-abab-4aba-8aba-abababababab";
    createdSales.push({
      id: saleId,
      organizationId,
      storeId,
      status: "draft",
      paymentStatus: "pending",
      grandTotal: 90,
      serviceTableId: null,
      committedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await kotService.generateStandaloneKotBatchForActor({
      organizationId,
      storeId,
      deviceId,
      saleId,
      batchItems: [{ productId, quantity: 1, addOns: [] }],
      serviceMode: "dine_in",
    });
    const kotId = String(createdKots[0]?.id);

    const response = await kotService.updateStandaloneKotForDevice(
      deviceSession,
      saleId,
      kotId,
      {
        items: [{ productId, quantity: 2, addOns: [] }],
        sale: { items: [{ productId, quantity: 2, addOns: [] }] },
      },
    );

    expect(response.status).toBe("success");
    expect(response.data?.sale.items[0]?.quantity).toBe(2);
    expect(replaceKotItems).toHaveBeenCalledTimes(1);
    expect(replaceKotItems.mock.calls[0]?.[3]).toBe(
      updateSale.mock.calls.at(-1)?.[1],
    );
  });

  test("rolls back the Draft Sale when standalone KOT editing fails", async () => {
    const saleId = "abababab-abab-4aba-8aba-abababababab";
    createdSales.push({
      id: saleId,
      organizationId,
      storeId,
      status: "draft",
      paymentStatus: "pending",
      grandTotal: 90,
      serviceTableId: null,
      committedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await kotService.generateStandaloneKotBatchForActor({
      organizationId,
      storeId,
      deviceId,
      saleId,
      batchItems: [{ productId, quantity: 1, addOns: [] }],
      serviceMode: "dine_in",
    });
    const kotId = String(createdKots[0]?.id);
    replaceKotItems.mockImplementationOnce(async () => {
      throw new Error("simulated KOT write failure");
    });

    await expect(
      kotService.updateStandaloneKotForDevice(deviceSession, saleId, kotId, {
        items: [{ productId, quantity: 2, addOns: [] }],
        sale: { items: [{ productId, quantity: 2, addOns: [] }] },
      }),
    ).rejects.toThrow("simulated KOT write failure");

    expect(createdSaleItems).toHaveLength(0);
    expect(createdKots[0]?.items[0]?.quantity).toBe(1);
  });
});
