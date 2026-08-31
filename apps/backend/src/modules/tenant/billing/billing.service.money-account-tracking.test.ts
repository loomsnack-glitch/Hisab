import {
    afterEach,
    beforeEach,
    describe,
    expect,
    mock,
    spyOn,
    test,
} from "bun:test";
import type {
    CommitSaleSVC,
    CompleteSaleSVC,
    CreateDraftSaleSVC,
    MoneyAccountDTO,
    MoneyAccountMovementDTO,
    MoneyAccountPaymentRouteDTO,
} from "@repo/types";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const cashAccountId = "55555555-5555-4555-8555-555555555555";
const bankAccountId = "11111111-1111-4111-8111-111111111111";
const upiAccountId = "33333333-3333-4333-8333-333333333333";
const now = new Date("2026-08-31T12:00:00.000Z");

const organization = { id: organizationId, name: "Demo Org" };
const store = {
    id: storeId,
    organizationId,
    name: "Adajan",
    kotSystemEnabled: false,
    tableManagementEnabled: false,
    moneyAccountTrackingEnabled: true,
};

const product = {
    id: productId,
    organizationId,
    categoryId: "22222222-2222-4222-8222-222222222222",
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

const cashAccount: MoneyAccountDTO = {
    id: cashAccountId,
    organizationId,
    name: "Adajan cash",
    type: "cash",
    scope: "store_scoped",
    storeId,
    notes: null,
    status: "active",
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const hdfcBankAccount: MoneyAccountDTO = {
    id: bankAccountId,
    organizationId,
    name: "HDFC Current",
    type: "bank",
    scope: "organization_wide",
    storeId: null,
    notes: null,
    status: "active",
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const sharedUpiAccount: MoneyAccountDTO = {
    ...hdfcBankAccount,
    id: upiAccountId,
    name: "Shared UPI QR",
    type: "upi",
};

const upiRoute: MoneyAccountPaymentRouteDTO = {
    id: "12121212-1212-4121-8121-121212121212",
    organizationId,
    storeId,
    paymentMethod: "upi",
    moneyAccountId: bankAccountId,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const cardRoute: MoneyAccountPaymentRouteDTO = {
    ...upiRoute,
    id: "13131313-1313-4131-8131-131313131313",
    paymentMethod: "card",
};

const createdSales: Array<Record<string, unknown>> = [];
const createdSaleItems: Array<Record<string, unknown>> = [];
const createdPayments: Array<Record<string, unknown>> = [];
const createdMovements: Array<Record<string, unknown>> = [];

const snapshotState = () => ({
    sales: createdSales.map((row) => ({ ...row })),
    items: createdSaleItems.map((row) => ({ ...row })),
    payments: createdPayments.map((row) => ({ ...row })),
    movements: createdMovements.map((row) => ({ ...row })),
});

const restoreState = (snapshot: ReturnType<typeof snapshotState>) => {
    createdSales.splice(0, createdSales.length, ...snapshot.sales);
    createdSaleItems.splice(0, createdSaleItems.length, ...snapshot.items);
    createdPayments.splice(0, createdPayments.length, ...snapshot.payments);
    createdMovements.splice(0, createdMovements.length, ...snapshot.movements);
};

const createSale = mock(async (data: Record<string, unknown>) => {
    const sale = {
        ...data,
        saleNumber: data.saleNumber ?? null,
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
        committedAt: data.committedAt ?? null,
        voidedAt: null,
        voidReason: null,
    };
    createdSales.push(sale);
    return sale;
});

const createSaleItem = mock(async (data: Record<string, unknown>) => {
    const item = { ...data, addOns: [], bundleComponents: [], createdAt: now, updatedAt: now };
    createdSaleItems.push(item);
    return item;
});

const paidTotalForSale = (saleId: string) =>
    createdPayments
        .filter((payment) => payment.saleId === saleId)
        .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

const getSaleById = mock(async (_organizationId: string, _storeId: string, saleId: string) => {
    const sale = createdSales.find((row) => row.id === saleId);
    if (!sale) {
        return null;
    }
    const paidTotal = paidTotalForSale(saleId);
    return {
        ...sale,
        paidTotal,
        dueTotal: Math.max(Number(sale.grandTotal ?? 0) - paidTotal, 0),
        itemCount: createdSaleItems.filter((item) => item.saleId === saleId).length,
        itemsSummary: "Burger",
    };
});

const getSaleItemsBySaleId = mock(async (saleId: string) =>
    createdSaleItems
        .filter((item) => item.saleId === saleId)
        .map((item) => ({ ...item, addOns: [], bundleComponents: [] })),
);

const getPaymentsBySaleId = mock(async (saleId: string) =>
    createdPayments.filter((payment) => payment.saleId === saleId),
);

const getSaleIdByCompletionRequestId = mock(
    async (_organizationId: string, _storeId: string, requestId: string) =>
        (createdSales.find((sale) => sale.completionRequestId === requestId)?.id as string | undefined) ??
        null,
);

const updateSale = mock(async (data: Record<string, unknown>) => {
    const index = createdSales.findIndex((row) => row.id === data.id);
    if (index < 0) {
        return null;
    }
    createdSales[index] = { ...createdSales[index], ...data, updatedAt: now };
    return createdSales[index];
});

const createPayment = mock(async (data: Record<string, unknown>) => {
    const payment = { ...data, createdAt: now, updatedAt: now };
    createdPayments.push(payment);
    return payment;
});

const lockDraftSale = mock(async () => true);
const lockCommittedSale = mock(async () => true);
const allocateSaleNumber = mock(async () => ({
    saleNumber: "1",
    saleSequenceNumber: 1,
    salePeriodKey: "continuous",
    tokenNumber: "1",
    tokenSequenceNumber: 1,
    tokenPeriodKey: "daily",
}));

const isMoneyAccountTrackingAvailable = mock(async () => true);
const noAddOns: Array<{ addOnId: string; quantity: number }> = [];

const lockActiveStoreCashAccount = mock(async (): Promise<MoneyAccountDTO | null> => cashAccount);
const lockPaymentRouteByStoreAndMethod = mock(
    async (
        _organizationId: string,
        _storeId: string,
        paymentMethod: "upi" | "card",
    ): Promise<MoneyAccountPaymentRouteDTO | null> => {
        if (paymentMethod === "upi") {
            return upiRoute;
        }
        if (paymentMethod === "card") {
            return cardRoute;
        }
        return null;
    },
);
const lockMoneyAccountById = mock(async (_organizationId: string, moneyAccountId: string) => {
    if (moneyAccountId === cashAccountId) {
        return cashAccount;
    }
    if (moneyAccountId === upiAccountId) {
        return sharedUpiAccount;
    }
    return hdfcBankAccount;
});
const createMoneyAccountMovement = mock(
    async (data: Record<string, unknown>): Promise<MoneyAccountMovementDTO> => {
        const movement = {
            id: crypto.randomUUID(),
            ...data,
            createdAt: now,
        } as MoneyAccountMovementDTO;
        createdMovements.push(movement);
        return movement;
    },
);
const getMovementByPaymentId = mock(async (_organizationId: string, paymentId: string) =>
    (createdMovements.find((movement) => movement.paymentId === paymentId) as
        | MoneyAccountMovementDTO
        | undefined) ?? null,
);

mock.module("@/config/db", () => ({
    pg: {
        begin: async <T>(callback: (tx: unknown) => Promise<T>) => {
            const snapshot = snapshotState();
            try {
                return await callback({});
            } catch (error) {
                restoreState(snapshot);
                throw error;
            }
        },
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
    createSaleItemAddOn: mock(async () => null),
    createSaleItemBundleComponent: mock(async () => null),
    createSaleItemBundleComponentAddOn: mock(async () => null),
    getSaleById,
    getSaleItemsBySaleId,
    getPaymentsBySaleId,
    getSaleIdByCompletionRequestId,
    deleteSaleItemsBySaleId: mock(async () => undefined),
    deleteDraftSale: mock(async () => true),
    updateSale,
    getCustomerById: mock(async () => null),
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
    createCustomerLedgerEntry: mock(async () => null),
    updateCustomerBalance: mock(async () => null),
    lockDraftSale,
    lockCommittedSale,
    allocateSaleNumber,
    getParentScopedAddOnSalesRollups: mock(async () => []),
    getAddOnScopedSalesRollups: mock(async () => []),
}));

mock.module("@/modules/tenant/table-service/table-service.repository", () => ({
    lockServiceTableForSale: mock(async () => null),
    markReadyDraftAsEngaged: mock(async () => false),
    setCommittedSaleTableState: mock(async () => null),
    getServiceTableById: mock(async () => null),
}));

mock.module("./billing-kot-read", () => ({
    getKotNumbersBySaleId: mock(async () => []),
    getKotsBySaleId: mock(async () => []),
}));

mock.module("./billing-kot-write", () => ({
    getStandaloneKotByGenerationRequestIdForActor: mock(async () => null),
    prepareStandaloneKotBatchForActor: mock(async () => ({
        status: "error",
        message: "not used",
        data: null,
        code: 400,
    })),
    persistPreparedStandaloneKotBatch: mock(async () => undefined),
}));

mock.module("@/modules/tenant/money-accounts/money-account-tracking-availability", () => ({
    isMoneyAccountTrackingAvailable,
}));

mock.module("@/modules/tenant/money-accounts/money-accounts.repository", () => ({
    lockActiveStoreCashAccount,
    lockPaymentRouteByStoreAndMethod,
    lockMoneyAccountById,
    createMoneyAccountMovement,
    getMovementByPaymentId,
}));

const catalogRepository = await import("@/modules/tenant/catalog/catalog.repository");
const billingService = await import("./billing.service");

const completeSalePayload = (overrides: Partial<CompleteSaleSVC> = {}): CompleteSaleSVC => ({
    requestId: crypto.randomUUID(),
    serviceMode: "dine_in",
    generateKot: false,
    items: [{ productId, quantity: 1, addOns: noAddOns }],
    payments: [{ amount: 90, method: "cash" }],
    ...overrides,
});

describe("Atomic POS Payment Money Account Tracking", () => {
    let getProductByIdSpy: ReturnType<typeof spyOn>;
    let getSelectableAttachmentSpy: ReturnType<typeof spyOn>;
    let getComboChoiceGroupsSpy: ReturnType<typeof spyOn>;
    let getComboChoiceOptionsSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        createdSales.length = 0;
        createdSaleItems.length = 0;
        createdPayments.length = 0;
        createdMovements.length = 0;
        store.moneyAccountTrackingEnabled = true;
        isMoneyAccountTrackingAvailable.mockClear();
        isMoneyAccountTrackingAvailable.mockResolvedValue(true);
        lockActiveStoreCashAccount.mockClear();
        lockActiveStoreCashAccount.mockResolvedValue(cashAccount);
        lockPaymentRouteByStoreAndMethod.mockClear();
        lockPaymentRouteByStoreAndMethod.mockImplementation(
            async (_organizationId, _storeId, paymentMethod: "upi" | "card") => {
                if (paymentMethod === "upi") {
                    return upiRoute;
                }
                if (paymentMethod === "card") {
                    return cardRoute;
                }
                return null;
            },
        );
        lockMoneyAccountById.mockClear();
        lockMoneyAccountById.mockImplementation(async (_organizationId, moneyAccountId: string) => {
            if (moneyAccountId === cashAccountId) {
                return cashAccount;
            }
            if (moneyAccountId === upiAccountId) {
                return sharedUpiAccount;
            }
            return hdfcBankAccount;
        });
        createMoneyAccountMovement.mockClear();
        createMoneyAccountMovement.mockImplementation(async (data: Record<string, unknown>) => {
            const movement = {
                id: crypto.randomUUID(),
                ...data,
                createdAt: now,
            } as MoneyAccountMovementDTO;
            createdMovements.push(movement);
            return movement;
        });
        getMovementByPaymentId.mockClear();
        createSale.mockClear();
        createSaleItem.mockClear();
        getSaleById.mockClear();
        getSaleItemsBySaleId.mockClear();
        getPaymentsBySaleId.mockClear();
        getSaleIdByCompletionRequestId.mockClear();
        updateSale.mockClear();
        createPayment.mockClear();
        lockDraftSale.mockClear();
        lockDraftSale.mockResolvedValue(true);
        lockCommittedSale.mockClear();
        lockCommittedSale.mockResolvedValue(true);
        allocateSaleNumber.mockClear();

        getProductByIdSpy = spyOn(catalogRepository, "getProductById").mockResolvedValue(product as never);
        getSelectableAttachmentSpy = spyOn(
            catalogRepository,
            "getSelectableProductAddOnAttachmentByProductAndAddOn",
        ).mockResolvedValue(null as never);
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

    test("checkout of a Cash Payment creates one linked Movement on the Store Cash Account", async () => {
        const response = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload(),
        );

        expect(response.status).toBe("success");
        expect(createdPayments).toHaveLength(1);
        expect(createdMovements).toHaveLength(1);
        expect(createdMovements[0]?.paymentId).toBe(createdPayments[0]?.id);
        expect(createdMovements[0]?.moneyAccountId).toBe(cashAccountId);
        expect(createdMovements[0]?.amount).toBe(90);
        expect(createdMovements[0]?.sourceKind).toBe("pos_payment");
        expect(createdMovements[0]?.storeId).toBe(storeId);
        expect(lockActiveStoreCashAccount).toHaveBeenCalled();
        expect(lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("partial checkout of a UPI Payment creates one linked Movement on the routed account", async () => {
        const response = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload({
                payments: [{ amount: 40, method: "upi" }],
            }),
        );

        expect(response.status).toBe("success");
        expect(response.data?.sale.paymentStatus).toBe("partial");
        expect(createdPayments).toHaveLength(1);
        expect(createdMovements).toHaveLength(1);
        expect(createdMovements[0]?.paymentId).toBe(createdPayments[0]?.id);
        expect(createdMovements[0]?.moneyAccountId).toBe(bankAccountId);
        expect(createdMovements[0]?.amount).toBe(40);
        expect(lockPaymentRouteByStoreAndMethod).toHaveBeenCalledWith(
            organizationId,
            storeId,
            "upi",
            expect.anything(),
        );
    });

    test("later Card collection creates one linked Movement on the routed account", async () => {
        const checkout = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload({ payments: [] }),
        );
        expect(checkout.status).toBe("success");
        expect(createdMovements).toHaveLength(0);

        const collected = await billingService.collectPayment(
            userId,
            organizationId,
            storeId,
            checkout.data?.sale.id as string,
            { amount: 90, method: "card" },
        );

        expect(collected.status).toBe("success");
        expect(collected.data?.sale.paymentStatus).toBe("paid");
        expect(createdPayments).toHaveLength(1);
        expect(createdMovements).toHaveLength(1);
        expect(createdMovements[0]?.paymentId).toBe(createdPayments[0]?.id);
        expect(createdMovements[0]?.moneyAccountId).toBe(bankAccountId);
        expect(createdMovements[0]?.amount).toBe(90);
    });

    test("rejects later Cash collection when the Store has no active Cash Account", async () => {
        const checkout = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload({ payments: [] }),
        );
        expect(checkout.status).toBe("success");
        lockActiveStoreCashAccount.mockResolvedValue(null);

        const collected = await billingService.collectPayment(
            userId,
            organizationId,
            storeId,
            checkout.data?.sale.id as string,
            { amount: 90, method: "cash" },
        );

        expect(collected.status).toBe("error");
        expect(collected.code).toBe(400);
        expect(collected.message).toContain("Cash");
        expect(collected.message).toContain("Cash Money Account");
        expect(createdPayments).toHaveLength(0);
        expect(createdMovements).toHaveLength(0);
    });

    test("committing a draft with a Cash Payment creates one linked Movement", async () => {
        const draft = await billingService.createDraftSale(userId, organizationId, storeId, {
            items: [{ productId, quantity: 1, addOns: noAddOns }],
            generateKot: false,
            serviceMode: "dine_in",
        } satisfies CreateDraftSaleSVC);
        expect(draft.status).toBe("success");

        const committed = await billingService.commitSale(
            userId,
            organizationId,
            storeId,
            draft.data?.sale.id as string,
            { payments: [{ amount: 90, method: "cash" }], generateKot: false } satisfies CommitSaleSVC,
        );

        expect(committed.status).toBe("success");
        expect(createdPayments).toHaveLength(1);
        expect(createdMovements).toHaveLength(1);
        expect(createdMovements[0]?.paymentId).toBe(createdPayments[0]?.id);
        expect(createdMovements[0]?.moneyAccountId).toBe(cashAccountId);
    });

    test("UPI and Card Payments can post immediately to the same Money Account", async () => {
        lockPaymentRouteByStoreAndMethod.mockImplementation(
            async (_organizationId, _storeId, paymentMethod: "upi" | "card") => ({
                ...(paymentMethod === "upi" ? upiRoute : cardRoute),
                moneyAccountId: bankAccountId,
            }),
        );

        const response = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload({
                payments: [
                    { amount: 40, method: "upi" },
                    { amount: 50, method: "card" },
                ],
            }),
        );

        expect(response.status).toBe("success");
        expect(createdPayments).toHaveLength(2);
        expect(createdMovements).toHaveLength(2);
        expect(createdMovements.map((movement) => movement.moneyAccountId)).toEqual([
            bankAccountId,
            bankAccountId,
        ]);
        expect(new Set(createdMovements.map((movement) => movement.paymentId)).size).toBe(2);
    });

    test("rejects a Cash Payment when the Store has no active Cash Account and creates neither Payment nor Movement", async () => {
        lockActiveStoreCashAccount.mockResolvedValue(null);

        const response = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload(),
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("Cash");
        expect(response.message).toContain("Cash Money Account");
        expect(createdPayments).toHaveLength(0);
        expect(createdMovements).toHaveLength(0);
        expect(createdSales).toHaveLength(0);
    });

    test("rejects only the selected UPI method when its route is missing", async () => {
        lockPaymentRouteByStoreAndMethod.mockImplementation(
            async (_organizationId, _storeId, paymentMethod: "upi" | "card") =>
                paymentMethod === "card" ? cardRoute : null,
        );

        const response = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload({
                payments: [{ amount: 90, method: "upi" }],
            }),
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("UPI");
        expect(response.message).not.toContain("Card");
        expect(createdPayments).toHaveLength(0);
        expect(createdMovements).toHaveLength(0);
    });

    test("rejects only the selected Card method when its routed account is inactive", async () => {
        lockMoneyAccountById.mockImplementation(async (_organizationId, moneyAccountId: string) => {
            if (moneyAccountId === bankAccountId) {
                return { ...hdfcBankAccount, status: "inactive" as const };
            }
            return hdfcBankAccount;
        });

        const response = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload({
                payments: [{ amount: 90, method: "card" }],
            }),
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toContain("Card");
        expect(response.message).toMatch(/inactive|not available/i);
        expect(createdPayments).toHaveLength(0);
        expect(createdMovements).toHaveLength(0);
    });

    test("Bank Transfer and Other Payments stay untracked even when tracking is active", async () => {
        lockActiveStoreCashAccount.mockResolvedValue(null);
        lockPaymentRouteByStoreAndMethod.mockResolvedValue(null);

        const bankTransfer = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload({
                requestId: crypto.randomUUID(),
                payments: [{ amount: 90, method: "bank_transfer" }],
            }),
        );
        const other = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload({
                requestId: crypto.randomUUID(),
                payments: [{ amount: 90, method: "other" }],
            }),
        );

        expect(bankTransfer.status).toBe("success");
        expect(other.status).toBe("success");
        expect(createdPayments).toHaveLength(2);
        expect(createdMovements).toHaveLength(0);
        expect(lockActiveStoreCashAccount).not.toHaveBeenCalled();
        expect(lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("tracks only Cash when a checkout mixes Cash with Bank Transfer", async () => {
        const response = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload({
                payments: [
                    { amount: 40, method: "cash" },
                    { amount: 50, method: "bank_transfer" },
                ],
            }),
        );

        expect(response.status).toBe("success");
        expect(createdPayments).toHaveLength(2);
        expect(createdMovements).toHaveLength(1);
        expect(createdMovements[0]?.moneyAccountId).toBe(cashAccountId);
        expect(createdPayments.some((payment) => payment.method === "bank_transfer")).toBe(true);
    });

    test("disabled tracking keeps current POS behavior and creates no Movements", async () => {
        store.moneyAccountTrackingEnabled = false;
        lockActiveStoreCashAccount.mockResolvedValue(null);

        const response = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload(),
        );

        expect(response.status).toBe("success");
        expect(createdPayments).toHaveLength(1);
        expect(createdPayments[0]?.method).toBe("cash");
        expect(createdMovements).toHaveLength(0);
        expect(lockActiveStoreCashAccount).not.toHaveBeenCalled();
    });

    test("unavailable tracking keeps current POS behavior and creates no Movements", async () => {
        isMoneyAccountTrackingAvailable.mockResolvedValue(false);
        lockActiveStoreCashAccount.mockResolvedValue(null);

        const response = await billingService.completeSale(
            userId,
            organizationId,
            storeId,
            completeSalePayload(),
        );

        expect(response.status).toBe("success");
        expect(createdPayments).toHaveLength(1);
        expect(createdMovements).toHaveLength(0);
        expect(lockActiveStoreCashAccount).not.toHaveBeenCalled();
    });

    test("retried checkout requests create one Payment and one Movement", async () => {
        const payload = completeSalePayload({
            requestId: "77777777-7777-4777-8777-777777777777",
        });

        const first = await billingService.completeSale(userId, organizationId, storeId, payload);
        const second = await billingService.completeSale(userId, organizationId, storeId, payload);

        expect(first.status).toBe("success");
        expect(second.status).toBe("success");
        expect(first.data?.sale.id).toBe(second.data?.sale.id);
        expect(createdPayments).toHaveLength(1);
        expect(createdMovements).toHaveLength(1);
        expect(createPayment).toHaveBeenCalledTimes(1);
        expect(createMoneyAccountMovement).toHaveBeenCalledTimes(1);
    });

    test("rolls back the Payment when Movement persistence fails", async () => {
        createMoneyAccountMovement.mockImplementation(async () => {
            throw new Error("movement write failed");
        });

        await expect(
            billingService.completeSale(userId, organizationId, storeId, completeSalePayload()),
        ).rejects.toThrow("movement write failed");

        expect(createdPayments).toHaveLength(0);
        expect(createdMovements).toHaveLength(0);
        expect(createdSales).toHaveLength(0);
    });
});
