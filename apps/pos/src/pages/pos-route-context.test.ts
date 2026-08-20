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
        expect(getPosPanelPath("bills")).toBe("/bills");
        expect(posPanelConfig.products.path).toBe("/");
        expect(posPanelConfig.bills.path).toBe("/bills");
    });

    test("falls back to products for the POS root and unknown paths", () => {
        expect(getPosPanelTabFromPath("/")).toBe("products");
        expect(getPosPanelTabFromPath("/bills")).toBe("bills");
        expect(getPosPanelTabFromPath("/unknown")).toBe("products");
    });

    test("sends unauthenticated workspace requests to POS login", () => {
        expect(getPosLoginPath("/")).toBe("/login?returnTo=%2F");
        expect(getPosLoginPath("/bills")).toBe("/login?returnTo=%2Fbills");
        expect(getPosLoginPath("/appearance")).toBe("/login?returnTo=%2Fappearance");
    });

    test("preserves only internal POS return paths after login", () => {
        expect(getPosReturnPath("/bills")).toBe("/bills");
        expect(getPosReturnPath("/appearance")).toBe("/appearance");
        expect(getPosReturnPath("https://example.com")).toBe("/");
        expect(getPosReturnPath("/login")).toBe("/");
        expect(getPosReturnPath("//evil.example")).toBe("/");
        expect(getPosReturnPath(null)).toBe("/");
    });

    test("exposes Products, Bills, and Appearance in POS navigation", () => {
        expect(posWorkspaceDestinations.map((destination) => destination.id)).toEqual([
            "products",
            "bills",
            "appearance",
        ]);
        expect(posWorkspaceDestinations.find((destination) => destination.id === "bills")).toMatchObject({
            path: "/bills",
        });
        expect(isPosMoreDestinationActive("/appearance")).toBe(true);
    });

    test("keeps the POS settings alias inside POS Appearance", () => {
        expect(isPosMoreDestinationActive("/settings")).toBe(true);
    });
});
