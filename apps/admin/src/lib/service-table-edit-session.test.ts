import { describe, expect, test } from "bun:test";

import {
  buildTableLayoutPersistPlan,
  mergeIncomingTableLayout,
  moveDraftTable,
  moveOrderedId,
  snapshotTableLayout,
  tableLayoutHasChanges,
  UNASSIGNED_GROUP_KEY,
} from "./service-table-edit-session";

describe("Service Table edit session", () => {
  const patioId = "99999999-9999-4999-8999-999999999999";
  const hallId = "77777777-7777-4777-8777-777777777777";
  const areas = [{ id: patioId }, { id: hallId }];
  const tables = [
    { id: "t1", serviceAreaId: patioId },
    { id: "t2", serviceAreaId: patioId },
    { id: "t3", serviceAreaId: null },
  ];

  test("snapshots area and table order without moving tables across areas", () => {
    const snapshot = snapshotTableLayout(areas, tables);

    expect(snapshot.areaIds).toEqual([patioId, hallId]);
    expect(snapshot.tableIdsByGroup[patioId]).toEqual(["t1", "t2"]);
    expect(snapshot.tableIdsByGroup[UNASSIGNED_GROUP_KEY]).toEqual(["t3"]);
  });

  test("moves ids within one list", () => {
    expect(moveOrderedId(["t1", "t2", "t3"], 0, 2)).toEqual(["t2", "t3", "t1"]);
    expect(moveOrderedId(["t1", "t2"], 0, 0)).toEqual(["t1", "t2"]);
  });

  test("detects staged area and table order changes", () => {
    const baseline = snapshotTableLayout(areas, tables);
    expect(tableLayoutHasChanges(baseline, baseline)).toBe(false);
    expect(
      tableLayoutHasChanges(baseline, {
        ...baseline,
        areaIds: [hallId, patioId],
      }),
    ).toBe(true);
    expect(
      tableLayoutHasChanges(baseline, {
        ...baseline,
        tableIdsByGroup: {
          ...baseline.tableIdsByGroup,
          [patioId]: ["t2", "t1"],
        },
      }),
    ).toBe(true);
  });

  test("keeps staged order when new areas or tables arrive", () => {
    const draft = {
      ...snapshotTableLayout(areas, tables),
      areaIds: [hallId, patioId],
      tableIdsByGroup: {
        [patioId]: ["t2", "t1"],
        [hallId]: [],
        [UNASSIGNED_GROUP_KEY]: ["t3"],
      },
    };
    const next = mergeIncomingTableLayout(
      draft,
      [...areas, { id: "new-area" }],
      [...tables, { id: "t4", serviceAreaId: patioId }],
    );

    expect(next.areaIds).toEqual([hallId, patioId, "new-area"]);
    expect(next.tableIdsByGroup[patioId]).toEqual(["t2", "t1", "t4"]);
  });

  test("moves tables only within the staged area group", () => {
    const draft = moveDraftTable(
      snapshotTableLayout(areas, tables),
      patioId,
      0,
      1,
    );
    expect(draft.tableIdsByGroup[patioId]).toEqual(["t2", "t1"]);
    expect(draft.tableIdsByGroup[UNASSIGNED_GROUP_KEY]).toEqual(["t3"]);
  });

  test("builds a persist plan from the staged group order", () => {
    const draft = {
      ...snapshotTableLayout(areas, tables),
      areaIds: [hallId, patioId],
      tableIdsByGroup: {
        [patioId]: ["t2", "t1"],
        [hallId]: [],
        [UNASSIGNED_GROUP_KEY]: ["t3"],
      },
    };

    expect(buildTableLayoutPersistPlan(draft)).toEqual({
      areaIds: [hallId, patioId],
      tableGroups: [
        { serviceAreaId: patioId, tableIds: ["t2", "t1"] },
        { serviceAreaId: null, tableIds: ["t3"] },
      ],
    });
  });
});
