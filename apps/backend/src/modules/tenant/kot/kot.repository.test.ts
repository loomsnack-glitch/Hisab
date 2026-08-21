import { describe, expect, mock, test } from "bun:test";

const executedQueries: string[] = [];
const pg = (strings: TemplateStringsArray) => {
    executedQueries.push(strings.join("?"));
    if (strings.join("?").includes("store_billing_settings")) {
        return Promise.resolve([
            {
                kot_number_reset_period: "daily",
                sale_number_timezone: "Asia/Kolkata",
            },
        ]);
    }
    return Promise.resolve([{ sequence_number: 1 }]);
};

mock.module("@/config/db", () => ({ pg }));

const kotRepository = await import("./kot.repository");

describe("KOT Number sequence allocation", () => {
    test("allocates from a Store-local KOT sequence rather than Sale or token sequences", async () => {
        executedQueries.length = 0;
        const allocated = await kotRepository.allocateKotNumber(
            "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            new Date("2026-08-21T12:00:00.000Z"),
        );

        const sql = executedQueries.join("\n");
        expect(sql).toContain("store_billing_settings");
        expect(sql).toContain("sale_number_timezone");
        expect(sql).not.toContain("kot_number_reset_period");
        expect(sql).toContain("store_kot_sequences");
        expect(sql).not.toContain("store_sale_sequences");
        expect(sql).not.toContain("store_token_sequences");
        expect(allocated.kotNumber).toBe("KOT-001");
        expect(allocated.kotSequenceNumber).toBe(1);
        expect(allocated.kotPeriodKey).toBe("20260821");
    });
});

describe("KOT item reads on a reserved connection", () => {
    test("does not start a second query while another is in flight", async () => {
        let inFlight = 0;
        let maxInFlight = 0;
        const tx = (_strings: TemplateStringsArray) => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            return new Promise((resolve) => {
                queueMicrotask(() => {
                    inFlight -= 1;
                    resolve([]);
                });
            });
        };

        await kotRepository.getKotItemsByKotId(
            "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            tx as never,
        );

        expect(maxInFlight).toBe(1);
    });
});
