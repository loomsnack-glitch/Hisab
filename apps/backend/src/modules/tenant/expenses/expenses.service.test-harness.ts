import { mock } from "bun:test";
import { resolveFeatureEntitlement } from "@/modules/tenant/commercial-licensing/feature-entitlement.test-harness";
import { isMoneyAccountTrackingActive } from "@/modules/tenant/test-support/money-account-tracking.test-harness";
import {
    createMoneyAccountMovementRepo,
    getMovementByOutgoingPaymentId,
    lockMoneyAccountById,
    lockPaymentRouteByStoreAndMethod,
    restoreCreateMoneyAccountMovementRepo,
} from "../purchases/purchases.service.test-harness";
import {
    getOrganizationByIdForUser,
    getStoreById,
    getStoresByOrganizationId,
} from "@/modules/tenant/test-support/organization-repository.test-harness";
import type {
    CreateExpenseREPO,
    CreateOutgoingPaymentREPO,
    ExpenseCategoryDTO,
    ExpenseDTO,
    MoneyAccountDTO,
    MoneyAccountMovementDTO,
    OutgoingPaymentDTO,
    UpdateExpenseREPO,
} from "@repo/types";

export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const expenseCategoryId = "11111111-1111-4111-8111-111111111111";
export const inactiveExpenseCategoryId = "22222222-2222-4222-8222-222222222222";
export const expenseId = "88888888-8888-4888-8888-888888888888";
export const now = new Date("2026-08-31T12:00:00.000Z");

export const organization = { id: organizationId, name: "Demo Org" };
export const store = { id: storeId, organizationId, name: "Adajan" };

