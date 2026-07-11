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
