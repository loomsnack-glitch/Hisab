import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { BillingSalesSummaryBar } from "./billing-sales-summary-bar";
import { formatCurrency } from "@repo/ui/lib/money";

describe("BillingSalesSummaryBar", () => {
    test("renders completed count and money totals", () => {
        const markup = renderToStaticMarkup(
            <BillingSalesSummaryBar
                summary={{
                    completedCount: 4,
                    salesTotal: 800,
                    collectedTotal: 500,
                    dueTotal: 300,
                }}
            />,
        );

        expect(markup).toContain("Sales");
        expect(markup).toContain("4");
        expect(markup).toContain(formatCurrency(800));
        expect(markup).toContain(formatCurrency(500));
        expect(markup).toContain(formatCurrency(300));
        expect(markup).toContain(formatCurrency(200));
    });

    test("renders nothing without a summary", () => {
        expect(renderToStaticMarkup(<BillingSalesSummaryBar summary={null} />)).toBe("");
    });
});
