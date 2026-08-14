import { beforeEach, describe, expect, test } from "bun:test";
import {
  catalogService,
  getOrganizationByIdForUser,
  getProductById,
  getProductLabelProfileByProductId,
  organization,
  organizationId,
  product,
  productId,
  updateProductRepo,
  upsertProductLabelProfileRepo,
  userId,
} from "./catalog.service.test-harness";

describe("Product Label Profile catalog service", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getProductById.mockClear();
    getProductLabelProfileByProductId.mockClear();
    upsertProductLabelProfileRepo.mockClear();
    updateProductRepo.mockClear();

    getOrganizationByIdForUser.mockResolvedValue(organization);
    getProductById.mockResolvedValue(product);
    getProductLabelProfileByProductId.mockResolvedValue(null);
    upsertProductLabelProfileRepo.mockImplementation(async (data) => ({
      ingredients: data.ingredients ?? null,
      nutrition: data.nutrition ?? null,
      netWeight: data.netWeight ?? null,
      unitSellingPriceText: data.unitSellingPriceText ?? null,
      mrp: data.mrp ?? null,
      shelfLifeDays: data.shelfLifeDays ?? null,
    }));
  });

  test("round-trips optional Product Label Profile fields", async () => {
    const response = await catalogService.updateProductLabelProfile(
      userId,
      organizationId,
      productId,
      {
        ingredients: "Wheat flour, jeera, salt",
        nutrition: [
          { name: "Energy", quantity: "450", unit: "kcal" },
          { name: "Protein", quantity: "12", unit: "g" },
        ],
        netWeight: "200 g",
        unitSellingPriceText: "₹10 per piece",
        mrp: 149,
        shelfLifeDays: 90,
      },
    );

    expect(response.status).toBe("success");
    expect(response.data?.product.labelProfile).toEqual({
      ingredients: "Wheat flour, jeera, salt",
      nutrition: [
        { name: "Energy", quantity: "450", unit: "kcal" },
        { name: "Protein", quantity: "12", unit: "g" },
      ],
      netWeight: "200 g",
      unitSellingPriceText: "₹10 per piece",
      mrp: 149,
      shelfLifeDays: 90,
    });
    expect(upsertProductLabelProfileRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        productId,
        organizationId,
        mrp: 149,
        shelfLifeDays: 90,
      }),
    );
    expect(updateProductRepo).not.toHaveBeenCalled();
  });

  test("clears optional Product Label Profile fields without deleting the Product", async () => {
    getProductLabelProfileByProductId.mockResolvedValue({
      ingredients: "Old ingredients",
      nutrition: [{ name: "Energy", quantity: "1", unit: "kcal" }],
      netWeight: "100 g",
      unitSellingPriceText: "Old text",
      mrp: 99,
      shelfLifeDays: 30,
    });

    const response = await catalogService.updateProductLabelProfile(
      userId,
      organizationId,
      productId,
      {
        ingredients: "",
        nutrition: null,
        netWeight: "",
        unitSellingPriceText: "",
        mrp: "",
        shelfLifeDays: "",
      },
    );

    expect(response.status).toBe("success");
    expect(response.data?.product.labelProfile).toEqual({
      ingredients: null,
      nutrition: null,
      netWeight: null,
      unitSellingPriceText: null,
      mrp: null,
      shelfLifeDays: null,
    });
    expect(getProductById).toHaveBeenCalledWith(organizationId, productId);
    expect(updateProductRepo).not.toHaveBeenCalled();
  });

  test("keeps Product selling price, discount, and Product Code unchanged when updating the label profile", async () => {
    const response = await catalogService.updateProductLabelProfile(
      userId,
      organizationId,
      productId,
      { mrp: 199 },
    );

    expect(response.status).toBe("success");
    expect(response.data?.product.price).toBe(product.price);
    expect(response.data?.product.discount).toBe(product.discount);
    expect(response.data?.product.productCode).toBe(product.productCode);
    expect(response.data?.product.productCodeKind).toBe(product.productCodeKind);
    expect(updateProductRepo).not.toHaveBeenCalled();
    expect(upsertProductLabelProfileRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        mrp: 199,
        ingredients: null,
        nutrition: null,
        netWeight: null,
        unitSellingPriceText: null,
        shelfLifeDays: null,
      }),
    );
  });
});
