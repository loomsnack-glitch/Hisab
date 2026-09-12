import { describe, expect, test } from "bun:test";

import {
    formatCurrency,
    formatDiscountPercentage,
    getAverageBillPerOrder,
    getDiscountPercentage,
    getDiscountedPrice,
} from "./money";

describe("formatCurrency", () => {
    test("formats INR amounts", () => {
        expect(formatCurrency(120)).toContain("120");
        expect(formatCurrency("80.5")).toContain("80.5");
    });

    test("treats invalid values as zero", () => {
        expect(formatCurrency("nope")).toBe(formatCurrency(0));
        expect(formatCurrency(null)).toBe(formatCurrency(0));
    });
});

describe("discount formatting", () => {
    test("calculates a discount percentage from the original amount", () => {
        expect(getDiscountPercentage(25, 100)).toBe(25);
        expect(formatDiscountPercentage(25, 100)).toBe("25%");
    });

    test("rounds percentages to one decimal place", () => {
        expect(formatDiscountPercentage(10, 80)).toBe("12.5%");
    });

    test("does not calculate a percentage without a positive base", () => {
        expect(getDiscountPercentage(10, 0)).toBeNull();
        expect(formatDiscountPercentage(0, 100)).toBeNull();
    });
});

describe("average bill per order", () => {
    test("divides total sales by the number of completed orders", () => {
        expect(getAverageBillPerOrder(600, 2)).toBe(300);
    });

    test("is zero when there are no completed orders", () => {
        expect(getAverageBillPerOrder(0, 0)).toBe(0);
    });
});

describe("discounted price", () => {
    test("subtracts the discount and never goes below zero", () => {
        expect(getDiscountedPrice(80, 20)).toBe(60);
        expect(getDiscountedPrice(20, 50)).toBe(0);
    });
});
