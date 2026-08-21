import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import RetiredPosRoutePage, {
    RETIRED_POS_ROUTE_MESSAGE,
    RETIRED_POS_ROUTE_TITLE,
} from "./retired-pos-route-page";

const renderRetiredPosRoute = (path: string) => {
    const router = createMemoryRouter(
        [
            { path: "/pos", element: <RetiredPosRoutePage /> },
            { path: "/pos/*", element: <RetiredPosRoutePage /> },
            { path: "/", element: <div>Admin home</div> },
            { path: "/login", element: <div>Admin login</div> },
            { path: "*", element: <div>Fallback redirect</div> },
        ],
        { initialEntries: [path] },
    );

    return renderToStaticMarkup(<RouterProvider router={router} />);
};

describe("retired Admin POS routes", () => {
    test.each(["/pos", "/pos/login", "/pos/bills", "/pos/appearance"])(
        "renders an unavailable page for %s without redirecting",
        (path) => {
            const markup = renderRetiredPosRoute(path);

            expect(markup).toContain(RETIRED_POS_ROUTE_TITLE);
            expect(markup).toContain(RETIRED_POS_ROUTE_MESSAGE);
            expect(markup).toContain('data-testid="retired-pos-route"');
            expect(markup).not.toContain("Admin home");
            expect(markup).not.toContain("Admin login");
            expect(markup).not.toContain("Fallback redirect");
            expect(markup).not.toContain("/login?org=");
            expect(markup).not.toContain("http://localhost:5174");
        },
    );
});
