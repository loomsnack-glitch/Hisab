import { afterEach, describe, expect, test } from "bun:test";
import { cloudReconciliationTimeoutSeconds } from "./cloud-reconciliation-config";
import { mapCloudOutboxReconciliationSummary } from "./cloud-outbox-summary";

const previousTimeout = process.env.WHATSAPP_CLOUD_RECONCILIATION_TIMEOUT_SECONDS;

afterEach(() => {
  if (previousTimeout === undefined) delete process.env.WHATSAPP_CLOUD_RECONCILIATION_TIMEOUT_SECONDS;
  else process.env.WHATSAPP_CLOUD_RECONCILIATION_TIMEOUT_SECONDS = previousTimeout;
});

describe("Cloud outbox reconciliation configuration", () => {
  test("uses the configured bounded timeout", () => {
    process.env.WHATSAPP_CLOUD_RECONCILIATION_TIMEOUT_SECONDS = "7200";
    expect(cloudReconciliationTimeoutSeconds()).toBe(7200);
  });

  test("fails closed to one hour for invalid or unsafe values", () => {
    for (const value of ["", "0", "59", "604801", "not-a-number"]) {
      process.env.WHATSAPP_CLOUD_RECONCILIATION_TIMEOUT_SECONDS = value;
      expect(cloudReconciliationTimeoutSeconds()).toBe(3600);
    }
  });
});

describe("Cloud outbox reconciliation summary", () => {
  test("maps bounded counts and a valid oldest timestamp", () => {
    expect(mapCloudOutboxReconciliationSummary({
      reconciling_count: "2",
      oldest_reconciling_at: "2026-08-23T05:00:00.000Z",
      retryable_count: "3",
      dead_letter_count: "4",
    })).toEqual({
      reconcilingCount: 2,
      oldestReconcilingAt: "2026-08-23T05:00:00.000Z",
      retryableCount: 3,
      deadLetterCount: 4,
    });
  });

  test("does not emit an invalid timestamp when the database value is absent or malformed", () => {
    expect(mapCloudOutboxReconciliationSummary({ oldest_reconciling_at: "invalid" }).oldestReconcilingAt).toBeNull();
    expect(mapCloudOutboxReconciliationSummary(undefined)).toEqual({
      reconcilingCount: 0,
      oldestReconcilingAt: null,
      retryableCount: 0,
      deadLetterCount: 0,
    });
  });

  test("clamps malformed counts to safe non-negative integers", () => {
    expect(mapCloudOutboxReconciliationSummary({
      reconciling_count: "-2.5",
      retryable_count: "not-a-number",
      dead_letter_count: "3.9",
    })).toMatchObject({
      reconcilingCount: 0,
      retryableCount: 0,
      deadLetterCount: 3,
    });
  });
});
