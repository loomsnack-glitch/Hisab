import { expect, test } from "bun:test";
import viteConfig from "../vite.config";

test("proxies same-origin /api to the shared backend", () => {
    const resolvedConfig = typeof viteConfig === "function"
        ? viteConfig({ command: "serve", mode: "development", isSsrBuild: false, isPreview: false })
        : viteConfig;

    expect(resolvedConfig.server?.port).toBe(5174);
    expect(resolvedConfig.server?.proxy).toMatchObject({
        "/api": {
            target: "http://127.0.0.1:8001",
            changeOrigin: true,
        },
    });
});
