import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
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
            ],
        },
        resolve: {
            preserveSymlinks: true,
            alias: {
                "@": path.resolve(__dirname, "./src"),
                "next-themes": path.resolve(__dirname, "./node_modules/next-themes/dist/index.mjs"),
                react: path.resolve(__dirname, "./node_modules/react"),
                "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
                "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
                "use-sync-external-store/shim": useSyncExternalStoreShimDir,
                "use-sync-external-store/shim/index.js": path.resolve(useSyncExternalStoreShimDir, "index.ts"),
                "use-sync-external-store/shim/with-selector": path.resolve(
                    useSyncExternalStoreShimDir,
                    "with-selector.ts",
                ),
                "use-sync-external-store/shim/with-selector.js": path.resolve(
                    useSyncExternalStoreShimDir,
                    "with-selector.ts",
                ),
            },
        },
        server: {
            port: 5173,
        },
    };
});
