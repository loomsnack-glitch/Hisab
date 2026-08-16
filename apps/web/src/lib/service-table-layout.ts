export type NormalizedTablePosition = { x: number; y: number };

export type FloorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type TableBoxSize = {
  width: number;
  height: number;
};

export const TABLE_BOX_SIZE: TableBoxSize = { width: 128, height: 82 };

export const FLOOR_SNAP_COLUMNS = 12;
export const FLOOR_SNAP_ROWS = 8;

export const clampNormalized = (value: number) => Math.min(1, Math.max(0, value));

export const snapNormalizedPosition = (
  position: NormalizedTablePosition,
  columns = FLOOR_SNAP_COLUMNS,
  rows = FLOOR_SNAP_ROWS,
): NormalizedTablePosition => ({
  x: clampNormalized(Math.round(position.x * columns) / columns),
  y: clampNormalized(Math.round(position.y * rows) / rows),
});

export const nextOpenTablePosition = (
  occupied: NormalizedTablePosition[],
  columns = FLOOR_SNAP_COLUMNS,
  rows = FLOOR_SNAP_ROWS,
): NormalizedTablePosition => {
  const used = new Set(
    occupied.map((position) => `${position.x.toFixed(4)}:${position.y.toFixed(4)}`),
  );

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const candidate = {
        x: col / columns,
        y: row / rows,
      };
      if (!used.has(`${candidate.x.toFixed(4)}:${candidate.y.toFixed(4)}`)) {
        return candidate;
      }
    }
  }

  return { x: 0, y: 0 };
};

export const sortServiceTablesByLabel = <T extends { tableLabel: string }>(tables: T[]) =>
  [...tables].sort((left, right) =>
    left.tableLabel.localeCompare(right.tableLabel, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

export const normalizePointerPosition = (
  clientX: number,
  clientY: number,
  floor: FloorRect,
  box: TableBoxSize = TABLE_BOX_SIZE,
): NormalizedTablePosition => {
  const availableWidth = Math.max(1, floor.width - box.width);
  const availableHeight = Math.max(1, floor.height - box.height);

  return {
    x: clampNormalized((clientX - floor.left - box.width / 2) / availableWidth),
    y: clampNormalized((clientY - floor.top - box.height / 2) / availableHeight),
  };
};

export const tablePositionStyle = (
  position: NormalizedTablePosition,
  box: TableBoxSize = TABLE_BOX_SIZE,
) => ({
  left: `calc(${position.x * 100}% - ${position.x * box.width}px)`,
  top: `calc(${position.y * 100}% - ${position.y * box.height}px)`,
});
