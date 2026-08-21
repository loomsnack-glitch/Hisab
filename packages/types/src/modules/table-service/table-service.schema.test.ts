import { describe, expect, test } from "bun:test";
import {
  AssignServiceTablesToAreaSchema,
  CreateServiceAreaSchema,
  CreateServiceTableSchema,
  ServiceAreaDTOSchema,
  ServiceTableDTOSchema,
  UpdateServiceAreaSchema,
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
    expect(
      CreateServiceTableSchema.safeParse({ tableLabel: "   " }).success,
    ).toBe(false);
    expect(CreateServiceTableSchema.safeParse({}).success).toBe(false);
    expect(
      CreateServiceTableSchema.safeParse({ tableLabel: "a".repeat(65) })
        .success,
    ).toBe(false);
  });

  test("rejects zero, negative, fractional, and non-finite capacities", () => {
    for (const capacity of [0, -2, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        CreateServiceTableSchema.safeParse({ tableLabel: "A1", capacity })
          .success,
      ).toBe(false);
    }
  });

  test("does not allow clients to write state or cross-store identifiers", () => {
    expect(UpdateServiceTableSchema.safeParse({ state: "paid" }).success).toBe(
      false,
    );
    expect(
      UpdateServiceTableSchema.safeParse({
        storeId,
        capacity: 4,
      }).success,
    ).toBe(false);
    expect(
      ServiceTableDTOSchema.safeParse({
        id: tableId,
        organizationId,
        storeId,
        serviceAreaId: null,
        tableLabel: "A1",
        capacity: 4,
        state: "free",
        currentSaleId: null,
        currentSaleTotal: null,
        createdBy: userId,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).success,
    ).toBe(true);
    expect(
      UpdateServiceTableSchema.safeParse({
        serviceAreaId: tableId,
      }).success,
    ).toBe(false);
  });
});

describe("Service Area contracts", () => {
  test("trims a title and accepts a blank description", () => {
    const result = CreateServiceAreaSchema.safeParse({
      title: "  Patio  ",
      description: "   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Patio");
      expect(result.data.description).toBe("");
    }
  });

  test("rejects missing, empty, and overlong titles", () => {
    expect(CreateServiceAreaSchema.safeParse({ title: "   " }).success).toBe(
      false,
    );
    expect(CreateServiceAreaSchema.safeParse({}).success).toBe(false);
    expect(
      CreateServiceAreaSchema.safeParse({ title: "a".repeat(129) }).success,
    ).toBe(false);
  });

  test("rejects a description longer than 1000 characters", () => {
    expect(
      CreateServiceAreaSchema.safeParse({
        title: "Patio",
        description: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });

  test("does not allow clients to write store identifiers on create or update", () => {
    expect(
      CreateServiceAreaSchema.safeParse({
        title: "Patio",
        storeId,
      }).success,
    ).toBe(false);
    expect(
      UpdateServiceAreaSchema.safeParse({
        storeId,
        title: "Indoor",
      }).success,
    ).toBe(false);
    expect(UpdateServiceAreaSchema.safeParse({}).success).toBe(false);
    expect(
      ServiceAreaDTOSchema.safeParse({
        id: tableId,
        organizationId,
        storeId,
        title: "Patio",
        description: "Outdoor seating",
        createdBy: userId,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).success,
    ).toBe(true);
  });

  test("assigns only explicit table ids and rejects an empty selection", () => {
    expect(
      AssignServiceTablesToAreaSchema.safeParse({
        tableIds: [tableId],
      }).success,
    ).toBe(true);
    expect(AssignServiceTablesToAreaSchema.safeParse({ tableIds: [] }).success).toBe(
      false,
    );
    expect(
      AssignServiceTablesToAreaSchema.safeParse({
        tableIds: [tableId],
        storeId,
      }).success,
    ).toBe(false);
  });
});
