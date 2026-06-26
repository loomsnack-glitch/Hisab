import path from "path";
import { createRequire } from "module";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const require = createRequire(import.meta.url);
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
                "react-select",
                "@emotion/react",
                "hoist-non-react-statics",
            ],
            exclude: [
                "@repo/assets",
                "@repo/services",
                "@repo/types",
                "@repo/ui",
            ],
        },
        resolve: {
            preserveSymlinks: true,
            alias: [
                { find: "@", replacement: path.resolve(__dirname, "./src") },
                {
                    find: /^hoist-non-react-statics$/,
                    replacement: path.resolve(__dirname, "./src/shims/hoist-non-react-statics.ts"),
                },
                {
                    find: "next-themes",
                    replacement: require.resolve("next-themes"),
                },
                { find: "react", replacement: path.dirname(require.resolve("react")) },
                {
                    find: "react/jsx-runtime",
                    replacement: require.resolve("react/jsx-runtime"),
                },
                { find: "react-dom", replacement: path.dirname(require.resolve("react-dom")) },
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
            port: 5173,
        },
    };
});
