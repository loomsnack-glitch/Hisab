import { describe, expect, test } from "bun:test";
import {
  CreateUnitSchema,
  UnitDTOSchema,
  UpdateUnitSchema,
  isUnitAvailableForAssignment,
  normalizeUnitToken,
} from "./units.schema";
import { PREDEFINED_UNITS, SEEDED_UNITS } from "./seeded-units";

describe("Unit contracts", () => {
  test("create Unit accepts a name, short label, and optional status", () => {
    const result = CreateUnitSchema.safeParse({
      name: "Crate",
      label: "crt",
      status: "active",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Crate");
      expect(result.data.label).toBe("crt");
      expect(result.data.status).toBe("active");
    }
  });

  test("create Unit trims name and label", () => {
    const result = CreateUnitSchema.safeParse({
      name: "  Crate  ",
      label: " crt ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Crate");
      expect(result.data.label).toBe("crt");
    }
  });

  test("create Unit defaults status as optional", () => {
    const result = CreateUnitSchema.safeParse({
      name: "Crate",
      label: "crt",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
    }
  });

  test("rejects a Unit without a name", () => {
    const result = CreateUnitSchema.safeParse({
      label: "crt",
    });

    expect(result.success).toBe(false);
  });

  test("rejects a Unit without a short label", () => {
    const result = CreateUnitSchema.safeParse({
      name: "Crate",
    });

    expect(result.success).toBe(false);
  });

  test("rejects a blank Unit name or label after trim", () => {
    expect(CreateUnitSchema.safeParse({ name: "   ", label: "crt" }).success).toBe(false);
    expect(CreateUnitSchema.safeParse({ name: "Crate", label: "   " }).success).toBe(false);
  });

  test("rejects conversion, dimension, and price-conversion fields", () => {
    expect(
      CreateUnitSchema.safeParse({
        name: "Crate",
        label: "crt",
        conversionFactor: 12,
      }).success,
    ).toBe(false);
    expect(
      CreateUnitSchema.safeParse({
        name: "Crate",
        label: "crt",
        dimension: "mass",
      }).success,
    ).toBe(false);
    expect(
      UpdateUnitSchema.safeParse({
        status: "inactive",
        priceConversion: { to: "kg", factor: 12 },
      }).success,
    ).toBe(false);
  });

  test("update Unit accepts status-only availability changes", () => {
    const result = UpdateUnitSchema.safeParse({ status: "inactive" });

    expect(result.success).toBe(true);
  });

  test("update Unit accepts name and label changes", () => {
    const result = UpdateUnitSchema.safeParse({
      name: "Crate",
      label: "crate",
    });

    expect(result.success).toBe(true);
  });

  test("update Unit requires at least one field", () => {
    const result = UpdateUnitSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  test("Unit DTO includes source kind, availability, name, and label only", () => {
    const result = UnitDTOSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Kilogram",
      label: "kg",
      kind: "predefined",
      predefinedKey: "kilogram",
      status: "active",
      createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      updatedBy: null,
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("predefined");
      expect(result.data.name).toBe("Kilogram");
      expect(result.data.label).toBe("kg");
      expect("conversionFactor" in result.data).toBe(false);
    }
  });

  test("rejects a Unit DTO with an invalid organization id", () => {
    const result = UnitDTOSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: "not-a-uuid",
      name: "Crate",
      label: "crt",
      kind: "custom",
      predefinedKey: null,
      status: "active",
      createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      updatedBy: null,
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

describe("Unit token normalization", () => {
  test("normalizes Unit names and labels by trim and case", () => {
    expect(normalizeUnitToken(" Kilogram ")).toBe("kilogram");
    expect(normalizeUnitToken("mL")).toBe("ml");
    expect(normalizeUnitToken("L")).toBe("l");
  });

  test("collapses internal whitespace in Unit tokens", () => {
    expect(normalizeUnitToken("Tea   Cup")).toBe("tea cup");
  });
});

describe("Unit assignment availability", () => {
  test("active Units are available for new or edited records", () => {
    expect(isUnitAvailableForAssignment({ status: "active" })).toBe(true);
  });

  test("inactive Units cannot be assigned to new or edited records", () => {
    expect(isUnitAvailableForAssignment({ status: "inactive" })).toBe(false);
  });
});

describe("Predefined Units", () => {
  test("seeds the agreed predefined Unit names and labels", () => {
    expect(SEEDED_UNITS).toEqual([
      { key: "piece", name: "piece", label: "pc" },
      { key: "packet", name: "packet", label: "pkt" },
      { key: "box", name: "box", label: "box" },
      { key: "carton", name: "carton", label: "ctn" },
      { key: "bag", name: "bag", label: "bag" },
      { key: "bottle", name: "bottle", label: "bottle" },
      { key: "can", name: "can", label: "can" },
      { key: "jar", name: "jar", label: "jar" },
      { key: "tray", name: "tray", label: "tray" },
      { key: "dozen", name: "dozen", label: "doz" },
      { key: "kilogram", name: "kilogram", label: "kg" },
      { key: "gram", name: "gram", label: "g" },
      { key: "litre", name: "litre", label: "L" },
      { key: "millilitre", name: "millilitre", label: "mL" },
      { key: "metre", name: "metre", label: "m" },
      { key: "foot", name: "foot", label: "ft" },
    ]);
    expect(PREDEFINED_UNITS).toBe(SEEDED_UNITS);
  });

  test("predefined Unit names and labels are unique after normalization", () => {
    const names = SEEDED_UNITS.map((unit) => normalizeUnitToken(unit.name));
    const labels = SEEDED_UNITS.map((unit) => normalizeUnitToken(unit.label));

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(labels).size).toBe(labels.length);

    for (const unit of SEEDED_UNITS) {
      for (const other of SEEDED_UNITS) {
        if (unit.key === other.key) {
          continue;
        }

        expect(normalizeUnitToken(unit.name)).not.toBe(normalizeUnitToken(other.label));
        expect(normalizeUnitToken(unit.label)).not.toBe(normalizeUnitToken(other.name));
      }
    }
  });
});
