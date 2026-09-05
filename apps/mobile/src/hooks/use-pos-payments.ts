import { useEffect } from "react";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { getPosPaymentSummary, validatePosPaymentRows, type PosPaymentRow } from "../lib/pos-payment-boundary";
import { usePosPaymentStore } from "../store/pos-payment.store";

export const usePosPayments = (total: number) => {
    const session = usePosSessionSnapshot().session;
    const scopeKey = session
        ? `${session.organization.id}:${session.store.id}:${session.device.id}`
        : null;
    const rows = usePosPaymentStore((state) => state.scopeKey === scopeKey ? state.rows : []);

    useEffect(() => {
        if (scopeKey) {
            usePosPaymentStore.getState().initialize(scopeKey, total);
        }
    }, [scopeKey, total]);

    const summary = getPosPaymentSummary(rows, total);

    return {
        rows,
        summary,
        validation: validatePosPaymentRows(rows, total),
        updateRow: (rowId: string, patch: Partial<Pick<PosPaymentRow, "method" | "amount">>) => {
            if (scopeKey) {
                usePosPaymentStore.getState().updateRow(scopeKey, rowId, patch);
            }
        },
        addRow: () => {
            if (scopeKey) {
                usePosPaymentStore.getState().addRow(scopeKey);
            }
        },
        removeRow: (rowId: string) => {
            if (scopeKey) {
                usePosPaymentStore.getState().removeRow(scopeKey, rowId);
            }
        },
    };
};
