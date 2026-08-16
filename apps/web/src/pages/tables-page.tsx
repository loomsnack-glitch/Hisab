import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { getOrganizationDetails, getServiceAreas, getServiceTables, updateServiceTable } from "@repo/services";
import type { ServiceTableDTO } from "@repo/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Armchair, Grip, LayoutGrid, MapPinned, Users } from "lucide-react";
import { toast } from "sonner";

import UnderDevelopment from "@/components/under-development";
import ServiceAreasPanel from "@/components/table-service/service-areas-panel";
import ServiceTableAreaSections from "@/components/table-service/service-table-area-sections";
import ServiceTableViewToggle from "@/components/table-service/service-table-view-toggle";
import UpsertServiceAreaDialog from "@/components/table-service/upsert-service-area-dialog";
import CreateServiceTableDialog from "@/components/table-service/create-service-table-dialog";
import {
  nextOpenTablePosition,
  normalizePointerPosition,
  snapNormalizedPosition,
  tablePositionStyle,
  TABLE_BOX_SIZE,
} from "@/lib/service-table-layout";
import { groupServiceTablesByArea } from "@/lib/service-area-tables";
import {
  persistServiceTableViewMode,
  readServiceTableViewMode,
  type ServiceTableViewMode,
} from "@/lib/service-table-view";
import { isTableServiceReady, tableServiceUnavailableMessage } from "@/lib/table-service-availability";
import { organizationKeys, serviceAreaKeys, serviceTableKeys } from "@/lib/query-keys";

type DragState = { tableId: string; pointerId: number } | null;

