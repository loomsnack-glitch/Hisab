import { describe, expect, mock, test } from "bun:test";

const executedQueries: string[] = [];

const pg = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
        executedQueries.push(strings.join("?"));
        void values;
        if (strings.join("?").includes("store_billing_settings")) {
            return Promise.resolve([
                {
                    store_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                    organization_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    reset_period: "financial_yearly",
                    timezone: "Asia/Kolkata",
                    token_number_enabled: true,
                    token_number_reset_period: "daily",
                    kot_number_reset_period: "daily",
                    created_at: new Date("2026-08-21T12:00:00.000Z"),
                    updated_at: new Date("2026-08-21T12:00:00.000Z"),
                },
            ]);
        }
        return Promise.resolve([{ sequence_number: 4 }]);
    },
    {},
);

mock.module("@/config/db", () => ({ pg }));

const billingRepository = await import("./billing.repository");

describe("Sale Number allocation", () => {
    test("continues past existing Sales in the financial-year period instead of restarting at 1", async () => {
        executedQueries.length = 0;

        const allocated = await billingRepository.allocateSaleNumber(
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            new Date("2026-08-21T12:00:00.000Z"),
        );

        const sql = executedQueries.join("\n");
        expect(sql).toContain("sale_period_key");
        expect(sql).toContain("GREATEST");
        expect(sql).toContain("store_sale_sequences");
        expect(sql).toContain("store_token_sequences");
        expect(allocated.saleNumber).toBe("4");
        expect(allocated.salePeriodKey).toBe("FY26-27");
        expect(allocated.tokenNumber).toBe("004");
    });
});
