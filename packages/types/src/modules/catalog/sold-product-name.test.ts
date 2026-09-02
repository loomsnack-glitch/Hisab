import { describe, expect, test } from "bun:test";
import {
  canOfferCustomSellingQuantity,
  catalogDefaultSellingPortion,
  catalogSellingQuantityLabel,
  catalogSoldPortionForAmount,
  defaultCatalogSoldPortion,
  formatSoldAmount,
  formatSoldProductName,
  isSameSoldAmount,
  parseCustomSellingQuantityInput,
  proportionalProductPrice,
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

  test("provides one shared priced portion and label for Catalog Product displays", () => {
    const product = {
      name: "Cake",
      price: 250,
      discount: 10,
      defaultSellingQuantity: 250,
      unitLabel: "g",
    };

    expect(catalogDefaultSellingPortion(product)).toEqual({
      soldQuantity: 250,
      unitLabel: "g",
      soldProductName: "Cake (250g)",
      unitPrice: 250,
      unitDiscount: 10,
    });
    expect(catalogSellingQuantityLabel(product)).toBe("250g");
  });

  test("treats an omitted Unit as one piece so existing Products keep a 1pc portion", () => {
    expect(defaultCatalogSoldPortion({ name: "Burger" })).toEqual({
      soldQuantity: 1,
      unitLabel: "pc",
      soldProductName: "Burger (1pc)",
    });
  });
});

describe("Custom Selling Quantity", () => {
  test("accepts only positive amounts with at most two decimal places", () => {
    expect(parseCustomSellingQuantityInput("250")).toBe(250);
    expect(parseCustomSellingQuantityInput("250.5")).toBe(250.5);
    expect(parseCustomSellingQuantityInput("0.75")).toBe(0.75);
    expect(parseCustomSellingQuantityInput("")).toBeNull();
    expect(parseCustomSellingQuantityInput("0")).toBeNull();
    expect(parseCustomSellingQuantityInput("-1")).toBeNull();
    expect(parseCustomSellingQuantityInput("1.234")).toBeNull();
    expect(parseCustomSellingQuantityInput("abc")).toBeNull();
  });

  test("calculates a custom portion rate as configured price times amount divided by Default Selling Quantity", () => {
    expect(proportionalProductPrice(250, 500, 250)).toBe(500);
    expect(proportionalProductPrice(250, 250, 250)).toBe(250);
    expect(proportionalProductPrice(20, 0.75, 1)).toBe(15);
  });

  test("rounds a custom one-portion rate to the nearest paise before quantity multiplication", () => {
    expect(proportionalProductPrice(10, 1, 3)).toBe(3.33);
    expect(proportionalProductPrice(10, 2, 3)).toBe(6.67);
  });

  test("Cake 250 g for ₹250 becomes Cake (500g) at ₹500 for a 500 g selection", () => {
    expect(
      catalogSoldPortionForAmount(
        {
          name: "Cake",
          price: 250,
          discount: 0,
          defaultSellingQuantity: 250,
          unitLabel: "g",
        },
        500,
      ),
    ).toEqual({
      soldQuantity: 500,
      unitLabel: "g",
      soldProductName: "Cake (500g)",
      unitPrice: 500,
      unitDiscount: 0,
    });
  });

  test("the unchanged default amount matches the ordinary portion so those lines merge", () => {
    const product = {
      name: "Cake",
      price: 250,
      defaultSellingQuantity: 250,
      unitLabel: "g",
    };
    const customDefault = catalogSoldPortionForAmount(product, 250);
    const ordinary = defaultCatalogSoldPortion(product);

    expect(customDefault.soldQuantity).toBe(ordinary.soldQuantity);
    expect(customDefault.soldProductName).toBe(ordinary.soldProductName);
    expect(customDefault.unitPrice).toBe(250);
    expect(isSameSoldAmount(250, 250.0)).toBe(true);
    expect(isSameSoldAmount(250, 500)).toBe(false);
  });

  test("only an eligible single Product can offer Custom Selling Quantity", () => {
    expect(
      canOfferCustomSellingQuantity({
        productType: "single",
        allowCustomSellingQuantity: true,
        status: "active",
      }),
    ).toBe(true);
    expect(
      canOfferCustomSellingQuantity({
        productType: "single",
        allowCustomSellingQuantity: false,
        status: "active",
      }),
    ).toBe(false);
    expect(
      canOfferCustomSellingQuantity({
        productType: "combo",
        allowCustomSellingQuantity: true,
        status: "active",
      }),
    ).toBe(false);
    expect(
      canOfferCustomSellingQuantity({
        productType: "bundle",
        allowCustomSellingQuantity: true,
        status: "active",
      }),
    ).toBe(false);
  });
});
