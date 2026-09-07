import { describe, expect, test } from "bun:test";

import {
  inactiveProductCodesWithoutActiveOffering,
  overlayActiveStoreProductOfferings,
} from "./store-product-offering-catalog";

const burger = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Burger",
  price: 100,
  discount: 10,
  status: "active" as const,
  productCode: "BURGER-1",
};

const cake = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Cake",
  price: 250,
  discount: 0,
  status: "active" as const,
  productCode: "CAKE-1",
};

describe("Store Product Offering catalog overlay", () => {
  test("Billing shows only active Offerings with the Store's trusted price and discount", () => {
    const products = overlayActiveStoreProductOfferings([burger, cake], [
      {
        productId: burger.id,
        effectivePrice: 175,
        effectiveDiscount: 25,
        status: "active",
      },
      {
        productId: cake.id,
        effectivePrice: 250,
        effectiveDiscount: 0,
        status: "inactive",
      },
    ]);

    expect(products).toEqual([
      {
        ...burger,
        price: 175,
        discount: 25,
        status: "active",
      },
    ]);
  });

  test("coded Catalog Products without an active Offering stay available only for scan recovery", () => {
    expect(
      inactiveProductCodesWithoutActiveOffering([burger, cake], [
        {
          productId: burger.id,
          effectivePrice: 80,
          effectiveDiscount: 5,
          status: "active",
        },
      ]),
    ).toEqual([{ productCode: "CAKE-1", productName: "Cake" }]);
  });
});
