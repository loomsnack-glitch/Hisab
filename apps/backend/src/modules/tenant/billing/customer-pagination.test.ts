import { describe, expect, test } from "bun:test";
import type { CustomerDTO } from "@repo/types";
import {
  decodeCustomerCursor,
  encodeCustomerCursor,
} from "./customer-pagination";

const customer = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: new Date("2026-08-05T19:15:49.167Z"),
} as CustomerDTO;

describe("customer cursor", () => {
  test("round-trips the ordering fields", () => {
    const cursor = encodeCustomerCursor(customer);

    expect(decodeCustomerCursor(cursor)).toEqual({
      sort: "newest",
      id: customer.id,
      createdAt: "2026-08-05T19:15:49.167Z",
    });
  });

  test("rejects malformed and tampered cursors", () => {
    expect(decodeCustomerCursor("not-a-cursor")).toBeNull();
    expect(
      decodeCustomerCursor(
        encodeURIComponent(JSON.stringify({ id: "not-a-uuid" })),
      ),
    ).toBeNull();
  });
});
