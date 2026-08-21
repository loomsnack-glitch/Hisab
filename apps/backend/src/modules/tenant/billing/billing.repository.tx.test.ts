import { describe, expect, mock, test } from "bun:test";

mock.module("@/config/db", () => ({
    pg: () => Promise.resolve([]),
}));

const billingRepository = await import("./billing.repository");

const createBusyTrackingSql = () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const sql = (_strings: TemplateStringsArray) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise((resolve) => {
            queueMicrotask(() => {
                inFlight -= 1;
                resolve([]);
            });
        });
    };
    return {
        sql,
        maxInFlight: () => maxInFlight,
    };
};

describe("Sale item reads on a reserved connection", () => {
    test("does not start a second query while another is in flight", async () => {
        const tx = createBusyTrackingSql();

        await billingRepository.getSaleItemsBySaleId(
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            tx.sql as never,
        );

        expect(tx.maxInFlight()).toBe(1);
    });
});
