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

export const isCommercialAccessSourceActiveAt = (
    source: { startsAt: Date; endsAt: Date; revokedAt: Date | null },
    at: Date,
): boolean =>
    source.revokedAt === null
    && source.startsAt.getTime() <= at.getTime()
    && at.getTime() < source.endsAt.getTime();
