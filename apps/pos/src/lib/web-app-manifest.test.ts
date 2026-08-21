import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildWebAppManifest, getWebAppIdentity, WEB_APP_SCOPE } from "./web-app-manifest";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");

describe("POS web app manifest", () => {
    test("installs Ganatri POS as a standalone app at the POS root", () => {
        expect(buildWebAppManifest()).toMatchObject({
            name: "Ganatri POS",
            short_name: "Ganatri POS",
            display: "standalone",
            scope: WEB_APP_SCOPE,
            start_url: "/",
            id: "/",
        });
        expect(getWebAppIdentity().manifestHref).toBe("/pos.webmanifest");
    });

    test("static manifest file matches the in-app contract", () => {
        const pos = JSON.parse(readFileSync(join(publicDir, "pos.webmanifest"), "utf8"));

        expect(pos).toEqual(buildWebAppManifest());
    });
});
