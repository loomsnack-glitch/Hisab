import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  catalogService,
  category,
  categoryId,
  createCategoryRepo,
  createStoreCategoryPresentationRepo,
  drinksCategory,
  drinksPresentationId,
  drinksStoreCategoryPresentation,
  getActiveStoreCatalogProducts,
  getCategoriesByOrganizationId,
  getOrganizationByIdForUser,
  getProductByCode,
  getProductsByOrganizationId,
  getStoreById,
  getStoreCategoryPresentationById,
  getStoreCategoryPresentationsByStoreId,
  getStoresByOrganizationId,
  getVisibleCategoriesForStore,
  lockStoreCategoryPresentationTopology,
  organization,
  organizationId,
  presentationId,
  product,
  productId,
  reorderStoreCategoryPresentationsRepo,
  store,
  storeCategoryPresentation,
  updateStoreCategoryPresentationRepo,
  userId,
  vesuStore,
} from "./catalog.service.test-harness";

describe("Store Category Presentations", () => {
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
    getCategoriesByOrganizationId.mockClear();
    getCategoriesByOrganizationId.mockResolvedValue([category, drinksCategory]);
    createCategoryRepo.mockClear();
    createCategoryRepo.mockImplementation(async (data) => ({
      ...category,
      ...data,
    }));
    lockStoreCategoryPresentationTopology.mockClear();
    createStoreCategoryPresentationRepo.mockClear();
    createStoreCategoryPresentationRepo.mockImplementation(async (data) => ({
      ...storeCategoryPresentation,
      ...data,
    }));
    getStoreCategoryPresentationsByStoreId.mockClear();
    getStoreCategoryPresentationsByStoreId.mockResolvedValue([
      storeCategoryPresentation,
      drinksStoreCategoryPresentation,
    ]);
    getStoreCategoryPresentationById.mockClear();
    getStoreCategoryPresentationById.mockResolvedValue(storeCategoryPresentation);
    updateStoreCategoryPresentationRepo.mockClear();
    updateStoreCategoryPresentationRepo.mockImplementation(async (data) => ({
      ...storeCategoryPresentation,
      ...data,
    }));
    reorderStoreCategoryPresentationsRepo.mockClear();
    getVisibleCategoriesForStore.mockClear();
    getVisibleCategoriesForStore.mockResolvedValue([category]);
    getActiveStoreCatalogProducts.mockClear();
    getActiveStoreCatalogProducts.mockResolvedValue([
      { ...product, price: 80, discount: 5, status: "active" as const },
    ]);
    getProductsByOrganizationId.mockClear();
    getProductsByOrganizationId.mockResolvedValue([product]);
    getProductByCode.mockClear();
    getProductByCode.mockResolvedValue(product);
  });

  afterEach(() => {
    getStoresByOrganizationId.mockResolvedValue([store]);
    getStoreById.mockResolvedValue(store);
  });

  test("creating a Category writes a visible Presentation for every current Store", async () => {
    const response = await catalogService.createCategory(userId, organizationId, {
      name: "Desserts",
    });

    expect(response.status).toBe("success");
    expect(lockStoreCategoryPresentationTopology).toHaveBeenCalledWith(
      organizationId,
      expect.anything(),
    );
    expect(createStoreCategoryPresentationRepo).toHaveBeenCalledTimes(2);
    expect(createStoreCategoryPresentationRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: store.id,
        visible: true,
        sortOrder: 0,
      }),
      expect.anything(),
    );
    expect(createStoreCategoryPresentationRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: vesuStore.id,
        visible: true,
      }),
      expect.anything(),
    );
  });

  test("creating a Store seeds visible Presentations for every existing Category", async () => {
    await catalogService.seedPresentationsForNewStore({} as never, {
      organizationId,
      storeId: vesuStore.id,
      createdBy: userId,
    });

    expect(getCategoriesByOrganizationId).toHaveBeenCalledWith(organizationId);
    expect(createStoreCategoryPresentationRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: vesuStore.id,
        categoryId,
        visible: true,
        sortOrder: category.sortOrder,
      }),
      expect.anything(),
    );
    expect(createStoreCategoryPresentationRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: vesuStore.id,
        categoryId: drinksCategory.id,
        visible: true,
        sortOrder: drinksCategory.sortOrder,
      }),
      expect.anything(),
    );
  });

  test("lists Store Category Presentations for one Store without changing shared Category identity", async () => {
    const response = await catalogService.getStoreCategoryPresentations(
      userId,
      organizationId,
      store.id,
    );

    expect(response.status).toBe("success");
    expect(response.data?.presentations).toEqual([
      expect.objectContaining({
        id: presentationId,
        visible: true,
        category: expect.objectContaining({ id: categoryId, name: "Combos" }),
      }),
      expect.objectContaining({
        id: drinksPresentationId,
        visible: false,
        category: expect.objectContaining({ name: "Drinks" }),
      }),
    ]);
    expect(getStoreCategoryPresentationsByStoreId).toHaveBeenCalledWith(
      organizationId,
      store.id,
    );
  });

  test("updates local visibility without touching Organization Category fields", async () => {
    const response = await catalogService.updateStoreCategoryPresentation(
      userId,
      organizationId,
      store.id,
      presentationId,
      { visible: false },
    );

    expect(response.status).toBe("success");
    expect(updateStoreCategoryPresentationRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: presentationId,
        storeId: store.id,
        visible: false,
      }),
    );
    expect(createCategoryRepo).not.toHaveBeenCalled();
  });

  test("reorders Store browse categories without changing Organization order", async () => {
    const response = await catalogService.reorderStoreCategoryPresentations(
      userId,
      organizationId,
      store.id,
      { categoryIds: [drinksCategory.id, categoryId] },
    );

    expect(response.status).toBe("success");
    expect(reorderStoreCategoryPresentationsRepo).toHaveBeenCalledWith(
      organizationId,
      store.id,
      [drinksCategory.id, categoryId],
      userId,
      expect.anything(),
    );
  });

  test("POS category browsing for a Store Device uses only visible categories in local order", async () => {
    getVisibleCategoriesForStore.mockResolvedValue([drinksCategory, category]);

    const response = await catalogService.getCategoriesForDevice({
      organization: { id: organizationId },
      store: { id: store.id },
      device: { id: "device-1" },
    } as never);

    expect(response.status).toBe("success");
    expect(response.data?.categories).toEqual([drinksCategory, category]);
    expect(getVisibleCategoriesForStore).toHaveBeenCalledWith(organizationId, store.id);
    expect(getCategoriesByOrganizationId).not.toHaveBeenCalled();
  });

  test("hiding a Store Category does not remove active Product Offerings or barcode resolution", async () => {
    getVisibleCategoriesForStore.mockResolvedValue([]);
    getProductByCode.mockResolvedValue({
      ...product,
      productCode: "SCAN-1",
      productCodeKind: "manufacturer" as const,
    });

    const categoriesResponse = await catalogService.getCategoriesForDevice({
      organization: { id: organizationId },
      store: { id: store.id },
      device: { id: "device-1" },
    } as never);
    const productsResponse = await catalogService.getProductsForDevice({
      organization: { id: organizationId },
      store: { id: store.id },
      device: { id: "device-1" },
    } as never);

    expect(categoriesResponse.data?.categories).toEqual([]);
    expect(productsResponse.data?.products).toEqual([
      expect.objectContaining({ id: productId, price: 80, discount: 5 }),
    ]);
    expect(getActiveStoreCatalogProducts).toHaveBeenCalledWith(organizationId, store.id);
  });

  test("rejects Store Category Presentation updates for another Store", async () => {
    getStoreCategoryPresentationById.mockResolvedValue(null);

    const response = await catalogService.updateStoreCategoryPresentation(
      userId,
      organizationId,
      vesuStore.id,
      presentationId,
      { visible: false },
    );

    expect(response.status).toBe("error");
    expect(response.code).toBe(404);
    expect(updateStoreCategoryPresentationRepo).not.toHaveBeenCalled();
  });
});
