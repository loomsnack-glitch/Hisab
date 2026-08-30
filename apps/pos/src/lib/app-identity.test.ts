import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getDocumentTitle, POS_APP_NAME } from "./app-identity";
import { buildPosVersionMetadata } from "./app-version";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Ganatri POS identity", () => {
    test("lives in the pos Turbo application directory", () => {
        expect(appRoot.replaceAll("\\", "/")).toMatch(/\/apps\/pos$/);
    });

    test("names the Turbo application pos and exposes independent app commands", () => {
        const packageJson = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8")) as {
            name?: string;
            scripts?: Record<string, string>;
        };

        expect(packageJson.name).toBe("pos");
        expect(packageJson.scripts).toMatchObject({
            dev: expect.any(String),
            build: expect.any(String),
            lint: expect.any(String),
            "check-types": expect.any(String),
            test: expect.any(String),
        });
    });

    test("uses Ganatri POS as the document title for every POS route", () => {
        expect(getDocumentTitle()).toBe(POS_APP_NAME);
        expect(getDocumentTitle()).toBe("Ganatri POS");
    });

    test("install document metadata identifies Ganatri POS", () => {
        const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");

        expect(indexHtml).toContain("<title>Ganatri POS</title>");
        expect(indexHtml).toContain('content="Ganatri POS"');
        expect(indexHtml).toContain('href="/pos.webmanifest"');
    });

    test("version metadata identifies the application as Ganatri POS", () => {
        expect(
            buildPosVersionMetadata({
                version: "1.2.0",
                build: "abc1234",
                builtAt: "2026-08-09T12:00:00.000Z",
            }),
        ).toEqual({
            name: "Ganatri POS",
            version: "1.2.0",
            build: "abc1234",
            builtAt: "2026-08-09T12:00:00.000Z",
        });
    });

    test("owns a device-only root route table isolated from Admin user authentication", () => {
        const appSource = readFileSync(join(appRoot, "src/App.tsx"), "utf8");

        expect(appSource).not.toContain("userAuthenticate");
        expect(appSource).toContain('path="/login"');
        expect(appSource).toContain("<PosProductsPage />");
        expect(appSource).toContain('path="tables"');
        expect(appSource).toContain('path="customers"');
        expect(appSource).toContain('path="bills"');
        expect(appSource).toContain('path="reports"');
        expect(appSource).toContain('path="whatsapp"');
        expect(appSource).toContain('path="appearance"');
        expect(appSource).toContain('path="settings"');
        expect(appSource).toContain('to="/appearance"');
        expect(appSource).not.toContain("/pos/login");
        expect(appSource).not.toContain('data-workspace="admin"');
    });
});
