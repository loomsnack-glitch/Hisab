import { describe, expect, it } from "bun:test";
import {
    addPosPaymentRow,
    createPosPaymentRow,
    getPosPaymentSummary,
    initializePosPaymentRows,
    mapPosPaymentRowsToInputs,
    removePosPaymentRow,
    validatePosPaymentRows,
} from "./pos-payment-boundary";

describe("POS Payment boundary", () => {
    it("starts with one full Cash row and maps it to a server input", () => {
        const rows = initializePosPaymentRows(125);

        expect(rows).toHaveLength(1);
        expect(rows[0]?.method).toBe("cash");
        expect(rows[0]?.amount).toBe("125");
        expect(mapPosPaymentRowsToInputs(rows)).toEqual([{
            amount: 125,
            method: "cash",
            referenceNumber: null,
            notes: null,
        }]);
    });

    it("summarizes multiple methods and ignores an empty Due row", () => {
        const first = createPosPaymentRow("50", "cash");
        const second = createPosPaymentRow("", "upi");
        const rows = addPosPaymentRow([first, second]);

        expect(getPosPaymentSummary(rows, 100)).toEqual({ collected: 50, remaining: 50 });
        expect(validatePosPaymentRows(rows, 100)).toEqual({ kind: "valid" });
        expect(mapPosPaymentRowsToInputs(rows)).toHaveLength(1);
    });

    it("rejects malformed, negative, and over-total values", () => {
        const row = createPosPaymentRow("abc");
        expect(validatePosPaymentRows([row], 100)).toEqual({ kind: "invalid_amount", rowId: row.id });
        expect(validatePosPaymentRows([{ ...row, amount: "-1" }], 100)).toEqual({ kind: "invalid_amount", rowId: row.id });
        expect(validatePosPaymentRows([{ ...row, amount: "101" }], 100)).toEqual({ kind: "over_total" });
    });

    it("does not remove the final row but removes optional rows", () => {
        const first = createPosPaymentRow("100");
        const second = createPosPaymentRow("25", "card");

        expect(removePosPaymentRow([first], first.id)).toEqual([first]);
        expect(removePosPaymentRow([first, second], second.id)).toEqual([first]);
    });
});
