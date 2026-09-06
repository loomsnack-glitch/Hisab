import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  catalogService,
  categoryId,
  createProductRepo,
  createStoreProductOfferingRepo,
  getActiveStoreCatalogProducts,
  getOrganizationByIdForUser,
  getProductById,
  getProductsByOrganizationId,
  getStoreById,
  lockStoreProductOfferingTopology,
  getStoreProductOfferingById,
  getStoreProductOfferingsByStoreId,
  getStoresByOrganizationId,
  offeringId,
  organization,
  organizationId,
  product,
  productId,
  productNameExistsInCategory,
  store,
  storeProductOffering,
  updateStoreProductOfferingRepo,
  userId,
  vesuStore,
} from "./catalog.service.test-harness";

describe("Store Product Offerings", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getStoresByOrganizationId.mockClear();
    getStoresByOrganizationId.mockResolvedValue([store, vesuStore]);
    getStoreById.mockClear();
    getStoreById.mockImplementation(async (_organizationId: string, storeId: string) => {
      if (storeId === store.id) return store;
      if (storeId === vesuStore.id) return vesuStore;
      return null;
    });
    productNameExistsInCategory.mockClear();
    productNameExistsInCategory.mockResolvedValue(false);
    getProductById.mockClear();
    getProductById.mockResolvedValue({ ...product });
    createProductRepo.mockClear();
    createProductRepo.mockImplementation(async (data) => ({
      ...product,
      ...data,
      unitLabel: "pc",
    }));
    createStoreProductOfferingRepo.mockClear();
    lockStoreProductOfferingTopology.mockClear();
    createStoreProductOfferingRepo.mockImplementation(async (data) => ({
      ...storeProductOffering,
      ...data,
    }));
    getStoreProductOfferingsByStoreId.mockClear();
    getStoreProductOfferingsByStoreId.mockResolvedValue([storeProductOffering]);
    getStoreProductOfferingById.mockClear();
    getStoreProductOfferingById.mockResolvedValue({ ...storeProductOffering });
    updateStoreProductOfferingRepo.mockClear();
    updateStoreProductOfferingRepo.mockImplementation(async (data) => ({
      ...storeProductOffering,
      ...data,
    }));
    getActiveStoreCatalogProducts.mockClear();
    getActiveStoreCatalogProducts.mockResolvedValue([
      { ...product, price: 80, discount: 5, status: "active" as const },
    ]);
    getProductsByOrganizationId.mockClear();
    getProductsByOrganizationId.mockResolvedValue([product]);
  });

  afterEach(() => {
    getStoresByOrganizationId.mockResolvedValue([store]);
    getStoreById.mockResolvedValue(store);
  });

  test("creating a Catalog Product writes an active Offering for every current Store", async () => {
    const response = await catalogService.createProduct(userId, organizationId, {
      categoryId,
      name: "Cake",
      price: 250,
      discount: 10,
    });

    expect(response.status).toBe("success");
    expect(createProductRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Cake",
        price: 250,
        discount: 10,
      }),
      expect.anything(),
    );
    expect(createStoreProductOfferingRepo).toHaveBeenCalledTimes(2);
    expect(lockStoreProductOfferingTopology).toHaveBeenCalledWith(
      organizationId,
      expect.anything(),
    );
    expect(createStoreProductOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: store.id,
        price: 250,
        discount: 10,
        status: "active",
      }),
      expect.anything(),
    );
    expect(createStoreProductOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: vesuStore.id,
        price: 250,
        status: "active",
      }),
      expect.anything(),
    );
  });

  test("creating a Store seeds inactive Offerings for every existing Catalog Product", async () => {
    await catalogService.seedInactiveOfferingsForNewStore({} as never, {
      organizationId,
      storeId: vesuStore.id,
      createdBy: userId,
    });

    expect(getProductsByOrganizationId).toHaveBeenCalledWith(organizationId, expect.anything());
    expect(createStoreProductOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: vesuStore.id,
        productId,
        price: product.price,
        discount: product.discount,
        status: "inactive",
      }),
      expect.anything(),
    );
  });

  test("a Store Products list includes inactive Offerings", async () => {
    getStoreProductOfferingsByStoreId.mockResolvedValue([
      { ...storeProductOffering, status: "inactive" as "active" | "inactive" },
    ]);

    const response = await catalogService.getStoreProductOfferings(
      userId,
      organizationId,
      store.id,
    );

    expect(response.status).toBe("success");
    expect(response.data?.offerings).toEqual([
      expect.objectContaining({
        productId,
        status: "inactive",
        product: expect.objectContaining({ name: product.name }),
      }),
    ]);
  });

  test("a Store can change Offering price, discount, and status independently", async () => {
    const response = await catalogService.updateStoreProductOffering(
      userId,
      organizationId,
      store.id,
      offeringId,
      { price: 180, discount: 20, status: "inactive" },
    );

    expect(response.status).toBe("success");
    expect(updateStoreProductOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: offeringId,
        storeId: store.id,
        price: 180,
        discount: 20,
        status: "inactive",
      }),
    );
    expect(response.data?.offering.price).toBe(180);
    expect(response.data?.offering.status).toBe("inactive");
  });

  test("does not expose deleting a Store Product Offering", () => {
    expect("deleteStoreProductOffering" in catalogService).toBe(false);
    expect("createStoreProductOffering" in catalogService).toBe(false);
  });

  test("POS discovery for a Store Device contains only that Store's active Offerings", async () => {
    const otherStoreProduct = {
      ...product,
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      name: "Ahmedabad only",
      productCode: "AHM-1",
      productCodeKind: "manufacturer" as const,
    };
    getActiveStoreCatalogProducts.mockResolvedValue([
      { ...product, price: 80, discount: 5, status: "active" as const },
    ]);
    getProductsByOrganizationId.mockResolvedValue([product, otherStoreProduct]);

    const response = await catalogService.getProductsForDevice({
      organization: { id: organizationId },
      store: { id: store.id },
      device: { id: "device-1" },
    } as never);

    expect(response.status).toBe("success");
    expect(response.data?.products).toEqual([
      expect.objectContaining({
        id: productId,
        price: 80,
        discount: 5,
      }),
    ]);
    expect(response.data?.inactiveProductCodes).toEqual([
      { productCode: "AHM-1", productName: "Ahmedabad only" },
    ]);
    expect(getActiveStoreCatalogProducts).toHaveBeenCalledWith(organizationId, store.id);
  });
});
