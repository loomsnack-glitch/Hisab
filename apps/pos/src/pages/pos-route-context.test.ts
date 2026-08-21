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
        expect(getPosPanelPath("bills")).toBe("/bills");
        expect(posPanelConfig.products.path).toBe("/");
        expect(posPanelConfig.tables.path).toBe("/tables");
        expect(posPanelConfig.bills.path).toBe("/bills");
    });

    test("falls back to products for the POS root and unknown paths", () => {
        expect(getPosPanelTabFromPath("/")).toBe("products");
        expect(getPosPanelTabFromPath("/tables")).toBe("tables");
        expect(getPosPanelTabFromPath("/bills")).toBe("bills");
        expect(getPosPanelTabFromPath("/unknown")).toBe("products");
    });

    test("sends unauthenticated workspace requests to POS login", () => {
        expect(getPosLoginPath("/")).toBe("/login?returnTo=%2F");
        expect(getPosLoginPath("/tables")).toBe("/login?returnTo=%2Ftables");
        expect(getPosLoginPath("/bills")).toBe("/login?returnTo=%2Fbills");
        expect(getPosLoginPath("/appearance")).toBe("/login?returnTo=%2Fappearance");
    });

    test("preserves only internal POS return paths after login", () => {
        expect(getPosReturnPath("/tables")).toBe("/tables");
        expect(getPosReturnPath("/bills")).toBe("/bills");
        expect(getPosReturnPath("/appearance")).toBe("/appearance");
        expect(getPosReturnPath("https://example.com")).toBe("/");
        expect(getPosReturnPath("/login")).toBe("/");
        expect(getPosReturnPath("//evil.example")).toBe("/");
        expect(getPosReturnPath(null)).toBe("/");
    });

    test("exposes Tables in POS navigation and marks it active in the mobile More menu", () => {
        expect(posWorkspaceDestinations.map((destination) => destination.id)).toEqual([
            "products",
            "tables",
            "bills",
            "appearance",
        ]);
        const tablesDestination = posWorkspaceDestinations.find((destination) => destination.id === "tables");
        expect(tablesDestination).toMatchObject({ label: "Tables", path: "/tables", tab: "tables" });
        expect(isPosMoreDestinationActive("/tables")).toBe(true);
        expect(isPosMoreDestinationActive("/appearance")).toBe(true);
    });

    test("keeps the POS settings alias inside POS Appearance", () => {
        expect(isPosMoreDestinationActive("/settings")).toBe(true);
    });
});
