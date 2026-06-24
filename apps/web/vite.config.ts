import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        preserveSymlinks: true,
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "next-themes": path.resolve(__dirname, "./node_modules/next-themes/dist/index.mjs"),
            react: path.resolve(__dirname, "./node_modules/react"),
            "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
            "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
        },
    },
    server: {
        port: 5173,
    },
});
