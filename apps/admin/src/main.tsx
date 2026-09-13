import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NuqsAdapter } from "nuqs/adapters/react-router/v6";
import { RouterProvider, createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

import "@repo/ui/app.css";
import "@repo/ui/globals.css";

import logo from "@repo/assets/logo.png";
import App from "./App";
import Providers from "./providers";

const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (favicon) {
    favicon.href = logo;
    favicon.type = "image/png";
}

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="*" element={<App />} />
    )
);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Providers>
            <NuqsAdapter>
                <RouterProvider router={router} />
            </NuqsAdapter>
        </Providers>
    </StrictMode>,
);
