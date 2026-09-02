import { describe, expect, test } from "bun:test";
import {
  defaultCatalogSoldPortion,
  formatSoldAmount,
  formatSoldProductName,
} from "./sold-product-name";

describe("Sold Product Name", () => {
  test("formats the amount suffix without a space before the Unit label", () => {
    expect(formatSoldProductName("Water Bottle", 1, "pc")).toBe(
      "Water Bottle (1pc)",
    );
    expect(formatSoldProductName("Cake", 250, "g")).toBe("Cake (250g)");
    expect(formatSoldProductName("Rice", 0.75, "kg")).toBe("Rice (0.75kg)");
  });

  test("drops meaningless trailing decimal zeroes from the sold amount", () => {
    expect(formatSoldAmount(1)).toBe("1");
    expect(formatSoldAmount(250)).toBe("250");
    expect(formatSoldAmount(250.5)).toBe("250.5");
    expect(formatSoldAmount(0.75)).toBe("0.75");
  });

  test("uses the Product Default Selling Quantity and Unit label for one ordinary portion", () => {
    expect(
      defaultCatalogSoldPortion({
        name: "Cake",
        defaultSellingQuantity: 250,
        unitLabel: "g",
      }),
    ).toEqual({
      soldQuantity: 250,
      unitLabel: "g",
      soldProductName: "Cake (250g)",
    });
  });

  test("treats an omitted Unit as one piece so existing Products keep a 1pc portion", () => {
    expect(defaultCatalogSoldPortion({ name: "Burger" })).toEqual({
      soldQuantity: 1,
      unitLabel: "pc",
      soldProductName: "Burger (1pc)",
    });
  });
});
