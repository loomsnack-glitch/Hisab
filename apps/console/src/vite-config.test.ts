import { expect, test } from "bun:test";
import viteConfig from "../vite.config";

test("pre-bundles the phone input CommonJS dependencies in development", () => {
    const resolvedConfig = typeof viteConfig === "function"
        ? viteConfig({ command: "serve", mode: "development", isSsrBuild: false, isPreview: false })
        : viteConfig;
    const include = resolvedConfig.optimizeDeps?.include ?? [];

    expect(include).toEqual(expect.arrayContaining([
        "react-phone-number-input",
        "prop-types",
        "classnames",
        "use-sync-external-store/shim",
        "use-sync-external-store/shim/index.js",
        "use-sync-external-store/shim/with-selector",
        "use-sync-external-store/shim/with-selector.js",
    ]));

    const aliases = Array.isArray(resolvedConfig.resolve?.alias) ? resolvedConfig.resolve.alias : [];
    const aliasFinds = aliases.map(alias => typeof alias === "string" ? alias : alias.find);
    expect(aliasFinds).toEqual(expect.arrayContaining([
        "use-sync-external-store/shim",
        "use-sync-external-store/shim/index.js",
        "use-sync-external-store/shim/with-selector",
        "use-sync-external-store/shim/with-selector.js",
    ]));
});
