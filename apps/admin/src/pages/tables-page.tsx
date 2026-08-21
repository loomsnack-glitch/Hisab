import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { getOrganizationDetails, getServiceAreas, getServiceTables } from "@repo/services";
import type { ServiceTableDTO } from "@repo/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Armchair, LayoutGrid, MapPinned, Users } from "lucide-react";

import UnderDevelopment from "@/components/under-development";
import ServiceAreasPanel from "@/components/table-service/service-areas-panel";
import ServiceTableAreaSections from "@/components/table-service/service-table-area-sections";
import UpsertServiceAreaDialog from "@/components/table-service/upsert-service-area-dialog";
import CreateServiceTableDialog from "@/components/table-service/create-service-table-dialog";
import { groupServiceTablesByArea } from "@/lib/service-area-tables";
import { isTableServiceReady, tableServiceUnavailableMessage } from "@/lib/table-service-availability";
import { organizationKeys, serviceAreaKeys, serviceTableKeys } from "@/lib/query-keys";

const TablesWorkspace = () => {
  const { organizationId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const activeTab = searchParams.get("tab") === "areas" ? "areas" : "tables";

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
  const areasError =
    areasQuery.data?.status === "error"
      ? areasQuery.data.message
      : areasQuery.isError
        ? "Service areas could not be loaded"
        : null;
  const tableGroups = useMemo(
    () => groupServiceTablesByArea(tables, areas),
    [areas, tables],
  );

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
          <p className="mt-1 text-sm text-muted-foreground">Configure tables and areas for each Store.</p>
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
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><LayoutGrid className="size-5" /></div>
              <div>
                <CardTitle className="text-lg">{selectedStoreName} tables</CardTitle>
                <CardDescription>
                  Tables are grouped by area so staff can find them quickly.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
            {tablesQuery.isPending || areasQuery.isPending ? (
              <div className="flex min-h-80 items-center justify-center"><Spinner className="size-6 text-primary" /></div>
            ) : tablesQuery.data?.status === "error" ? (
              <p role="alert" className="p-8 text-center text-sm text-destructive">{tablesQuery.data.message}</p>
            ) : areasError ? (
              <p role="alert" className="p-8 text-center text-sm text-destructive">{areasError}</p>
            ) : tables.length === 0 ? (
              <Empty className="min-h-80 rounded-2xl border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Armchair /></EmptyMedia>
                  <EmptyTitle>No tables configured</EmptyTitle>
                  <EmptyDescription>Add a table to get started.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
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
