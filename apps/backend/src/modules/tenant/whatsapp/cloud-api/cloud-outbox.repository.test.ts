import { afterEach, describe, expect, test } from "bun:test";
import { cloudReconciliationTimeoutSeconds } from "./cloud-reconciliation-config";

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
