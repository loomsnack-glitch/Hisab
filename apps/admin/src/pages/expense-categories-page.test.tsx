import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ExpenseCategoryDTO } from "@repo/types";

import { expenseCategoryKeys } from "@/lib/query-keys";
import ExpensesPage from "@/pages/expenses-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = new Date("2026-08-31T12:00:00.000Z");

const rent: ExpenseCategoryDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "Rent",
    kind: "predefined",
    predefinedKey: "rent",
    status: "active",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const packaging: ExpenseCategoryDTO = {
    id: "22222222-2222-4222-8222-222222222222",
    organizationId,
    name: "Packaging",
    kind: "custom",
    predefinedKey: null,
    status: "inactive",
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const renderExpenseCategoriesTab = (
    result: "pending" | "success" | "error" | "empty" = "success",
    expenseCategories: ExpenseCategoryDTO[] = [rent, packaging],
) => {
    const queryClient = new QueryClient();
    if (result !== "pending") {
        queryClient.setQueryData(expenseCategoryKeys.list(organizationId), {
            status: result === "error" ? "error" : "success",
            data: result === "error" ? null : { expenseCategories: result === "empty" ? [] : expenseCategories },
            message: result === "error"
                ? "Expense Categories could not be loaded right now."
                : "Expense Categories fetched successfully",
            code: result === "error" ? 500 : 200,
        });
    }

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/expenses?tab=categories`]}>
                <Routes>
                    <Route path="/organizations/:organizationId/expenses" element={<ExpensesPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe("Admin Expense Categories tab", () => {
    test("shows predefined and custom Expense Categories with availability and no delete command", () => {
        const markup = renderExpenseCategoriesTab();

        expect(markup).toContain("data-testid=\"expense-categories-directory\"");
        expect(markup).toContain("Categories");
        expect(markup).toContain("Rent");
        expect(markup).toContain("Standard");
        expect(markup).toContain("Packaging");
        expect(markup).toContain("Custom");
        expect(markup).toContain("Add category");
        expect(markup).toContain("Search expense categories...");
        expect(markup).toContain("Availability");
        expect(markup).toContain("active");
        expect(markup).toContain("inactive");
        expect(markup).toContain("Edit");
        expect(markup).not.toContain("Delete");
    });

    test("shows a loading spinner while Expense Categories are fetched", () => {
        const markup = renderExpenseCategoriesTab("pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("data-testid=\"expense-categories-directory\"");
    });

    test("shows an error state when Expense Categories cannot be loaded", () => {
        const markup = renderExpenseCategoriesTab("error");

        expect(markup).toContain("Unable to load expense categories");
        expect(markup).toContain("Expense Categories could not be loaded right now.");
        expect(markup).toContain("Try again");
    });

    test("shows an empty state with a create action", () => {
        const markup = renderExpenseCategoriesTab("empty");

        expect(markup).toContain("No expense categories yet");
        expect(markup).toContain("Add category");
    });
});
