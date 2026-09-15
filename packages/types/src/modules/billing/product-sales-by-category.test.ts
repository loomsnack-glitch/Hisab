import { describe, expect, test } from "bun:test";

import {
    aggregateProductSalesByCategory,
    buildSalesDistributionSlices,
    mergeProductSalesByProductId,
} from "./product-sales-by-category";

const product = (
    productId: string,
    productName: string,
    categoryName: string | null,
    quantitySold: number,
) => ({
    productId,
    productName,
    categoryName,
    quantitySold,
});

const burger = (n: number, name: string, quantitySold: number) =>
    product(
        `11111111-1111-4111-8111-11111111111${n}`,
        name,
        "Burgers",
        quantitySold,
    );

describe("mergeProductSalesByProductId", () => {
    test("combines the same product sold under different names into one ranked row", () => {
        const summary = mergeProductSalesByProductId([
            product(
                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "Aloo Tikki (1pc)",
                "burgers A",
                11,
            ),
            product(
                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "Aloo Tikki",
                "burgers A",
                80,
            ),
            product(
                "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                "Cheese Vadapav",
                "vadapav A",
                35,
            ),
        ]);

        expect(summary).toEqual([
            {
                productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                productName: "Aloo Tikki",
                categoryName: "burgers A",
                quantitySold: 91,
            },
            {
                productId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                productName: "Cheese Vadapav",
                categoryName: "vadapav A",
                quantitySold: 35,
            },
        ]);
    });
});

describe("aggregateProductSalesByCategory", () => {
    test("ranks a category of many flavours above a single higher-selling product", () => {
        const summary = aggregateProductSalesByCategory([
            product(
                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "Cold Drink",
                "Beverages",
                40,
            ),
            burger(1, "Classic Burger", 12),
            burger(2, "Cheese Burger", 10),
            burger(3, "Veg Burger", 8),
            burger(4, "Chicken Burger", 7),
            burger(5, "Spicy Burger", 6),
            burger(6, "Double Burger", 5),
            burger(7, "Paneer Burger", 4),
        ]);

        expect(summary).toEqual([
            {
                categoryName: "Burgers",
                quantitySold: 52,
                productCount: 7,
            },
            {
                categoryName: "Beverages",
                quantitySold: 40,
                productCount: 1,
            },
        ]);
    });

    test("groups products without a category as Uncategorized", () => {
        const summary = aggregateProductSalesByCategory([
            product(
                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "House Special",
                null,
                3,
            ),
            product(
                "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                "Staff Meal",
                "  ",
                2,
            ),
        ]);

        expect(summary).toEqual([
            {
                categoryName: "Uncategorized",
                quantitySold: 5,
                productCount: 2,
            },
        ]);
    });

    test("returns no categories when nothing was sold", () => {
        expect(aggregateProductSalesByCategory([])).toEqual([]);
    });
});

describe("buildSalesDistributionSlices", () => {
    test("keeps every row when there are few enough slices", () => {
        expect(
            buildSalesDistributionSlices([
                { name: "Burgers", quantitySold: 52 },
                { name: "Beverages", quantitySold: 40 },
            ]),
        ).toEqual([
            { name: "Burgers", value: 52 },
            { name: "Beverages", value: 40 },
        ]);
    });

    test("folds the long tail into Other so the pie stays readable", () => {
        const slices = buildSalesDistributionSlices(
            Array.from({ length: 10 }, (_, index) => ({
                name: `Item ${index + 1}`,
                quantitySold: 10 - index,
            })),
            4,
        );

        expect(slices).toEqual([
            { name: "Item 1", value: 10 },
            { name: "Item 2", value: 9 },
            { name: "Item 3", value: 8 },
            { name: "Other", value: 28 },
        ]);
    });

    test("drops rows with no units sold", () => {
        expect(
            buildSalesDistributionSlices([
                { name: "Burgers", quantitySold: 12 },
                { name: "Sides", quantitySold: 0 },
            ]),
        ).toEqual([{ name: "Burgers", value: 12 }]);
    });
});
