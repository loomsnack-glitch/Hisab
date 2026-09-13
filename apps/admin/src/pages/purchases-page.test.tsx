import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import PurchasesPage from "@/pages/purchases-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("PurchasesPage", () => {
    test("renders under development state", () => {
        const markup = renderToStaticMarkup(
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/purchases`]}>
                <Routes>
                    <Route path="/organizations/:organizationId/purchases" element={<PurchasesPage />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(markup).toContain("data-testid=\"purchases-page\"");
        expect(markup).toContain("data-testid=\"under-development\"");
        expect(markup).toContain("Purchases");
        expect(markup).toContain("Coming soon");
    });
});
