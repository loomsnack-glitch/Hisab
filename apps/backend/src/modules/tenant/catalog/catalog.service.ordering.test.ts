import { beforeEach, describe, expect, test } from "bun:test";

import {
  catalogService,
  bundleId,
  category,
  coffee,
  getCategoriesByOrganizationId,
  getOrganizationByIdForUser,
  getProductsByCategoryId,
  organization,
  organizationId,
  product,
  reorderCategoriesRepo,
  reorderProductsRepo,
  userId,
} from "./catalog.service.test-harness";

describe("Catalog ordering", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getCategoriesByOrganizationId.mockClear();
    getCategoriesByOrganizationId.mockResolvedValue([
      { ...category },
      { ...category, id: bundleId },
    ]);
    getProductsByCategoryId.mockClear();
    getProductsByCategoryId.mockResolvedValue([
      { ...product },
      { ...product, id: coffee.id },
    ]);
    reorderCategoriesRepo.mockClear();
    reorderProductsRepo.mockClear();
  });

  test("accepts a complete category order for the organization", async () => {
    const response = await catalogService.reorderCategories(
      userId,
      organizationId,
      {
        categoryIds: [category.id, bundleId],
      },
    );

    expect(response.status).toBe("success");
    expect(reorderCategoriesRepo).toHaveBeenCalledWith(
      organizationId,
      [category.id, bundleId],
      userId,
      expect.anything(),
    );
  });

  test("rejects an incomplete category order", async () => {
    const response = await catalogService.reorderCategories(
      userId,
      organizationId,
      {
        categoryIds: [category.id],
      },
    );

    expect(response.status).toBe("error");
    expect(response.code).toBe(400);
    expect(reorderCategoriesRepo).not.toHaveBeenCalled();
  });

  test("accepts a complete product order within one category", async () => {
    const response = await catalogService.reorderProducts(
      userId,
      organizationId,
      {
        categoryId: category.id,
        productIds: [product.id, coffee.id],
      },
    );

    expect(response.status).toBe("success");
    expect(reorderProductsRepo).toHaveBeenCalledWith(
      organizationId,
      category.id,
      [product.id, coffee.id],
      userId,
      expect.anything(),
    );
  });

  test("rejects a product order containing a product from another category", async () => {
    getProductsByCategoryId.mockResolvedValue([{ ...product }]);

    const response = await catalogService.reorderProducts(
      userId,
      organizationId,
      {
        categoryId: category.id,
        productIds: [product.id, coffee.id],
      },
    );

    expect(response.status).toBe("error");
    expect(response.code).toBe(400);
    expect(reorderProductsRepo).not.toHaveBeenCalled();
  });
});
