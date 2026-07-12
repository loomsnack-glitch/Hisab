import { describe, expect, mock, test } from "bun:test";

const executedQueries: string[] = [];
const pg = (strings: TemplateStringsArray) => {
    executedQueries.push(strings.join("?"));
    return Promise.resolve([]);
};

mock.module("@/config/db", () => ({ pg }));

const billingRepository = await import("./billing.repository");

describe("Add-on sales rollup repository", () => {
    test("uses sale-time names instead of mutable catalog names", async () => {
        await billingRepository.getParentScopedAddOnSalesRollups("organization-id", "store-id");
        await billingRepository.getAddOnScopedSalesRollups("organization-id", "store-id");

        const sql = executedQueries.join("\n");

        expect(sql).toContain("MAX(si.product_name_snapshot) AS product_name_snapshot");
        expect(sql).toContain("MAX(sia.add_on_name_snapshot) AS add_on_name_snapshot");
        expect(sql).not.toContain("MAX(p.name)");
        expect(sql).not.toContain("MAX(ao.name)");
    });
});

describe("Bundle sales rollup repository", () => {
    test("keeps commercial money on bundle lines and exposes component usage without money columns", async () => {
        await billingRepository.getBundleCommercialSalesRollups("organization-id", "store-id");
        await billingRepository.getBundleComponentProductUsageRollups("organization-id", "store-id");
        await billingRepository.getBundleComponentAddOnUsageRollups("organization-id", "store-id");

        const sql = executedQueries.join("\n");

        expect(sql).toContain("MAX(si.product_name_snapshot) AS bundle_product_name_snapshot");
        expect(sql).toContain("COALESCE(SUM(si.line_total), 0) AS line_total");
        expect(sql).toContain("SUM(sibc.total_quantity)::int AS total_quantity");
        expect(sql).toContain("SUM(sibca.total_quantity)::int AS total_quantity");
        expect(sql).toContain("GROUP BY si.product_id, sibc.component_product_id");
        expect(sql).toContain("GROUP BY si.product_id, sibc.component_product_id, sibca.add_on_id");
        expect(sql).toContain("s.status = 'completed'");
        expect(sql).not.toContain("sibc.unit_price_snapshot");
        expect(sql).not.toContain("sibca.unit_price_snapshot");
        expect(sql).not.toContain("sibc.unit_discount_snapshot");
        expect(sql).not.toContain("sibca.unit_discount_snapshot");
    });
});
