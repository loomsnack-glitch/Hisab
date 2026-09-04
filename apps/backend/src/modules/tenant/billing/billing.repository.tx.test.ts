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

describe("Sale Service Mode updates", () => {
  test("preserves the stored mode when a non-order update omits serviceMode", async () => {
    let sql = "";
    const tx = (strings: TemplateStringsArray) => {
      sql = strings.join("?");
      return Promise.resolve([]);
    };

    await billingRepository.updateSale(
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        status: "completed",
        paymentStatus: "paid",
        subtotal: 100,
        discountTotal: 0,
        grandTotal: 100,
      },
      tx as never,
    );

    expect(sql).toContain("service_mode = COALESCE");
    expect(sql).toContain("::sale_service_mode_enum");
    expect(sql).not.toContain("service_mode = ?");
  });
});

describe("Sale completion request reads", () => {
  test("uses the reserved connection when provided", async () => {
    let queryRanOnTransaction = false;
    const tx = (_strings: TemplateStringsArray) => {
      queryRanOnTransaction = true;
      return Promise.resolve([{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }]);
    };

    const saleId = await billingRepository.getSaleIdByCompletionRequestId(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      tx as never,
    );

    expect(queryRanOnTransaction).toBe(true);
    expect(saleId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
