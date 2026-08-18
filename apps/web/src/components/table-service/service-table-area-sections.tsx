import { Fragment, type ReactNode } from "react";

import type { ServiceAreaTableGroup } from "@/lib/service-area-tables";

type ServiceTableAreaSectionsProps<T extends { id: string }> = {
  groups: ServiceAreaTableGroup<T>[];
  gridClassName: string;
  renderTable: (table: T) => ReactNode;
  compact?: boolean;
};

const ServiceTableAreaSections = <T extends { id: string }>({
  groups,
  gridClassName,
  renderTable,
  compact = false,
}: ServiceTableAreaSectionsProps<T>) => (
  <div
    data-testid="service-table-simple-grid"
    className={compact ? "space-y-5" : "space-y-8"}
  >
    {groups.map((group) => (
      <section
        key={group.areaId ?? "unassigned"}
        aria-label={group.title}
      >
        <h2
          className={
            compact
              ? "mb-2 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              : "mb-3 font-display text-xl font-semibold tracking-tight text-primary"
          }
        >
          <span className={compact ? "text-foreground" : undefined}>{group.title}</span>
          {compact ? (
            <span className="font-medium normal-case tracking-normal text-muted-foreground/80">
              {group.tables.length}
            </span>
          ) : null}
        </h2>
        <div className={gridClassName}>
          {group.tables.map((table) => (
            <Fragment key={table.id}>{renderTable(table)}</Fragment>
          ))}
        </div>
      </section>
    ))}
  </div>
);

export default ServiceTableAreaSections;
