import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

describe("Store workspace page", () => {
    test("redirects the Store workspace root URL to Store Products", () => {
        const pageSource = readFileSync(join(import.meta.dir, "store-workspace-page.tsx"), "utf8");
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");

        expect(appSource).toContain(
            'path="/organizations/:organizationId/workspaces/:storeId" element={<StoreWorkspacePage />}',
        );
        expect(pageSource).toContain("Navigate");
        expect(pageSource).toContain("getStoreProductsPath");
        expect(pageSource).toContain("replace");
        expect(pageSource).not.toContain("Vendors");
        expect(pageSource).not.toContain("Package2");
        expect(pageSource).not.toContain("Truck");
        expect(pageSource).not.toContain("AdminWorkspaceSwitcherPanel");
    });

    test("registers a refresh-safe Store workspace route without replacing Organization store-detail routes", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");

        expect(appSource).toContain('path="/organizations/:organizationId/workspaces/:storeId"');
        expect(appSource).toContain('path="/organizations/:organizationId/workspaces/:storeId/products"');
        expect(appSource).toContain('path="/organizations/:organizationId/workspaces/:storeId/vendors"');
        expect(appSource).toContain('path="/organizations/:organizationId/stores/:storeId"');
        expect(appSource).toContain('path="/organizations/:organizationId/stores"');
        expect(appSource).toContain('path="/organizations/:organizationId/products"');
    });
});
