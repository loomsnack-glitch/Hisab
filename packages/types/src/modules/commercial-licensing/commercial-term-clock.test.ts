import { describe, expect, test } from "bun:test";

import {
    addCommercialTerm,
    COMMERCIAL_TERM_TIMEZONE,
    isCommercialAccessSourceActiveAt,
} from "./commercial-term-clock";

describe("Commercial Term Clock", () => {
    test("uses Asia/Kolkata as the commercial timezone", () => {
        expect(COMMERCIAL_TERM_TIMEZONE).toBe("Asia/Kolkata");
    });

    test("a seven-day Trial started at 20:30 IST ends at 20:30 IST seven local days later", () => {
        const start = new Date("2026-09-04T15:00:00.000Z");
        const end = addCommercialTerm(start, { count: 7, unit: "day" });

        expect(end.toISOString()).toBe("2026-09-11T15:00:00.000Z");
    });

    test("a one-year term keeps the same Asia/Kolkata wall-clock time", () => {
        const start = new Date("2026-03-15T10:15:30.000Z");
        const end = addCommercialTerm(start, { count: 1, unit: "year" });

        expect(end.toISOString()).toBe("2027-03-15T10:15:30.000Z");
    });

    test("a one-month term from 31 January clamps to the last local day of February", () => {
        const start = new Date("2026-01-31T15:00:00.000Z");
        const end = addCommercialTerm(start, { count: 1, unit: "month" });

        expect(end.toISOString()).toBe("2026-02-28T15:00:00.000Z");
    });

    test("an access source is active on its start timestamp and inactive at its end timestamp", () => {
        const startsAt = new Date("2026-09-04T15:00:00.000Z");
        const endsAt = new Date("2026-09-11T15:00:00.000Z");
        const source = { startsAt, endsAt, revokedAt: null };

        expect(isCommercialAccessSourceActiveAt(source, startsAt)).toBe(true);
        expect(isCommercialAccessSourceActiveAt(source, new Date("2026-09-11T14:59:59.999Z"))).toBe(true);
        expect(isCommercialAccessSourceActiveAt(source, endsAt)).toBe(false);
        expect(isCommercialAccessSourceActiveAt(
            { ...source, revokedAt: new Date("2026-09-05T00:00:00.000Z") },
            new Date("2026-09-06T00:00:00.000Z"),
        )).toBe(false);
    });
});
