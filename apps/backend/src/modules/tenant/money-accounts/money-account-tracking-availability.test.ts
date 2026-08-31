import { describe, expect, test } from "bun:test";
import { isMoneyAccountTrackingAvailable } from "./money-account-tracking-availability";

describe("Money Account Tracking availability", () => {
    test("permits every Organization until subscription plans exist", async () => {
        const available = await isMoneyAccountTrackingAvailable(
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        );

        expect(available).toBe(true);
    });
});
