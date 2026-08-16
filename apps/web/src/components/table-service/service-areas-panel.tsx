import { useQuery } from "@tanstack/react-query";
import { getServiceAreas, getServiceTables } from "@repo/services";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Armchair, MapPinned } from "lucide-react";

import AssignServiceAreaTablesDialog from "@/components/table-service/assign-service-area-tables-dialog";
import DeleteServiceAreaButton from "@/components/table-service/delete-service-area-button";
import UnassignServiceTableButton from "@/components/table-service/unassign-service-table-button";
import UpsertServiceAreaDialog from "@/components/table-service/upsert-service-area-dialog";
import {
  tablesAssignedToServiceArea,
  unassignedServiceTables,
} from "@/lib/service-area-tables";
import { serviceAreaKeys, serviceTableKeys } from "@/lib/query-keys";

type ServiceAreasPanelProps = {
  organizationId: string;
  storeId: string;
  storeName: string;
};

const ServiceAreasPanel = ({
  organizationId,
  storeId,
  storeName,
}: ServiceAreasPanelProps) => {
  const areasQuery = useQuery({
    queryKey: serviceAreaKeys.store(organizationId, storeId),
    queryFn: () => getServiceAreas(organizationId, storeId),
    enabled: Boolean(organizationId && storeId),
  });
  const tablesQuery = useQuery({
    queryKey: serviceTableKeys.store(organizationId, storeId),
    queryFn: () => getServiceTables(organizationId, storeId),
    enabled: Boolean(organizationId && storeId),
  });
  const areas = areasQuery.data?.status === "success" ? areasQuery.data.data?.areas ?? [] : [];
  const tables = tablesQuery.data?.status === "success" ? tablesQuery.data.data?.tables ?? [] : [];
  const unassignedTables = unassignedServiceTables(tables);

  return (
    <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPinned className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{storeName} areas</CardTitle>
            <CardDescription>
              Assign unassigned tables to an area. Remove a table before moving it to another area.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-5">
        {areasQuery.isPending ? (
          <div className="flex min-h-80 items-center justify-center">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : areasQuery.data?.status === "error" ? (
          <p role="alert" className="p-8 text-center text-sm text-destructive">
            {areasQuery.data.message}
          </p>
        ) : areas.length === 0 ? (
          <Empty className="min-h-80 rounded-2xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon"><MapPinned /></EmptyMedia>
              <EmptyTitle>No areas configured</EmptyTitle>
              <EmptyDescription>
                Add an area, then assign unassigned tables to it.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul data-testid="service-areas-list" className="space-y-3">
            {areas.map((area) => {
              const assignedTables = tablesAssignedToServiceArea(tables, area.id);
              return (
                <li
                  key={area.id}
                  aria-label={`Area ${area.title}`}
                  className="rounded-2xl border border-border/70 bg-background/80 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold">{area.title}</p>
                      {area.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{area.description}</p>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">No description</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AssignServiceAreaTablesDialog
                        organizationId={organizationId}
                        storeId={storeId}
                        area={area}
                        unassignedTables={unassignedTables}
                        hasConfiguredTables={tables.length > 0}
                      />
                      <UpsertServiceAreaDialog
                        organizationId={organizationId}
                        storeId={storeId}
                        area={area}
                      />
                      <DeleteServiceAreaButton
                        organizationId={organizationId}
                        storeId={storeId}
                        area={area}
                      />
                    </div>
                  </div>
                  {tablesQuery.isPending ? (
                    <div className="mt-4 flex justify-center py-4">
                      <Spinner className="size-5 text-primary" />
                    </div>
                  ) : assignedTables.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      No tables assigned yet.
                    </p>
                  ) : (
                    <ul
                      aria-label={`Tables in ${area.title}`}
                      className="mt-4 space-y-2"
                    >
                      {assignedTables.map((table) => (
                        <li
                          key={table.id}
                          aria-label={`Table ${table.tableLabel} in ${area.title}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Armchair className="size-4 shrink-0 text-muted-foreground" />
                            <span className="font-display text-base font-semibold">
                              {table.tableLabel}
                            </span>
                          </span>
                          <UnassignServiceTableButton
                            organizationId={organizationId}
                            storeId={storeId}
                            area={area}
                            table={table}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceAreasPanel;
