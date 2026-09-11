import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import { formatCurrency, formatDiscountPercentage } from "@/lib/format";

describe("ProductPriceDisplay", () => {
    test("compact discounted prices show the sale price, struck original, and percent without a savings sentence", () => {
        const markup = renderToStaticMarkup(
            <ProductPriceDisplay price={80} discount={20} compact />,
        );

        expect(markup).toContain(formatCurrency(60));
        expect(markup).toContain(formatCurrency(80));
        expect(markup).toContain(`−${formatDiscountPercentage(20, 80)}`);
        expect(markup).not.toContain("Save ");
        expect(markup).not.toContain("Effective price");
        expect(markup).not.toContain("Org default");
    });

    test("stacked discounted prices still explain the savings amount", () => {
        const markup = renderToStaticMarkup(
            <ProductPriceDisplay price={80} discount={20} />,
        );

        expect(markup).toContain(`Save ${formatCurrency(20)}`);
        expect(markup).toContain(formatDiscountPercentage(20, 80));
    });
});
