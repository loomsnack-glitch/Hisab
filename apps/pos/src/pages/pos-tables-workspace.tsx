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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Spinner } from "@repo/ui/components/spinner";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";
import { Armchair, BookOpen, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

import PosServiceTableCard from "@/components/table-service/pos-service-table-card";
import PosServiceTableLegend from "@/components/table-service/pos-service-table-legend";
import ServiceTableAreaSections from "@/components/table-service/service-table-area-sections";
import { groupServiceTablesByArea } from "@/lib/service-area-tables";
import { serviceAreaKeys, serviceTableKeys } from "@/lib/query-keys";
import {
  posTablesPageClassName,
  posTablesScrollerClassName,
  type PosServiceTableAction,
} from "@/lib/pos-service-table";
import type { PosRouteContext } from "@/pages/pos-route-context";

type TableOperation = { tableId: string; action: PosServiceTableAction };
type OrderOperation = { tableId: string; mode: "start" | "resume" };
type TableActionConfirmation =
  | { type: "cancel"; table: ServiceTableDTO }
  | { type: "free-allocated"; table: ServiceTableDTO }
  | { type: "free-paid"; table: ServiceTableDTO };

const tableActionConfirmationCopy: Record<
  TableActionConfirmation["type"],
  { title: string; description: (tableLabel: string) => string; confirmLabel: string }
> = {
  cancel: {
    title: "Cancel this order?",
    description: (tableLabel) =>
      `Cancel the order for table ${tableLabel}? Any unsaved items will be removed.`,
    confirmLabel: "Cancel order",
  },
  "free-allocated": {
    title: "Free this table?",
    description: (tableLabel) =>
      `Release table ${tableLabel}? No order was started for this allocation.`,
    confirmLabel: "Free table",
  },
  "free-paid": {
    title: "Free this table?",
    description: (tableLabel) =>
      `Clear table ${tableLabel}? The bill has been paid and the table will be available again.`,
    confirmLabel: "Free table",
  },
};

const PosTablesWorkspace = () => {
  const { session, onPanelTabChange } = useOutletContext<PosRouteContext>();
  const queryClient = useQueryClient();
  const [paymentTableId, setPaymentTableId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [legendOpen, setLegendOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<TableActionConfirmation | null>(null);
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
  const areasError =
    areasQuery.data?.status === "error"
      ? areasQuery.data.message
      : areasQuery.isError
        ? "Service areas could not be loaded"
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
      if (variables.action === "free") {
        setPendingConfirmation(null);
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
      if (response.status !== "success" || (!response.data?.sale && !response.data?.tableOrder)) {
        toast.error(response.message);
        return;
      }
      if (
        response.data.table.state === "engaged" &&
        (response.data.table.currentSaleId || response.data.table.currentTableOrderId)
      ) {
        await queryClient.invalidateQueries({
          queryKey: serviceTableKeys.pos(
            session.organization.id,
            session.store.id,
          ),
        });
      }
      onPanelTabChange("products", {
        sale: response.data.sale ?? null,
        table: response.data.table,
        tableOrder: response.data.tableOrder ?? null,
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
      setPendingConfirmation(null);
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
      if (variables.state === "paid") {
        setPendingConfirmation(null);
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

  const findTable = (tableId: string) =>
    tables.find((current) => current.id === tableId);

  const confirmPendingAction = () => {
    if (!pendingConfirmation) return;
    const { type, table } = pendingConfirmation;
    if (type === "cancel") {
      cancelMutation.mutate(table.id);
      return;
    }
    if (type === "free-allocated") {
      operationMutation.mutate({ tableId: table.id, action: "free" });
      return;
    }
    releaseMutation.mutate({ tableId: table.id, state: "paid" });
  };

  const isConfirmingAction =
    cancelMutation.isPending ||
    (operationMutation.isPending &&
      operationMutation.variables?.action === "free") ||
    (releaseMutation.isPending &&
      releaseMutation.variables?.state === "paid");

  const renderTableCard = (table: ServiceTableDTO) => (
    <PosServiceTableCard
      key={table.id}
      table={table}
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
      onAllocateOrFree={(tableId, action) => {
        if (action === "free") {
          const current = findTable(tableId);
          if (current) {
            setPendingConfirmation({ type: "free-allocated", table: current });
          }
          return;
        }
        operationMutation.mutate({ tableId, action });
      }}
      onStartOrder={(tableId) =>
        orderMutation.mutate({ tableId, mode: "start" })
      }
      onOpenOrder={(tableId) =>
        orderMutation.mutate({ tableId, mode: "resume" })
      }
      onCancelOrder={(tableId) => {
        const current = findTable(tableId);
        if (current) {
          setPendingConfirmation({ type: "cancel", table: current });
        }
      }}
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
      onFreePaid={(tableId) => {
        const current = findTable(tableId);
        if (current) {
          setPendingConfirmation({ type: "free-paid", table: current });
        }
      }}
    />
  );

  return (
    <div className={posTablesPageClassName} data-testid="pos-tables-page">
      <div
        className={cn(posTablesScrollerClassName, "p-3 sm:p-4 lg:p-6")}
        data-testid="pos-tables-scroller"
      >
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="sr-only">Tables</h1>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/70 px-2.5 py-1.5 text-xs text-muted-foreground sm:text-sm">
                <LayoutGrid className="size-3.5 text-primary sm:size-4" />
                <span>
                  {tables.length} {tables.length === 1 ? "table" : "tables"}
                </span>
              </div>
              {tables.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="size-8 rounded-lg border-border/60 bg-card/70"
                  aria-label="View table status colors"
                  onClick={() => setLegendOpen(true)}
                >
                  <BookOpen className="size-3.5 text-primary sm:size-4" />
                </Button>
              ) : null}
            </div>
          </div>

          <Dialog open={legendOpen} onOpenChange={setLegendOpen}>
            <DialogContent className="max-w-md rounded-2xl p-5">
              <DialogHeader>
                <DialogTitle>Table status colors</DialogTitle>
                <DialogDescription>
                  What each color means in the table view.
                </DialogDescription>
              </DialogHeader>
              <PosServiceTableLegend showTitle={false} className="border-0 bg-transparent px-0 py-0" />
            </DialogContent>
          </Dialog>

          {tablesQuery.isPending || areasQuery.isPending ? (
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
          ) : areasError ? (
            <p
              role="alert"
              className="p-6 text-center text-sm text-destructive sm:p-8"
            >
              {areasError}
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
          ) : (
            <ServiceTableAreaSections
              groups={tableGroups}
              compact
              gridClassName="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2 sm:gap-2.5"
              renderTable={(table) => renderTableCard(table)}
            />
          )}
        </div>
      </div>

      <AlertDialog
        open={Boolean(pendingConfirmation)}
        onOpenChange={(open) => {
          if (!open && !isConfirmingAction) {
            setPendingConfirmation(null);
          }
        }}
      >
        <AlertDialogContent>
          {pendingConfirmation ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {tableActionConfirmationCopy[pendingConfirmation.type].title}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {tableActionConfirmationCopy[pendingConfirmation.type].description(
                    pendingConfirmation.table.tableLabel,
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isConfirmingAction}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={isConfirmingAction}
                  className={
                    pendingConfirmation.type === "cancel"
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : undefined
                  }
                  onClick={confirmPendingAction}
                >
                  {isConfirmingAction ? (
                    <Spinner className="size-4" />
                  ) : (
                    tableActionConfirmationCopy[pendingConfirmation.type].confirmLabel
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PosTablesWorkspace;
