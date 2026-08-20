import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

const useSyncExternalStoreShimDir = path.resolve(__dirname, "./src/shims/use-sync-external-store-shim");

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, "");
    return {
        define: {
            "process.env.EXPO_PUBLIC_BASE_API_URL": JSON.stringify(env.EXPO_PUBLIC_BASE_API_URL),
            "process.env.NEXT_PUBLIC_BASE_API_URL": JSON.stringify(env.NEXT_PUBLIC_BASE_API_URL),
            "process.env.API_BASE_URL": JSON.stringify(env.API_BASE_URL),
            "process.env.BASE_API_URL": JSON.stringify(env.BASE_API_URL),
        },
        plugins: [react(), tailwindcss()],
        optimizeDeps: {
            include: [
                "use-sync-external-store/shim",
                "use-sync-external-store/shim/index.js",
                "use-sync-external-store/shim/with-selector",
                "use-sync-external-store/shim/with-selector.js",
                "react-phone-number-input",
                "prop-types",
                "classnames",
            ],
        },
        resolve: {
            preserveSymlinks: true,
            alias: [
                { find: "@", replacement: path.resolve(__dirname, "./src") },
                { find: "@repo/services", replacement: path.resolve(__dirname, "../../packages/services/src/index.ts") },
                { find: "@repo/types", replacement: path.resolve(__dirname, "../../packages/types/src/index.ts") },
                {
                    find: "use-sync-external-store/shim",
                    replacement: useSyncExternalStoreShimDir,
                },
                {
                    find: "use-sync-external-store/shim/index.js",
                    replacement: path.resolve(useSyncExternalStoreShimDir, "index.ts"),
                },
                {
                    find: "use-sync-external-store/shim/with-selector",
                    replacement: path.resolve(useSyncExternalStoreShimDir, "with-selector.ts"),
                },
                {
                    find: "use-sync-external-store/shim/with-selector.js",
                    replacement: path.resolve(useSyncExternalStoreShimDir, "with-selector.ts"),
                },
            ],
        },
        server: {
            host: true,
            port: 5175,
            proxy: {
                "/api": { target: "http://localhost:8001", changeOrigin: true },
            },
        },
    };
});
