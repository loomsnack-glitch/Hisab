import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ADMIN_APP_NAME, getDocumentTitle } from "./app-identity";
import { buildAdminVersionMetadata } from "./app-version";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Ganatri Admin identity", () => {
    test("lives in the admin Turbo application directory", () => {
        expect(appRoot.replaceAll("\\", "/")).toMatch(/\/apps\/admin$/);
    });

    test("names the Turbo application admin and exposes independent app commands", () => {
        const packageJson = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8")) as {
            name?: string;
            scripts?: Record<string, string>;
        };

        expect(packageJson.name).toBe("admin");
        expect(packageJson.scripts).toMatchObject({
            dev: expect.any(String),
            build: expect.any(String),
            lint: expect.any(String),
            "check-types": expect.any(String),
            test: expect.any(String),
        });
    });

    test("uses Ganatri Admin as the document title for every Admin route", () => {
        expect(getDocumentTitle()).toBe("Ganatri Admin");
        expect(getDocumentTitle()).toBe(ADMIN_APP_NAME);
    });

    test("does not detect POS from Admin pathnames or load Device Login", () => {
        const appSource = readFileSync(join(appRoot, "src/App.tsx"), "utf8");

        expect(appSource).toContain("userAuthenticate");
        expect(appSource).not.toContain("deviceAuthenticate");
        expect(appSource).not.toContain("isPosRoute");
        expect(appSource).not.toContain("PosLoginPage");
        expect(appSource).not.toContain("PosPage");
        expect(appSource).not.toContain('path="/pos/login"');
        expect(appSource).toContain('path="/pos"');
        expect(appSource).toContain("<RetiredPosRoutePage");
        expect(appSource).not.toContain('Navigate to="/pos');
        expect(appSource).not.toContain("startsWith(\"/pos\")");
    });

    test("install document metadata identifies Ganatri Admin", () => {
        const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");

        expect(indexHtml).toContain("<title>Ganatri Admin</title>");
        expect(indexHtml).toContain('content="Ganatri Admin"');
    });

    test("version metadata identifies the application as Ganatri Admin", () => {
        expect(
            buildAdminVersionMetadata({
                version: "1.2.0",
                build: "abc1234",
                builtAt: "2026-08-09T12:00:00.000Z",
            }),
        ).toEqual({
            name: "Ganatri Admin",
            version: "1.2.0",
            build: "abc1234",
            builtAt: "2026-08-09T12:00:00.000Z",
        });
    });
});
