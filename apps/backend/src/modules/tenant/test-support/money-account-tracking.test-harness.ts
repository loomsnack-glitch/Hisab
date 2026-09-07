import { mock } from "bun:test";

export const isMoneyAccountTrackingActive = mock(async () => false);

mock.module("@/modules/tenant/money-accounts/money-account-tracking", () => ({
    isMoneyAccountTrackingActive,
}));
