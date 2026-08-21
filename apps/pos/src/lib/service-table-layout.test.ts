import { describe, expect, test } from "bun:test";
import { sortServiceTablesByLabel } from "./service-table-layout";

describe("Service Table layout", () => {
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
