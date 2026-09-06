import { beforeEach, describe, expect, test } from "bun:test";
import {
  addOn,
  addOnId,
  catalogService,
  getAddOnById,
  getOrganizationByIdForUser,
  getStoreAddOnOfferingsByAddOnId,
  getStoresByOrganizationId,
  organization,
  organizationId,
  store,
  storeAddOnOffering,
  updateAddOnRepo,
  userId,
  vesuStore,
} from "./catalog.service.test-harness";

describe("Add-On Organization defaults", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getStoresByOrganizationId.mockClear();
    getStoresByOrganizationId.mockResolvedValue([store, vesuStore]);
    getAddOnById.mockClear();
    getAddOnById.mockResolvedValue({ ...addOn });
    getStoreAddOnOfferingsByAddOnId.mockClear();
    getStoreAddOnOfferingsByAddOnId.mockResolvedValue([
      {
        ...storeAddOnOffering,
        priceOverride: null,
        discountOverride: 5,
        effectivePrice: addOn.price,
        effectiveDiscount: 5,
        isPriceInherited: true,
        isDiscountInherited: false,
        discount: 5,
      },
    ]);
    updateAddOnRepo.mockClear();
    updateAddOnRepo.mockImplementation(async (data) => ({
      ...addOn,
      ...data,
    }));
  });

  test("updates Organization default price without writing Store override rows", async () => {
    const response = await catalogService.updateAddOn(userId, organizationId, addOnId, {
      price: 30,
    });

    expect(response.status).toBe("success");
    expect(updateAddOnRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: addOnId,
        price: 30,
        discount: addOn.discount,
      }),
    );
    expect(getStoreAddOnOfferingsByAddOnId).toHaveBeenCalledWith(
      organizationId,
      addOnId,
    );
  });

  test("rejects Organization default changes that create invalid effective pairs at overridden Stores", async () => {
    const response = await catalogService.updateAddOn(userId, organizationId, addOnId, {
      price: 4,
    });

    expect(response.status).toBe("error");
    expect(response.message).toContain("effective discount exceed");
    expect(updateAddOnRepo).not.toHaveBeenCalled();
  });
});
