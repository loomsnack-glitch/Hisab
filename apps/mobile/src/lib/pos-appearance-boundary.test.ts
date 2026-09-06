import { describe, expect, it } from "bun:test";
import { DEFAULT_POS_DISPLAY_SIZE, DEFAULT_POS_THEME, resolvePosDisplaySize, resolvePosTheme } from "./pos-appearance-boundary";

describe("POS appearance boundary", () => {
    it("accepts approved theme choices and falls back safely", () => {
        expect(resolvePosTheme("light")).toBe("light");
        expect(resolvePosTheme("dark")).toBe("dark");
        expect(resolvePosTheme("system")).toBe("system");
        expect(resolvePosTheme("neon")).toBe(DEFAULT_POS_THEME);
        expect(resolvePosTheme(null)).toBe(DEFAULT_POS_THEME);
    });

    it("accepts approved display sizes and falls back safely", () => {
        expect(resolvePosDisplaySize("standard")).toBe("standard");
        expect(resolvePosDisplaySize("large")).toBe("large");
        expect(resolvePosDisplaySize("tiny")).toBe(DEFAULT_POS_DISPLAY_SIZE);
        expect(resolvePosDisplaySize(null)).toBe(DEFAULT_POS_DISPLAY_SIZE);
    });
});
