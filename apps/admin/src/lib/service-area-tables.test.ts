import { describe, expect, test } from "bun:test";

import {
  groupServiceTablesByArea,
  tablesAssignedToServiceArea,
  unassignedServiceTables,
} from "./service-area-tables";

describe("Service Area table membership", () => {
  const patioId = "99999999-9999-4999-8999-999999999999";
  const indoorId = "77777777-7777-4777-8777-777777777777";
  const tables = [
    { tableLabel: "T10", serviceAreaId: patioId },
    { tableLabel: "T2", serviceAreaId: null },
    { tableLabel: "T1", serviceAreaId: patioId },
    { tableLabel: "A1", serviceAreaId: indoorId },
  ];

  test("lists only tables assigned to the selected area, sorted by label", () => {
    expect(
      tablesAssignedToServiceArea(tables, patioId).map((table) => table.tableLabel),
    ).toEqual(["T1", "T10"]);
  });

  test("lists Unassigned Service Tables and excludes tables already in an area", () => {
    expect(
      unassignedServiceTables(tables).map((table) => table.tableLabel),
    ).toEqual(["T2"]);
  });

  test("groups tables under each area heading and keeps Unassigned last", () => {
    expect(
      groupServiceTablesByArea(tables, [
        { id: indoorId, title: "Hall" },
        { id: patioId, title: "First Floor" },
      ]).map((group) => ({
        title: group.title,
        labels: group.tables.map((table) => table.tableLabel),
      })),
    ).toEqual([
      { title: "Hall", labels: ["A1"] },
      { title: "First Floor", labels: ["T1", "T10"] },
      { title: "Unassigned", labels: ["T2"] },
    ]);
  });

  test("omits empty areas and labels all tables Unassigned when no areas exist", () => {
    expect(
      groupServiceTablesByArea(tables, [{ id: indoorId, title: "Hall" }]).map(
        (group) => group.title,
      ),
    ).toEqual(["Hall", "Unassigned"]);
    expect(
      groupServiceTablesByArea(tables, []).map((group) => group.title),
    ).toEqual(["Unassigned"]);
  });
});
