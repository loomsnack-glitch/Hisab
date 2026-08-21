import { expect, test } from "bun:test";

import viteConfig from "../vite.config";

test("proxies same-origin /api to the shared backend on an origin isolated from POS", () => {
    const resolvedConfig = typeof viteConfig === "function"
        ? viteConfig({ command: "serve", mode: "development", isSsrBuild: false, isPreview: false })
        : viteConfig;

    expect(resolvedConfig.server?.port).toBe(5173);
    expect(resolvedConfig.server?.proxy).toMatchObject({
        "/api": {
            target: "http://localhost:8001",
            changeOrigin: true,
        },
    });
});
