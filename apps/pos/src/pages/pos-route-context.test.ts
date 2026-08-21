import { describe, expect, test } from "bun:test";

import {
    getPosLoginPath,
    getPosPanelPath,
    getPosPanelTabFromPath,
    getPosReturnPath,
    posPanelConfig,
} from "@/pages/pos-route-context";
import { isPosMoreDestinationActive, posWorkspaceDestinations } from "@/components/pos/pos-nav-items";

describe("POS route context", () => {
    test("maps core POS panels to root-based routes", () => {
        expect(getPosPanelPath("products")).toBe("/");
        expect(getPosPanelPath("tables")).toBe("/tables");
        expect(getPosPanelPath("customers")).toBe("/customers");
        expect(getPosPanelPath("bills")).toBe("/bills");
        expect(getPosPanelPath("reports")).toBe("/reports");
        expect(getPosPanelPath("purchases")).toBe("/purchases");
        expect(getPosPanelPath("whatsapp")).toBe("/whatsapp");
        expect(posPanelConfig.products.path).toBe("/");
        expect(posPanelConfig.tables.path).toBe("/tables");
        expect(posPanelConfig.customers.path).toBe("/customers");
        expect(posPanelConfig.bills.path).toBe("/bills");
        expect(posPanelConfig.reports.path).toBe("/reports");
        expect(posPanelConfig.purchases.path).toBe("/purchases");
        expect(posPanelConfig.whatsapp.path).toBe("/whatsapp");
    });

    test("falls back to products for the POS root and unknown paths", () => {
        expect(getPosPanelTabFromPath("/")).toBe("products");
        expect(getPosPanelTabFromPath("/tables")).toBe("tables");
        expect(getPosPanelTabFromPath("/customers")).toBe("customers");
        expect(getPosPanelTabFromPath("/bills")).toBe("bills");
        expect(getPosPanelTabFromPath("/reports")).toBe("reports");
        expect(getPosPanelTabFromPath("/purchases")).toBe("purchases");
        expect(getPosPanelTabFromPath("/whatsapp")).toBe("whatsapp");
        expect(getPosPanelTabFromPath("/unknown")).toBe("products");
    });

    test("sends unauthenticated workspace requests to POS login", () => {
        expect(getPosLoginPath("/")).toBe("/login?returnTo=%2F");
        expect(getPosLoginPath("/tables")).toBe("/login?returnTo=%2Ftables");
        expect(getPosLoginPath("/customers")).toBe("/login?returnTo=%2Fcustomers");
        expect(getPosLoginPath("/bills")).toBe("/login?returnTo=%2Fbills");
        expect(getPosLoginPath("/reports")).toBe("/login?returnTo=%2Freports");
        expect(getPosLoginPath("/purchases")).toBe("/login?returnTo=%2Fpurchases");
        expect(getPosLoginPath("/whatsapp")).toBe("/login?returnTo=%2Fwhatsapp");
        expect(getPosLoginPath("/appearance")).toBe("/login?returnTo=%2Fappearance");
    });

    test("preserves only internal POS return paths after login", () => {
        expect(getPosReturnPath("/tables")).toBe("/tables");
        expect(getPosReturnPath("/customers")).toBe("/customers");
        expect(getPosReturnPath("/bills")).toBe("/bills");
        expect(getPosReturnPath("/reports")).toBe("/reports");
        expect(getPosReturnPath("/purchases")).toBe("/purchases");
        expect(getPosReturnPath("/whatsapp")).toBe("/whatsapp");
        expect(getPosReturnPath("/appearance")).toBe("/appearance");
        expect(getPosReturnPath("https://example.com")).toBe("/");
        expect(getPosReturnPath("/login")).toBe("/");
        expect(getPosReturnPath("//evil.example")).toBe("/");
        expect(getPosReturnPath(null)).toBe("/");
    });

    test("exposes Tables and Customers in POS navigation and marks them active in the mobile More menu", () => {
        expect(posWorkspaceDestinations.map((destination) => destination.id)).toEqual([
            "products",
            "tables",
            "customers",
            "bills",
            "reports",
            "purchases",
            "appearance",
        ]);
        const tablesDestination = posWorkspaceDestinations.find((destination) => destination.id === "tables");
        expect(tablesDestination).toMatchObject({ label: "Tables", path: "/tables", tab: "tables" });
        const customersDestination = posWorkspaceDestinations.find((destination) => destination.id === "customers");
        expect(customersDestination).toMatchObject({ label: "Customers", path: "/customers", tab: "customers" });
        const reportsDestination = posWorkspaceDestinations.find((destination) => destination.id === "reports");
        expect(reportsDestination).toMatchObject({ label: "Reports", path: "/reports", tab: "reports" });
        const purchasesDestination = posWorkspaceDestinations.find((destination) => destination.id === "purchases");
        expect(purchasesDestination).toMatchObject({ label: "Purchases", path: "/purchases", tab: "purchases" });
        expect(isPosMoreDestinationActive("/tables")).toBe(false);
        expect(isPosMoreDestinationActive("/customers")).toBe(true);
        expect(isPosMoreDestinationActive("/purchases")).toBe(true);
        expect(isPosMoreDestinationActive("/reports")).toBe(true);
        expect(isPosMoreDestinationActive("/appearance")).toBe(true);
    });

    test("keeps the POS settings alias inside POS Appearance", () => {
        expect(isPosMoreDestinationActive("/settings")).toBe(true);
    });
});
