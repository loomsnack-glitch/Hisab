import { describe, expect, test } from "bun:test";
import type { SaleSummaryDTO } from "@repo/types";
import { decodeSalesCursor, encodeSalesCursor } from "./sales-pagination";

const sale = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: new Date("2026-08-05T19:15:49.167Z"),
  grandTotal: 99,
} as SaleSummaryDTO;

describe("sales cursor", () => {
  test("round-trips the ordering fields", () => {
    const cursor = encodeSalesCursor(sale, "newest");

    expect(decodeSalesCursor(cursor)).toEqual({
      sort: "newest",
      id: sale.id,
      createdAt: "2026-08-05T19:15:49.167Z",
      grandTotal: 99,
    });
  });

  test("rejects malformed and tampered cursors", () => {
    expect(decodeSalesCursor("not-a-cursor")).toBeNull();
    expect(
      decodeSalesCursor(
        encodeURIComponent(
          JSON.stringify({ sort: "newest", id: "not-a-uuid" }),
        ),
      ),
    ).toBeNull();
  });
});
