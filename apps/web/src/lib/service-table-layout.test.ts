import { describe, expect, test } from "bun:test";
import { normalizePointerPosition, tablePositionStyle } from "./service-table-layout";

describe("Service Table floor layout", () => {
  const floor = { left: 100, top: 50, width: 1000, height: 600 };

  test("normalizes a drag position to the logical floor, not viewport pixels", () => {
    expect(normalizePointerPosition(600, 350, floor, { width: 128, height: 82 })).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });

  test("keeps dragged boxes within the normalized floor bounds", () => {
    expect(normalizePointerPosition(-100, -100, floor)).toEqual({ x: 0, y: 0 });
    expect(normalizePointerPosition(2_000, 2_000, floor)).toEqual({ x: 1, y: 1 });
  });

  test("renders normalized coordinates as responsive percentages", () => {
    expect(tablePositionStyle({ x: 0.25, y: 0.75 })).toEqual({
      left: "calc(25% - 32px)",
      top: "calc(75% - 61.5px)",
    });
  });
});
