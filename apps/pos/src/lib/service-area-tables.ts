export const tablesAssignedToServiceArea = <
  T extends { serviceAreaId: string | null; tableLabel: string },
>(
  tables: T[],
  areaId: string,
) => tables.filter((table) => table.serviceAreaId === areaId);

export const unassignedServiceTables = <
  T extends { serviceAreaId: string | null; tableLabel: string },
>(
  tables: T[],
) => tables.filter((table) => table.serviceAreaId === null);

export type ServiceAreaTableGroup<T> = {
  areaId: string | null;
  title: string;
  tables: T[];
};

export const groupServiceTablesByArea = <
  T extends { serviceAreaId: string | null; tableLabel: string },
>(
  tables: T[],
  areas: { id: string; title: string }[],
): ServiceAreaTableGroup<T>[] => {
  if (tables.length === 0) return [];

  if (areas.length === 0) {
    return [
      {
        areaId: null,
        title: "Unassigned",
        tables,
      },
    ];
  }

  const groups: ServiceAreaTableGroup<T>[] = [];
  for (const area of areas) {
    const assigned = tablesAssignedToServiceArea(tables, area.id);
    if (assigned.length === 0) continue;
    groups.push({
      areaId: area.id,
      title: area.title,
      tables: assigned,
    });
  }

  const unassigned = unassignedServiceTables(tables);
  if (unassigned.length > 0) {
    groups.push({
      areaId: null,
      title: "Unassigned",
      tables: unassigned,
    });
  }

  return groups;
};
