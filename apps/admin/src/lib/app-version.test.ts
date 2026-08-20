import { describe, expect, test } from "bun:test";

import { formatAppVersion, parseAppVersionInfo } from "./app-version";

describe("app version metadata", () => {
    test("accepts complete version metadata", () => {
        const version = parseAppVersionInfo({
            version: "1.2.0",
            build: "abc1234",
            builtAt: "2026-08-09T12:00:00.000Z",
        });

        expect(version).toEqual({
            version: "1.2.0",
            build: "abc1234",
            builtAt: "2026-08-09T12:00:00.000Z",
        });
    });

    test("rejects incomplete version metadata", () => {
        expect(parseAppVersionInfo({ version: "1.2.0", build: "abc1234" })).toBeNull();
        expect(parseAppVersionInfo(null)).toBeNull();
    });

    test("formats the user-facing version", () => {
        expect(formatAppVersion({ version: "1.2.0", build: "abc1234", builtAt: "" })).toBe("v1.2.0");
    });
});
