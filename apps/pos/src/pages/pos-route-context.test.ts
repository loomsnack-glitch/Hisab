import { describe, expect, test } from "bun:test";

import {
    getPosLoginPath,
    getPosPanelPath,
    getPosPanelTabFromPath,
    getPosReturnPath,
    posPanelConfig,
} from "@/pages/pos-route-context";
import {
    getVisiblePosPrimaryMobileDestinations,
    getVisiblePosWorkspaceDestinations,
    isPosMoreDestinationActive,
    posWorkspaceDestinations,
} from "@/components/pos/pos-nav-items";

describe("POS route context", () => {
    test("maps core POS panels to root-based routes", () => {
        expect(getPosPanelPath("products")).toBe("/");
        expect(getPosPanelPath("tables")).toBe("/tables");
        expect(getPosPanelPath("bills")).toBe("/bills");
        expect(getPosPanelPath("whatsapp")).toBe("/whatsapp");
        expect(posPanelConfig.products.path).toBe("/");
        expect(posPanelConfig.tables.path).toBe("/tables");
        expect(posPanelConfig.bills.path).toBe("/bills");
        expect(posPanelConfig.whatsapp.path).toBe("/whatsapp");
    });

    test("falls back to products for the POS root and unknown paths", () => {
        expect(getPosPanelTabFromPath("/")).toBe("products");
        expect(getPosPanelTabFromPath("/tables")).toBe("tables");
        expect(getPosPanelTabFromPath("/bills")).toBe("bills");
        expect(getPosPanelTabFromPath("/whatsapp")).toBe("whatsapp");
        expect(getPosPanelTabFromPath("/customers")).toBe("products");
        expect(getPosPanelTabFromPath("/reports")).toBe("products");
        expect(getPosPanelTabFromPath("/unknown")).toBe("products");
    });

    test("sends unauthenticated workspace requests to POS login", () => {
        expect(getPosLoginPath("/")).toBe("/login?returnTo=%2F");
        expect(getPosLoginPath("/tables")).toBe("/login?returnTo=%2Ftables");
        expect(getPosLoginPath("/bills")).toBe("/login?returnTo=%2Fbills");
        expect(getPosLoginPath("/whatsapp")).toBe("/login?returnTo=%2Fwhatsapp");
        expect(getPosLoginPath("/appearance")).toBe(
            "/login?returnTo=%2Fappearance",
        );
        expect(getPosLoginPath("/printer")).toBe(
            "/login?returnTo=%2Fprinter",
        );
        expect(getPosLoginPath("/settings")).toBe(
            "/login?returnTo=%2Fsettings",
        );
    });

    test("preserves only internal POS return paths after login", () => {
        expect(getPosReturnPath("/tables")).toBe("/tables");
        expect(getPosReturnPath("/bills")).toBe("/bills");
        expect(getPosReturnPath("/whatsapp")).toBe("/whatsapp");
        expect(getPosReturnPath("/appearance")).toBe("/appearance");
        expect(getPosReturnPath("/printer")).toBe("/printer");
        expect(getPosReturnPath("/settings")).toBe("/settings");
        expect(getPosReturnPath("https://example.com")).toBe("/");
        expect(getPosReturnPath("/login")).toBe("/");
        expect(getPosReturnPath("//evil.example")).toBe("/");
        expect(getPosReturnPath(null)).toBe("/");
    });

    test("exposes Tables in POS navigation and marks KOT active in the mobile More menu", () => {
        expect(
            posWorkspaceDestinations.map((destination) => destination.id),
        ).toEqual([
            "products",
            "tables",
            "bills",
            "kots",
            "printer",
            "appearance",
            "settings",
        ]);
        const tablesDestination = posWorkspaceDestinations.find(
            (destination) => destination.id === "tables",
        );
        expect(tablesDestination).toMatchObject({
            label: "Tables",
            path: "/tables",
            tab: "tables",
        });
        expect(isPosMoreDestinationActive("/tables")).toBe(false);
        expect(isPosMoreDestinationActive("/kots")).toBe(true);
        expect(isPosMoreDestinationActive("/appearance")).toBe(true);
        expect(isPosMoreDestinationActive("/printer")).toBe(true);
        expect(isPosMoreDestinationActive("/settings")).toBe(true);
    });

    test("hides Tables from POS navigation when Table Management is disabled", () => {
        expect(
            getVisiblePosWorkspaceDestinations({
                tableManagementEnabled: true,
                kotSystemEnabled: true,
            }).map((destination) => destination.id),
        ).toContain("tables");
        expect(
            getVisiblePosWorkspaceDestinations({
                tableManagementEnabled: false,
                kotSystemEnabled: true,
            }).map((destination) => destination.id),
        ).not.toContain("tables");
        expect(
            getVisiblePosPrimaryMobileDestinations({
                tableManagementEnabled: false,
                kotSystemEnabled: true,
            }).map((destination) => destination.id),
        ).toEqual(["products", "bills"]);
        expect(
            getVisiblePosPrimaryMobileDestinations({
                tableManagementEnabled: true,
                kotSystemEnabled: true,
            }).map((destination) => destination.id),
        ).toEqual(["products", "tables", "bills"]);
    });

});
