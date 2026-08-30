import { describe, expect, test } from "bun:test";
import {
  canAssignUnitToVendorItem,
  CreateVendorItemSchema,
  CreateVendorSchema,
  isVendorItemAvailableForFutureSelection,
  UpdateVendorItemSchema,
  UpdateVendorSchema,
  VendorDTOSchema,
  VendorItemDTOSchema,
} from "./vendors.schema";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const vendorId = "11111111-1111-4111-8111-111111111111";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("Vendor contracts", () => {
  test("create Vendor accepts a name, optional description, and optional status", () => {
    const result = CreateVendorSchema.safeParse({
      name: "Fresh Farms",
      description: "Daily produce supplier",
      status: "active",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Fresh Farms");
      expect(result.data.description).toBe("Daily produce supplier");
      expect(result.data.status).toBe("active");
    }
  });

  test("create Vendor trims name and description", () => {
    const result = CreateVendorSchema.safeParse({
      name: "  Fresh Farms  ",
      description: "  Daily produce  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Fresh Farms");
      expect(result.data.description).toBe("Daily produce");
    }
  });

  test("create Vendor defaults status as optional", () => {
    const result = CreateVendorSchema.safeParse({
      name: "Fresh Farms",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
      expect(result.data.description).toBeUndefined();
    }
  });

  test("create Vendor accepts a blank description", () => {
    const result = CreateVendorSchema.safeParse({
      name: "Fresh Farms",
      description: "   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("");
    }
  });

  test("rejects a Vendor without a name", () => {
    const result = CreateVendorSchema.safeParse({
      description: "Daily produce",
    });

    expect(result.success).toBe(false);
  });

  test("rejects a blank Vendor name after trim", () => {
    expect(CreateVendorSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  test("rejects a description longer than 1000 characters", () => {
    expect(
      CreateVendorSchema.safeParse({
        name: "Fresh Farms",
        description: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });

  test("rejects Store-scoped and Vendor Item fields on create", () => {
    expect(
      CreateVendorSchema.safeParse({
        name: "Fresh Farms",
        storeId: organizationId,
      }).success,
    ).toBe(false);
    expect(
      CreateVendorSchema.safeParse({
        name: "Fresh Farms",
        vendorItems: [{ name: "Tomato" }],
      }).success,
    ).toBe(false);
  });

  test("update Vendor accepts name, description, and status changes", () => {
    const result = UpdateVendorSchema.safeParse({
      name: "Fresh Farms Co",
      description: "Updated notes",
      status: "inactive",
    });

    expect(result.success).toBe(true);
  });

  test("update Vendor accepts status-only availability changes", () => {
    const result = UpdateVendorSchema.safeParse({ status: "inactive" });

    expect(result.success).toBe(true);
  });

  test("update Vendor requires at least one field", () => {
    const result = UpdateVendorSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  test("rejects a delete command field on update", () => {
    expect(
      UpdateVendorSchema.safeParse({
        status: "inactive",
        deleted: true,
      }).success,
    ).toBe(false);
  });

  test("Vendor DTO includes Organization ownership, description, and status", () => {
    const result = VendorDTOSchema.safeParse({
      id: vendorId,
      organizationId,
      name: "Fresh Farms",
      description: "Daily produce supplier",
      status: "active",
      createdBy: userId,
      updatedBy: null,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizationId).toBe(organizationId);
      expect(result.data.description).toBe("Daily produce supplier");
      expect(result.data.status).toBe("active");
    }
  });

  test("Vendor DTO accepts a null description", () => {
    const result = VendorDTOSchema.safeParse({
      id: vendorId,
      organizationId,
      name: "Fresh Farms",
      description: null,
      status: "inactive",
      createdBy: userId,
      updatedBy: null,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  test("rejects a Vendor DTO with an invalid organization id", () => {
    const result = VendorDTOSchema.safeParse({
      id: vendorId,
      organizationId: "not-a-uuid",
      name: "Fresh Farms",
      description: null,
      status: "active",
      createdBy: userId,
      updatedBy: null,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

const unitId = "33333333-3333-4333-8333-333333333333";
const vendorItemId = "44444444-4444-4444-8444-444444444444";

describe("Vendor Item contracts", () => {
  test("create Vendor Item requires a Vendor, Unit, name, and non-negative two-decimal price", () => {
    const result = CreateVendorItemSchema.safeParse({
      vendorId,
      name: "Tomato",
      unitId,
      defaultPurchasePrice: 40.5,
      status: "active",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vendorId).toBe(vendorId);
      expect(result.data.name).toBe("Tomato");
      expect(result.data.unitId).toBe(unitId);
      expect(result.data.defaultPurchasePrice).toBe(40.5);
      expect(result.data.status).toBe("active");
    }
  });

  test("create Vendor Item trims name and defaults status as optional", () => {
    const result = CreateVendorItemSchema.safeParse({
      vendorId,
      name: "  Tomato  ",
      unitId,
      defaultPurchasePrice: 0,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Tomato");
      expect(result.data.status).toBeUndefined();
      expect(result.data.defaultPurchasePrice).toBe(0);
    }
  });

  test("rejects a Vendor Item without a Vendor, Unit, name, or price", () => {
    expect(CreateVendorItemSchema.safeParse({ name: "Tomato", unitId, defaultPurchasePrice: 10 }).success).toBe(false);
    expect(CreateVendorItemSchema.safeParse({ vendorId, name: "Tomato", defaultPurchasePrice: 10 }).success).toBe(false);
    expect(CreateVendorItemSchema.safeParse({ vendorId, unitId, defaultPurchasePrice: 10 }).success).toBe(false);
    expect(CreateVendorItemSchema.safeParse({ vendorId, name: "Tomato", unitId }).success).toBe(false);
  });

  test("rejects a blank Vendor Item name after trim", () => {
    expect(
      CreateVendorItemSchema.safeParse({
        vendorId,
        name: "   ",
        unitId,
        defaultPurchasePrice: 10,
      }).success,
    ).toBe(false);
  });

  test("rejects a negative default purchase price", () => {
    expect(
      CreateVendorItemSchema.safeParse({
        vendorId,
        name: "Tomato",
        unitId,
        defaultPurchasePrice: -0.01,
      }).success,
    ).toBe(false);
  });

  test("rejects a default purchase price with more than two decimal places", () => {
    expect(
      CreateVendorItemSchema.safeParse({
        vendorId,
        name: "Tomato",
        unitId,
        defaultPurchasePrice: 10.999,
      }).success,
    ).toBe(false);
  });

  test("rejects Store, Product, inventory, and extra relationship fields on create", () => {
    const base = {
      vendorId,
      name: "Tomato",
      unitId,
      defaultPurchasePrice: 10,
    };

    expect(CreateVendorItemSchema.safeParse({ ...base, storeId: organizationId }).success).toBe(false);
    expect(CreateVendorItemSchema.safeParse({ ...base, productId: vendorItemId }).success).toBe(false);
    expect(CreateVendorItemSchema.safeParse({ ...base, inventoryQuantity: 5 }).success).toBe(false);
    expect(CreateVendorItemSchema.safeParse({ ...base, vendorIds: [vendorId] }).success).toBe(false);
  });

  test("rejects a Vendor Item with an invalid Vendor or Unit id", () => {
    expect(
      CreateVendorItemSchema.safeParse({
        vendorId: "not-a-uuid",
        name: "Tomato",
        unitId,
        defaultPurchasePrice: 10,
      }).success,
    ).toBe(false);
    expect(
      CreateVendorItemSchema.safeParse({
        vendorId,
        name: "Tomato",
        unitId: "not-a-uuid",
        defaultPurchasePrice: 10,
      }).success,
    ).toBe(false);
  });

  test("update Vendor Item accepts name, Unit, price, and status changes", () => {
    const result = UpdateVendorItemSchema.safeParse({
      name: "Roma Tomato",
      unitId,
      defaultPurchasePrice: 12.25,
      status: "inactive",
    });

    expect(result.success).toBe(true);
  });

  test("update Vendor Item accepts status-only availability changes", () => {
    expect(UpdateVendorItemSchema.safeParse({ status: "inactive" }).success).toBe(true);
  });

  test("update Vendor Item requires at least one field", () => {
    expect(UpdateVendorItemSchema.safeParse({}).success).toBe(false);
  });

  test("rejects changing the parent Vendor or a delete command on update", () => {
    expect(
      UpdateVendorItemSchema.safeParse({
        vendorId,
        status: "inactive",
      }).success,
    ).toBe(false);
    expect(
      UpdateVendorItemSchema.safeParse({
        status: "inactive",
        deleted: true,
      }).success,
    ).toBe(false);
  });

  test("Vendor Item DTO includes Organization ownership, one Vendor, Unit, price, and status", () => {
    const result = VendorItemDTOSchema.safeParse({
      id: vendorItemId,
      organizationId,
      vendorId,
      name: "Tomato",
      unitId,
      defaultPurchasePrice: 40.5,
      status: "active",
      createdBy: userId,
      updatedBy: null,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizationId).toBe(organizationId);
      expect(result.data.vendorId).toBe(vendorId);
      expect(result.data.unitId).toBe(unitId);
      expect(result.data.defaultPurchasePrice).toBe(40.5);
      expect(result.data.status).toBe("active");
    }
  });

  test("an inactive Vendor leaves Item status unchanged but blocks future selection", () => {
    expect(
      isVendorItemAvailableForFutureSelection({
        itemStatus: "active",
        vendorStatus: "inactive",
      }),
    ).toBe(false);
    expect(
      isVendorItemAvailableForFutureSelection({
        itemStatus: "active",
        vendorStatus: "active",
      }),
    ).toBe(true);
    expect(
      isVendorItemAvailableForFutureSelection({
        itemStatus: "inactive",
        vendorStatus: "active",
      }),
    ).toBe(false);
  });

  test("inactive Units cannot be newly assigned while a currently assigned Unit remains visible", () => {
    expect(canAssignUnitToVendorItem({ unitStatus: "inactive" })).toBe(false);
    expect(canAssignUnitToVendorItem({ unitStatus: "active" })).toBe(true);
    expect(canAssignUnitToVendorItem({ unitStatus: "inactive", currentlyAssigned: true })).toBe(true);
  });
});
