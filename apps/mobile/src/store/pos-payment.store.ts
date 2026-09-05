import { create } from "zustand";
import {
    addPosPaymentRow,
    initializePosPaymentRows,
    removePosPaymentRow,
    updatePosPaymentRow,
    type PosPaymentRow,
} from "../lib/pos-payment-boundary";

type PosPaymentStore = {
    scopeKey: string | null;
    rows: PosPaymentRow[];
    initialize: (scopeKey: string, total: number) => void;
    updateRow: (scopeKey: string, rowId: string, patch: Partial<Pick<PosPaymentRow, "method" | "amount">>) => void;
    addRow: (scopeKey: string) => void;
    removeRow: (scopeKey: string, rowId: string) => void;
    clear: () => void;
};

export const usePosPaymentStore = create<PosPaymentStore>()((set) => ({
    scopeKey: null,
    rows: [],
    initialize: (scopeKey, total) => set((state) => state.scopeKey === scopeKey
        ? state
        : { scopeKey, rows: initializePosPaymentRows(total) }),
    updateRow: (scopeKey, rowId, patch) => set((state) => state.scopeKey !== scopeKey
        ? state
        : { rows: updatePosPaymentRow(state.rows, rowId, patch) }),
    addRow: (scopeKey) => set((state) => state.scopeKey !== scopeKey
        ? state
        : { rows: addPosPaymentRow(state.rows) }),
    removeRow: (scopeKey, rowId) => set((state) => state.scopeKey !== scopeKey
        ? state
        : { rows: removePosPaymentRow(state.rows, rowId) }),
    clear: () => set({ scopeKey: null, rows: [] }),
}));

export const clearPosPayments = () => usePosPaymentStore.getState().clear();
