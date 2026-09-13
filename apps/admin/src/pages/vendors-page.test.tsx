import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import VendorsPage from "@/pages/vendors-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("VendorsPage", () => {
    test("renders under development state", () => {
        const markup = renderToStaticMarkup(
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/vendors`]}>
                <Routes>
                    <Route path="/organizations/:organizationId/vendors" element={<VendorsPage />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(markup).toContain("data-testid=\"vendors-page\"");
        expect(markup).toContain("data-testid=\"under-development\"");
        expect(markup).toContain("Vendors");
        expect(markup).toContain("Coming soon");
    });
});
