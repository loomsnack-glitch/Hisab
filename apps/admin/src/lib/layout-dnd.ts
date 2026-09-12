import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export const LAYOUT_DND_MOUSE_DISTANCE_PX = 8;
export const LAYOUT_DND_TOUCH_DELAY_MS = 250;
export const LAYOUT_DND_TOUCH_TOLERANCE_PX = 8;

export const useLayoutDndSensors = () =>
  useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: LAYOUT_DND_MOUSE_DISTANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: LAYOUT_DND_TOUCH_DELAY_MS,
        tolerance: LAYOUT_DND_TOUCH_TOLERANCE_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

export const resolveSameListMove = (
  ids: readonly string[],
  activeId: string,
  overId: string | null | undefined,
) => {
  if (!overId || activeId === overId) return null;
  const fromIndex = ids.indexOf(activeId);
  const toIndex = ids.indexOf(overId);
  if (fromIndex < 0 || toIndex < 0) return null;
  return { fromIndex, toIndex };
};
