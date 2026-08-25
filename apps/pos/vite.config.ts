import path from "path";
import { createRequire } from "module";
import { existsSync, readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const require = createRequire(import.meta.url);
const useSyncExternalStoreShimDir = path.resolve(__dirname, "./src/shims/use-sync-external-store-shim");
const rootPackagePath = path.resolve(__dirname, "../../package.json");
const generatedVersionPath = path.resolve(__dirname, "./public/version.json");

const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8")) as { version?: string };
const generatedVersion = existsSync(generatedVersionPath)
    ? (JSON.parse(readFileSync(generatedVersionPath, "utf8")) as { version?: string; build?: string; builtAt?: string })
    : {};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, "");

    return {
        define: {
            "import.meta.env.VITE_APP_VERSION": JSON.stringify(generatedVersion.version || rootPackage.version || "development"),
            "import.meta.env.VITE_BUILD_ID": JSON.stringify(generatedVersion.build || "development"),
            "import.meta.env.VITE_BUILD_TIME": JSON.stringify(generatedVersion.builtAt || ""),
            "process.env.EXPO_PUBLIC_BASE_API_URL": JSON.stringify(env.EXPO_PUBLIC_BASE_API_URL),
            "process.env.NEXT_PUBLIC_BASE_API_URL": JSON.stringify(env.NEXT_PUBLIC_BASE_API_URL),
            "process.env.API_BASE_URL": JSON.stringify(env.API_BASE_URL),
            "process.env.BASE_API_URL": JSON.stringify(env.BASE_API_URL || "/api"),
        },
        plugins: [react(), tailwindcss()],
        optimizeDeps: {
            include: [
                "use-sync-external-store/shim",
                "use-sync-external-store/shim/index.js",
                "use-sync-external-store/shim/with-selector",
                "use-sync-external-store/shim/with-selector.js",
                "react-select",
                "react-phone-number-input",
                "prop-types",
                "classnames",
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
                    find: "@repo/services",
                    replacement: path.resolve(__dirname, "../../packages/services/src/index.ts"),
                },
                {
                    find: "@repo/types",
                    replacement: path.resolve(__dirname, "../../packages/types/src/index.ts"),
                },
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
            allowedHosts: [".ngrok-free.dev", ".ngrok.io"],
            host: true,
            port: 5174,
            proxy: {
                "/api": {
                    target: "http://127.0.0.1:8001",
                    changeOrigin: true,
                },
            },
            watch: {
                ignored: ["!**/node_modules/@repo/**"],
            },
        },
    };
});
