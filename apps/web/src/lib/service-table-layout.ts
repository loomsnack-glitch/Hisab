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

export const clampNormalized = (value: number) => Math.min(1, Math.max(0, value));

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
