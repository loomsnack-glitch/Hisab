import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
    buildWebAppManifest,
    getWebAppIdentity,
    isPathInWebAppScope,
    isWithinStartUrlPrefix,
    WEB_APP_SCOPE,
} from "./web-app-manifest";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");
const appRoot = join(publicDir, "..");

describe("Admin web app manifest", () => {
    test("installs Ganatri Admin as a standalone app without POS workspace metadata", () => {
        expect(buildWebAppManifest()).toMatchObject({
            name: "Ganatri Admin",
            short_name: "Ganatri Admin",
            display: "standalone",
            scope: WEB_APP_SCOPE,
            start_url: "/organizations",
            id: "/",
        });
        expect(getWebAppIdentity().manifestHref).toBe("/admin.webmanifest");
        expect(getWebAppIdentity().manifestHref).not.toContain("pos");
    });

    test("keeps Admin sibling routes inside the installed app scope", () => {
        expect(isPathInWebAppScope("/organizations/abc/stores")).toBe(true);
        expect(isPathInWebAppScope("/organizations/abc/billing")).toBe(true);
        expect(isPathInWebAppScope("/appearance")).toBe(true);
    });

    test("does not treat Admin store pages as a POS start-URL prefix", () => {
        expect(isWithinStartUrlPrefix("/organizations", "/organizations/abc/stores")).toBe(true);
        expect(isWithinStartUrlPrefix("/organizations/abc/stores", "/organizations/abc/billing")).toBe(false);
        expect(isWithinStartUrlPrefix("/organizations/abc/stores", "/appearance")).toBe(false);
    });

    test("static manifest file matches the in-app contract and POS metadata is gone", () => {
        const admin = JSON.parse(readFileSync(join(publicDir, "admin.webmanifest"), "utf8"));

        expect(admin).toEqual(buildWebAppManifest());
        expect(() => readFileSync(join(publicDir, "pos.webmanifest"), "utf8")).toThrow();
        expect(readFileSync(join(appRoot, "index.html"), "utf8")).toContain('href="/admin.webmanifest"');
        expect(readFileSync(join(appRoot, "index.html"), "utf8")).not.toContain("pos.webmanifest");
    });
});
