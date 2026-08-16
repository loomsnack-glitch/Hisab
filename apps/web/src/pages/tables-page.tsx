import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  createServiceTable,
  getOrganizationDetails,
  getServiceTables,
  updateServiceTable,
} from "@repo/services";
import {
  CreateServiceTableSchema,
  type ServiceTableDTO,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Armchair, Grip, LayoutGrid, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { normalizePointerPosition, tablePositionStyle, TABLE_BOX_SIZE } from "@/lib/service-table-layout";
import { organizationKeys, serviceTableKeys } from "@/lib/query-keys";

type DragState = { tableId: string; pointerId: number } | null;

const TablesPage = () => {
  const { organizationId = "" } = useParams();
  const queryClient = useQueryClient();
  const floorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftCapacity, setDraftCapacity] = useState("");
  const [formError, setFormError] = useState("");
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

  useEffect(() => {
    if (stores.length > 0 && !stores.some((store) => store.id === selectedStoreId)) {
      setSelectedStoreId(stores[0]?.id ?? "");
    }
  }, [selectedStoreId, stores]);

  const tablesQuery = useQuery({
    queryKey: serviceTableKeys.store(organizationId, selectedStoreId),
    queryFn: () => getServiceTables(organizationId, selectedStoreId),
    enabled: Boolean(organizationId && selectedStoreId),
  });
  const tables = tablesQuery.data?.status === "success" ? tablesQuery.data.data?.tables ?? [] : [];
  const tableById = useMemo(() => new Map(tables.map((table) => [table.id, table])), [tables]);

  useEffect(() => {
    setDraggedPositions({});
  }, [selectedStoreId, tablesQuery.dataUpdatedAt]);

  const createMutation = useMutation({
    mutationFn: (data: { tableLabel: string; capacity: number | null }) =>
      createServiceTable(organizationId, selectedStoreId, data),
    onSuccess: (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      toast.success("Service table created");
      setDraftLabel("");
      setDraftCapacity("");
      setFormError("");
      void queryClient.invalidateQueries({ queryKey: serviceTableKeys.store(organizationId, selectedStoreId) });
    },
    onError: (error: { message?: string }) => toast.error(error.message ?? "Failed to create service table"),
  });

  const positionMutation = useMutation({
    mutationFn: ({ tableId, position }: { tableId: string; position: ServiceTableDTO["position"] }) =>
      updateServiceTable(organizationId, selectedStoreId, tableId, { position }),
    onSuccess: (response) => {
      if (response.status !== "success") toast.error(response.message);
      void queryClient.invalidateQueries({ queryKey: serviceTableKeys.store(organizationId, selectedStoreId) });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to save table position");
      void queryClient.invalidateQueries({ queryKey: serviceTableKeys.store(organizationId, selectedStoreId) });
    },
  });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const floor = floorRef.current;
      if (!drag || !floor || event.pointerId !== drag.pointerId) return;
      const rect = floor.getBoundingClientRect();
      const position = normalizePointerPosition(event.clientX, event.clientY, rect);
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

  const handleCreate = () => {
    const capacity = draftCapacity.trim() === "" ? null : Number(draftCapacity);
    const result = CreateServiceTableSchema.safeParse({ tableLabel: draftLabel, capacity });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "Enter valid table details");
      return;
    }
    if (!selectedStoreId) {
      setFormError("Select a Store first");
      return;
    }
    setFormError("");
    createMutation.mutate({ tableLabel: result.data.tableLabel, capacity: result.data.capacity ?? null });
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>, table: ServiceTableDTO) => {
    if (event.button !== 0 || !floorRef.current) return;
    event.preventDefault();
    dragRef.current = { tableId: table.id, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  if (organizationQuery.isPending) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-6 text-primary" /></div>;
  }

  if (organizationQuery.isError || organizationQuery.data?.status === "error" || !organization) {
    return <Card><CardHeader><CardTitle>Organization not found</CardTitle><CardDescription>{organizationQuery.data?.message ?? "You may not have access to this workspace."}</CardDescription></CardHeader></Card>;
  }

  return (
    <div className="space-y-6" data-testid="tables-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Service area setup</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Tables</h1>
          <p className="mt-1 text-sm text-muted-foreground">Arrange the tables for each Store’s floor.</p>
        </div>
        <label className="flex min-w-56 flex-col gap-1.5 text-sm font-medium">
          Store
          <select
            aria-label="Store"
            value={selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
            className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        </label>
      </div>

      {stores.length === 0 ? (
        <Card><CardContent className="pt-6"><Empty><EmptyHeader><EmptyMedia variant="icon"><Armchair /></EmptyMedia><EmptyTitle>Add a Store first</EmptyTitle><EmptyDescription>Service Tables belong to a specific Store.</EmptyDescription></EmptyHeader></Empty></CardContent></Card>
      ) : (
        <>
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="gap-1"><CardTitle className="text-lg">Add Service Table</CardTitle><CardDescription>Use the same Table no that staff see on the floor.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
                <label className="flex flex-col gap-1.5 text-sm font-medium">Table no
                  <Input aria-label="Table no" value={draftLabel} onChange={(event) => setDraftLabel(event.target.value)} placeholder="e.g. Patio-2" className="h-10 rounded-xl" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">Persons no <span className="font-normal text-muted-foreground">(optional)</span>
                  <Input aria-label="Persons no" inputMode="numeric" value={draftCapacity} onChange={(event) => setDraftCapacity(event.target.value)} placeholder="e.g. 4" className="h-10 rounded-xl" />
                </label>
                <Button type="button" onClick={handleCreate} disabled={createMutation.isPending} className="h-10 rounded-xl"><Plus className="size-4" />{createMutation.isPending ? "Creating..." : "Add table"}</Button>
              </div>
              {formError ? <p role="alert" className="mt-3 text-sm text-destructive">{formError}</p> : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-muted/10"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><LayoutGrid className="size-5" /></div><div><CardTitle className="text-lg">{stores.find((store) => store.id === selectedStoreId)?.name ?? "Store"} floor</CardTitle><CardDescription>Drag a table to place it. Positions are saved for this Store.</CardDescription></div></div></CardHeader>
            <CardContent className="p-3 sm:p-5">
              {tablesQuery.isPending ? <div className="flex min-h-80 items-center justify-center"><Spinner className="size-6 text-primary" /></div> : tablesQuery.data?.status === "error" ? <p role="alert" className="p-8 text-center text-sm text-destructive">{tablesQuery.data.message}</p> : tables.length === 0 ? <Empty className="min-h-80 rounded-2xl border border-dashed"><EmptyHeader><EmptyMedia variant="icon"><Armchair /></EmptyMedia><EmptyTitle>No tables configured</EmptyTitle><EmptyDescription>Add a table above, then drag it into place.</EmptyDescription></EmptyHeader></Empty> : (
                <div ref={floorRef} data-testid="floor-canvas" className="relative min-h-[32rem] overflow-hidden rounded-2xl border border-dashed border-border/70 bg-[radial-gradient(circle,_var(--color-border)_1px,_transparent_1px)] [background-size:24px_24px] touch-none">
                  {tables.map((table) => {
                    const position = draggedPositions[table.id] ?? table.position;
                    return <div key={table.id} role="button" tabIndex={0} aria-label={`Table ${table.tableLabel}`} onPointerDown={(event) => startDrag(event, table)} className="absolute flex cursor-grab select-none flex-col items-center active:cursor-grabbing" style={{ ...tablePositionStyle(position), width: TABLE_BOX_SIZE.width, height: TABLE_BOX_SIZE.height }}>
                      <div className="flex h-14 w-32 flex-col items-center justify-center rounded-2xl border-2 border-primary/40 bg-card shadow-md shadow-primary/10"><Grip className="mb-0.5 size-3.5 text-muted-foreground/60" /><span className="font-display text-lg font-semibold">{table.tableLabel}</span></div>
                      {table.capacity !== null ? <span className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Users className="size-3" />{table.capacity}</span> : <span className="mt-1 h-4" aria-hidden="true" />}
                    </div>;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TablesPage;
