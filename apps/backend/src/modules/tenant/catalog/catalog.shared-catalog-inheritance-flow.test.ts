import { beforeEach, describe, expect, test } from "bun:test";
import {
  UpdateStoreAddOnOfferingSchema,
  UpdateStoreProductOfferingSchema,
} from "@repo/types";
import {
  catalogService,
  categoryId,
  getActiveStoreCatalogProducts,
  getOrganizationByIdForUser,
  getProductById,
  getStoreAddOnOfferingOverrideSummary,
  getStoreCategoryPresentationsByStoreId,
  getStoreProductOfferingOverrideSummary,
  getStoreProductOfferingsByStoreId,
  getStoresByOrganizationId,
  organization,
  organizationId,
  product,
  productId,
  store,
  storeProductOffering,
  updateProductRepo,
  updateStoreProductOfferingRepo,
  userId,
  vesuStore,
} from "./catalog.service.test-harness";

const commercialOperations = await import("./catalog-commercial-operations");

describe("Shared catalog inheritance end-to-end flow", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getStoresByOrganizationId.mockClear();
    getStoresByOrganizationId.mockResolvedValue([store, vesuStore]);
    getProductById.mockClear();
    getProductById.mockResolvedValue({ ...product });
    updateProductRepo.mockClear();
    updateProductRepo.mockImplementation(async (data) => ({
      ...product,
      ...data,
      unitLabel: "pc",
    }));
    getStoreProductOfferingsByStoreId.mockClear();
    getStoreProductOfferingsByStoreId.mockResolvedValue([storeProductOffering]);
    updateStoreProductOfferingRepo.mockClear();
    updateStoreProductOfferingRepo.mockImplementation(async (data) => ({
      ...storeProductOffering,
      ...data,
      effectivePrice: data.priceOverride ?? product.price,
      effectiveDiscount: data.discountOverride ?? product.discount,
      isPriceInherited: data.priceOverride === null,
      isDiscountInherited: data.discountOverride === null,
    }));
    getActiveStoreCatalogProducts.mockClear();
    getStoreProductOfferingOverrideSummary.mockClear();
    getStoreAddOnOfferingOverrideSummary.mockClear();
    getStoreCategoryPresentationsByStoreId.mockClear();
  });

  test("rejects legacy copied-price update contracts for Products and Add-Ons", () => {
    expect(UpdateStoreProductOfferingSchema.safeParse({ price: 100 }).success).toBe(false);
    expect(UpdateStoreProductOfferingSchema.safeParse({ discount: 5 }).success).toBe(false);
    expect(UpdateStoreAddOnOfferingSchema.safeParse({ price: 20 }).success).toBe(false);
    expect(UpdateStoreAddOnOfferingSchema.safeParse({ discount: 2 }).success).toBe(false);
    expect(
      UpdateStoreProductOfferingSchema.safeParse({ priceOverride: 100 }).success,
    ).toBe(true);
    expect(
      UpdateStoreAddOnOfferingSchema.safeParse({ discountOverride: 2 }).success,
    ).toBe(true);
  });

  test("Organization default edits fan out to inheriting Stores without writing Offering rows", async () => {
    const response = await catalogService.updateProduct(userId, organizationId, productId, {
      price: 140,
    });

    expect(response.status).toBe("success");
    expect(updateProductRepo).toHaveBeenCalledWith(
      expect.objectContaining({ price: 140 }),
    );
    expect(updateStoreProductOfferingRepo).not.toHaveBeenCalled();
  });

  test("Store Commercial Overrides are set only through explicit override fields", async () => {
    const response = await catalogService.updateStoreProductOffering(
      userId,
      organizationId,
      store.id,
      storeProductOffering.id,
      { priceOverride: 175, discountOverride: 15 },
    );

    expect(response.status).toBe("success");
    expect(updateStoreProductOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: store.id,
        priceOverride: 175,
        discountOverride: 15,
      }),
    );
    expect(response.data?.offering.isPriceInherited).toBe(false);
    expect(response.data?.offering.isDiscountInherited).toBe(false);
  });

  test("POS discovery resolves trusted effective Store Offering values per Store", async () => {
    getActiveStoreCatalogProducts.mockImplementation(async (_organizationId, storeId) => {
      if (storeId === store.id) {
        return [{ ...product, price: 88, discount: 4, status: "active" as const }];
      }
      return [{ ...product, price: 120, discount: 0, status: "active" as const }];
    });

    const storeOne = await catalogService.getProductsForDevice({
      organization: { id: organizationId },
      store: { id: store.id },
      device: { id: "device-1" },
    } as never);
    const storeTwo = await catalogService.getProductsForDevice({
      organization: { id: organizationId },
      store: { id: vesuStore.id },
      device: { id: "device-2" },
    } as never);

    expect(storeOne.data?.products[0]).toEqual(
      expect.objectContaining({ id: productId, price: 88, discount: 4 }),
    );
    expect(storeTwo.data?.products[0]).toEqual(
      expect.objectContaining({ id: productId, price: 120, discount: 0 }),
    );
    expect(getActiveStoreCatalogProducts).toHaveBeenCalledWith(organizationId, store.id);
    expect(getActiveStoreCatalogProducts).toHaveBeenCalledWith(organizationId, vesuStore.id);
  });

  test("Store Category presentation is scoped per Store and does not change Product sellability", async () => {
    getStoreCategoryPresentationsByStoreId.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        organizationId,
        storeId: store.id,
        categoryId,
        visible: false,
        sortOrder: 99,
        createdBy: userId,
        createdAt: new Date("2026-07-12T12:00:00.000Z"),
        updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      },
    ]);
    getActiveStoreCatalogProducts.mockResolvedValue([
      { ...product, price: product.price, discount: product.discount, status: "active" as const },
    ]);

    const presentations = await catalogService.getStoreCategoryPresentations(
      userId,
      organizationId,
      store.id,
    );
    const posProducts = await catalogService.getProductsForDevice({
      organization: { id: organizationId },
      store: { id: store.id },
      device: { id: "device-1" },
    } as never);

    expect(presentations.data?.presentations[0]?.visible).toBe(false);
    expect(posProducts.data?.products[0]?.status).toBe("active");
    expect(updateStoreProductOfferingRepo).not.toHaveBeenCalled();
  });

  test("exposes inferred migration override counts for Organization-admin review", async () => {
    getStoreProductOfferingOverrideSummary.mockResolvedValue({
      totalOfferings: 6,
      fullyInherited: 3,
      priceOverridden: 1,
      discountOverridden: 1,
      bothOverridden: 1,
    });
    getStoreAddOnOfferingOverrideSummary.mockResolvedValue({
      totalOfferings: 4,
      fullyInherited: 2,
      priceOverridden: 1,
      discountOverridden: 0,
      bothOverridden: 1,
    });

    const productSummary = await catalogService.getStoreProductOfferingOverrideSummary(
      userId,
      organizationId,
    );
    const addOnSummary = await catalogService.getStoreAddOnOfferingOverrideSummary(
      userId,
      organizationId,
    );

    expect(productSummary.data?.summary.fullyInherited).toBe(3);
    expect(productSummary.data?.summary.bothOverridden).toBe(1);
    expect(addOnSummary.data?.summary.priceOverridden).toBe(1);
  });

  test("audited multi-store operations mutate overrides, not Organization defaults", async () => {
    const preview = await commercialOperations.previewCatalogCommercialOperation(
      userId,
      organizationId,
      {
        itemType: "product",
        operation: "set_price_override",
        storeIds: [store.id],
        itemIds: [productId],
        value: 160,
      },
    );

    expect(preview.status).toBe("success");
    expect(preview.data?.preview.changes[0]?.after.priceOverride).toBe(160);
    expect(updateProductRepo).not.toHaveBeenCalled();
  });
});
