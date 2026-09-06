import { beforeEach, describe, expect, test } from "bun:test";
import {
  catalogService,
  countActiveBundlesByComponentProductId,
  countActiveCombosByOptionProductId,
  getOrganizationByIdForUser,
  getProductById,
  getStoreProductOfferingOverrideSummary,
  getStoreProductOfferingsByProductId,
  getStoresByOrganizationId,
  organization,
  organizationId,
  product,
  productId,
  store,
  storeProductOffering,
  updateProductRepo,
  userId,
  vesuStore,
} from "./catalog.service.test-harness";

describe("Catalog Product Organization defaults", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getStoresByOrganizationId.mockClear();
    getStoresByOrganizationId.mockResolvedValue([store, vesuStore]);
    getProductById.mockClear();
    getProductById.mockResolvedValue({ ...product });
    getStoreProductOfferingsByProductId.mockClear();
    getStoreProductOfferingsByProductId.mockResolvedValue([
      {
        ...storeProductOffering,
        priceOverride: null,
        discountOverride: 30,
        effectivePrice: product.price,
        effectiveDiscount: 30,
        isPriceInherited: true,
        isDiscountInherited: false,
      },
    ]);
    updateProductRepo.mockClear();
    updateProductRepo.mockImplementation(async (data) => ({
      ...product,
      ...data,
      unitLabel: "pc",
    }));
    countActiveBundlesByComponentProductId.mockClear();
    countActiveBundlesByComponentProductId.mockResolvedValue(0);
    countActiveCombosByOptionProductId.mockClear();
    countActiveCombosByOptionProductId.mockResolvedValue(0);
    getStoreProductOfferingOverrideSummary.mockClear();
  });

  test("updates Organization default price without writing Store override rows", async () => {
    const response = await catalogService.updateProduct(userId, organizationId, productId, {
      price: 120,
    });

    expect(response.status).toBe("success");
    expect(updateProductRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: productId,
        price: 120,
        discount: product.discount,
      }),
    );
    expect(getStoreProductOfferingsByProductId).toHaveBeenCalledWith(
      organizationId,
      productId,
    );
  });

  test("rejects Organization default changes that create invalid effective pairs at overridden Stores", async () => {
    const response = await catalogService.updateProduct(userId, organizationId, productId, {
      price: 20,
    });

    expect(response.status).toBe("error");
    expect(response.message).toContain("effective discount exceed");
    expect(updateProductRepo).not.toHaveBeenCalled();
  });

  test("returns inferred Store override counts for Organization review", async () => {
    getStoreProductOfferingOverrideSummary.mockResolvedValue({
      totalOfferings: 4,
      fullyInherited: 2,
      priceOverridden: 1,
      discountOverridden: 0,
      bothOverridden: 1,
    });

    const response = await catalogService.getStoreProductOfferingOverrideSummary(
      userId,
      organizationId,
    );

    expect(response.status).toBe("success");
    expect(response.data?.summary).toEqual({
      totalOfferings: 4,
      fullyInherited: 2,
      priceOverridden: 1,
      discountOverridden: 0,
      bothOverridden: 1,
    });
  });
});
