import { describe, expect, test } from "bun:test";

import {
    getPosPanelPath,
    getPosPanelTabFromPath,
    getPosReturnPath,
    posPanelConfig,
} from "@/pages/pos-route-context";

describe("POS route context", () => {
    test("maps each POS panel to its canonical route", () => {
        expect(getPosPanelPath("products")).toBe(posPanelConfig.products.path);
        expect(getPosPanelPath("bills")).toBe(posPanelConfig.bills.path);
        expect(getPosPanelPath("reports")).toBe(posPanelConfig.reports.path);
        expect(getPosPanelPath("customers")).toBe(posPanelConfig.customers.path);
        expect(getPosPanelPath("purchases")).toBe(posPanelConfig.purchases.path);
    });

    test("falls back to products for the POS root and unknown paths", () => {
        expect(getPosPanelTabFromPath("/pos")).toBe("products");
        expect(getPosPanelTabFromPath("/pos/reports")).toBe("reports");
        expect(getPosPanelTabFromPath("/pos/unknown")).toBe("products");
    });

    test("preserves only internal POS return paths after login", () => {
        expect(getPosReturnPath("/pos/bills")).toBe("/pos/bills");
        expect(getPosReturnPath("/pos/customers?search=alice")).toBe("/pos/customers?search=alice");
        expect(getPosReturnPath("https://example.com")).toBe("/pos");
        expect(getPosReturnPath("/pos/login")).toBe("/pos");
    });
});
