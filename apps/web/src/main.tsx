import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

import "@repo/ui/app.css";
import "@repo/ui/globals.css";

import App from "./App";
import Providers from "./providers";

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="*" element={<App />} />
    )
);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Providers>
            <RouterProvider router={router} />
        </Providers>
    </StrictMode>,
);
