import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SERVICE_TABLE_VIEW,
  isServiceTableViewMode,
  readServiceTableViewMode,
} from "./service-table-view";

describe("Service Table view mode", () => {
  test("accepts only Simple and Floor layout modes", () => {
    expect(isServiceTableViewMode("simple")).toBe(true);
    expect(isServiceTableViewMode("floor")).toBe(true);
    expect(isServiceTableViewMode("canvas")).toBe(false);
  });

  test("defaults to Simple view when nothing is stored", () => {
    expect(DEFAULT_SERVICE_TABLE_VIEW).toBe("simple");
    expect(readServiceTableViewMode("admin")).toBe("simple");
    expect(readServiceTableViewMode("pos")).toBe("simple");
  });
});
