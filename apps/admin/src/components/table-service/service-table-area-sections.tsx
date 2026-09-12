import { Fragment, useRef, type MutableRefObject, type ReactNode } from "react";

import type { ServiceAreaTableGroup } from "@/lib/service-area-tables";

type ServiceTableAreaSectionsProps<T extends { id: string }> = {
  groups: ServiceAreaTableGroup<T>[];
  gridClassName: string;
  renderTable: (table: T) => ReactNode;
  renderHeadingAction?: (group: ServiceAreaTableGroup<T>) => ReactNode;
  compact?: boolean;
  tablesDraggable?: boolean;
  onMoveTable?: (areaId: string | null, fromIndex: number, toIndex: number) => void;
};

const ServiceTableAreaSections = <T extends { id: string }>({
  groups,
  gridClassName,
  renderTable,
  renderHeadingAction,
  compact = false,
  tablesDraggable = false,
  onMoveTable,
}: ServiceTableAreaSectionsProps<T>) => {
  const dragRef = useRef<{ areaKey: string; index: number } | null>(null);

  return (
    <div
      data-testid="service-table-simple-grid"
      className={compact ? "space-y-5" : "space-y-8"}
    >
      {groups.map((group) => (
        <section
          key={group.areaId ?? "unassigned"}
          aria-label={group.title}
        >
          <div
            className={
              compact
                ? "mb-2 flex items-center gap-2"
                : "mb-3 flex items-center gap-2"
            }
          >
            <h2
              className={
                compact
                  ? "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  : "font-display text-sm font-semibold tracking-tight text-foreground sm:text-base"
              }
            >
              {group.title}
            </h2>
            <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {group.tables.length}
            </span>
            {renderHeadingAction?.(group)}
          </div>
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
              dragRef={dragRef}
              onMoveTable={onMoveTable}
            />
          )}
        </section>
      ))}
    </div>
  );
};

type TableGroupGridProps<T extends { id: string }> = {
  group: ServiceAreaTableGroup<T>;
  gridClassName: string;
  renderTable: (table: T) => ReactNode;
  tablesDraggable: boolean;
  dragRef: MutableRefObject<{ areaKey: string; index: number } | null>;
  onMoveTable?: (areaId: string | null, fromIndex: number, toIndex: number) => void;
};

const TableGroupGrid = <T extends { id: string }>({
  group,
  gridClassName,
  renderTable,
  tablesDraggable,
  dragRef,
  onMoveTable,
}: TableGroupGridProps<T>) => {
  const areaKey = group.areaId ?? "unassigned";

  return (
    <div className={gridClassName}>
      {group.tables.map((table, index) => (
        <div
          key={table.id}
          draggable={tablesDraggable}
          onDragStart={(event) => {
            if (!tablesDraggable) return;
            if ((event.target as HTMLElement | null)?.closest("button")) {
              event.preventDefault();
              return;
            }
            dragRef.current = { areaKey, index };
            event.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(event) => {
            if (!tablesDraggable) return;
            if (dragRef.current?.areaKey !== areaKey) return;
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!tablesDraggable || !onMoveTable || !dragRef.current) return;
            if (dragRef.current.areaKey !== areaKey) return;
            onMoveTable(group.areaId, dragRef.current.index, index);
            dragRef.current = null;
          }}
          onDragEnd={() => {
            dragRef.current = null;
          }}
          className={tablesDraggable ? "cursor-grab active:cursor-grabbing" : undefined}
        >
          <Fragment>{renderTable(table)}</Fragment>
        </div>
      ))}
    </div>
  );
};

export default ServiceTableAreaSections;
