import { describe, expect, test } from "bun:test";
import {
  CreateVendorSchema,
  UpdateVendorSchema,
  VendorDTOSchema,
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
