import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Providers>
            <App />
        </Providers>
    </StrictMode>,
);
