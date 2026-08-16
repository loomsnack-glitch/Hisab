import { describe, expect, test } from "bun:test";
import {
  CreateServiceTableSchema,
  ServiceTableDTOSchema,
  UpdateServiceTableSchema,
} from "./table-service.schema";

const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const organizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const tableId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userId = "11111111-1111-4111-8111-111111111111";

describe("Service Table contracts", () => {
  test("trims a meaningful label and accepts blank capacity", () => {
    const result = CreateServiceTableSchema.safeParse({
      tableLabel: "  Patio-2  ",
      capacity: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tableLabel).toBe("Patio-2");
      expect(result.data.capacity).toBeNull();
    }
  });

  test("rejects missing, empty, and overlong labels", () => {
    expect(CreateServiceTableSchema.safeParse({ tableLabel: "   " }).success).toBe(false);
    expect(CreateServiceTableSchema.safeParse({}).success).toBe(false);
    expect(CreateServiceTableSchema.safeParse({ tableLabel: "a".repeat(65) }).success).toBe(false);
  });

  test("rejects zero, negative, fractional, and non-finite capacities", () => {
    for (const capacity of [0, -2, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(CreateServiceTableSchema.safeParse({ tableLabel: "A1", capacity }).success).toBe(false);
    }
  });

  test("accepts normalized positions and rejects coordinates outside the floor", () => {
    expect(CreateServiceTableSchema.safeParse({ tableLabel: "A1", position: { x: 0, y: 1 } }).success).toBe(true);
    expect(CreateServiceTableSchema.safeParse({ tableLabel: "A1", position: { x: -0.01, y: 0.5 } }).success).toBe(false);
    expect(UpdateServiceTableSchema.safeParse({ position: { x: 0.5, y: 1.01 } }).success).toBe(false);
  });

  test("does not allow clients to write state or cross-store identifiers", () => {
    expect(UpdateServiceTableSchema.safeParse({ state: "paid" }).success).toBe(false);
    expect(UpdateServiceTableSchema.safeParse({ storeId, position: { x: 0.2, y: 0.2 } }).success).toBe(false);
    expect(ServiceTableDTOSchema.safeParse({
      id: tableId,
      organizationId,
      storeId,
      tableLabel: "A1",
      capacity: 4,
      position: { x: 0.1, y: 0.2 },
      state: "free",
      currentSaleId: null,
      createdBy: userId,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).success).toBe(true);
  });
});
