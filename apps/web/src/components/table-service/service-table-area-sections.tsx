import { Fragment, type ReactNode } from "react";

import type { ServiceAreaTableGroup } from "@/lib/service-area-tables";

type ServiceTableAreaSectionsProps<T extends { id: string }> = {
  groups: ServiceAreaTableGroup<T>[];
  gridClassName: string;
  renderTable: (table: T) => ReactNode;
};

const ServiceTableAreaSections = <T extends { id: string }>({
  groups,
  gridClassName,
  renderTable,
}: ServiceTableAreaSectionsProps<T>) => (
  <div data-testid="service-table-simple-grid" className="space-y-8">
    {groups.map((group) => (
      <section
        key={group.areaId ?? "unassigned"}
        aria-label={group.title}
      >
        <h2 className="mb-3 font-display text-xl font-semibold tracking-tight text-primary">
          {group.title}
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
