import { describe, expect, it } from "bun:test";
import {
    APP_LANGUAGES,
    DEFAULT_APP_LANGUAGE,
    isAppLanguage,
    resolveAppLanguage,
    appResources,
} from "./localization-boundary";

describe("localization boundary", () => {
    it("supports the approved interface languages", () => {
        expect(APP_LANGUAGES).toEqual(["en", "gu", "hi"]);
        expect(Object.keys(appResources)).toEqual(APP_LANGUAGES);
        expect(isAppLanguage("en")).toBe(true);
        expect(isAppLanguage("gu")).toBe(true);
        expect(isAppLanguage("hi")).toBe(true);
    });

    it("falls back to English for missing or unsupported values", () => {
        expect(resolveAppLanguage(null)).toBe(DEFAULT_APP_LANGUAGE);
        expect(resolveAppLanguage("fr")).toBe(DEFAULT_APP_LANGUAGE);
        expect(resolveAppLanguage("en-US")).toBe(DEFAULT_APP_LANGUAGE);
    });

    it("keeps supported persisted values unchanged", () => {
        expect(resolveAppLanguage("gu")).toBe("gu");
        expect(resolveAppLanguage("hi")).toBe("hi");
    });
});
