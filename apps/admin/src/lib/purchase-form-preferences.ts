import { OUTGOING_PAYMENT_METHODS, type OutgoingPaymentMethod } from "@repo/types";

export type PurchaseSettlementMode = "full" | "partial" | "due";

export type PurchaseFormPreferences = {
    storeId?: string;
    settlementMode?: PurchaseSettlementMode;
    paymentMethod?: OutgoingPaymentMethod;
    moneyAccountId?: string | null;
};

const PURCHASE_SETTLEMENT_MODES = ["full", "partial", "due"] as const;

export const PURCHASE_FORM_PREFERENCES_STORAGE_PREFIX = "hisab_purchase_form_prefs_";

const storageKey = (organizationId: string) => `${PURCHASE_FORM_PREFERENCES_STORAGE_PREFIX}${organizationId}`;

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isSettlementMode = (value: string): value is PurchaseSettlementMode =>
    PURCHASE_SETTLEMENT_MODES.includes(value as PurchaseSettlementMode);

const isOutgoingPaymentMethod = (value: string): value is OutgoingPaymentMethod =>
    (OUTGOING_PAYMENT_METHODS as readonly string[]).includes(value);

const normalizePurchaseFormPreferences = (
    preferences: PurchaseFormPreferences | null | undefined,
): PurchaseFormPreferences | null => {
    if (!preferences || typeof preferences !== "object") {
        return null;
    }

    const normalized: PurchaseFormPreferences = {};

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

export const readPurchaseFormPreferences = (
    organizationId: string,
): PurchaseFormPreferences | null => {
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

        const parsed = JSON.parse(raw) as Partial<PurchaseFormPreferences>;
        return normalizePurchaseFormPreferences(parsed);
    } catch {
        window.localStorage.removeItem(key);
        return null;
    }
};

export const writePurchaseFormPreferences = (
    organizationId: string,
    preferences: PurchaseFormPreferences | null | undefined,
) => {
    if (typeof window === "undefined" || !organizationId) {
        return;
    }

    const normalized = normalizePurchaseFormPreferences(preferences);
    if (!normalized) {
        return;
    }

    try {
        window.localStorage.setItem(storageKey(organizationId), JSON.stringify(normalized));
    } catch {
        // Local storage may be unavailable; the current form state still works.
    }
};

export const clearPurchaseFormPreferences = (organizationId?: string) => {
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
        if (key?.startsWith(PURCHASE_FORM_PREFERENCES_STORAGE_PREFIX)) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach((key) => {
        window.localStorage.removeItem(key);
    });
};
