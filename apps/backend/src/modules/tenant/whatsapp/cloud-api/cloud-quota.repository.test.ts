import { describe, expect, test } from "bun:test";
import {
  assertCloudQuotaCapacity,
  CloudDuplicateCampaignRecipientError,
  CloudQuotaExceededError,
} from "./cloud-quota.repository";

describe("Cloud quota admission", () => {
  const base = {
    usedUnits: 9,
    usedCostMinor: 90,
    requestedUnits: 1,
    requestedCostMinor: 10,
  };

  test("allows a reservation at the configured message and budget limits", () => {
    expect(() => assertCloudQuotaCapacity({
      ...base,
      monthlyMessageLimit: 10,
      monthlyBudgetMinor: 100,
    })).not.toThrow();
  });

  test("blocks concurrent overspend by checking both dimensions before insert", () => {
    expect(() => assertCloudQuotaCapacity({
      ...base,
      monthlyMessageLimit: 9,
      monthlyBudgetMinor: 100,
    })).toThrowError(new CloudQuotaExceededError("messages"));
    expect(() => assertCloudQuotaCapacity({
      ...base,
      monthlyMessageLimit: 10,
      monthlyBudgetMinor: 99,
    })).toThrowError(new CloudQuotaExceededError("budget"));
  });

  test("treats an unset policy dimension as unlimited", () => {
    expect(() => assertCloudQuotaCapacity({
      ...base,
      monthlyMessageLimit: null,
      monthlyBudgetMinor: null,
    })).not.toThrow();
  });

  test("keeps campaign recipient duplicates as a distinct safety error", () => {
    expect(new CloudDuplicateCampaignRecipientError()).toBeInstanceOf(Error);
    expect(new CloudQuotaExceededError("customer_cooldown").message).toContain("cooldown");
  });
});
