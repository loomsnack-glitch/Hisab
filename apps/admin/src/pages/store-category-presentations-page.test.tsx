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
        expect(pageSource).toContain("Edit category");
        expect(pageSource).toContain("UpsertStoreCategoryPresentationDialog");
        expect(pageSource).not.toContain("Visible in POS menu");
        expect(pageSource).toContain("Search categories...");
        expect(pageSource).toContain("storeCatalogListFilterParsers");
        expect(pageSource).toContain("orgStatuses");
        expect(pageSource).toContain("Showing {filteredPresentations.length} categor");
        expect(pageSource).toContain("grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4");
        expect(pageSource).toContain("product{categoryProducts.length === 1 ? \"\" : \"s\"}");
    });
});
