import { describe, expect, test } from "bun:test";

import {
    getDefaultHistoryQuery,
    getHistoryDateBounds,
    startOfLocalDay,
    toHistoryQuery,
} from "./date-range-filter";

describe("date-range-filter", () => {
    test("defaults to today's local bounds", () => {
        const today = startOfLocalDay(new Date("2026-09-01T15:30:00.000Z"));
        const OriginalDate = globalThis.Date;
        globalThis.Date = class extends OriginalDate {
            constructor(...args: ConstructorParameters<typeof OriginalDate>) {
                if (args.length === 0) {
                    super(today);
                    return;
                }
                super(...args);
            }

            static now() {
                return today.getTime();
            }
        } as typeof OriginalDate;

        const query = getDefaultHistoryQuery();
        const bounds = getHistoryDateBounds("date", today, null, null, "today");

        expect(query.occurredFrom).toBe(bounds.from?.toISOString());
        expect(query.occurredTo).toBe(bounds.to?.toISOString());

        globalThis.Date = OriginalDate;
    });

    test("returns an empty query for all dates", () => {
        expect(toHistoryQuery({ from: null, to: null })).toEqual({});
    });
});
