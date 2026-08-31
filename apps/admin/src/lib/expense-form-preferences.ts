import { OUTGOING_PAYMENT_METHODS, type OutgoingPaymentMethod } from "@repo/types";

export type ExpenseSettlementMode = "full" | "partial" | "due";

export type ExpenseFormPreferences = {
    storeId?: string;
    settlementMode?: ExpenseSettlementMode;
    paymentMethod?: OutgoingPaymentMethod;
    moneyAccountId?: string | null;
};

const EXPENSE_SETTLEMENT_MODES = ["full", "partial", "due"] as const;

export const EXPENSE_FORM_PREFERENCES_STORAGE_PREFIX = "hisab_expense_form_prefs_";

const storageKey = (organizationId: string) => `${EXPENSE_FORM_PREFERENCES_STORAGE_PREFIX}${organizationId}`;

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isSettlementMode = (value: string): value is ExpenseSettlementMode =>
    EXPENSE_SETTLEMENT_MODES.includes(value as ExpenseSettlementMode);

const isOutgoingPaymentMethod = (value: string): value is OutgoingPaymentMethod =>
    (OUTGOING_PAYMENT_METHODS as readonly string[]).includes(value);

const normalizeExpenseFormPreferences = (
    preferences: ExpenseFormPreferences | null | undefined,
): ExpenseFormPreferences | null => {
    if (!preferences || typeof preferences !== "object") {
        return null;
    }

    const normalized: ExpenseFormPreferences = {};

    if (typeof preferences.storeId === "string" && isUuid(preferences.storeId)) {
        normalized.storeId = preferences.storeId;
    }
    if (typeof preferences.settlementMode === "string" && isSettlementMode(preferences.settlementMode)) {
        normalized.settlementMode = preferences.settlementMode;
    }
    if (typeof preferences.paymentMethod === "string" && isOutgoingPaymentMethod(preferences.paymentMethod)) {
        normalized.paymentMethod = preferences.paymentMethod;
    }
    if (preferences.moneyAccountId === null) {
        normalized.moneyAccountId = null;
    } else if (typeof preferences.moneyAccountId === "string" && isUuid(preferences.moneyAccountId)) {
        normalized.moneyAccountId = preferences.moneyAccountId;
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
};

export const readExpenseFormPreferences = (
    organizationId: string,
): ExpenseFormPreferences | null => {
    if (typeof window === "undefined" || !organizationId) {
        return null;
    }

    const key = storageKey(organizationId);

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw || raw === "undefined" || raw === "null") {
            if (raw === "undefined" || raw === "null") {
                window.localStorage.removeItem(key);
            }
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<ExpenseFormPreferences>;
        return normalizeExpenseFormPreferences(parsed);
    } catch {
        window.localStorage.removeItem(key);
        return null;
    }
};

export const writeExpenseFormPreferences = (
    organizationId: string,
    preferences: ExpenseFormPreferences | null | undefined,
) => {
    if (typeof window === "undefined" || !organizationId) {
        return;
    }

    const normalized = normalizeExpenseFormPreferences(preferences);
    if (!normalized) {
        return;
    }

    try {
        window.localStorage.setItem(storageKey(organizationId), JSON.stringify(normalized));
    } catch {
        // Local storage may be unavailable; the current form state still works.
    }
};

export const clearExpenseFormPreferences = (organizationId?: string) => {
    if (typeof window === "undefined") {
        return;
    }

    if (organizationId) {
        window.localStorage.removeItem(storageKey(organizationId));
        return;
    }

    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith(EXPENSE_FORM_PREFERENCES_STORAGE_PREFIX)) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach((key) => {
        window.localStorage.removeItem(key);
    });
};
