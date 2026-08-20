import { describe, expect, test } from "bun:test";

import {
    getStoreDetailPath,
    getStoreDetailTab,
    getStoreListPath,
    isStoresNavActive,
} from "./store-routes";

describe("store routes", () => {
    test("builds list and detail paths", () => {
        expect(getStoreListPath("org-1")).toBe("/organizations/org-1/stores");
        expect(getStoreDetailPath("org-1", "store-1")).toBe(
            "/organizations/org-1/stores/store-1/devices",
        );
        expect(getStoreDetailPath("org-1", "store-1", "settings")).toBe(
            "/organizations/org-1/stores/store-1/settings",
        );
    });

    test("reads the active store detail tab from the path", () => {
        expect(getStoreDetailTab("/organizations/org-1/stores/store-1/devices")).toBe("devices");
        expect(getStoreDetailTab("/organizations/org-1/stores/store-1/settings")).toBe("settings");
        expect(getStoreDetailTab("/organizations/org-1/stores/store-1")).toBe("devices");
    });

    test("keeps Stores nav active on store list and detail, but not WhatsApp", () => {
        expect(isStoresNavActive("/organizations/org-1/stores")).toBe(true);
        expect(isStoresNavActive("/organizations/org-1/stores/store-1")).toBe(true);
        expect(isStoresNavActive("/organizations/org-1/stores/store-1/devices")).toBe(true);
        expect(isStoresNavActive("/organizations/org-1/stores/store-1/settings")).toBe(true);
        expect(isStoresNavActive("/organizations/org-1/stores/store-1/whatsapp")).toBe(false);
        expect(isStoresNavActive("/organizations/org-1/products")).toBe(false);
        expect(isStoresNavActive("/organizations")).toBe(false);
    });
});
