import { describe, expect, test } from "bun:test";

import { getSalesDateBounds, getSalesDatePresetOptions, nextLocalDay, startOfLocalDay } from "./sales-date";

describe("sales date presets", () => {
    test("single-day mode only offers today, yesterday, and custom", () => {
        expect(getSalesDatePresetOptions("date").map((preset) => preset.value)).toEqual([
            "today",
            "yesterday",
            "custom",
        ]);
    });

    test("range mode offers week, month, custom, and all", () => {
        expect(getSalesDatePresetOptions("range").map((preset) => preset.value)).toEqual([
            "this-week",
            "this-month",
            "custom",
            "all",
        ]);
    });
});

describe("sales date bounds", () => {
    test("today covers the current local day", () => {
        const today = startOfLocalDay(new Date());
        const bounds = getSalesDateBounds("date", today, null, null, "today");
        expect(bounds.from?.getTime()).toBe(today.getTime());
        expect(bounds.to?.getTime()).toBe(nextLocalDay(today).getTime());
    });

    test("all dates leaves the range open", () => {
        expect(getSalesDateBounds("range", new Date(), null, null, "all")).toEqual({ from: null, to: null });
    });
});
