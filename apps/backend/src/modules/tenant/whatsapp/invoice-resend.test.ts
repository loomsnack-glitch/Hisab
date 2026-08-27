import { describe, expect, mock, test } from "bun:test";

mock.module("@/config/minio", () => ({ default: {} }));

const { invoiceIdempotencyKey } = await import("./invoice");

describe("Cloud invoice resend idempotency", () => {
  test("keeps the first send stable and gives each resend its own key", () => {
    expect(invoiceIdempotencyKey("sale-id", {})).toBe("invoice:sale-id");
    expect(
      invoiceIdempotencyKey("sale-id", {
        resend: true,
        requestId: "resend-1",
      }),
    ).toBe("invoice:sale-id:resend:resend-1");
    expect(
      invoiceIdempotencyKey("sale-id", {
        resend: true,
        requestId: "resend-2",
      }),
    ).not.toBe("invoice:sale-id:resend:resend-1");
  });
});
