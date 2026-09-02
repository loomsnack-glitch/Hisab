import { describe, expect, test } from "bun:test";
import type { ProductResponseDTO } from "@repo/types";
import {
  catalogDefaultSellingPortion,
  catalogSellingQuantityLabel,
  parseCustomSellingQuantityInput,
} from "@repo/types";

import {
  composerFieldsFromSoldAmount,
  customSellingQuantityDialogDefaults,
} from "./sold-product-portion";

const product = (
  overrides: Partial<ProductResponseDTO> = {},
): ProductResponseDTO =>
  ({
    id: "product-1",
    organizationId: "organization-1",
    categoryId: "category-1",
    name: "Cake",
    price: 250,
    discount: 0,
    imagePath: null,
    imageSignedUrl: null,
    productType: "single",
    productCode: "cake-250",
    productCodeKind: "manufacturer",
    unitId: "unit-gram",
    defaultSellingQuantity: 250,
    allowCustomSellingQuantity: false,
    unitLabel: "g",
    status: "active",
    createdBy: "user-1",
    updatedBy: null,
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
    ...overrides,
  }) as ProductResponseDTO;

describe("POS default selling portion", () => {
  test("ordinary tap fields use the Sold Product Name and one-portion rate", () => {
    expect(catalogDefaultSellingPortion(product())).toEqual({
      soldProductName: "Cake (250g)",
      soldQuantity: 250,
      unitLabel: "g",
      unitPrice: 250,
      unitDiscount: 0,
    });
  });

  test("a product-code scan of a 1pc Product uses the same default portion as a tap", () => {
    expect(
      catalogDefaultSellingPortion(
        product({
          name: "Water Bottle",
          price: 20,
          defaultSellingQuantity: 1,
          unitLabel: "pc",
        }),
      ),
    ).toEqual({
        soldProductName: "Water Bottle (1pc)",
      soldQuantity: 1,
      unitLabel: "pc",
      unitPrice: 20,
      unitDiscount: 0,
    });
  });

  test("repeated equal default portions share Sold Product Name and amount so quantity can increase", () => {
    expect(catalogDefaultSellingPortion(product())).toEqual(
      catalogDefaultSellingPortion(product()),
    );
  });

  test("catalog listings show the selling quantity without renaming the Product", () => {
    expect(catalogSellingQuantityLabel(product())).toBe("250g");
    expect(
      catalogSellingQuantityLabel(
        product({ defaultSellingQuantity: 1, unitLabel: "pc" }),
      ),
    ).toBe("1pc");
  });
});

describe("POS custom selling portion", () => {
  test("a 500 g selection uses Cake (500g) at the proportional ₹500 rate", () => {
    expect(composerFieldsFromSoldAmount(product(), 500)).toEqual({
      name: "Cake (500g)",
      soldQuantity: 500,
      unitLabel: "g",
      unitPrice: 500,
      unitDiscount: 0,
    });
  });

  test("accepting the prefilled default amount matches the ordinary tap so those cart lines merge", () => {
    const customDefault = composerFieldsFromSoldAmount(product(), 250);
    const ordinary = catalogDefaultSellingPortion(product());

    expect(customDefault.name).toBe(ordinary.soldProductName);
    expect(customDefault.soldQuantity).toBe(ordinary.soldQuantity);
    expect(customDefault.unitPrice).toBe(ordinary.unitPrice);
  });

  test("250 g and 500 g remain distinct cart identities", () => {
    expect(composerFieldsFromSoldAmount(product(), 250).soldQuantity).toBe(250);
    expect(composerFieldsFromSoldAmount(product(), 500).soldQuantity).toBe(500);
    expect(composerFieldsFromSoldAmount(product(), 250).name).toBe("Cake (250g)");
    expect(composerFieldsFromSoldAmount(product(), 500).name).toBe("Cake (500g)");
  });

  test("the custom-amount action prefills the Default Selling Quantity and Unit label", () => {
    expect(customSellingQuantityDialogDefaults(product())).toMatchObject({
      amountInput: "250",
      unitLabel: "g",
      amountFieldLabel: "Amount (g)",
      defaultHint: "Default 250g",
      preview: {
        name: "Cake (250g)",
        soldQuantity: 250,
        unitPrice: 250,
      },
    });
  });

  test("blank, zero, negative, and over-precise amounts are rejected before the cart changes", () => {
    expect(parseCustomSellingQuantityInput("")).toBeNull();
    expect(parseCustomSellingQuantityInput("0")).toBeNull();
    expect(parseCustomSellingQuantityInput("-1")).toBeNull();
    expect(parseCustomSellingQuantityInput("1.234")).toBeNull();
    expect(parseCustomSellingQuantityInput("500")).toBe(500);
  });
});
