import type { CSSProperties, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@repo/ui/lib/utils";

type SortableLayoutItemProps = {
  id: string;
  data?: Record<string, unknown>;
  sortableType: "area" | "table";
  className?: string;
  children: ReactNode;
};

const SortableLayoutItem = ({
  id,
  data,
  sortableType,
  className,
  children,
}: SortableLayoutItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data,
    attributes: { role: "group" },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 30 : undefined,
    WebkitTouchCallout: "none",
    WebkitUserSelect: "none",
    userSelect: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-sortable={sortableType}
      onContextMenu={(event) => event.preventDefault()}
      data-grabbed={isDragging ? "true" : undefined}
      className={cn(
        "touch-manipulation select-none rounded-2xl transition-[box-shadow,opacity] duration-150",
        isDragging
          ? "cursor-grabbing ring-2 ring-primary/25"
          : "cursor-grab",
        className,
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

export default SortableLayoutItem;
