import { Fragment, useState, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";

import type { ServiceAreaTableGroup } from "@/lib/service-area-tables";
import { resolveSameListMove, useLayoutDndSensors } from "@/lib/layout-dnd";
import { cn } from "@repo/ui/lib/utils";

import SortableLayoutItem from "@/components/table-service/sortable-layout-item";

export type ServiceTableRenderOptions = {
  isGrabbed?: boolean;
};

type ServiceTableAreaSectionsProps<T extends { id: string }> = {
  groups: ServiceAreaTableGroup<T>[];
  gridClassName: string;
  renderTable: (table: T, options?: ServiceTableRenderOptions) => ReactNode;
  renderHeading?: (group: ServiceAreaTableGroup<T>) => ReactNode;
  renderHeadingAction?: (group: ServiceAreaTableGroup<T>) => ReactNode;
  compact?: boolean;
  tablesDraggable?: boolean;
  onMoveTable?: (areaId: string | null, fromIndex: number, toIndex: number) => void;
};

const ServiceTableAreaSections = <T extends { id: string }>({
  groups,
  gridClassName,
  renderTable,
  renderHeading,
  renderHeadingAction,
  compact = false,
  tablesDraggable = false,
  onMoveTable,
}: ServiceTableAreaSectionsProps<T>) => {
  const sensors = useLayoutDndSensors();
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const activeTable = activeTableId
    ? (groups.flatMap((group) => group.tables).find((table) => table.id === activeTableId) ?? null)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTableId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTableId(null);
    if (!onMoveTable) return;

    const activeAreaId = readAreaId(event.active.data.current);
    const overAreaId = readAreaId(event.over?.data.current);
    if (activeAreaId === undefined || activeAreaId !== overAreaId) return;

    const group = groups.find((entry) => entry.areaId === activeAreaId);
    if (!group) return;

    const move = resolveSameListMove(
      group.tables.map((table) => table.id),
      String(event.active.id),
      event.over ? String(event.over.id) : null,
    );
    if (move) onMoveTable(group.areaId, move.fromIndex, move.toIndex);
  };

  const sections = (
    <div
      data-testid="service-table-simple-grid"
      className={compact ? "space-y-5" : "space-y-8"}
    >
      {groups.map((group) => {
        const description = group.description?.trim();
        const hasDescription = Boolean(description);

        return (
        <section
          key={group.areaId ?? "unassigned"}
          aria-label={group.title}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              compact
                ? hasDescription
                  ? "mb-1.5"
                  : "mb-2"
                : hasDescription
                  ? "mb-2"
                  : "mb-3",
            )}
          >
            {renderHeading ? (
              renderHeading(group)
            ) : (
              <h2
                className={
                  compact
                    ? "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    : "font-display text-sm font-semibold tracking-tight text-foreground sm:text-base"
                }
              >
                {group.title}
              </h2>
            )}
            {renderHeadingAction ? (
              <div className="flex items-center gap-1">
                {renderHeadingAction(group)}
              </div>
            ) : null}
          </div>
          {hasDescription ? (
            <p
              className={cn(
                "text-sm text-muted-foreground",
                compact ? "mb-2" : "mb-3",
              )}
            >
              {description}
            </p>
          ) : null}
          {group.tables.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
              No tables in this area yet.
            </p>
          ) : (
            <TableGroupGrid
              group={group}
              gridClassName={gridClassName}
              renderTable={renderTable}
              tablesDraggable={tablesDraggable}
            />
          )}
        </section>
        );
      })}
    </div>
  );

  if (!tablesDraggable) return sections;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={sameAreaCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTableId(null)}
    >
      {sections}
      <DragOverlay dropAnimation={null}>
        {activeTable ? (
          <div className="cursor-grabbing touch-none">
            {renderTable(activeTable, { isGrabbed: true })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

type TableGroupGridProps<T extends { id: string }> = {
  group: ServiceAreaTableGroup<T>;
  gridClassName: string;
  renderTable: (table: T) => ReactNode;
  tablesDraggable: boolean;
};

const TableGroupGrid = <T extends { id: string }>({
  group,
  gridClassName,
  renderTable,
  tablesDraggable,
}: TableGroupGridProps<T>) => {
  const items = group.tables.map((table) => table.id);
  const grid = (
    <div className={gridClassName}>
      {group.tables.map((table) =>
        tablesDraggable ? (
          <SortableLayoutItem
            key={table.id}
            id={table.id}
            sortableType="table"
            data={{ kind: "table", areaId: group.areaId }}
          >
            {renderTable(table)}
          </SortableLayoutItem>
        ) : (
          <div key={table.id}>
            <Fragment>{renderTable(table)}</Fragment>
          </div>
        ),
      )}
    </div>
  );

  if (!tablesDraggable) return grid;

  return (
    <SortableContext items={items} strategy={rectSortingStrategy}>
      {grid}
    </SortableContext>
  );
};

const readAreaId = (data: unknown): string | null | undefined => {
  if (!data || typeof data !== "object" || !("areaId" in data)) return undefined;
  const areaId = data.areaId;
  if (areaId === null || typeof areaId === "string") return areaId;
  return undefined;
};

const sameAreaCollision: CollisionDetection = (args) => {
  const areaId = readAreaId(args.active.data.current);
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => readAreaId(container.data.current) === areaId,
    ),
  });
};

export default ServiceTableAreaSections;
