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
  startPosServiceTableOrder,
} from "@repo/services";
import type { CreatePaymentJSON, PaymentMethod, ServiceTableDTO } from "@repo/types";
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

import PosServiceTableCard from "@/components/table-service/pos-service-table-card";
import PosServiceTableLegend from "@/components/table-service/pos-service-table-legend";
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
      className="flex h-full min-h-0 flex-col overflow-hidden lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))]"
      data-testid="pos-tables-page"
    >
      <div className="min-h-0 flex-1 touch-[pan-y_pinch-zoom] overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="sr-only">Tables</h1>
            <ServiceTableViewToggle
              value={viewMode}
              onChange={handleViewModeChange}
            />
            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/70 px-2.5 py-1.5 text-xs text-muted-foreground sm:text-sm">
              <LayoutGrid className="size-3.5 text-primary sm:size-4" />
              <span>
                {tables.length} {tables.length === 1 ? "table" : "tables"}
              </span>
            </div>
          </div>

          {viewMode === "simple" && tables.length > 0 ? (
            <PosServiceTableLegend />
          ) : null}

          {tablesQuery.isPending || simpleViewAreasPending ? (
            <div className="flex min-h-64 items-center justify-center sm:min-h-80">
              <Spinner className="size-6 text-primary" />
            </div>
          ) : tablesQuery.data?.status === "error" ? (
            <p
              role="alert"
              className="p-6 text-center text-sm text-destructive sm:p-8"
            >
              {tablesQuery.data.message}
            </p>
          ) : simpleViewAreasError ? (
            <p
              role="alert"
              className="p-6 text-center text-sm text-destructive sm:p-8"
            >
              {simpleViewAreasError}
            </p>
          ) : tables.length === 0 ? (
            <Empty className="min-h-64 rounded-2xl border border-dashed sm:min-h-80">
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
              compact
              gridClassName="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2 sm:gap-2.5"
              renderTable={(table) => renderTableCard(table, "simple")}
            />
          ) : (
            <div
              data-testid="floor-canvas"
              className="relative min-h-[20rem] overflow-hidden rounded-2xl border border-dashed border-border/70 bg-[radial-gradient(circle,_var(--color-border)_1px,_transparent_1px)] [background-size:24px_24px] sm:min-h-[28rem] lg:min-h-[32rem]"
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
        </div>
      </div>
    </div>
  );
};

export default PosTablesWorkspace;
