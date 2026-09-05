import type { CreatePaymentJSON, PaymentMethod } from "@repo/types";

export type PosPaymentMethod = Extract<PaymentMethod, "cash" | "upi" | "card">;

export type PosPaymentRow = {
    id: string;
    method: PosPaymentMethod;
    amount: string;
};

export type PosPaymentValidation =
    | { kind: "valid" }
    | { kind: "invalid_amount"; rowId: string }
    | { kind: "over_total" };

let paymentRowSequence = 0;

const createPaymentRowId = () => `payment-${paymentRowSequence += 1}`;

export const createPosPaymentRow = (amount = "", method: PosPaymentMethod = "cash"): PosPaymentRow => ({
    id: createPaymentRowId(),
    method,
    amount,
});

export const initializePosPaymentRows = (total: number) => [
    createPosPaymentRow(total > 0 ? String(total) : ""),
];

export const parsePosPaymentAmount = (amount: string) => {
    if (!amount.trim()) {
        return 0;
    }

    const parsed = Number(amount.trim());
    return Number.isFinite(parsed) ? parsed : null;
};

export const getPosPaymentSummary = (rows: readonly PosPaymentRow[], total: number) => {
    const collected = rows.reduce((sum, row) => {
        const amount = parsePosPaymentAmount(row.amount);
        return amount !== null && amount > 0 ? sum + amount : sum;
    }, 0);

    return {
        collected,
        remaining: Math.max(0, total - collected),
    };
};

export const validatePosPaymentRows = (rows: readonly PosPaymentRow[], total: number): PosPaymentValidation => {
    for (const row of rows) {
        const amount = parsePosPaymentAmount(row.amount);
        if (amount === null || amount < 0) {
            return { kind: "invalid_amount", rowId: row.id };
        }
    }

    if (getPosPaymentSummary(rows, total).collected > total) {
        return { kind: "over_total" };
    }

    return { kind: "valid" };
};

export const updatePosPaymentRow = (
    rows: readonly PosPaymentRow[],
    rowId: string,
    patch: Partial<Pick<PosPaymentRow, "method" | "amount">>,
) => rows.map((row) => row.id === rowId ? { ...row, ...patch } : row);

export const addPosPaymentRow = (rows: readonly PosPaymentRow[]) => [...rows, createPosPaymentRow()];

export const removePosPaymentRow = (rows: readonly PosPaymentRow[], rowId: string) => {
    if (rows.length <= 1) {
        return [...rows];
    }

    return rows.filter((row) => row.id !== rowId);
};

export const mapPosPaymentRowsToInputs = (rows: readonly PosPaymentRow[]): CreatePaymentJSON[] =>
    rows.flatMap((row) => {
        const amount = parsePosPaymentAmount(row.amount);
        return amount !== null && amount > 0
            ? [{ amount, method: row.method, referenceNumber: null, notes: null }]
            : [];
    });
