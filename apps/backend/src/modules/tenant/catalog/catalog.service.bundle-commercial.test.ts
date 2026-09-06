import { beforeEach, describe, expect, test } from "bun:test";
import {
  begin,
  burger,
  burgerId,
  bundleId,
  catalogService,
  category,
  categoryId,
  countActiveBundlesByComponentProductId,
  createProductRepo,
  createStoreProductOfferingRepo,
  deleteBundleProductComponentsByBundleProductId,
  existingBundle,
  getBundleProductComponentsByBundleProductId,
  getCategoryById,
  getOrganizationByIdForUser,
  getProductById,
  getStoreProductOfferingById,
  getStoreProductOfferingsByProductId,
  getStoreProductOfferingsByStoreId,
  getStoresByOrganizationId,
  lockStoreProductOfferingTopology,
  organization,
  organizationId,
  offeringId,
  productNameExistsInCategory,
  store,
  storeProductOffering,
  updateProductRepo,
  updateStoreProductOfferingRepo,
  userId,
  vesuStore,
} from "./catalog.service.test-harness";

const bundleOffering = {
  ...storeProductOffering,
  productId: bundleId,
  product: { ...existingBundle, id: bundleId, name: "Burger Combo" },
};

describe("Bundle Product commercial inheritance", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getCategoryById.mockClear();
    getCategoryById.mockResolvedValue(category);
    productNameExistsInCategory.mockClear();
    productNameExistsInCategory.mockResolvedValue(false);
    getStoresByOrganizationId.mockClear();
    getStoresByOrganizationId.mockResolvedValue([store, vesuStore]);
    begin.mockClear();
    begin.mockImplementation(async (callback) => callback({}));
    getProductById.mockClear();
    getProductById.mockImplementation(async (_organizationId: string, productId: string) => {
      if (productId === burgerId) return burger;
      if (productId === bundleId) {
        return { ...existingBundle, id: bundleId, name: "Burger Combo" };
      }
      return null;
    });
    createProductRepo.mockClear();
    createProductRepo.mockImplementation(async (data) => ({
      ...existingBundle,
      ...data,
      unitLabel: "pc",
    }));
    createStoreProductOfferingRepo.mockClear();
    lockStoreProductOfferingTopology.mockClear();
    createStoreProductOfferingRepo.mockImplementation(async (data) => ({
      ...storeProductOffering,
      ...data,
    }));
    getBundleProductComponentsByBundleProductId.mockClear();
    getBundleProductComponentsByBundleProductId.mockResolvedValue([]);
    deleteBundleProductComponentsByBundleProductId.mockClear();
    updateProductRepo.mockClear();
    updateProductRepo.mockImplementation(async (data) => ({
      ...existingBundle,
      id: bundleId,
      ...data,
      unitLabel: "pc",
    }));
    getStoreProductOfferingsByStoreId.mockClear();
    getStoreProductOfferingsByStoreId.mockResolvedValue([
      {
        ...bundleOffering,
        priceOverride: 120,
        discountOverride: null,
        effectivePrice: 120,
        effectiveDiscount: existingBundle.discount,
        isPriceInherited: false,
        isDiscountInherited: true,
      },
    ]);
    getStoreProductOfferingById.mockClear();
    getStoreProductOfferingById.mockResolvedValue(bundleOffering);
    getStoreProductOfferingsByProductId.mockClear();
    getStoreProductOfferingsByProductId.mockResolvedValue([
      {
        ...bundleOffering,
        priceOverride: null,
        discountOverride: 55,
        effectivePrice: existingBundle.price,
        effectiveDiscount: 55,
        isPriceInherited: true,
        isDiscountInherited: false,
      },
    ]);
    updateStoreProductOfferingRepo.mockClear();
    updateStoreProductOfferingRepo.mockImplementation(async (data) => ({
      ...bundleOffering,
      ...data,
      effectivePrice: data.priceOverride ?? existingBundle.price,
      effectiveDiscount: data.discountOverride ?? existingBundle.discount,
      isPriceInherited: data.priceOverride === null,
      isDiscountInherited: data.discountOverride === null,
    }));
    countActiveBundlesByComponentProductId.mockClear();
    countActiveBundlesByComponentProductId.mockResolvedValue(0);
  });

  test("creating a Bundle Product seeds inherited Store Offerings for every current Store", async () => {
    const response = await catalogService.createBundleProduct(userId, organizationId, {
      categoryId,
      name: "Burger Combo",
      price: 99,
      discount: 5,
      components: [{ productId: burgerId, quantity: 1 }],
    });

    expect(response.status).toBe("success");
    expect(createStoreProductOfferingRepo).toHaveBeenCalledTimes(2);
    expect(createStoreProductOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: store.id,
        priceOverride: null,
        discountOverride: null,
        status: "active",
      }),
      expect.anything(),
    );
    expect(createStoreProductOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: vesuStore.id,
        priceOverride: null,
        discountOverride: null,
        status: "active",
      }),
      expect.anything(),
    );
    expect(lockStoreProductOfferingTopology).toHaveBeenCalled();
  });

  test("a Store can override a Bundle Product price independently of its components", async () => {
    const response = await catalogService.updateStoreProductOffering(
      userId,
      organizationId,
      store.id,
      offeringId,
      { priceOverride: 120, discountOverride: 10, status: "active" },
    );

    expect(response.status).toBe("success");
    expect(updateStoreProductOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        priceOverride: 120,
        discountOverride: 10,
      }),
    );
    expect(response.data?.offering.effectivePrice).toBe(120);
    expect(response.data?.offering.effectiveDiscount).toBe(10);
    expect(response.data?.offering.isPriceInherited).toBe(false);
  });

  test("a Store Bundle Products list exposes effective inherited or overridden values", async () => {
    const response = await catalogService.getStoreProductOfferings(
      userId,
      organizationId,
      store.id,
    );

    expect(response.status).toBe("success");
    expect(response.data?.offerings[0]).toEqual(
      expect.objectContaining({
        productId: bundleId,
        effectivePrice: 120,
        isPriceInherited: false,
        isDiscountInherited: true,
        product: expect.objectContaining({
          productType: "bundle",
          name: "Burger Combo",
        }),
      }),
    );
  });

  test("updating Bundle Organization defaults rejects invalid effective pairs at overridden Stores", async () => {
    const response = await catalogService.updateBundleProduct(
      userId,
      organizationId,
      bundleId,
      {
        price: 50,
        discount: 0,
      },
    );

    expect(response.status).toBe("error");
    expect(response.message).toContain(
      "effective discount exceed the effective price",
    );
    expect(updateProductRepo).not.toHaveBeenCalled();
  });
});
