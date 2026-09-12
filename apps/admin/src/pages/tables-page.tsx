import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  getOrganizationDetails,
  getServiceAreas,
  getServiceTables,
  reorderServiceAreas,
  reorderServiceTables,
} from "@repo/services";
import type { ServiceTableDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import {
  Armchair,
  Check,
  LayoutGrid,
  Pencil,
  Plus,
  RefreshCw,
  Store,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import UnderDevelopment from "@/components/under-development";
import ServiceTableAreaSections from "@/components/table-service/service-table-area-sections";
import UpsertServiceAreaDialog from "@/components/table-service/upsert-service-area-dialog";
import CreateServiceTableDialog from "@/components/table-service/create-service-table-dialog";
import { groupServiceTablesByArea } from "@/lib/service-area-tables";
import {
  buildTableLayoutPersistPlan,
  mergeIncomingTableLayout,
  moveDraftArea,
  moveDraftTable,
  orderAreasByDraft,
  orderTablesByDraft,
  sameStringList,
  snapshotTableLayout,
  tableGroupKey,
  tableLayoutHasChanges,
  type TableLayoutDraft,
} from "@/lib/service-table-edit-session";
import {
  isTableServiceReady,
  tableServiceUnavailableMessage,
} from "@/lib/table-service-availability";
import {
  organizationKeys,
  serviceAreaKeys,
  serviceTableKeys,
} from "@/lib/query-keys";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";

type AreaFilter = "all" | "unassigned" | string;

const ServiceTableTile = ({ table }: { table: ServiceTableDTO }) => (
  <div
    role="listitem"
    aria-label={`Table ${table.tableLabel}`}
    className="group relative flex aspect-square min-h-24 flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-2 text-center shadow-2xs transition-all duration-200 hover:border-primary/30 hover:bg-card/95 hover:shadow-md"
  >
    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/70 via-primary/40 to-transparent" />
    <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 transition-transform duration-200 group-hover:scale-[1.03] sm:size-14">
      <span className="font-display text-base font-bold leading-none text-primary sm:text-lg">
        {table.tableLabel}
      </span>
    </div>
    {table.capacity !== null ? (
      <Badge
        variant="outline"
        className="mt-2 rounded-full border-border/60 bg-muted/30 px-2 py-0 text-[10px] font-semibold text-muted-foreground"
      >
        <Users className="size-3" />
        {table.capacity}
      </Badge>
    ) : null}
  </div>
);

const TablesWorkspace = () => {
  const { organizationId = "", storeId = "" } = useParams();
  const queryClient = useQueryClient();
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("all");
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [baseline, setBaseline] = useState<TableLayoutDraft | null>(null);
  const [draft, setDraft] = useState<TableLayoutDraft | null>(null);
  const areaDragIndexRef = useRef<number | null>(null);
  const areaDidDragRef = useRef(false);

  const organizationQuery = useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => getOrganizationDetails(organizationId),
    enabled: Boolean(organizationId),
  });
  const organization =
    organizationQuery.data?.status === "success"
      ? organizationQuery.data.data?.organization
      : null;
  const stores = organization?.stores ?? [];
  const workspaceStore = resolveNamedStoreInOrganization(storeId, stores);
  const effectiveStoreId = workspaceStore?.id ?? "";

  const tablesQuery = useQuery({
    queryKey: serviceTableKeys.store(organizationId, effectiveStoreId),
    queryFn: () => getServiceTables(organizationId, effectiveStoreId),
    enabled: Boolean(organizationId && effectiveStoreId),
  });
  const tables =
    tablesQuery.data?.status === "success"
      ? (tablesQuery.data.data?.tables ?? [])
      : [];
  const areasQuery = useQuery({
    queryKey: serviceAreaKeys.store(organizationId, effectiveStoreId),
    queryFn: () => getServiceAreas(organizationId, effectiveStoreId),
    enabled: Boolean(organizationId && effectiveStoreId),
  });
  const areas =
    areasQuery.data?.status === "success"
      ? (areasQuery.data.data?.areas ?? [])
      : [];
  const areasError =
    areasQuery.data?.status === "error"
      ? areasQuery.data.message
      : areasQuery.isError
        ? "Service areas could not be loaded"
        : null;

  const exitLayoutEdit = () => {
    setIsEditing(false);
    setBaseline(null);
    setDraft(null);
    setIsSavingLayout(false);
  };

  const startLayoutEdit = () => {
    const snapshot = snapshotTableLayout(areas, tables);
    setBaseline(snapshot);
    setDraft(snapshot);
    setAreaFilter("all");
    setIsEditing(true);
  };

  useEffect(() => {
    setIsEditing(false);
    setBaseline(null);
    setDraft(null);
    setIsSavingLayout(false);
  }, [effectiveStoreId]);

  useEffect(() => {
    if (!isEditing) return;
    setDraft((current) => {
      if (!current) return current;
      const next = mergeIncomingTableLayout(current, areas, tables);
      return tableLayoutHasChanges(current, next) ? next : current;
    });
  }, [areas, isEditing, tables]);

  const layoutAreas = useMemo(
    () => (isEditing && draft ? orderAreasByDraft(areas, draft) : areas),
    [areas, draft, isEditing],
  );
  const layoutTables = useMemo(
    () => (isEditing && draft ? orderTablesByDraft(tables, draft) : tables),
    [draft, isEditing, tables],
  );

  const filteredTables = useMemo(() => {
    let result = layoutTables;

    if (areaFilter === "unassigned") {
      result = result.filter((table) => table.serviceAreaId === null);
    } else if (areaFilter !== "all") {
      result = result.filter((table) => table.serviceAreaId === areaFilter);
    }

    return result;
  }, [areaFilter, layoutTables]);

  const tableGroups = useMemo(() => {
    if (areaFilter === "all") {
      return groupServiceTablesByArea(filteredTables, layoutAreas, {
        includeEmptyAreas: isEditing,
      });
    }

    if (areaFilter === "unassigned") {
      return [{ areaId: null, title: "Unassigned", tables: filteredTables }];
    }

    const area = layoutAreas.find((entry) => entry.id === areaFilter);
    if (!area) return [];

    return [
      {
        areaId: area.id,
        title: area.title,
        tables: filteredTables,
      },
    ];
  }, [areaFilter, filteredTables, isEditing, layoutAreas]);

  const hasUnassignedTables = useMemo(
    () => layoutTables.some((table) => table.serviceAreaId === null),
    [layoutTables],
  );
  const showUnassignedFilter = hasUnassignedTables || isEditing;

  const hasActiveFilters = areaFilter !== "all";

  const confirmLayoutEdit = async () => {
    if (!draft || !baseline) return;
    if (!tableLayoutHasChanges(baseline, draft)) {
      exitLayoutEdit();
      return;
    }

    setIsSavingLayout(true);
    const plan = buildTableLayoutPersistPlan(draft);
    try {
      if (
        plan.areaIds.length > 0 &&
        !sameStringList(baseline.areaIds, plan.areaIds)
      ) {
        const response = await reorderServiceAreas(
          organizationId,
          effectiveStoreId,
          {
            areaIds: plan.areaIds,
          },
        );
        if (response.status !== "success") {
          toast.error(response.message);
          return;
        }
      }

      for (const group of plan.tableGroups) {
        const previousIds =
          baseline.tableIdsByGroup[tableGroupKey(group.serviceAreaId)] ?? [];
        if (sameStringList(previousIds, group.tableIds)) continue;
        const response = await reorderServiceTables(
          organizationId,
          effectiveStoreId,
          {
            serviceAreaId: group.serviceAreaId,
            tableIds: group.tableIds,
          },
        );
        if (response.status !== "success") {
          toast.error(response.message);
          return;
        }
      }

      toast.success("Table layout updated");
      exitLayoutEdit();
    } finally {
      setIsSavingLayout(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: serviceTableKeys.store(organizationId, effectiveStoreId),
        }),
        queryClient.invalidateQueries({
          queryKey: serviceAreaKeys.store(organizationId, effectiveStoreId),
        }),
      ]);
    }
  };

  if (organizationQuery.isPending) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (
    organizationQuery.isError ||
    organizationQuery.data?.status === "error" ||
    !organization
  ) {
    return (
      <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
        <CardContent className="p-0">
          <Empty className="rounded-2xl border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayoutGrid />
              </EmptyMedia>
              <EmptyTitle>Organization not found</EmptyTitle>
              <EmptyDescription>
                {organizationQuery.data?.message ??
                  "You may not have access to this workspace."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  if (!workspaceStore) {
    return (
      <Card className="border-border/60 bg-card/80 shadow-md">
        <CardContent className="pt-6">
          <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Store />
              </EmptyMedia>
              <EmptyTitle>Store not found</EmptyTitle>
              <EmptyDescription>
                This Store may have been removed or you may not have access to
                it.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const selectedStoreName = workspaceStore.name;
  const scrollRowClassName =
    "flex items-center gap-1.5 overflow-x-auto py-0 scrollbar-none";

  return (
    <div
      className="space-y-3"
      data-testid="tables-page"
      data-admin-workspace="store"
    >
      <div className="flex items-center gap-2">
        <div className={cn(scrollRowClassName, "min-w-0 flex-1")}>
          {isEditing ? (
            <UpsertServiceAreaDialog
              organizationId={organizationId}
              storeId={effectiveStoreId}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Add area"
                  className="h-8.5 w-8.5 shrink-0 rounded-full border-border/60 bg-card/50 p-0 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="size-4" />
                </Button>
              }
            />
          ) : null}
          <Button
            variant={areaFilter === "all" ? "default" : "outline"}
            className={cn(
              "h-8.5 shrink-0 rounded-full px-4 text-xs font-medium transition-all cursor-pointer",
              areaFilter === "all"
                ? "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                : "border-border/60 bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-card hover:text-foreground",
            )}
            onClick={() => setAreaFilter("all")}
          >
            All
          </Button>
          {layoutAreas.map((area, index) => (
            <span
              key={area.id}
              draggable={isEditing}
              onDragStart={(event) => {
                if (!isEditing) return;
                areaDragIndexRef.current = index;
                areaDidDragRef.current = false;
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (!isEditing || areaDragIndexRef.current === null) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!isEditing || areaDragIndexRef.current === null) return;
                const fromIndex = areaDragIndexRef.current;
                if (fromIndex !== index) {
                  areaDidDragRef.current = true;
                  setDraft((current) =>
                    current
                      ? moveDraftArea(current, fromIndex, index)
                      : current,
                  );
                }
                areaDragIndexRef.current = null;
              }}
              onDragEnd={() => {
                areaDragIndexRef.current = null;
              }}
              className={
                isEditing
                  ? "shrink-0 cursor-grab active:cursor-grabbing"
                  : "shrink-0"
              }
            >
              <Button
                variant={areaFilter === area.id ? "default" : "outline"}
                className={cn(
                  "h-8.5 shrink-0 rounded-full px-4 text-xs font-medium transition-all cursor-pointer",
                  areaFilter === area.id
                    ? "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                    : "border-border/60 bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-card hover:text-foreground",
                )}
                onClick={() => {
                  if (areaDidDragRef.current) {
                    areaDidDragRef.current = false;
                    return;
                  }
                  setAreaFilter(area.id);
                }}
              >
                {area.title}
              </Button>
            </span>
          ))}
          {showUnassignedFilter ? (
            <Button
              variant={areaFilter === "unassigned" ? "default" : "outline"}
              className={cn(
                "h-8.5 shrink-0 rounded-full px-4 text-xs font-medium transition-all cursor-pointer",
                areaFilter === "unassigned"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                  : "border-border/60 bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-card hover:text-foreground",
              )}
              onClick={() => setAreaFilter("unassigned")}
            >
              Unassigned
            </Button>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                aria-label="Cancel layout edits"
                disabled={isSavingLayout}
                className="h-8.5 rounded-full px-3 text-xs font-medium"
                onClick={exitLayoutEdit}
              >
                Cancel
              </Button>
              <Button
                type="button"
                aria-label="Confirm layout"
                disabled={isSavingLayout}
                className="h-8.5 rounded-full px-3 text-xs font-medium"
                onClick={() => void confirmLayoutEdit()}
              >
                <Check className="size-3.5" />
                Confirm
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              aria-label="Edit layout"
              className="h-8.5 rounded-full px-3 text-xs font-medium"
              onClick={startLayoutEdit}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {tablesQuery.isPending || areasQuery.isPending ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : tablesQuery.data?.status === "error" ? (
        <Card className="border-border/60 bg-card/80 shadow-md">
          <CardContent className="p-0">
            <Empty className="rounded-2xl border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RefreshCw />
                </EmptyMedia>
                <EmptyTitle>Unable to load tables</EmptyTitle>
                <EmptyDescription>{tablesQuery.data.message}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => tablesQuery.refetch()}
                >
                  Try again
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : areasError ? (
        <Card className="border-border/60 bg-card/80 shadow-md">
          <CardContent className="pt-6">
            <p role="alert" className="text-center text-sm text-destructive">
              {areasError}
            </p>
          </CardContent>
        </Card>
      ) : tableGroups.length > 0 ? (
        <div className="transition-all duration-300 ease-out animate-in fade-in-40 slide-in-from-bottom-2">
          <ServiceTableAreaSections
            groups={tableGroups}
            gridClassName="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10"
            tablesDraggable={isEditing}
            onMoveTable={(areaId, fromIndex, toIndex) => {
              setDraft((current) =>
                current
                  ? moveDraftTable(current, areaId, fromIndex, toIndex)
                  : current,
              );
            }}
            renderTable={(table) => <ServiceTableTile table={table} />}
            renderHeadingAction={(group) =>
              isEditing ? (
                <CreateServiceTableDialog
                  organizationId={organizationId}
                  storeId={effectiveStoreId}
                  serviceAreaId={group.areaId}
                  areaTitle={group.title}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Add table to ${group.title}`}
                      className="h-6 w-6 shrink-0 rounded-full border-border/60 bg-card/50 p-0 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  }
                />
              ) : null
            }
          />
        </div>
      ) : tables.length === 0 ? (
        <Card className="border-border/60 bg-card/80 shadow-md">
          <CardContent className="pt-6">
            <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Armchair />
                </EmptyMedia>
                <EmptyTitle>No tables configured</EmptyTitle>
                <EmptyDescription>
                  Add an area, then add tables to it for {selectedStoreName}.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 bg-card/80 shadow-md">
          <CardContent className="pt-6">
            <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Armchair />
                </EmptyMedia>
                <EmptyTitle>No tables found</EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters
                    ? "Try adjusting your search or area filter."
                    : "Add your first table to get started."}
                </EmptyDescription>
              </EmptyHeader>
              {hasActiveFilters ? (
                <EmptyContent>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setAreaFilter("all");
                    }}
                  >
                    Clear all filters
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const TablesPage = () => {
  if (!isTableServiceReady) {
    return (
      <div className="space-y-3" data-testid="tables-page">
        <UnderDevelopment
          title="Tables is under development"
          message={tableServiceUnavailableMessage}
        />
      </div>
    );
  }

  return <TablesWorkspace />;
};

export default TablesPage;
