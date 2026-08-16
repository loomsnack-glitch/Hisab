import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  allocatePosServiceTable,
  cancelPosServiceTableOrder,
  collectPosPayment,
  freeDuePosServiceTable,
  freePaidPosServiceTable,
  freePosServiceTable,
  getPosServiceTableOrder,
  getPosServiceTables,
  getPosServiceAreas,
  markPosServiceTableReadyToBill,
  startPosServiceTableOrder,
} from "@repo/services";
import type { CreatePaymentJSON, PaymentMethod, ServiceTableDTO } from "@repo/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Armchair, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

import PosDeviceSidebar from "@/components/pos/pos-device-sidebar";
import PosServiceTableCard from "@/components/table-service/pos-service-table-card";
import ServiceTableAreaSections from "@/components/table-service/service-table-area-sections";
import ServiceTableViewToggle from "@/components/table-service/service-table-view-toggle";
import { groupServiceTablesByArea } from "@/lib/service-area-tables";
import { serviceAreaKeys, serviceTableKeys } from "@/lib/query-keys";
import type { PosServiceTableAction } from "@/lib/pos-service-table";
import {
  tablePositionStyle,
  TABLE_BOX_SIZE,
} from "@/lib/service-table-layout";
import {
  persistServiceTableViewMode,
  readServiceTableViewMode,
  type ServiceTableViewMode,
} from "@/lib/service-table-view";
import type { PosRouteContext } from "@/pages/pos-route-context";

type TableOperation = { tableId: string; action: PosServiceTableAction };
type OrderOperation = { tableId: string; mode: "start" | "resume" };

