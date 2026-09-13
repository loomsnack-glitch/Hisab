import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ExpensesPage from "@/pages/expenses-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("ExpensesPage", () => {
    test("renders under development state", () => {
        const markup = renderToStaticMarkup(
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/expenses`]}>
                <Routes>
                    <Route path="/organizations/:organizationId/expenses" element={<ExpensesPage />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(markup).toContain("data-testid=\"expenses-page\"");
        expect(markup).toContain("data-testid=\"under-development\"");
        expect(markup).toContain("Expenses");
        expect(markup).toContain("Coming soon");
    });
});
