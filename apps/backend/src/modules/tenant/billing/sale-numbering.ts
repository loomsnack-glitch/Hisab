import type { SaleNumberResetPeriod } from "@repo/types";

export const DEFAULT_SALE_NUMBER_TIMEZONE = "Asia/Kolkata";

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

const getIsoWeek = (parts: ZonedDateParts) => {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const weekday = (date.getUTCDay() + 6) % 7;
    const thursday = new Date(date.getTime() + (3 - weekday) * 86_400_000);
    const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
    const firstWeekday = (firstThursday.getUTCDay() + 6) % 7;
    const firstIsoThursday = new Date(firstThursday.getTime() + (3 - firstWeekday) * 86_400_000);
    const week = 1 + Math.round((thursday.getTime() - firstIsoThursday.getTime()) / 86_400_000 / 7);

    return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

export const isValidSaleNumberTimezone = (timezone: string) => {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
        return true;
    } catch {
        return false;
    }
};

export const getSaleNumberPeriodKey = (
    resetPeriod: SaleNumberResetPeriod,
    date: Date,
    timezone: string,
): string => {
    if (resetPeriod === "never") {
        return "continuous";
    }

    const parts = getZonedDateParts(date, timezone);
    const month = String(parts.month).padStart(2, "0");
    const day = String(parts.day).padStart(2, "0");

    switch (resetPeriod) {
        case "daily":
            return `${parts.year}${month}${day}`;
        case "weekly":
            return getIsoWeek(parts);
        case "monthly":
            return `${parts.year}-${month}`;
        case "quarterly":
            return `${parts.year}-Q${Math.ceil(parts.month / 3)}`;
        case "half_yearly":
            return `${parts.year}-H${parts.month <= 6 ? 1 : 2}`;
        case "yearly":
            return String(parts.year);
    }
};

export const formatSaleNumber = (resetPeriod: SaleNumberResetPeriod, periodKey: string, sequenceNumber: number) => {
    if (resetPeriod === "never") {
        return String(sequenceNumber);
    }

    return `${periodKey}-${String(sequenceNumber).padStart(4, "0")}`;
};