const PosTablesWorkspace = () => {
  const { session, onPanelTabChange } = useOutletContext<PosRouteContext>();
  const queryClient = useQueryClient();
  const [paymentTableId, setPaymentTableId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [viewMode, setViewMode] = useState<ServiceTableViewMode>(() =>
    readServiceTableViewMode("pos"),
  );
  const tablesQuery = useQuery({
    queryKey: serviceTableKeys.pos(session.organization.id, session.store.id),
    queryFn: getPosServiceTables,
    refetchOnWindowFocus: true,
  });
  const tables =
    tablesQuery.data?.status === "success"
      ? (tablesQuery.data.data?.tables ?? [])
      : [];
  const areasQuery = useQuery({
    queryKey: serviceAreaKeys.pos(session.organization.id, session.store.id),
    queryFn: getPosServiceAreas,
    refetchOnWindowFocus: true,
  });
  const areas =
    areasQuery.data?.status === "success"
      ? (areasQuery.data.data?.areas ?? [])
      : [];
  const simpleViewAreasPending = viewMode === "simple" && areasQuery.isPending;
  const simpleViewAreasError =
    viewMode === "simple"
      ? areasQuery.data?.status === "error"
        ? areasQuery.data.message
        : areasQuery.isError
          ? "Service areas could not be loaded"
          : null
      : null;
  const tableGroups = groupServiceTablesByArea(tables, areas);

  const operationMutation = useMutation({
    mutationFn: ({ tableId, action }: TableOperation) =>
      action === "allocate"
        ? allocatePosServiceTable(tableId)
        : freePosServiceTable(tableId),
    onSuccess: async (response, variables) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: serviceTableKeys.pos(
          session.organization.id,
          session.store.id,
        ),
      });
      toast.success(
        variables.action === "allocate" ? "Table allocated" : "Table freed",
      );
    },
    onError: (error: { message?: string }) =>
      toast.error(error.message ?? "Table operation failed"),
  });

  const orderMutation = useMutation({
    mutationFn: ({ tableId, mode }: OrderOperation) =>
      mode === "start"
        ? startPosServiceTableOrder(tableId)
        : getPosServiceTableOrder(tableId),
    onSuccess: async (response) => {
      if (response.status !== "success" || !response.data?.sale) {
        toast.error(response.message);
        return;
      }
      if (
        response.data.table.state === "engaged" &&
        response.data.table.currentSaleId
      ) {
        await queryClient.invalidateQueries({
          queryKey: serviceTableKeys.pos(
            session.organization.id,
            session.store.id,
          ),
        });
      }
      onPanelTabChange("products", {
        sale: response.data.sale,
        editSaleId: null,
      });
    },
    onError: (error: { message?: string }) =>
      toast.error(error.message ?? "Table order could not be opened"),
  });

  const cancelMutation = useMutation({
    mutationFn: (tableId: string) => cancelPosServiceTableOrder(tableId),
    onSuccess: async (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: serviceTableKeys.pos(
          session.organization.id,
          session.store.id,
        ),
      });
      toast.success(response.message ?? "Table order cancelled");
    },
    onError: (error: { message?: string }) =>
      toast.error(error.message ?? "Table order could not be cancelled"),
  });

  const readyMutation = useMutation({
    mutationFn: (tableId: string) => markPosServiceTableReadyToBill(tableId),
    onSuccess: async (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: serviceTableKeys.pos(session.organization.id, session.store.id),
      });
      toast.success("Table marked Ready to bill");
    },
    onError: (error: { message?: string }) =>
      toast.error(error.message ?? "Table could not be marked Ready to bill"),
  });

  const releaseMutation = useMutation({
    mutationFn: ({ tableId, state }: { tableId: string; state: "paid" | "due" }) =>
      state === "paid"
        ? freePaidPosServiceTable(tableId)
        : freeDuePosServiceTable(tableId),
    onSuccess: async (response, variables) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: serviceTableKeys.pos(session.organization.id, session.store.id),
      });
      setPaymentTableId(null);
      toast.success(variables.state === "paid" ? "Paid table freed" : "Table freed with bill due");
    },
    onError: (error: { message?: string }) =>
      toast.error(error.message ?? "Table could not be freed"),
  });

  const collectMutation = useMutation({
    mutationFn: ({ saleId, data }: { saleId: string; data: CreatePaymentJSON }) =>
      collectPosPayment(saleId, data),
    onSuccess: async (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: serviceTableKeys.pos(session.organization.id, session.store.id),
      });
      setPaymentTableId(null);
      setPaymentAmount("");
      toast.success("Payment collected");
    },
    onError: (error: { message?: string }) =>
      toast.error(error.message ?? "Payment could not be collected"),
  });

  const handleViewModeChange = (mode: ServiceTableViewMode) => {
    setViewMode(mode);
    persistServiceTableViewMode("pos", mode);
  };

  const submitPayment = (table: ServiceTableDTO) => {
    if (!table.currentSaleId) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a positive payment amount");
      return;
    }
    collectMutation.mutate({
      saleId: table.currentSaleId,
      data: {
        amount,
        method: paymentMethod,
        referenceNumber: null,
        notes: null,
      },
    });
  };

  const renderTableCard = (table: ServiceTableDTO, layout: ServiceTableViewMode) => (
    <PosServiceTableCard
      key={table.id}
      table={table}
      layout={layout}
      paymentTableId={paymentTableId}
      paymentAmount={paymentAmount}
      paymentMethod={paymentMethod}
      busy={{
        allocateOrFree:
          operationMutation.isPending &&
          operationMutation.variables?.tableId === table.id,
        opening:
          orderMutation.isPending &&
          orderMutation.variables?.tableId === table.id,
        cancelling:
          cancelMutation.isPending && cancelMutation.variables === table.id,
        markingReady:
          readyMutation.isPending && readyMutation.variables === table.id,
        releasing:
          releaseMutation.isPending &&
          releaseMutation.variables?.tableId === table.id,
        collecting: collectMutation.isPending,
        anyMutation:
          operationMutation.isPending ||
          orderMutation.isPending ||
          cancelMutation.isPending,
      }}
      onAllocateOrFree={(tableId, action) =>
        operationMutation.mutate({ tableId, action })
      }
      onStartOrder={(tableId) =>
        orderMutation.mutate({ tableId, mode: "start" })
      }
      onOpenOrder={(tableId) =>
        orderMutation.mutate({ tableId, mode: "resume" })
      }
      onCancelOrder={(tableId) => cancelMutation.mutate(tableId)}
      onMarkReady={(tableId) => readyMutation.mutate(tableId)}
      onBeginCollect={(current) => {
        setPaymentTableId(current.id);
        setPaymentAmount(String(current.currentSaleTotal ?? ""));
      }}
      onSubmitPayment={submitPayment}
      onPaymentAmountChange={setPaymentAmount}
      onPaymentMethodChange={setPaymentMethod}
      onFreeDue={(tableId) =>
        releaseMutation.mutate({ tableId, state: "due" })
      }
      onFreePaid={(tableId) =>
        releaseMutation.mutate({ tableId, state: "paid" })
      }
    />
  );

  return (
    <div
      className="flex min-h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] flex-col max-lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))] lg:min-h-0 lg:overflow-hidden lg:flex-row"
      data-testid="pos-tables-page"
    >
      <PosDeviceSidebar activePanelTab="tables" />
      <section className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pb-8 lg:p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                {tablesQuery.data?.status === "success"
                  ? "Live service area"
                  : "Service area"}
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Tables
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {tablesQuery.data?.status === "success"
                  ? `Manage the current floor for ${session.store.name}.`
                  : "Loading your Store floor..."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ServiceTableViewToggle
                value={viewMode}
                onChange={handleViewModeChange}
              />
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
                <LayoutGrid className="size-4 text-primary" />
                <span>
                  {tables.length} {tables.length === 1 ? "table" : "tables"}
                </span>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Armchair className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {session.store.name} floor
                  </CardTitle>
                  <CardDescription>
                    {viewMode === "simple"
                      ? "Tables are grouped by area. Color shows whether a table is free, seated, or billed."
                      : "Free and Allocated tables can be changed before an order exists."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5">
              {tablesQuery.isPending || simpleViewAreasPending ? (
                <div className="flex min-h-80 items-center justify-center">
                  <Spinner className="size-6 text-primary" />
                </div>
              ) : tablesQuery.data?.status === "error" ? (
                <p
                  role="alert"
                  className="p-8 text-center text-sm text-destructive"
                >
                  {tablesQuery.data.message}
                </p>
              ) : simpleViewAreasError ? (
                <p
                  role="alert"
                  className="p-8 text-center text-sm text-destructive"
                >
                  {simpleViewAreasError}
                </p>
              ) : tables.length === 0 ? (
                <Empty className="min-h-80 rounded-2xl border border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Armchair />
                    </EmptyMedia>
                    <EmptyTitle>No tables configured</EmptyTitle>
                    <EmptyDescription>
                      Ask an administrator to configure Service Tables for this
                      Store.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : viewMode === "simple" ? (
                <ServiceTableAreaSections
                  groups={tableGroups}
                  gridClassName="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                  renderTable={(table) => renderTableCard(table, "simple")}
                />
              ) : (
                <div
                  data-testid="floor-canvas"
                  className="relative min-h-[32rem] overflow-hidden rounded-2xl border border-dashed border-border/70 bg-[radial-gradient(circle,_var(--color-border)_1px,_transparent_1px)] [background-size:24px_24px]"
                >
                  {tables.map((table) => (
                    <div
                      key={table.id}
                      className="absolute flex flex-col items-center"
                      style={{
                        ...tablePositionStyle(table.position),
                        width: TABLE_BOX_SIZE.width + 24,
                      }}
                    >
                      {renderTableCard(table, "floor")}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default PosTablesWorkspace;
