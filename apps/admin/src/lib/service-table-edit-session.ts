export const UNASSIGNED_GROUP_KEY = "unassigned";

export type TableLayoutDraft = {
  areaIds: string[];
  tableIdsByGroup: Record<string, string[]>;
};

export const tableGroupKey = (areaId: string | null) =>
  areaId ?? UNASSIGNED_GROUP_KEY;

export const snapshotTableLayout = (
  areas: { id: string }[],
  tables: { id: string; serviceAreaId: string | null }[],
): TableLayoutDraft => {
  const tableIdsByGroup: Record<string, string[]> = {
    [UNASSIGNED_GROUP_KEY]: [],
  };
  for (const area of areas) {
    tableIdsByGroup[area.id] = [];
  }
  for (const table of tables) {
    const key = tableGroupKey(table.serviceAreaId);
    if (!tableIdsByGroup[key]) {
      tableIdsByGroup[key] = [];
    }
    tableIdsByGroup[key].push(table.id);
  }

  return {
    areaIds: areas.map((area) => area.id),
    tableIdsByGroup,
  };
};

export const moveOrderedId = (
  ids: string[],
  fromIndex: number,
  toIndex: number,
) => {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= ids.length ||
    toIndex >= ids.length
  ) {
    return ids;
  }

  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return ids;
  next.splice(toIndex, 0, moved);
  return next;
};

export const sameStringList = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

export const tableLayoutHasChanges = (
  baseline: TableLayoutDraft,
  draft: TableLayoutDraft,
) => {
  if (!sameStringList(baseline.areaIds, draft.areaIds)) return true;
  const keys = new Set([
    ...Object.keys(baseline.tableIdsByGroup),
    ...Object.keys(draft.tableIdsByGroup),
  ]);
  for (const key of keys) {
    if (
      !sameStringList(
        baseline.tableIdsByGroup[key] ?? [],
        draft.tableIdsByGroup[key] ?? [],
      )
    ) {
      return true;
    }
  }
  return false;
};

export const mergeIncomingTableLayout = (
  draft: TableLayoutDraft,
  areas: { id: string }[],
  tables: { id: string; serviceAreaId: string | null }[],
): TableLayoutDraft => {
  const incoming = snapshotTableLayout(areas, tables);
  const areaIds = [
    ...draft.areaIds.filter((id) => incoming.areaIds.includes(id)),
    ...incoming.areaIds.filter((id) => !draft.areaIds.includes(id)),
  ];
  const mergeGroup = (key: string) => {
    const incomingIds = incoming.tableIdsByGroup[key] ?? [];
    const currentIds = (draft.tableIdsByGroup[key] ?? []).filter((id) =>
      incomingIds.includes(id),
    );
    return [
      ...currentIds,
      ...incomingIds.filter((id) => !currentIds.includes(id)),
    ];
  };

  const tableIdsByGroup: Record<string, string[]> = {
    [UNASSIGNED_GROUP_KEY]: mergeGroup(UNASSIGNED_GROUP_KEY),
  };
  for (const areaId of areaIds) {
    tableIdsByGroup[areaId] = mergeGroup(areaId);
  }

  return { areaIds, tableIdsByGroup };
};

export const moveDraftArea = (
  draft: TableLayoutDraft,
  fromIndex: number,
  toIndex: number,
): TableLayoutDraft => ({
  ...draft,
  areaIds: moveOrderedId(draft.areaIds, fromIndex, toIndex),
});

export const moveDraftTable = (
  draft: TableLayoutDraft,
  areaId: string | null,
  fromIndex: number,
  toIndex: number,
): TableLayoutDraft => {
  const key = tableGroupKey(areaId);
  return {
    ...draft,
    tableIdsByGroup: {
      ...draft.tableIdsByGroup,
      [key]: moveOrderedId(
        draft.tableIdsByGroup[key] ?? [],
        fromIndex,
        toIndex,
      ),
    },
  };
};

export const orderAreasByDraft = <T extends { id: string }>(
  areas: T[],
  draft: TableLayoutDraft,
) => {
  const byId = new Map(areas.map((area) => [area.id, area]));
  return draft.areaIds
    .map((id) => byId.get(id))
    .filter((area): area is T => Boolean(area));
};

export const orderTablesByDraft = <T extends { id: string }>(
  tables: T[],
  draft: TableLayoutDraft,
) => {
  const byId = new Map(tables.map((table) => [table.id, table]));
  const ordered: T[] = [];
  const seen = new Set<string>();
  const append = (ids: string[]) => {
    for (const id of ids) {
      const table = byId.get(id);
      if (!table || seen.has(id)) continue;
      ordered.push(table);
      seen.add(id);
    }
  };

  for (const areaId of draft.areaIds) {
    append(draft.tableIdsByGroup[areaId] ?? []);
  }
  append(draft.tableIdsByGroup[UNASSIGNED_GROUP_KEY] ?? []);
  for (const table of tables) {
    if (!seen.has(table.id)) ordered.push(table);
  }
  return ordered;
};

export type TableLayoutPersistPlan = {
  areaIds: string[];
  tableGroups: { serviceAreaId: string | null; tableIds: string[] }[];
};

export const buildTableLayoutPersistPlan = (
  draft: TableLayoutDraft,
): TableLayoutPersistPlan => {
  return {
    areaIds: draft.areaIds,
    tableGroups: [
      ...draft.areaIds.map((areaId) => ({
        serviceAreaId: areaId,
        tableIds: draft.tableIdsByGroup[areaId] ?? [],
      })),
      {
        serviceAreaId: null,
        tableIds: draft.tableIdsByGroup[UNASSIGNED_GROUP_KEY] ?? [],
      },
    ].filter((group) => group.tableIds.length > 0),
  };
};
