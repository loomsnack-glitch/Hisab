import { describe, expect, test } from "bun:test";
import type { ProductResponseDTO } from "@repo/types";

import {
  catalogSellingQuantityLabel,
  composerFieldsFromDefaultPortion,
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

describe("Admin default selling portion", () => {
  test("ordinary tap fields use the Sold Product Name and one-portion rate", () => {
    expect(composerFieldsFromDefaultPortion(product())).toEqual({
      name: "Cake (250g)",
      soldQuantity: 250,
      unitLabel: "g",
      unitPrice: 250,
      unitDiscount: 0,
    });
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
