import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
    buildWebAppManifest,
    getWebAppIdentity,
    getWebAppWorkspace,
    isPathInWebAppScope,
    isWithinStartUrlPrefix,
    WEB_APP_SCOPE,
} from "./web-app-manifest";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");

describe("web app manifest", () => {
    test("treats POS paths as the POS workspace and everything else as admin", () => {
        expect(getWebAppWorkspace("/pos")).toBe("pos");
        expect(getWebAppWorkspace("/pos/bills")).toBe("pos");
        expect(getWebAppWorkspace("/organizations/abc/stores")).toBe("admin");
        expect(getWebAppWorkspace("/appearance")).toBe("admin");
    });

    test("installs admin and POS as standalone apps over the whole origin", () => {
        expect(buildWebAppManifest("admin")).toMatchObject({
            display: "standalone",
            scope: WEB_APP_SCOPE,
            start_url: "/organizations",
        });
        expect(buildWebAppManifest("pos")).toMatchObject({
            display: "standalone",
            scope: WEB_APP_SCOPE,
            start_url: "/pos",
        });
        expect(getWebAppIdentity("admin").id).not.toBe(getWebAppIdentity("pos").id);
    });

    test("keeps admin sibling routes inside the installed app scope", () => {
        expect(isPathInWebAppScope("/organizations/abc/stores")).toBe(true);
        expect(isPathInWebAppScope("/organizations/abc/billing")).toBe(true);
        expect(isPathInWebAppScope("/appearance")).toBe(true);
        expect(isPathInWebAppScope("/pos/bills")).toBe(true);
    });

    test("explains why POS home-screen clips survived without a manifest and admin did not", () => {
        expect(isWithinStartUrlPrefix("/pos", "/pos/bills")).toBe(true);
        expect(isWithinStartUrlPrefix("/pos", "/pos/appearance")).toBe(true);
        expect(isWithinStartUrlPrefix("/organizations/abc/stores", "/organizations/abc/billing")).toBe(false);
        expect(isWithinStartUrlPrefix("/organizations/abc/stores", "/appearance")).toBe(false);
    });

    test("static manifest files match the in-app contract", () => {
        const admin = JSON.parse(readFileSync(join(publicDir, "admin.webmanifest"), "utf8"));
        const pos = JSON.parse(readFileSync(join(publicDir, "pos.webmanifest"), "utf8"));

        expect(admin).toEqual(buildWebAppManifest("admin"));
        expect(pos).toEqual(buildWebAppManifest("pos"));
    });
});
