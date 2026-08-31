import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PurchaseDTO } from "@repo/types";

import { formatCurrency } from "@/lib/format";
import { purchaseKeys } from "@/lib/query-keys";
import PurchaseDetailPage from "@/pages/purchase-detail-page";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const purchaseId = "88888888-8888-4888-8888-888888888888";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const vendorId = "11111111-1111-4111-8111-111111111111";
const vendorItemId = "44444444-4444-4444-8444-444444444444";
const unitId = "33333333-3333-4333-8333-333333333333";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const now = new Date("2026-08-31T12:00:00.000Z");

const draftPurchase: PurchaseDTO = {
    id: purchaseId,
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
            purchaseId,
            vendorItemId,
            vendorItemName: "Tomato",
            unitId,
            unitLabel: "kg",
            quantity: 2,
            agreedUnitPrice: 40.5,
            lineTotal: 81,
        },
    ],
    outgoingPayments: [],
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const recordedPurchase: PurchaseDTO = {
    ...draftPurchase,
    lifecycle: "recorded",
    payableStatus: "due",
    dueAmount: 106.5,
    recordedAt: now,
};

const renderDetailPage = (
    result: "pending" | "success" | "error" = "success",
    purchase: PurchaseDTO = draftPurchase,
) => {
    const queryClient = new QueryClient();
    if (result !== "pending") {
        queryClient.setQueryData(purchaseKeys.detail(organizationId, purchaseId), {
            status: result === "error" ? "error" : "success",
            data: result === "error" ? null : { purchase },
            message: result === "error"
                ? "Purchase could not be loaded right now."
                : "Purchase fetched successfully",
            code: result === "error" ? 500 : 200,
        });
    }

    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/purchases/${purchaseId}`]}>
                <Routes>
                    <Route
                        path="/organizations/:organizationId/purchases/:purchaseId"
                        element={<PurchaseDetailPage />}
                    />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe("Admin Purchase detail page", () => {
    test("shows Vendor, Store, lines, snapshots, adjustment, and draft actions", () => {
        const markup = renderDetailPage("success", draftPurchase);

        expect(markup).toContain("data-testid=\"purchase-detail-page\"");
        expect(markup).toContain("Fresh Farms");
        expect(markup).toContain("Adajan");
        expect(markup).toContain("Tomato");
        expect(markup).toContain("kg");
        expect(markup).toContain("Draft");
        expect(markup).toContain("Weekly produce");
        expect(markup).toContain("INV-104");
        expect(markup).toContain("Edit draft");
        expect(markup).toContain("Record purchase");
        expect(markup).toContain("Discard draft");
        expect(markup).toContain(formatCurrency(25.5));
        expect(markup).toContain(formatCurrency(106.5));
        expect(markup).toContain("Back to purchases");
    });

    test("shows due-only recorded Purchase without draft mutation actions", () => {
        const markup = renderDetailPage("success", recordedPurchase);

        expect(markup).toContain("Recorded");
        expect(markup).toContain("Due");
        expect(markup).toContain(formatCurrency(0));
        expect(markup).toContain(formatCurrency(106.5));
        expect(markup).not.toContain("Edit draft");
        expect(markup).not.toContain("Discard draft");
        expect(markup).not.toContain(">Record purchase<");
        expect(markup).toContain("Record payment");
        expect(markup).toContain("Outgoing Payments");
        expect(markup).toContain("No Outgoing Payments recorded yet.");
    });

    test("shows a recorded Purchase with later settlement actions and payment history", () => {
        const partialPurchase: PurchaseDTO = {
            ...recordedPurchase,
            payableStatus: "partial",
            paidTotal: 40,
            dueAmount: 66.5,
            outgoingPayments: [
                {
                    id: "12121212-1212-4121-8121-121212121212",
                    organizationId,
                    purchaseId,
                    amount: 40,
                    paymentMethod: "cash",
                    moneyAccountId: null,
                    moneyAccountName: null,
                    reference: "CASH-1",
                    notes: null,
                    paidAt: now,
                    reversedAt: null,
                    createdBy: userId,
                    createdAt: now,
                },
            ],
        };
        const markup = renderDetailPage("success", partialPurchase);

        expect(markup).toContain("Partial");
        expect(markup).toContain("Record payment");
        expect(markup).toContain("Cash");
        expect(markup).toContain("CASH-1");
        expect(markup).toContain(formatCurrency(40));
        expect(markup).toContain(formatCurrency(66.5));
        expect(markup).not.toContain("No Outgoing Payments recorded yet.");
    });

    test("shows a loading spinner while the Purchase is fetched", () => {
        const markup = renderDetailPage("pending");

        expect(markup).toContain("aria-label=\"Loading\"");
        expect(markup).not.toContain("data-testid=\"purchase-detail-page\"");
    });

    test("shows an error state when the Purchase cannot be loaded", () => {
        const markup = renderDetailPage("error");

        expect(markup).toContain("Unable to load purchase");
        expect(markup).toContain("Purchase could not be loaded right now.");
        expect(markup).toContain("Try again");
    });
});
