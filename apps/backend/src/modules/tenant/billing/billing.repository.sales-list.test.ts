import { describe, expect, test } from "bun:test";

import { getSalesByStore, getSalesSummaryByStore } from "./billing.repository";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const query = {
    limit: 40,
    sort: "newest" as const,
    createdFrom: "2026-08-22T18:30:00.000Z",
    createdTo: "2026-08-23T18:30:00.000Z",
};
const dbTest = process.env.DATABASE_URL ? test : test.skip;

describe("sales list without a payment-method filter", () => {
        dbTest("does not generate invalid SQL for an empty payment-method IN list", async () => {
        const result = await getSalesByStore(organizationId, storeId, query);

        expect(result.sales).toEqual([]);
        expect(result.pageInfo.hasMore).toBe(false);
    });

        dbTest("summarizes the same unfiltered window without a syntax error", async () => {
        const summary = await getSalesSummaryByStore(organizationId, storeId, query);

        expect(summary.completedCount).toBe(0);
        expect(summary.salesTotal).toBe(0);
    });

        dbTest("still accepts a payment-method IN list when a filter is present", async () => {
        const result = await getSalesByStore(organizationId, storeId, {
            ...query,
            paymentMethods: ["cash"],
        });

        expect(result.sales).toEqual([]);
    });
});
