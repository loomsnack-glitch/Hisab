import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

describe("Store Category Presentations page", () => {
    test("registers the Store workspace categories route", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");
        const pageSource = readFileSync(join(import.meta.dir, "store-category-presentations-page.tsx"), "utf8");

        expect(appSource).toContain(
            'path="/organizations/:organizationId/workspaces/:storeId/categories" element={<StoreCategoryPresentationsPage />}',
        );
        expect(pageSource).toContain('data-testid="store-categories-page"');
        expect(pageSource).toContain("Visible in POS menu");
        expect(pageSource).toContain("Search categories...");
    });
});
