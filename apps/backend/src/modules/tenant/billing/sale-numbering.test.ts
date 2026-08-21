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

    test("uses the Store timezone for daily periods", () => {
        expect(getSaleNumberPeriodKey("daily", date, "Asia/Kolkata")).toBe("20260807");
        expect(getSaleNumberPeriodKey("daily", date, "America/New_York")).toBe("20260806");
    });

    test("creates calendar and financial period keys", () => {
        expect(getSaleNumberPeriodKey("weekly", date, "Asia/Kolkata")).toBe("2026-W32");
        expect(getSaleNumberPeriodKey("monthly", date, "Asia/Kolkata")).toBe("2026-08");
        expect(getSaleNumberPeriodKey("quarterly", date, "Asia/Kolkata")).toBe("2026-Q3");
        expect(getSaleNumberPeriodKey("half_yearly", date, "Asia/Kolkata")).toBe("2026-H2");
        expect(getSaleNumberPeriodKey("yearly", date, "Asia/Kolkata")).toBe("2026");
        expect(getSaleNumberPeriodKey("financial_yearly", date, "Asia/Kolkata")).toBe("FY26-27");
        expect(getSaleNumberPeriodKey("financial_yearly", new Date("2026-03-31T18:29:59.000Z"), "Asia/Kolkata")).toBe(
            "FY25-26",
        );
        expect(getSaleNumberPeriodKey("never", date, "Asia/Kolkata")).toBe("continuous");
    });

    test("formats reset and continuous numbers without a prefix", () => {
        expect(formatSaleNumber("never", "continuous", 123)).toBe("123");
        expect(formatSaleNumber("monthly", "2026-08", 1)).toBe("2026-08-0001");
        expect(formatSaleNumber("quarterly", "2026-Q3", 42)).toBe("2026-Q3-0042");
        expect(formatSaleNumber("financial_yearly", "FY26-27", 1)).toBe("FY26-27-0001");
        expect(formatSaleNumber("financial_yearly", "FY26-27", 10000)).toBe("FY26-27-10000");
    });

    test("formats simple token numbers and reset periods", () => {
        expect(getTokenNumberPeriodKey("daily", date, "Asia/Kolkata")).toBe("20260807");
        expect(getTokenNumberPeriodKey("weekly", date, "Asia/Kolkata")).toBe("2026-W32");
        expect(getTokenNumberPeriodKey("monthly", date, "Asia/Kolkata")).toBe("2026-08");
        expect(getTokenNumberPeriodKey("financial_yearly", date, "Asia/Kolkata")).toBe("FY26-27");
        expect(getTokenNumberPeriodKey("never", date, "Asia/Kolkata")).toBe("continuous");
        expect(formatTokenNumber(1)).toBe("001");
        expect(formatTokenNumber(1000)).toBe("1000");
    });

    test("formats Store-local KOT Numbers independently of Sale and token numbers", () => {
        expect(getKotNumberPeriodKey("daily", date, "Asia/Kolkata")).toBe("20260807");
        expect(getKotNumberPeriodKey("daily", date, "America/New_York")).toBe("20260806");
        expect(getKotNumberPeriodKey("weekly", date, "Asia/Kolkata")).toBe("2026-W32");
        expect(getKotNumberPeriodKey("monthly", date, "Asia/Kolkata")).toBe("2026-08");
        expect(getKotNumberPeriodKey("financial_yearly", date, "Asia/Kolkata")).toBe("FY26-27");
        expect(getKotNumberPeriodKey("never", date, "Asia/Kolkata")).toBe("continuous");
        expect(formatKotNumber(1)).toBe("KOT-001");
        expect(formatKotNumber(12)).toBe("KOT-012");
        expect(formatKotNumber(1000)).toBe("KOT-1000");
        expect(formatKotNumber(1)).not.toBe(formatSaleNumber("never", "continuous", 1));
        expect(formatKotNumber(1)).not.toBe(formatTokenNumber(1));
    });

    test("validates IANA timezones", () => {
        expect(isValidSaleNumberTimezone("Asia/Kolkata")).toBe(true);
        expect(isValidSaleNumberTimezone("Not/A-Timezone")).toBe(false);
    });
});
