import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "@repo/ui/app.css";
import "@repo/ui/globals.css";

import App from "./App";
import Providers from "./providers";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Providers>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </Providers>
    </StrictMode>,
);
