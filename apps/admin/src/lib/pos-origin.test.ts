import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_POS_ORIGIN, getConfiguredPosOrigin, getPosLoginUrl } from "./pos-origin";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Admin POS login handoff", () => {
    test("uses the configured POS origin and defaults to the local POS app", () => {
        expect(getConfiguredPosOrigin("")).toBe(DEFAULT_POS_ORIGIN);
        expect(getConfiguredPosOrigin("   ")).toBe(DEFAULT_POS_ORIGIN);
        expect(getConfiguredPosOrigin("https://pos.ganatri.in/")).toBe("https://pos.ganatri.in");
        expect(DEFAULT_POS_ORIGIN).toBe("http://localhost:5174");
    });

    test("opens POS device login with only non-secret organization and device prefills", () => {
        expect(getPosLoginUrl({}, "https://pos.ganatri.in")).toBe("https://pos.ganatri.in/login");
        expect(
            getPosLoginUrl(
                { organizationUsername: "demo-grocery", deviceUsername: "counter_1" },
                "https://pos.ganatri.in",
            ),
        ).toBe("https://pos.ganatri.in/login?org=demo-grocery&device=counter_1");
    });

    test("never places a Store Device Secret in the POS login URL", () => {
        const loginUrl = getPosLoginUrl(
            { organizationUsername: "demo-grocery", deviceUsername: "counter_1" },
            "https://pos.ganatri.in",
        );
        const parsed = new URL(loginUrl);

        expect(parsed.origin).toBe("https://pos.ganatri.in");
        expect(parsed.pathname).toBe("/login");
        expect([...parsed.searchParams.keys()].sort()).toEqual(["device", "org"]);
        expect(parsed.hash).toBe("");
        expect(loginUrl.toLowerCase()).not.toContain("secret");
        expect(loginUrl).not.toContain("/pos/login");
    });

    test("browser-visible Admin configuration exposes only the POS origin", () => {
        const envExample = readFileSync(join(appRoot, ".env.example"), "utf8");
        const browserConfiguration = envExample
            .split(/\r?\n/)
            .filter((line) => line.startsWith("VITE_"))
            .join("\n");

        expect(envExample).toContain("VITE_POS_ORIGIN=http://localhost:5174");
        expect(browserConfiguration.toLowerCase()).not.toContain("secret");
    });
});
