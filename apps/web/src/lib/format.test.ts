import { describe, expect, test } from "bun:test";

import { formatDiscountPercentage, getDiscountPercentage } from "./format";

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
