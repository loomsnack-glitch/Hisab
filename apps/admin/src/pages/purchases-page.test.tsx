import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PurchaseDTO } from "@repo/types";

import { purchaseKeys } from "@/lib/query-keys";
import PurchasesPage from "@/pages/purchases-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const vendorId = "11111111-1111-4111-8111-111111111111";
const vendorItemId = "44444444-4444-4444-8444-444444444444";
const unitId = "33333333-3333-4333-8333-333333333333";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const now = new Date("2026-08-31T12:00:00.000Z");

const draftPurchase: PurchaseDTO = {
    id: "88888888-8888-4888-8888-888888888888",
    organizationId,
    storeId,
    storeName: "Adajan",
    vendorId,
    vendorName: "Fresh Farms",
    lifecycle: "draft",
    payableStatus: null,
    effectiveDate: "2026-08-30",
    invoiceReference: "INV-104",
    notes: "Weekly produce",
    adjustment: 25.5,
    linesTotal: 81,
    total: 106.5,
    paidTotal: 0,
    dueAmount: null,
    recordedAt: null,
    lines: [
        {
            id: "99999999-9999-4999-8999-999999999999",
            organizationId,
            purchaseId: "88888888-8888-4888-8888-888888888888",
            vendorItemId,
            vendorItemName: "Tomato",
            unitId,
            unitLabel: "kg",
            quantity: 2,
            agreedUnitPrice: 40.5,
            lineTotal: 81,
        },
    ],
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const recordedPurchase: PurchaseDTO = {
    ...draftPurchase,
    id: "77777777-7777-4777-8777-777777777777",
    lifecycle: "recorded",
    payableStatus: "due",
    dueAmount: 106.5,
    recordedAt: now,
    invoiceReference: "INV-200",
};

const renderPurchasesPage = (
    result: "pending" | "success" | "error" | "empty" = "success",
    purchases: PurchaseDTO[] = [draftPurchase, recordedPurchase],
) => {
    const queryClient = new QueryClient();
    if (result !== "pending") {
        queryClient.setQueryData(purchaseKeys.list(organizationId), {
            status: result === "error" ? "error" : "success",
            data: result === "error" ? null : { purchases: result === "empty" ? [] : purchases },
            message: result === "error"
                ? "Purchases could not be loaded right now."
                : "Purchases fetched successfully",
            code: result === "error" ? 500 : 200,
        });
    }

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/purchases`]}>
                <Routes>
                    <Route path="/organizations/:organizationId/purchases" element={<PurchasesPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe("Admin Purchases page", () => {
    test("shows Store, Vendor, lifecycle, totals, and due amount", () => {
        const markup = renderPurchasesPage();

        expect(markup).toContain("data-testid=\"purchases-page\"");
        expect(markup).toContain("Fresh Farms");
        expect(markup).toContain("Adajan");
        expect(markup).toContain("Draft");
        expect(markup).toContain("Recorded");
        expect(markup).toContain("Due");
        expect(markup).toContain("Add purchase");
        expect(markup).toContain("Search purchases...");
        expect(markup).toContain("View");
        expect(markup).toContain("Edit");
        expect(markup).toContain(`/organizations/${organizationId}/purchases/${draftPurchase.id}`);
    });

    test("shows a loading spinner while Purchases are fetched", () => {
        const markup = renderPurchasesPage("pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("data-testid=\"purchases-page\"");
    });

    test("shows an error state when Purchases cannot be loaded", () => {
        const markup = renderPurchasesPage("error");

        expect(markup).toContain("Unable to load purchases");
        expect(markup).toContain("Purchases could not be loaded right now.");
        expect(markup).toContain("Try again");
    });

    test("shows an empty state with a create action", () => {
        const markup = renderPurchasesPage("empty");

        expect(markup).toContain("No purchases yet");
        expect(markup).toContain("Add purchase");
    });
});