const TablesWorkspace = () => {
  const { organizationId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const floorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const activeTab = searchParams.get("tab") === "areas" ? "areas" : "tables";
  const [viewMode, setViewMode] = useState<ServiceTableViewMode>(() =>
    readServiceTableViewMode("admin"),
  );
  const [draggedPositions, setDraggedPositions] = useState<Record<string, ServiceTableDTO["position"]>>({});

  const organizationQuery = useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => getOrganizationDetails(organizationId),
    enabled: Boolean(organizationId),
  });
  const organization = organizationQuery.data?.status === "success"
    ? organizationQuery.data.data?.organization
    : null;
  const stores = organization?.stores ?? [];
  const effectiveStoreId = stores.some((store) => store.id === selectedStoreId)
    ? selectedStoreId
    : (stores[0]?.id ?? "");

  const tablesQuery = useQuery({
    queryKey: serviceTableKeys.store(organizationId, effectiveStoreId),
    queryFn: () => getServiceTables(organizationId, effectiveStoreId),
    enabled: Boolean(organizationId && effectiveStoreId),
  });
  const tables = tablesQuery.data?.status === "success" ? tablesQuery.data.data?.tables ?? [] : [];
  const areasQuery = useQuery({
    queryKey: serviceAreaKeys.store(organizationId, effectiveStoreId),
    queryFn: () => getServiceAreas(organizationId, effectiveStoreId),
    enabled: Boolean(organizationId && effectiveStoreId),
  });
  const areas = areasQuery.data?.status === "success" ? areasQuery.data.data?.areas ?? [] : [];
  const simpleViewAreasPending = viewMode === "simple" && areasQuery.isPending;
  const simpleViewAreasError =
    viewMode === "simple"
      ? areasQuery.data?.status === "error"
        ? areasQuery.data.message
        : areasQuery.isError
          ? "Service areas could not be loaded"
          : null
      : null;
  const tableGroups = useMemo(
    () => groupServiceTablesByArea(tables, areas),
    [areas, tables],
  );
  const tableById = useMemo(() => new Map(tables.map((table) => [table.id, table])), [tables]);
  const nextPosition = useMemo(
    () => nextOpenTablePosition(tables.map((table) => table.position)),
    [tables],
  );

  useEffect(() => {
    setDraggedPositions({});
  }, [effectiveStoreId, tablesQuery.dataUpdatedAt]);

  const positionMutation = useMutation({
    mutationFn: ({ tableId, position }: { tableId: string; position: ServiceTableDTO["position"] }) =>
      updateServiceTable(organizationId, effectiveStoreId, tableId, { position }),
    onSuccess: (response) => {
      if (response.status !== "success") toast.error(response.message);
      void queryClient.invalidateQueries({ queryKey: serviceTableKeys.store(organizationId, effectiveStoreId) });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to save table position");
      void queryClient.invalidateQueries({ queryKey: serviceTableKeys.store(organizationId, effectiveStoreId) });
    },
  });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const floor = floorRef.current;
      if (!drag || !floor || event.pointerId !== drag.pointerId) return;
      const rect = floor.getBoundingClientRect();
      const position = snapNormalizedPosition(normalizePointerPosition(event.clientX, event.clientY, rect));
      setDraggedPositions((current) => ({ ...current, [drag.tableId]: position }));
    };
    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const table = tableById.get(drag.tableId);
      const position = draggedPositions[drag.tableId];
      dragRef.current = null;
      if (table && position) positionMutation.mutate({ tableId: table.id, position });
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggedPositions, positionMutation, tableById]);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>, table: ServiceTableDTO) => {
    if (event.button !== 0 || !floorRef.current) return;
    event.preventDefault();
    dragRef.current = { tableId: table.id, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleViewModeChange = (mode: ServiceTableViewMode) => {
    setViewMode(mode);
    persistServiceTableViewMode("admin", mode);
  };

  if (organizationQuery.isPending) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-6 text-primary" /></div>;
  }

  if (organizationQuery.isError || organizationQuery.data?.status === "error" || !organization) {
    return <Card><CardHeader><CardTitle>Organization not found</CardTitle><CardDescription>{organizationQuery.data?.message ?? "You may not have access to this workspace."}</CardDescription></CardHeader></Card>;
  }

  const selectedStoreName = stores.find((store) => store.id === effectiveStoreId)?.name ?? "Store";

  return (
    <div className="space-y-6" data-testid="tables-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Service area setup</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Tables</h1>
          <p className="mt-1 text-sm text-muted-foreground">Arrange tables and areas for each Store’s floor.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-56 flex-col gap-1.5 text-sm font-medium">
            Store
            <select
              aria-label="Store"
              value={effectiveStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
          {stores.length > 0 && activeTab === "tables" ? (
            <CreateServiceTableDialog
              organizationId={organizationId}
              storeId={effectiveStoreId}
              nextPosition={nextPosition}
            />
          ) : null}
          {stores.length > 0 && activeTab === "areas" ? (
            <UpsertServiceAreaDialog
              organizationId={organizationId}
              storeId={effectiveStoreId}
            />
          ) : null}
        </div>
      </div>

      {stores.length === 0 ? (
        <Card><CardContent className="pt-6"><Empty><EmptyHeader><EmptyMedia variant="icon"><Armchair /></EmptyMedia><EmptyTitle>Add a Store first</EmptyTitle><EmptyDescription>Service Tables belong to a specific Store.</EmptyDescription></EmptyHeader></Empty></CardContent></Card>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(tab) => setSearchParams(tab === "tables" ? {} : { tab })}
          className="w-full space-y-6"
        >
          <TabsList
            variant="line"
            color="primary"
            className="h-auto w-full justify-start gap-6 border-b border-border/60 bg-transparent p-0 pb-px"
          >
            <TabsTrigger
              value="tables"
              className="h-auto gap-2 rounded-none px-1 py-3 text-sm font-semibold transition-all hover:text-foreground data-active:text-primary sm:text-base cursor-pointer"
            >
              <Armchair className="size-4" />
              Tables
            </TabsTrigger>
            <TabsTrigger
              value="areas"
              className="h-auto gap-2 rounded-none px-1 py-3 text-sm font-semibold transition-all hover:text-foreground data-active:text-primary sm:text-base cursor-pointer"
            >
              <MapPinned className="size-4" />
              Areas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tables" className="focus-visible:outline-none">
        <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><LayoutGrid className="size-5" /></div>
                <div>
                  <CardTitle className="text-lg">{selectedStoreName} floor</CardTitle>
                  <CardDescription>
                    {viewMode === "simple"
                      ? "Tables are grouped by area so staff can find them quickly."
                      : "Drag a table to place it. Positions snap to the floor grid and are saved for this Store."}
                  </CardDescription>
                </div>
              </div>
              <ServiceTableViewToggle value={viewMode} onChange={handleViewModeChange} />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
            {tablesQuery.isPending || simpleViewAreasPending ? (
              <div className="flex min-h-80 items-center justify-center"><Spinner className="size-6 text-primary" /></div>
            ) : tablesQuery.data?.status === "error" ? (
              <p role="alert" className="p-8 text-center text-sm text-destructive">{tablesQuery.data.message}</p>
            ) : simpleViewAreasError ? (
              <p role="alert" className="p-8 text-center text-sm text-destructive">{simpleViewAreasError}</p>
            ) : tables.length === 0 ? (
              <Empty className="min-h-80 rounded-2xl border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Armchair /></EmptyMedia>
                  <EmptyTitle>No tables configured</EmptyTitle>
                  <EmptyDescription>Add a table, then switch to Floor layout if you want to place it on a map.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : viewMode === "simple" ? (
              <ServiceTableAreaSections
                groups={tableGroups}
                gridClassName="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10"
                renderTable={(table) => (
                  <div
                    role="listitem"
                    aria-label={`Table ${table.tableLabel}`}
                    className="flex aspect-square min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 px-2 text-center shadow-sm"
                  >
                    <span className="font-display text-xl font-semibold leading-none">{table.tableLabel}</span>
                    {table.capacity !== null ? (
                      <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Users className="size-3" />
                        {table.capacity}
                      </span>
                    ) : null}
                  </div>
                )}
              />
            ) : (
              <div
                ref={floorRef}
                data-testid="floor-canvas"
                className="relative min-h-[32rem] overflow-hidden rounded-2xl border border-dashed border-border/70 bg-[radial-gradient(circle,_var(--color-border)_1px,_transparent_1px)] [background-size:24px_24px] touch-none"
              >
                {tables.map((table) => {
                  const position = draggedPositions[table.id] ?? table.position;
                  return (
                    <div
                      key={table.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Table ${table.tableLabel}`}
                      onPointerDown={(event) => startDrag(event, table)}
                      className="absolute flex cursor-grab select-none flex-col items-center active:cursor-grabbing"
                      style={{ ...tablePositionStyle(position), width: TABLE_BOX_SIZE.width, height: TABLE_BOX_SIZE.height }}
                    >
                      <div className="flex h-14 w-32 flex-col items-center justify-center rounded-2xl border-2 border-primary/40 bg-card shadow-md shadow-primary/10">
                        <Grip className="mb-0.5 size-3.5 text-muted-foreground/60" />
                        <span className="font-display text-lg font-semibold">{table.tableLabel}</span>
                      </div>
                      {table.capacity !== null ? (
                        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Users className="size-3" />
                          {table.capacity}
                        </span>
                      ) : (
                        <span className="mt-1 h-4" aria-hidden="true" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="areas" className="focus-visible:outline-none">
            <ServiceAreasPanel
              organizationId={organizationId}
              storeId={effectiveStoreId}
              storeName={selectedStoreName}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

const TablesPage = () => {
  if (!isTableServiceReady) {
    return (
      <div className="space-y-6" data-testid="tables-page">
        <div>
          <p className="text-sm font-medium text-primary">Service area setup</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Tables</h1>
        </div>
        <UnderDevelopment title="Tables is under development" message={tableServiceUnavailableMessage} />
      </div>
    );
  }

  return <TablesWorkspace />;
};

export default TablesPage;
