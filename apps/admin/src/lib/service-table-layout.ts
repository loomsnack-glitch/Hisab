export const sortServiceTablesByLabel = <T extends { tableLabel: string }>(tables: T[]) =>
  [...tables].sort((left, right) =>
    left.tableLabel.localeCompare(right.tableLabel, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
