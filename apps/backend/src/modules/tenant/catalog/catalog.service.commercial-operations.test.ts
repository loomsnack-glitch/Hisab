import { beforeEach, describe, expect, test } from "bun:test";
import {
  addOn,
  addOnId,
  addOnOfferingId,
  createCatalogCommercialOperationAudit,
  getAddOnsByIds,
  getOrganizationByIdForUser,
  getStoreAddOnOfferingsForStoresAndAddOns,
  getStoresByOrganizationId,
  organization,
  organizationId,
  store,
  storeAddOnOffering,
  updateStoreAddOnOfferingRepo,
  userId,
  vesuStore,
} from "./catalog.service.test-harness";

const commercialOperations = await import("./catalog-commercial-operations");

describe("Catalog commercial operations service", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getStoresByOrganizationId.mockClear();
    getStoresByOrganizationId.mockResolvedValue([store, vesuStore]);
    getAddOnsByIds.mockClear();
    getAddOnsByIds.mockResolvedValue([addOn]);
    getStoreAddOnOfferingsForStoresAndAddOns.mockClear();
    getStoreAddOnOfferingsForStoresAndAddOns.mockResolvedValue([
      { ...storeAddOnOffering, addOnName: addOn.name },
      {
        ...storeAddOnOffering,
        id: "f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1",
        storeId: vesuStore.id,
        discountOverride: 5,
        effectiveDiscount: 5,
        isDiscountInherited: false,
        discount: 5,
        addOnName: addOn.name,
      },
    ]);
    updateStoreAddOnOfferingRepo.mockClear();
    updateStoreAddOnOfferingRepo.mockImplementation(async (data) => ({
      ...storeAddOnOffering,
      ...data,
      effectivePrice: data.priceOverride ?? addOn.price,
      effectiveDiscount: data.discountOverride ?? addOn.discount,
      isPriceInherited: data.priceOverride === null,
      isDiscountInherited: data.discountOverride === null,
    }));
    createCatalogCommercialOperationAudit.mockClear();
    createCatalogCommercialOperationAudit.mockImplementation(async (audit) => ({
      id: audit.id,
      organizationId: audit.organizationId,
      itemType: audit.itemType,
      operation: audit.operation,
      storeIds: audit.storeIds,
      itemIds: audit.itemIds,
      actorId: audit.actorId,
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      changes: audit.details.changes,
    }));
  });

  test("previews clearing Add-On discount overrides only where an override exists", async () => {
    const response = await commercialOperations.previewCatalogCommercialOperation(
      userId,
      organizationId,
      {
        itemType: "add_on",
        operation: "clear_discount_override",
        storeIds: [store.id, vesuStore.id],
        itemIds: [addOnId],
      },
    );

    expect(response.status).toBe("success");
    const changes = response.data?.preview.changes ?? [];
    expect(changes).toHaveLength(2);
    expect(changes.find((change) => change.storeId === store.id)?.affectsOverride).toBe(false);
    expect(changes.find((change) => change.storeId === vesuStore.id)?.affectsOverride).toBe(true);
    expect(response.data?.preview.requiresConfirmation).toBe(true);
  });

  test("applies confirmed Add-On override clearing and records audit history", async () => {
    const response = await commercialOperations.applyCatalogCommercialOperation(
      userId,
      organizationId,
      {
        itemType: "add_on",
        operation: "clear_discount_override",
        storeIds: [vesuStore.id],
        itemIds: [addOnId],
        confirmed: true,
      },
    );

    expect(response.status).toBe("success");
    expect(updateStoreAddOnOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1",
        discountOverride: null,
      }),
      expect.anything(),
    );
    expect(createCatalogCommercialOperationAudit).toHaveBeenCalled();
    expect(response.data?.result.appliedChangeCount).toBe(1);
  });

  test("allows local status changes without explicit confirmation", async () => {
    const response = await commercialOperations.applyCatalogCommercialOperation(
      userId,
      organizationId,
      {
        itemType: "add_on",
        operation: "set_local_status",
        storeIds: [store.id],
        itemIds: [addOnId],
        value: "inactive",
        confirmed: false,
      },
    );

    expect(response.status).toBe("success");
    expect(updateStoreAddOnOfferingRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: addOnOfferingId,
        status: "inactive",
      }),
      expect.anything(),
    );
  });
});
