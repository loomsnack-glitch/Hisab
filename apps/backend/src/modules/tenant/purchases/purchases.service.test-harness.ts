import { mock } from "bun:test";
import type {
    CreateOutgoingPaymentREPO,
    CreatePurchaseLineREPO,
    CreatePurchaseREPO,
    MoneyAccountDTO,
    MoneyAccountMovementDTO,
    OutgoingPaymentDTO,
    PurchaseDTO,
    PurchaseLineDTO,
    UnitDTO,
    UpdatePurchaseREPO,
    VendorDTO,
    VendorItemDTO,
} from "@repo/types";

export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const vendorId = "11111111-1111-4111-8111-111111111111";
export const inactiveVendorId = "22222222-2222-4222-8222-222222222222";
export const unitId = "33333333-3333-4333-8333-333333333333";
export const vendorItemId = "44444444-4444-4444-8444-444444444444";
export const millersTomatoItemId = "66666666-6666-4666-8666-666666666666";
export const onionItemId = "77777777-7777-4777-8777-777777777777";
export const purchaseId = "88888888-8888-4888-8888-888888888888";
export const lineId = "99999999-9999-4999-8999-999999999999";
export const now = new Date("2026-08-31T12:00:00.000Z");

export const organization = { id: organizationId, name: "Demo Org" };
export const store = { id: storeId, organizationId, name: "Adajan" };

