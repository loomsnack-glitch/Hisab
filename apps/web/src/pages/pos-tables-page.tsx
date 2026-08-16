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
  markPosServiceTableReadyToBill,
  startPosServiceTableOrder,
} from "@repo/services";
import type { CreatePaymentJSON, PaymentMethod, ServiceTableDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
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
import {
  Armchair,
  Check,
  CircleOff,
  LayoutGrid,
  Play,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import PosDeviceSidebar from "@/components/pos/pos-device-sidebar";
import { serviceTableKeys } from "@/lib/query-keys";
import {
  getPosServiceTableAction,
  getPosServiceTableStateLabel,
  type PosServiceTableAction,
} from "@/lib/pos-service-table";
import { tablePositionStyle, TABLE_BOX_SIZE } from "@/lib/service-table-layout";
import { formatCurrency } from "@/lib/format";
import type { PosRouteContext } from "@/pages/pos-route-context";

type TableOperation = { tableId: string; action: PosServiceTableAction };
type OrderOperation = { tableId: string; mode: "start" | "resume" };

const stateClassName: Record<ServiceTableDTO["state"], string> = {
  free: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  allocated:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  engaged: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  ready_to_bill:
    "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  payment_due:
    "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  paid: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

const PosTablesPage = () => {
  const { session, onPanelTabChange } = useOutletContext<PosRouteContext>();
  const queryClient = useQueryClient();
  const [paymentTableId, setPaymentTableId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const tablesQuery = useQuery({
    queryKey: serviceTableKeys.pos(session.organization.id, session.store.id),
    queryFn: getPosServiceTables,
    refetchOnWindowFocus: true,
  });
  const tables =
    tablesQuery.data?.status === "success"
      ? (tablesQuery.data.data?.tables ?? [])
      : [];

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

  const handleTableOperation = (
    tableId: string,
    action: PosServiceTableAction,
  ) => {
    operationMutation.mutate({ tableId, action });
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

  return (
    <div
      className="flex min-h-full flex-col lg:flex-row"
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
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
              <LayoutGrid className="size-4 text-primary" />
              <span>
                {tables.length} {tables.length === 1 ? "table" : "tables"}
              </span>
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
                    Free and Allocated tables can be changed before an order
                    exists.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5">
              {tablesQuery.isPending ? (
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
              ) : (
                <div className="relative min-h-[32rem] overflow-hidden rounded-2xl border border-dashed border-border/70 bg-[radial-gradient(circle,_var(--color-border)_1px,_transparent_1px)] [background-size:24px_24px]">
                  {tables.map((table) => {
                    const action = getPosServiceTableAction(table.state);
                    const isOperating =
                      operationMutation.isPending &&
                      operationMutation.variables?.tableId === table.id;
                    const isOpening =
                      orderMutation.isPending &&
                      orderMutation.variables?.tableId === table.id;
                    const isCancelling =
                      cancelMutation.isPending &&
                      cancelMutation.variables === table.id;
                    return (
                      <div
                        key={table.id}
                        data-testid={`pos-table-${table.id}`}
                        className="absolute flex flex-col items-center"
                        style={{
                          ...tablePositionStyle(table.position),
                          width: TABLE_BOX_SIZE.width + 24,
                        }}
                      >
                        <div
                          className={`flex h-16 w-32 flex-col items-center justify-center rounded-2xl border-2 bg-card shadow-md ${stateClassName[table.state]}`}
                        >
                          <span className="font-display text-lg font-semibold text-foreground">
                            {table.tableLabel}
                          </span>
                          <Badge
                            variant="outline"
                            className={`mt-1 ${stateClassName[table.state]}`}
                          >
                            {getPosServiceTableStateLabel(table.state)}
                          </Badge>
                        </div>
                        {table.capacity !== null ? (
                          <span className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Users className="size-3" />
                            {table.capacity}
                          </span>
                        ) : (
                          <span className="mt-1 h-4" aria-hidden="true" />
                        )}
                        {table.currentSaleTotal !== null ? (
                          <span className="mt-1 text-xs font-semibold text-foreground">
                            {table.state === "payment_due" ? "Outstanding" : "Current total"}{" "}
                            {formatCurrency(table.currentSaleTotal)}
                          </span>
                        ) : null}
                        {action ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={action === "free" ? "outline" : "default"}
                            className="mt-2 min-w-28 rounded-lg"
                            disabled={operationMutation.isPending}
                            isLoading={isOperating}
                            onClick={() =>
                              handleTableOperation(table.id, action)
                            }
                            aria-label={`${action === "allocate" ? "Allocate" : "Free"} table ${table.tableLabel}`}
                          >
                            {action === "allocate" ? (
                              <Check className="size-3.5" />
                            ) : (
                              <CircleOff className="size-3.5" />
                            )}
                            {action === "allocate" ? "Allocate" : "Free"}
                          </Button>
                        ) : null}
                        {table.state === "allocated" ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2 min-w-28 rounded-lg"
                            disabled={
                              operationMutation.isPending ||
                              orderMutation.isPending ||
                              cancelMutation.isPending
                            }
                            isLoading={isOpening}
                            onClick={() =>
                              orderMutation.mutate({
                                tableId: table.id,
                                mode: "start",
                              })
                            }
                            aria-label={`Start order for table ${table.tableLabel}`}
                          >
                            <Play className="size-3.5" />
                            Start order
                          </Button>
                        ) : null}
                        {(table.state === "engaged" ||
                          table.state === "ready_to_bill") &&
                        table.currentSaleId ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2 min-w-28 rounded-lg"
                            disabled={
                              orderMutation.isPending ||
                              cancelMutation.isPending
                            }
                            isLoading={isOpening}
                            onClick={() =>
                              orderMutation.mutate({
                                tableId: table.id,
                                mode: "resume",
                              })
                            }
                            aria-label={`Open order for table ${table.tableLabel}`}
                          >
                            <Play className="size-3.5" />
                            Open order
                          </Button>
                        ) : null}
                        {(table.state === "engaged" || table.state === "ready_to_bill") && table.currentSaleId ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-2 min-w-28 rounded-lg text-destructive hover:text-destructive"
                            disabled={
                              orderMutation.isPending ||
                              cancelMutation.isPending
                            }
                            isLoading={isCancelling}
                            onClick={() => cancelMutation.mutate(table.id)}
                            aria-label={`Cancel order for table ${table.tableLabel}`}
                          >
                            <Trash2 className="size-3.5" />
                            Cancel order
                          </Button>
                        ) : null}
                        {table.state === "engaged" && table.currentSaleId ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2 min-w-28 rounded-lg"
                            disabled={readyMutation.isPending}
                            isLoading={readyMutation.isPending && readyMutation.variables === table.id}
                            onClick={() => readyMutation.mutate(table.id)}
                            aria-label={`Mark table ${table.tableLabel} Ready to bill`}
                          >
                            <Check className="size-3.5" />
                            Ready to bill
                          </Button>
                        ) : null}
                        {table.state === "payment_due" && table.currentSaleId ? (
                          <>
                            {paymentTableId === table.id ? (
                              <div className="mt-2 flex w-36 flex-col gap-1.5">
                                <input
                                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={paymentAmount}
                                  onChange={(event) => setPaymentAmount(event.target.value)}
                                  placeholder="Amount"
                                  aria-label={`Payment amount for table ${table.tableLabel}`}
                                />
                                <select
                                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                                  value={paymentMethod}
                                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                                  aria-label={`Payment method for table ${table.tableLabel}`}
                                >
                                  <option value="cash">Cash</option>
                                  <option value="upi">UPI</option>
                                  <option value="card">Card</option>
                                </select>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-lg"
                                  disabled={collectMutation.isPending}
                                  isLoading={collectMutation.isPending}
                                  onClick={() => submitPayment(table)}
                                >
                                  Collect payment
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                className="mt-2 min-w-28 rounded-lg"
                                onClick={() => {
                                  setPaymentTableId(table.id);
                                  setPaymentAmount(String(table.currentSaleTotal ?? ""));
                                }}
                                aria-label={`Collect payment for table ${table.tableLabel}`}
                              >
                                Collect payment
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="mt-2 min-w-28 rounded-lg"
                              disabled={releaseMutation.isPending}
                              onClick={() => releaseMutation.mutate({ tableId: table.id, state: "due" })}
                              aria-label={`Free table ${table.tableLabel} with bill due`}
                            >
                              Free with bill due
                            </Button>
                          </>
                        ) : null}
                        {table.state === "paid" && table.currentSaleId ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-2 min-w-28 rounded-lg"
                            disabled={releaseMutation.isPending}
                            isLoading={releaseMutation.isPending && releaseMutation.variables?.tableId === table.id}
                            onClick={() => releaseMutation.mutate({ tableId: table.id, state: "paid" })}
                            aria-label={`Free paid table ${table.tableLabel}`}
                          >
                            <CircleOff className="size-3.5" />
                            Free paid table
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default PosTablesPage;
