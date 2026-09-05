import { describe, expect, it } from "bun:test";
import { usePosSaleCompleteStore } from "./pos-sale-complete.store";

const sale = { id: "sale-1", saleNumber: "S-1", paymentStatus: "paid" } as never;

describe("POS completed Sale store", () => {
    it("hands off the latest server Sale and replaces stale results", () => {
        usePosSaleCompleteStore.getState().clear();
        usePosSaleCompleteStore.getState().setSale(sale);
        expect(usePosSaleCompleteStore.getState().sale).toBe(sale);

        const nextSale = { id: "sale-2" } as never;
        usePosSaleCompleteStore.getState().setSale(nextSale);
        expect(usePosSaleCompleteStore.getState().sale).toBe(nextSale);
    });

    it("clears the result when starting another Sale", () => {
        usePosSaleCompleteStore.getState().setSale(sale);
        usePosSaleCompleteStore.getState().clear();
        expect(usePosSaleCompleteStore.getState().sale).toBeNull();
    });
});
