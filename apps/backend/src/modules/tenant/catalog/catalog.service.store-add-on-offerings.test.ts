import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  addOn,
  addOnId,
  addOnOfferingId,
  catalogService,
  createAddOnRepo,
  createStoreAddOnOfferingRepo,
  getAddOnById,
  getAddOnsByOrganizationId,
  getOrganizationByIdForUser,
  getStoreAddOnOfferingById,
  getStoreAddOnOfferingsByStoreId,
  getStoresByOrganizationId,
  lockStoreAddOnOfferingTopology,
  organization,
  organizationId,
  store,
  storeAddOnOffering,
  updateStoreAddOnOfferingRepo,
  userId,
  vesuStore,
} from "./catalog.service.test-harness";

describe("Store Add-On Offerings", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getStoresByOrganizationId.mockClear();
    getStoresByOrganizationId.mockResolvedValue([store, vesuStore]);
    getAddOnById.mockClear();
    getAddOnById.mockResolvedValue({ ...addOn });
    getAddOnsByOrganizationId.mockClear();
    getAddOnsByOrganizationId.mockResolvedValue([addOn]);
    createStoreAddOnOfferingRepo.mockClear();
    createAddOnRepo.mockClear();
    createAddOnRepo.mockImplementation(async (data) => ({
      ...addOn,
      ...data,
    }));
    lockStoreAddOnOfferingTopology.mockClear();
    createStoreAddOnOfferingRepo.mockImplementation(async (data) => ({
      ...storeAddOnOffering,
      ...data,
    }));
    getStoreAddOnOfferingsByStoreId.mockClear();
    getStoreAddOnOfferingsByStoreId.mockResolvedValue([storeAddOnOffering]);
    getStoreAddOnOfferingById.mockClear();
    getStoreAddOnOfferingById.mockResolvedValue({ ...storeAddOnOffering });
    updateStoreAddOnOfferingRepo.mockClear();
  });

  afterEach(() => {
    getStoresByOrganizationId.mockResolvedValue([store]);
  });

  test("creating an Add-On writes an active Offering for every current Store", async () => {
    const response = await catalogService.createAddOn(userId, organizationId, {
      name: "Extra Cheese",
      price: 20,
      discount: 2,
    });

    expect(response.status).toBe("success");
    expect(createAddOnRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Extra Cheese",
        price: 20,
        discount: 2,
        status: "inactive",
      }),
      expect.anything(),
    );
    expect(createStoreAddOnOfferingRepo).toHaveBeenCalledTimes(2);
    expect(lockStoreAddOnOfferingTopology).toHaveBeenCalledWith(
      organizationId,
      expect.anything(),
    );
    expect(createStoreAddOnOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: store.id,
        priceOverride: null,
        discountOverride: null,
        status: "active",
      }),
      expect.anything(),
    );
  });

  test("creating a Store seeds inactive Offerings for every existing Add-On", async () => {
    await catalogService.seedInactiveAddOnOfferingsForNewStore({} as never, {
      organizationId,
      storeId: vesuStore.id,
      createdBy: userId,
    });

    expect(getAddOnsByOrganizationId).toHaveBeenCalledWith(organizationId);
    expect(createStoreAddOnOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: vesuStore.id,
        addOnId,
        priceOverride: null,
        discountOverride: null,
        status: "inactive",
      }),
      expect.anything(),
    );
  });

  test("updates Store price override independently from discount inheritance", async () => {
    const response = await catalogService.updateStoreAddOnOffering(
      userId,
      organizationId,
      store.id,
      addOnOfferingId,
      { priceOverride: 25 },
    );

    expect(response.status).toBe("success");
    expect(updateStoreAddOnOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        priceOverride: 25,
        discountOverride: null,
      }),
    );
  });

  test("accepts inherited commercial values when organization defaults are numeric strings", async () => {
    getAddOnById.mockResolvedValue({
      ...addOn,
      price: "10",
      discount: "5",
    });
    getStoreAddOnOfferingById.mockResolvedValue({
      ...storeAddOnOffering,
      priceOverride: null,
      discountOverride: null,
      effectivePrice: 10,
      effectiveDiscount: 5,
      isPriceInherited: true,
      isDiscountInherited: true,
    });

    const response = await catalogService.updateStoreAddOnOffering(
      userId,
      organizationId,
      store.id,
      addOnOfferingId,
      { status: "active" },
    );

    expect(response.status).toBe("success");
  });

  test("clears a price override to restore Organization inheritance", async () => {
    getStoreAddOnOfferingById.mockResolvedValue({
      ...storeAddOnOffering,
      priceOverride: 25,
      discountOverride: null,
      isPriceInherited: false,
      price: 25,
    });

    const response = await catalogService.updateStoreAddOnOffering(
      userId,
      organizationId,
      store.id,
      addOnOfferingId,
      { clearPriceOverride: true },
    );

    expect(response.status).toBe("success");
    expect(updateStoreAddOnOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        priceOverride: null,
      }),
    );
  });
});
