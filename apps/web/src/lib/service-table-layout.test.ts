import { describe, expect, test } from "bun:test";
import {
  nextOpenTablePosition,
  normalizePointerPosition,
  snapNormalizedPosition,
  sortServiceTablesByLabel,
  tablePositionStyle,
} from "./service-table-layout";

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

  test("snaps a dragged table onto the aligned floor grid", () => {
    expect(snapNormalizedPosition({ x: 0.2, y: 0.61 })).toEqual({
      x: 2 / 12,
      y: 5 / 8,
    });
  });

  test("places a new table in the next empty aligned slot", () => {
    expect(nextOpenTablePosition([])).toEqual({ x: 0, y: 0 });
    expect(nextOpenTablePosition([{ x: 0, y: 0 }])).toEqual({
      x: 1 / 12,
      y: 0,
    });
  });

  test("sorts table labels in natural order for the simple grid", () => {
    expect(
      sortServiceTablesByLabel([
        { tableLabel: "T10" },
        { tableLabel: "T2" },
        { tableLabel: "T1" },
      ]).map((table) => table.tableLabel),
    ).toEqual(["T1", "T2", "T10"]);
  });
});
