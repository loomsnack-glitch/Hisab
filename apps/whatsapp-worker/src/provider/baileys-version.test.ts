import { describe, expect, it } from "bun:test";
import { resolveBaileysVersion } from "./baileys-version.js";

describe("Baileys version resolution", () => {
    it("uses the latest version when the fetch succeeds", async () => {
        const version = await resolveBaileysVersion(async () => ({
            version: [2, 3000, 1234567890],
            isLatest: true,
        }));

        expect(version).toEqual([2, 3000, 1234567890]);
    });

    it("uses the bundled fallback returned by Baileys when fetching fails", async () => {
        const version = await resolveBaileysVersion(async () => ({
            version: [2, 3000, 1023223821],
            isLatest: false,
            error: new Error("network unavailable"),
        }));

        expect(version).toEqual([2, 3000, 1023223821]);
    });
});
