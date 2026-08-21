import { describe, expect, test } from "bun:test";

import {
    formatKotNumber,
    formatTokenNumber,
    formatSaleNumber,
    getKotNumberPeriodKey,
    getSaleNumberPeriodKey,
    getTokenNumberPeriodKey,
    isValidSaleNumberTimezone,
} from "./sale-numbering";

describe("sale numbering periods", () => {
    const date = new Date("2026-08-06T23:30:00.000Z");

    test("bill numbers use financial-year period keys only", () => {
        expect(getSaleNumberPeriodKey(date, "Asia/Kolkata")).toBe("FY26-27");
        expect(getSaleNumberPeriodKey(new Date("2026-03-31T18:29:59.000Z"), "Asia/Kolkata")).toBe(
            "FY25-26",
        );
        expect(getSaleNumberPeriodKey(date, "America/New_York")).toBe("FY26-27");
    });

    test("formats bill numbers as plain sequence numbers without prefixes", () => {
        expect(formatSaleNumber(1)).toBe("1");
        expect(formatSaleNumber(123)).toBe("123");
        expect(formatSaleNumber(10000)).toBe("10000");
    });

    test("token numbers always reset daily in the Store timezone", () => {
        expect(getTokenNumberPeriodKey(date, "Asia/Kolkata")).toBe("20260807");
        expect(getTokenNumberPeriodKey(date, "America/New_York")).toBe("20260806");
        expect(formatTokenNumber(1)).toBe("001");
        expect(formatTokenNumber(1000)).toBe("1000");
    });

    test("KOT Numbers always reset daily and stay independent of Sale and token numbers", () => {
        expect(getKotNumberPeriodKey(date, "Asia/Kolkata")).toBe("20260807");
        expect(getKotNumberPeriodKey(date, "America/New_York")).toBe("20260806");
        expect(formatKotNumber(1)).toBe("KOT-001");
        expect(formatKotNumber(12)).toBe("KOT-012");
        expect(formatKotNumber(1000)).toBe("KOT-1000");
        expect(formatKotNumber(1)).not.toBe(formatSaleNumber(1));
        expect(formatKotNumber(1)).not.toBe(formatTokenNumber(1));
    });

    test("validates IANA timezones", () => {
        expect(isValidSaleNumberTimezone("Asia/Kolkata")).toBe(true);
        expect(isValidSaleNumberTimezone("Not/A-Timezone")).toBe(false);
    });
});
