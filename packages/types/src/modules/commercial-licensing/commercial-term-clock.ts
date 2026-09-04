import type { CommercialCatalogTerm } from "../platform/commercial-catalog.type";

export const COMMERCIAL_TERM_TIMEZONE = "Asia/Kolkata";

type KolkataDateTimeParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
};

const pad = (value: number, size = 2) => String(value).padStart(size, "0");

const kolkataPartsFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: COMMERCIAL_TERM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

export const kolkataDateTimeParts = (instant: Date): KolkataDateTimeParts => {
    const parts = Object.fromEntries(
        kolkataPartsFormatter.formatToParts(instant).map((part) => [part.type, part.value]),
    );
    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second),
        millisecond: instant.getUTCMilliseconds(),
    };
};

export const fromKolkataDateTimeParts = (parts: KolkataDateTimeParts): Date =>
    new Date(
        `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}.${pad(parts.millisecond, 3)}+05:30`,
    );

const daysInKolkataMonth = (year: number, month: number): number =>
    new Date(Date.UTC(year, month, 0)).getUTCDate();

const addKolkataMonths = (parts: KolkataDateTimeParts, count: number): KolkataDateTimeParts => {
    const zeroBasedMonth = parts.month - 1 + count;
    const year = parts.year + Math.floor(zeroBasedMonth / 12);
    const month = ((zeroBasedMonth % 12) + 12) % 12;
    const maxDay = daysInKolkataMonth(year, month + 1);
    return {
        ...parts,
        year,
        month: month + 1,
        day: Math.min(parts.day, maxDay),
    };
};

export const addCommercialTerm = (start: Date, term: CommercialCatalogTerm): Date => {
    const parts = kolkataDateTimeParts(start);
    if (term.unit === "day") {
        const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + term.count));
        return fromKolkataDateTimeParts({
            ...parts,
            year: shifted.getUTCFullYear(),
            month: shifted.getUTCMonth() + 1,
            day: shifted.getUTCDate(),
        });
    }
    if (term.unit === "month") {
        return fromKolkataDateTimeParts(addKolkataMonths(parts, term.count));
    }
    return fromKolkataDateTimeParts(addKolkataMonths(parts, term.count * 12));
};

export const commercialAccessSourceEffectiveEndsAt = (
    source: { endsAt: Date; revokedAt: Date | null },
): Date => source.revokedAt ?? source.endsAt;

export const isCommercialAccessSourceActiveAt = (
    source: { startsAt: Date; endsAt: Date; revokedAt: Date | null },
    at: Date,
): boolean => {
    const effectiveEndsAt = commercialAccessSourceEffectiveEndsAt(source);
    return source.startsAt.getTime() <= at.getTime()
        && at.getTime() < effectiveEndsAt.getTime();
};

export const commercialTermRemainingFraction = (
    startsAt: Date,
    endsAt: Date,
    at: Date,
): number => {
    const totalMs = endsAt.getTime() - startsAt.getTime();
    if (totalMs <= 0) {
        return 0;
    }
    if (at.getTime() <= startsAt.getTime()) {
        return 1;
    }
    if (at.getTime() >= endsAt.getTime()) {
        return 0;
    }
    return (endsAt.getTime() - at.getTime()) / totalMs;
};

export type PlanUpgradeChargeBreakdown = {
    remainingFraction: number;
    creditInr: number;
    chargeInr: number;
    amountInr: number;
    amountPaise: number;
};

export const calculatePlanUpgradeCharge = (
    originalPurchasedPriceInr: number,
    upgradedPlanPriceInr: number,
    startsAt: Date,
    endsAt: Date,
    at: Date,
    inrToPaise: (amountInr: number) => number,
): PlanUpgradeChargeBreakdown => {
    const remainingFraction = commercialTermRemainingFraction(startsAt, endsAt, at);
    const creditInr = originalPurchasedPriceInr * remainingFraction;
    const chargeInr = upgradedPlanPriceInr * remainingFraction;
    const amountInr = inrToPaise(chargeInr - creditInr) / 100;
    return {
        remainingFraction,
        creditInr,
        chargeInr,
        amountInr,
        amountPaise: inrToPaise(amountInr),
    };
};

export type CoTermAddOnChargeBreakdown = {
    remainingFraction: number;
    chargeInr: number;
    amountInr: number;
    amountPaise: number;
};

export const calculateCoTermAddOnCharge = (
    catalogPriceInr: number,
    basePlanStartsAt: Date,
    basePlanEndsAt: Date,
    at: Date,
    inrToPaise: (amountInr: number) => number,
): CoTermAddOnChargeBreakdown => {
    const remainingFraction = commercialTermRemainingFraction(basePlanStartsAt, basePlanEndsAt, at);
    const chargeInr = catalogPriceInr * remainingFraction;
    const amountInr = inrToPaise(chargeInr) / 100;
    return {
        remainingFraction,
        chargeInr,
        amountInr,
        amountPaise: inrToPaise(amountInr),
    };
};

export const commercialTermsMatch = (
    left: CommercialCatalogTerm,
    right: CommercialCatalogTerm,
): boolean => left.count === right.count && left.unit === right.unit;
