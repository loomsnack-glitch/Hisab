import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import MoneyAccountsPage from "@/pages/money-accounts-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("MoneyAccountsPage", () => {
    test("renders under development state", () => {
        const markup = renderToStaticMarkup(
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/money-accounts`]}>
                <Routes>
                    <Route path="/organizations/:organizationId/money-accounts" element={<MoneyAccountsPage />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(markup).toContain("data-testid=\"money-accounts-page\"");
        expect(markup).toContain("data-testid=\"under-development\"");
        expect(markup).toContain("Money Accounts");
        expect(markup).toContain("Coming soon");
    });
});
