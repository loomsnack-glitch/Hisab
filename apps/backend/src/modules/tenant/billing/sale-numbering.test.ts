import { describe, expect, test } from "bun:test";

import {
    formatSaleNumber,
    getSaleNumberPeriodKey,
    isValidSaleNumberTimezone,
} from "./sale-numbering";

describe("sale numbering periods", () => {
    const date = new Date("2026-08-06T23:30:00.000Z");

    test("uses the Store timezone for daily periods", () => {
        expect(getSaleNumberPeriodKey("daily", date, "Asia/Kolkata")).toBe("20260807");
        expect(getSaleNumberPeriodKey("daily", date, "America/New_York")).toBe("20260806");
    });

    test("creates calendar period keys", () => {
        expect(getSaleNumberPeriodKey("weekly", date, "Asia/Kolkata")).toBe("2026-W32");
        expect(getSaleNumberPeriodKey("monthly", date, "Asia/Kolkata")).toBe("2026-08");
        expect(getSaleNumberPeriodKey("quarterly", date, "Asia/Kolkata")).toBe("2026-Q3");
        expect(getSaleNumberPeriodKey("half_yearly", date, "Asia/Kolkata")).toBe("2026-H2");
        expect(getSaleNumberPeriodKey("yearly", date, "Asia/Kolkata")).toBe("2026");
        expect(getSaleNumberPeriodKey("never", date, "Asia/Kolkata")).toBe("continuous");
    });

    test("formats reset and continuous numbers without a prefix", () => {
        expect(formatSaleNumber("never", "continuous", 123)).toBe("123");
        expect(formatSaleNumber("monthly", "2026-08", 1)).toBe("2026-08-0001");
        expect(formatSaleNumber("quarterly", "2026-Q3", 42)).toBe("2026-Q3-0042");
    });

    test("validates IANA timezones", () => {
        expect(isValidSaleNumberTimezone("Asia/Kolkata")).toBe(true);
        expect(isValidSaleNumberTimezone("Not/A-Timezone")).toBe(false);
    });
});
