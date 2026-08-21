import type { SaleNumberResetPeriod } from "@repo/types";

export const DEFAULT_SALE_NUMBER_TIMEZONE = "Asia/Kolkata";
export const FIXED_SALE_NUMBER_RESET_PERIOD = "financial_yearly" as const satisfies SaleNumberResetPeriod;
export const FIXED_TOKEN_NUMBER_RESET_PERIOD = "daily" as const satisfies SaleNumberResetPeriod;
export const FIXED_KOT_NUMBER_RESET_PERIOD = "daily" as const satisfies SaleNumberResetPeriod;

type ZonedDateParts = {
    year: number;
    month: number;
    day: number;
};

const getZonedDateParts = (date: Date, timezone: string): ZonedDateParts => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    })
        .formatToParts(date)
        .reduce<Record<string, string>>((result, part) => {
            if (part.type !== "literal") {
                result[part.type] = part.value;
            }
            return result;
        }, {});

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
    };
};

export const isValidSaleNumberTimezone = (timezone: string) => {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
        return true;
    } catch {
        return false;
    }
};

const getDailyPeriodKey = (date: Date, timezone: string): string => {
    const parts = getZonedDateParts(date, timezone);
    const month = String(parts.month).padStart(2, "0");
    const day = String(parts.day).padStart(2, "0");
    return `${parts.year}${month}${day}`;
};

const getFinancialYearPeriodKey = (date: Date, timezone: string): string => {
    const parts = getZonedDateParts(date, timezone);
    const startYear = parts.month >= 4 ? parts.year : parts.year - 1;
    return `FY${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
};

/** Bill numbers reset each financial year; the printed value is only the sequence. */
export const getSaleNumberPeriodKey = (date: Date, timezone: string): string =>
    getFinancialYearPeriodKey(date, timezone);

export const formatSaleNumber = (sequenceNumber: number) => String(sequenceNumber);

/** Token numbers always reset daily. */
export const getTokenNumberPeriodKey = (date: Date, timezone: string): string =>
    getDailyPeriodKey(date, timezone);

export const formatTokenNumber = (sequenceNumber: number) => String(sequenceNumber).padStart(3, "0");

/** KOT Numbers always reset daily. */
export const getKotNumberPeriodKey = (date: Date, timezone: string): string =>
    getDailyPeriodKey(date, timezone);

export const formatKotNumber = (sequenceNumber: number) => `KOT-${String(sequenceNumber).padStart(3, "0")}`;
