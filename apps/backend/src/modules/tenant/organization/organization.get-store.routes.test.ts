import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Organization Store lookup route", () => {
    test("authorizes Store workspace context through GET store, not navigation visibility", () => {
        const source = readFileSync(join(import.meta.dir, "organization.routes.ts"), "utf8");

        expect(source).toContain('router.get("/:organizationId/stores/:storeId"');
        expect(source).toContain("organizationService.getStore(");
        expect(source).toContain('router.get("/:organizationId/stores"');
        expect(source).toContain('router.get("/:organizationId/stores/:storeId/devices"');
    });
});
