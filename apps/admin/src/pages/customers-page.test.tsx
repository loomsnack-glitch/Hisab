import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { CustomerDTO } from "@repo/types";

import { billingKeys } from "@/lib/query-keys";
import CustomersPage from "@/pages/customers-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = new Date("2026-08-31T12:00:00.000Z");
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const createCustomer = (overrides: Partial<CustomerDTO> & Pick<CustomerDTO, "id" | "name">): CustomerDTO => ({
    organizationId,
    phone: null,
    balance: 0,
    isActive: true,
    marketingOptedOut: false,
    marketingOptedIn: false,
    marketingOptedInAt: null,
    marketingOptInSource: null,
    utilityOptedIn: true,
    utilityOptedInAt: null,
    utilityOptInSource: null,
    whatsappSuppressed: false,
    whatsappSuppressedAt: null,
    whatsappSuppressionReason: null,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
});

const riya = createCustomer({
    id: "11111111-1111-4111-8111-111111111111",
    name: "Riya Shah",
    phone: "+919876543210",
    balance: 120,
});

const amit = createCustomer({
    id: "22222222-2222-4222-8222-222222222222",
    name: "Amit Patel",
    isActive: false,
});

const searchFromPath = (path: string) => (path.includes("?") ? path.slice(path.indexOf("?")) : "");

const filtersFromPath = (path: string) => {
    const params = new URLSearchParams(searchFromPath(path));
    const search = params.get("search")?.trim() || undefined;
    const statuses = params.get("statuses")?.split(",").filter(Boolean);
    const dues = params.get("dues")?.split(",").filter(Boolean);
    const sort = params.get("sort") || undefined;
    return { search, statuses, dues, sort };
};

const seedCustomers = (
    queryClient: QueryClient,
    result: "success" | "error" | "empty",
    customers: CustomerDTO[],
    query: { search?: string; statuses?: string[]; dues?: string[]; sort?: string } = {},
) => {
    const statusFilter = query.statuses?.length ? query.statuses : ["active"];
    const dueFilter = query.dues ?? [];
    const allCustomers = result === "empty" ? [] : customers;
    const pagedCustomers = allCustomers.filter((customer) => {
        if (statusFilter.length === 1) {
            if (statusFilter[0] === "active" && !customer.isActive) return false;
            if (statusFilter[0] === "inactive" && customer.isActive) return false;
        }
        if (dueFilter.length === 1) {
            if (dueFilter[0] === "has_due" && customer.balance <= 0) return false;
            if (dueFilter[0] === "no_due" && customer.balance > 0) return false;
        }
        if (!query.search?.trim()) return true;
        const search = query.search.trim().toLowerCase();
        return customer.name.toLowerCase().includes(search)
            || (customer.phone ?? "").toLowerCase().includes(search);
    });
    const payload = {
        status: result === "error" ? "error" : "success",
        data: result === "error"
            ? null
            : {
                customers: pagedCustomers,
                pageInfo: {
                    hasMore: false,
                    nextCursor: null,
                    totalCount: pagedCustomers.length,
                    page: 1,
                    pageSize: 50,
                    totalPages: 1,
                },
            },
        message: result === "error" ? "Customers failed to load" : "Customers fetched successfully",
        code: result === "error" ? 500 : 200,
    };
    const pagedQuery = {
        search: query.search,
        statuses: statusFilter,
        dues: dueFilter.length > 0 ? dueFilter : undefined,
        sort: query.sort ?? "newest",
        page: 1,
        limit: 50,
    };
    queryClient.setQueryData(
        billingKeys.customers(organizationId, { mode: "admin", ...pagedQuery }),
        payload,
    );
    queryClient.setQueryData(
        billingKeys.customers(organizationId, {
            mode: "admin",
            search: undefined,
            statuses: ["active"],
            dues: undefined,
            sort: "newest",
            page: 1,
            limit: 50,
        }),
        payload,
    );
};

const renderCustomersPage = (
    result: "pending" | "success" | "error" | "empty" = "success",
    customers: CustomerDTO[] = [riya, amit],
    path = `/organizations/${organizationId}/customers`,
) => {
    const queryClient = new QueryClient();
    const urlFilters = filtersFromPath(path);
    if (result !== "pending") {
        seedCustomers(queryClient, result, customers, urlFilters);
    }

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <NuqsTestingAdapter searchParams={searchFromPath(path)}>
                <MemoryRouter initialEntries={[path]}>
                    <Routes>
                        <Route path="/organizations/:organizationId/customers" element={<CustomersPage />} />
                    </Routes>
                </MemoryRouter>
            </NuqsTestingAdapter>
        </QueryClientProvider>,
    );
};

describe("Admin Customers page", () => {
    test("defaults to active customers and keeps search and status filters in the URL", () => {
        const markup = renderCustomersPage();

        expect(markup).toContain("data-testid=\"customers-page\"");
        expect(markup).toContain("data-testid=\"customer-directory\"");
        expect(markup).toContain("Riya Shah");
        expect(markup).not.toContain("Amit Patel");
        expect(markup).toContain("Search customers...");
        expect(markup).toContain("Add customer");
        expect(markup).toContain("Status");
        expect(markup).toContain("Due");
        expect(markup).toContain("1 customer");
    });

    test("shows a loading spinner while customers are fetched", () => {
        const markup = renderCustomersPage("pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("Riya Shah");
    });

    test("shows an error state when customers cannot be loaded", () => {
        const markup = renderCustomersPage("error");

        expect(markup).toContain("Customers could not be loaded.");
        expect(markup).toContain("Try again");
    });

    test("shows an empty state with a create action", () => {
        const markup = renderCustomersPage("empty");

        expect(markup).toContain("No customers found");
        expect(markup).toContain("Add your first customer to get started.");
        expect(markup).toContain("Add customer");
    });

    test("reads search and status filters from the URL", () => {
        const markup = renderCustomersPage(
            "success",
            [riya, amit],
            `/organizations/${organizationId}/customers?search=Amit&statuses=inactive`,
        );

        expect(markup).toContain("value=\"Amit\"");
        expect(markup).toContain("Amit Patel");
        expect(markup).not.toContain("Riya Shah");
    });
});