export const kilogramUnit: UnitDTO = {
    id: unitId,
    organizationId,
    name: "kilogram",
    label: "kg",
    kind: "predefined",
    predefinedKey: "kilogram",
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const freshFarmsVendor: VendorDTO = {
    id: vendorId,
    organizationId,
    name: "Fresh Farms",
    description: "Daily produce supplier",
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const millersVendor: VendorDTO = {
    id: inactiveVendorId,
    organizationId,
    name: "Miller Spices",
    description: null,
    status: "inactive",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const tomatoItem: VendorItemDTO = {
    id: vendorItemId,
    organizationId,
    vendorId,
    name: "Tomato",
    unitId,
    defaultPurchasePrice: 40.5,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const millersTomatoItem: VendorItemDTO = {
    id: millersTomatoItemId,
    organizationId,
    vendorId: inactiveVendorId,
    name: "Tomato",
    unitId,
    defaultPurchasePrice: 55,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const onionItem: VendorItemDTO = {
    id: onionItemId,
    organizationId,
    vendorId,
    name: "Onion",
    unitId,
    defaultPurchasePrice: 20,
    status: "inactive",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const tomatoLine: PurchaseLineDTO = {
    id: lineId,
    organizationId,
    purchaseId,
    vendorItemId,
    vendorItemName: "Tomato",
    unitId,
    unitLabel: "kg",
    quantity: 2,
    agreedUnitPrice: 40.5,
    lineTotal: 81,
};

export const draftPurchase: PurchaseDTO = {
    id: purchaseId,
    organizationId,
    storeId,
    storeName: "Adajan",
    vendorId,
    vendorName: "Fresh Farms",
    lifecycle: "draft",
    payableStatus: null,
    effectiveDate: "2026-08-30",
    invoiceReference: "INV-104",
    notes: "Weekly produce",
    adjustment: 25.5,
    linesTotal: 81,
    total: 106.5,
    paidTotal: 0,
    dueAmount: null,
    recordedAt: null,
    lines: [tomatoLine],
    outgoingPayments: [],
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const recordedPurchase: PurchaseDTO = {
    ...draftPurchase,
    lifecycle: "recorded",
    payableStatus: "due",
    dueAmount: 106.5,
    recordedAt: now,
};

export const cashMoneyAccountId = "55555555-5555-4555-8555-555555555555";
export const outgoingPaymentId = "12121212-1212-4121-8121-121212121212";

export const adajanCashAccount: MoneyAccountDTO = {
    id: cashMoneyAccountId,
    organizationId,
    name: "Adajan till",
    type: "cash",
    scope: "store_scoped",
    storeId,
    notes: null,
    status: "active",
    openingBalance: 200,
    balance: 200,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const hdfcBankAccount: MoneyAccountDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "HDFC Current",
    type: "bank",
    scope: "organization_wide",
    storeId: null,
    notes: null,
    status: "active",
    openingBalance: 500,
    balance: 500,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

let storedPurchase: PurchaseDTO | null = draftPurchase;
let storedOutgoingPayments: OutgoingPaymentDTO[] = [];

export const resetStoredPurchase = (purchase: PurchaseDTO | null) => {
    storedPurchase = purchase
        ? { ...purchase, lines: [...purchase.lines], outgoingPayments: [...purchase.outgoingPayments] }
        : null;
    storedOutgoingPayments = purchase ? [...purchase.outgoingPayments] : [];
};

export const getOrganizationByIdForUser = mock(
    async (): Promise<{ id: string; name: string } | null> => organization,
);
export const getStoreById = mock(
    async (): Promise<{ id: string; organizationId: string; name: string } | null> => store,
);
export const getVendorById = mock(async (_organizationId: string, id: string) => {
    if (id === inactiveVendorId) return millersVendor;
    if (id === vendorId) return freshFarmsVendor;
    return null;
});
export const getVendorItemById = mock(async (_organizationId: string, id: string) => {
    if (id === millersTomatoItemId) return millersTomatoItem;
    if (id === onionItemId) return onionItem;
    if (id === vendorItemId) return tomatoItem;
    return null;
});
export const getUnitById = mock(async () => kilogramUnit);
export const getPurchasesByOrganizationId = mock(async () => [draftPurchase]);
export const getPurchaseById = mock(async (_organizationId: string, id: string) => {
    if (!storedPurchase || storedPurchase.id !== id) {
        return null;
    }
    return storedPurchase;
});

export const createPurchaseRepo = mock(async (data: CreatePurchaseREPO) => {
    storedPurchase = {
        ...draftPurchase,
        ...data,
        storeName: store.name,
        lines: [],
        outgoingPayments: [],
        updatedBy: data.updatedBy ?? null,
        createdAt: now,
        updatedAt: now,
    };
    return storedPurchase;
});

export const updatePurchaseRepo = mock(async (data: UpdatePurchaseREPO) => {
    storedPurchase = {
        ...(storedPurchase ?? draftPurchase),
        ...data,
        storeName: store.name,
        lines: storedPurchase?.lines ?? [],
        outgoingPayments: storedPurchase?.outgoingPayments ?? storedOutgoingPayments,
        createdAt: storedPurchase?.createdAt ?? now,
        updatedAt: now,
    };
    return storedPurchase;
});

export const replacePurchaseLinesRepo = mock(
    async (_organizationId: string, nextPurchaseId: string, lines: CreatePurchaseLineREPO[]) => {
        const mapped = lines.map((line) => ({
            ...line,
            purchaseId: nextPurchaseId,
        }));
        if (storedPurchase) {
            storedPurchase = { ...storedPurchase, lines: mapped };
        }
        return mapped;
    },
);

export const lockPurchaseById = mock(async (_organizationId: string, id: string) => {
    if (!storedPurchase || storedPurchase.id !== id) {
        return null;
    }
    return storedPurchase;
});

export const isMoneyAccountTrackingActive = mock(async () => false);
export const lockMoneyAccountById = mock(async () => adajanCashAccount);
export const createMoneyAccountMovementRepo = mock(
    async (): Promise<MoneyAccountMovementDTO | null> => null,
);
export const lockPaymentRouteByStoreAndMethod = mock(async () => null);

export const createOutgoingPaymentRepo = mock(async (data: CreateOutgoingPaymentREPO) => {
    const payment: OutgoingPaymentDTO = {
        id: data.id,
        organizationId: data.organizationId,
        purchaseId: data.purchaseId,
        expenseId: data.expenseId ?? null,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        moneyAccountId: data.moneyAccountId,
        moneyAccountName: data.moneyAccountId === cashMoneyAccountId ? adajanCashAccount.name : data.moneyAccountId === hdfcBankAccount.id ? hdfcBankAccount.name : null,
        reference: data.reference,
        notes: data.notes,
        paidAt: data.paidAt,
        reversedAt: data.reversedAt,
        createdBy: data.createdBy,
        createdAt: now,
    };
    storedOutgoingPayments = [...storedOutgoingPayments, payment];
    if (storedPurchase) {
        storedPurchase = {
            ...storedPurchase,
            outgoingPayments: storedOutgoingPayments,
        };
    }
    return payment;
});

export const getOutgoingPaymentsByPurchaseIds = mock(async () => storedOutgoingPayments);

export const deletePurchaseRepo = mock(async () => {
    storedPurchase = null;
    storedOutgoingPayments = [];
    return true;
});

export const begin = mock(async (callback: (tx: unknown) => Promise<unknown>) => callback({}));

mock.module("@/config/db", () => ({
    pg: { begin },
}));

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
    getStoreById,
}));

mock.module("@/modules/tenant/units/units.repository", () => ({
    getUnitById,
}));

mock.module("@/modules/tenant/vendors/vendors.repository", () => ({
    getVendorById,
    getVendorItemById,
}));

mock.module("./purchases.repository", () => ({
    getPurchasesByOrganizationId,
    getPurchaseById,
    lockPurchaseById,
    createPurchase: createPurchaseRepo,
    updatePurchase: updatePurchaseRepo,
    replacePurchaseLines: replacePurchaseLinesRepo,
    deletePurchase: deletePurchaseRepo,
}));

mock.module("@/modules/tenant/outgoing-payments/outgoing-payments.repository", () => ({
    createOutgoingPayment: createOutgoingPaymentRepo,
    getOutgoingPaymentsByPurchaseIds,
    getOutgoingPaymentById: mock(async () => storedOutgoingPayments[0] ?? null),
}));

mock.module("@/modules/tenant/money-accounts/money-account-tracking", () => ({
    isMoneyAccountTrackingActive,
}));

mock.module("@/modules/tenant/money-accounts/money-accounts.repository", () => ({
    lockMoneyAccountById,
    createMoneyAccountMovement: createMoneyAccountMovementRepo,
    lockPaymentRouteByStoreAndMethod,
}));

export const purchasesService = await import("./purchases.service");