export const rentCategory: ExpenseCategoryDTO = {
    id: expenseCategoryId,
    organizationId,
    name: "Rent",
    kind: "predefined",
    predefinedKey: "rent",
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const inactiveMarketingCategory: ExpenseCategoryDTO = {
    id: inactiveExpenseCategoryId,
    organizationId,
    name: "Marketing",
    kind: "predefined",
    predefinedKey: "marketing",
    status: "inactive",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const draftExpense: ExpenseDTO = {
    id: expenseId,
    organizationId,
    storeId,
    storeName: "Adajan",
    expenseCategoryId,
    expenseCategoryName: "Rent",
    lifecycle: "draft",
    payableStatus: null,
    effectiveDate: "2026-08-30",
    invoiceReference: "RENT-AUG",
    notes: "Shop rent for August",
    total: 25000,
    paidTotal: 0,
    dueAmount: null,
    recordedAt: null,
    voidedAt: null,
    voidReason: null,
    outgoingPayments: [],
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const recordedExpense: ExpenseDTO = {
    ...draftExpense,
    lifecycle: "recorded",
    payableStatus: "due",
    dueAmount: 25000,
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
    balance: 30000,
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
    balance: 50000,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

let storedExpense: ExpenseDTO | null = draftExpense;
let storedOutgoingPayments: OutgoingPaymentDTO[] = [];
let storedMovements: MoneyAccountMovementDTO[] = [];

export const resetStoredExpense = (expense: ExpenseDTO | null) => {
    storedExpense = expense
        ? { ...expense, outgoingPayments: [...expense.outgoingPayments] }
        : null;
    storedOutgoingPayments = expense ? [...expense.outgoingPayments] : [];
    storedMovements = [];
};

export {
    getOrganizationByIdForUser,
    getStoreById,
    getStoresByOrganizationId,
    resolveFeatureEntitlement,
    isMoneyAccountTrackingActive,
    createMoneyAccountMovementRepo,
    getMovementByOutgoingPaymentId,
    lockMoneyAccountById,
    lockPaymentRouteByStoreAndMethod,
    restoreCreateMoneyAccountMovementRepo,
};

export const getExpenseCategoryById = mock(async (_organizationId: string, id: string) => {
    if (id === inactiveExpenseCategoryId) return inactiveMarketingCategory;
    if (id === expenseCategoryId) return rentCategory;
    return null;
});
export const getExpensesByOrganizationId = mock(async () => [draftExpense]);
export const getExpenseById = mock(async (_organizationId: string, id: string) => {
    if (!storedExpense || storedExpense.id !== id) {
        return null;
    }
    return storedExpense;
});

export const createExpenseRepo = mock(async (data: CreateExpenseREPO) => {
    storedExpense = {
        ...draftExpense,
        ...data,
        storeName: store.name,
        outgoingPayments: [],
        updatedBy: data.updatedBy ?? null,
        createdAt: now,
        updatedAt: now,
    };
    return storedExpense;
});

export const updateExpenseRepo = mock(async (data: UpdateExpenseREPO) => {
    storedExpense = {
        ...(storedExpense ?? draftExpense),
        ...data,
        storeName: store.name,
        outgoingPayments: storedExpense?.outgoingPayments ?? storedOutgoingPayments,
        createdAt: storedExpense?.createdAt ?? now,
        updatedAt: now,
    };
    return storedExpense;
});

export const deleteExpenseRepo = mock(async () => {
    storedExpense = null;
    storedOutgoingPayments = [];
    return true;
});

export const lockExpenseById = mock(async (_organizationId: string, id: string) => {
    if (!storedExpense || storedExpense.id !== id) {
        return null;
    }
    return storedExpense;
});

export const createOutgoingPaymentRepo = mock(async (data: CreateOutgoingPaymentREPO) => {
    const payment: OutgoingPaymentDTO = {
        id: data.id,
        organizationId: data.organizationId,
        purchaseId: data.purchaseId,
        expenseId: data.expenseId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        moneyAccountId: data.moneyAccountId,
        moneyAccountName:
            data.moneyAccountId === cashMoneyAccountId
                ? adajanCashAccount.name
                : data.moneyAccountId === hdfcBankAccount.id
                  ? hdfcBankAccount.name
                  : null,
        reference: data.reference,
        notes: data.notes,
        paidAt: data.paidAt,
        reversedAt: data.reversedAt,
        reversalReason: data.reversalReason ?? null,
        reversalKind: data.reversalKind ?? null,
        createdBy: data.createdBy,
        createdAt: now,
    };
    storedOutgoingPayments = [...storedOutgoingPayments, payment];
    if (storedExpense) {
        storedExpense = {
            ...storedExpense,
            outgoingPayments: storedOutgoingPayments,
        };
    }
    return payment;
});

export const reverseOutgoingPaymentRepo = mock(
    async (data: {
        id: string;
        organizationId: string;
        reversedAt: Date;
        reversalReason: string;
        reversalKind: OutgoingPaymentDTO["reversalKind"];
    }) => {
        const index = storedOutgoingPayments.findIndex((payment) => payment.id === data.id);
        if (index < 0) {
            return storedOutgoingPayments.find((payment) => payment.id === data.id) ?? null;
        }
        const current = storedOutgoingPayments[index];
        if (!current) {
            return null;
        }
        if (current.reversedAt) {
            return current;
        }
        const reversed: OutgoingPaymentDTO = {
            ...current,
            reversedAt: data.reversedAt,
            reversalReason: data.reversalReason,
            reversalKind: data.reversalKind,
        };
        storedOutgoingPayments = storedOutgoingPayments.map((payment, paymentIndex) =>
            paymentIndex === index ? reversed : payment,
        );
        if (storedExpense) {
            storedExpense = {
                ...storedExpense,
                outgoingPayments: storedOutgoingPayments,
            };
        }
        return reversed;
    },
);

export const getOutgoingPaymentsByExpenseIds = mock(async () => storedOutgoingPayments);

export const begin = mock(async (callback: (tx: unknown) => Promise<unknown>) => callback({}));

mock.module("@/config/db", () => ({
    pg: { begin },
}));

mock.module("@/modules/tenant/expense-categories/expense-categories.repository", () => ({
    getExpenseCategoryById,
}));

mock.module("./expenses.repository", () => ({
    getExpensesByOrganizationId,
    getExpenseById,
    lockExpenseById,
    createExpense: createExpenseRepo,
    updateExpense: updateExpenseRepo,
    deleteExpense: deleteExpenseRepo,
}));

const purchasesHarness = await import("../purchases/purchases.service.test-harness");

const createOutgoingPayment = mock(async (data: CreateOutgoingPaymentREPO) => {
    if (data.expenseId != null) {
        return createOutgoingPaymentRepo(data);
    }
    return purchasesHarness.createOutgoingPaymentRepo(data);
});

const reverseOutgoingPayment = mock(
    async (data: {
        id: string;
        organizationId: string;
        reversedAt: Date;
        reversalReason: string;
        reversalKind: OutgoingPaymentDTO["reversalKind"];
    }) => {
        const expensePayment = storedOutgoingPayments.find((payment) => payment.id === data.id);
        if (expensePayment) {
            return reverseOutgoingPaymentRepo(data);
        }
        return purchasesHarness.reverseOutgoingPaymentRepo(data);
    },
);

const getOutgoingPaymentById = mock(async (_organizationId: string, id: string) => {
    const expensePayment = storedOutgoingPayments.find((payment) => payment.id === id);
    if (expensePayment) {
        return expensePayment;
    }

    const purchasePayments = await purchasesHarness.getOutgoingPaymentsByPurchaseIds(
        _organizationId,
        [],
    );
    return purchasePayments.find((payment) => payment.id === id) ?? null;
});

mock.module("@/modules/tenant/outgoing-payments/outgoing-payments.repository", () => ({
    createOutgoingPayment,
    reverseOutgoingPayment,
    getOutgoingPaymentsByPurchaseIds: purchasesHarness.getOutgoingPaymentsByPurchaseIds,
    getOutgoingPaymentsByExpenseIds,
    getOutgoingPaymentById,
}));

export const expensesService = await import("./expenses.service");
