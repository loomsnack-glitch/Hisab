import { describe, expect, test } from "bun:test";

import {
    getPosPanelPath,
    getPosPanelTabFromPath,
    getPosReturnPath,
    posPanelConfig,
} from "@/pages/pos-route-context";
import { isPosMoreDestinationActive, posWorkspaceDestinations } from "@/components/pos/pos-nav-items";

describe("POS route context", () => {
    test("maps each POS panel to its canonical route", () => {
        expect(getPosPanelPath("products")).toBe(posPanelConfig.products.path);
        expect(getPosPanelPath("tables")).toBe(posPanelConfig.tables.path);
        expect(getPosPanelPath("bills")).toBe(posPanelConfig.bills.path);
        expect(getPosPanelPath("reports")).toBe(posPanelConfig.reports.path);
        expect(getPosPanelPath("customers")).toBe(posPanelConfig.customers.path);
        expect(getPosPanelPath("purchases")).toBe(posPanelConfig.purchases.path);
    });

    test("falls back to products for the POS root and unknown paths", () => {
        expect(getPosPanelTabFromPath("/pos")).toBe("products");
        expect(getPosPanelTabFromPath("/pos/reports")).toBe("reports");
        expect(getPosPanelTabFromPath("/pos/tables")).toBe("tables");
        expect(getPosPanelTabFromPath("/pos/unknown")).toBe("products");
    });

    test("preserves only internal POS return paths after login", () => {
        expect(getPosReturnPath("/pos/bills")).toBe("/pos/bills");
        expect(getPosReturnPath("/pos/customers?search=alice")).toBe("/pos/customers?search=alice");
        expect(getPosReturnPath("https://example.com")).toBe("/pos");
        expect(getPosReturnPath("/pos/login")).toBe("/pos");
    });

    test("exposes Tables in POS navigation and marks it active in the mobile More menu", () => {
        const tablesDestination = posWorkspaceDestinations.find((destination) => destination.id === "tables");

        expect(tablesDestination).toMatchObject({ label: "Tables", path: "/pos/tables", tab: "tables" });
        expect(isPosMoreDestinationActive("/pos/tables")).toBe(true);
    });
});
