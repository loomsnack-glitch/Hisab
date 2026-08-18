import type { PaymentMethod, ServiceTableDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Check, CircleOff, Loader2, Play, Trash2, Users } from "lucide-react";
import type { ReactNode } from "react";

import { formatCurrency } from "@/lib/format";
import {
  getPosServiceTableAction,
  getPosServiceTableStateLabel,
  posServiceTableFloorToneClassName,
  posServiceTableSimpleToneClassName,
  posServiceTableStatusDotClassName,
  type PosServiceTableAction,
} from "@/lib/pos-service-table";
import type { ServiceTableViewMode } from "@/lib/service-table-view";

export type PosServiceTableBusyState = {
  allocateOrFree: boolean;
  opening: boolean;
  cancelling: boolean;
  releasing: boolean;
  collecting: boolean;
  anyMutation: boolean;
};

type PosServiceTableCardProps = {
  table: ServiceTableDTO;
  layout: ServiceTableViewMode;
  paymentTableId: string | null;
  paymentAmount: string;
  paymentMethod: PaymentMethod;
  busy: PosServiceTableBusyState;
  onAllocateOrFree: (tableId: string, action: PosServiceTableAction) => void;
  onStartOrder: (tableId: string) => void;
  onOpenOrder: (tableId: string) => void;
  onCancelOrder: (tableId: string) => void;
  onBeginCollect: (table: ServiceTableDTO) => void;
  onSubmitPayment: (table: ServiceTableDTO) => void;
  onPaymentAmountChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onFreeDue: (tableId: string) => void;
  onFreePaid: (tableId: string) => void;
};

type TileActionVariant = "allocate" | "start" | "open" | "collect" | "muted" | "danger";

type TileAction = {
  key: string;
  label: string;
  ariaLabel: string;
  variant: TileActionVariant;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

const tileActionClassName: Record<TileActionVariant, string> = {
  allocate:
    "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950/70",
  start:
    "bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-950/70",
  open:
    "bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-950/70",
  collect:
    "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950/70",
  muted:
    "bg-white text-muted-foreground hover:bg-muted/40 dark:bg-card dark:text-muted-foreground dark:hover:bg-muted/30",
  danger:
    "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60",
};

const buildSimpleTileActions = ({
  table,
  busy,
  onAllocateOrFree,
  onStartOrder,
  onOpenOrder,
  onCancelOrder,
  onBeginCollect,
  onFreeDue,
  onFreePaid,
}: Omit<PosServiceTableCardProps, "layout" | "paymentTableId" | "paymentAmount" | "paymentMethod" | "onSubmitPayment" | "onPaymentAmountChange" | "onPaymentMethodChange">): TileAction[] => {
  if (table.state === "free") {
    return [
      {
        key: "allocate",
        label: "Allocate",
        ariaLabel: `Allocate table ${table.tableLabel}`,
        variant: "allocate",
        loading: busy.allocateOrFree,
        disabled: busy.anyMutation,
        onClick: () => onAllocateOrFree(table.id, "allocate"),
      },
    ];
  }

  if (table.state === "allocated") {
    return [
      {
        key: "start",
        label: "Start",
        ariaLabel: `Start order for table ${table.tableLabel}`,
        variant: "start",
        loading: busy.opening,
        disabled: busy.anyMutation,
        onClick: () => onStartOrder(table.id),
      },
      {
        key: "free",
        label: "Free",
        ariaLabel: `Free table ${table.tableLabel}`,
        variant: "muted",
        loading: busy.allocateOrFree,
        disabled: busy.anyMutation,
        onClick: () => onAllocateOrFree(table.id, "free"),
      },
    ];
  }

  if ((table.state === "engaged" || table.state === "ready_to_bill") && table.currentSaleId) {
    return [
      {
        key: "open",
        label: "Open",
        ariaLabel: `Open order for table ${table.tableLabel}`,
        variant: "open",
        loading: busy.opening,
        disabled: busy.opening || busy.cancelling,
        onClick: () => onOpenOrder(table.id),
      },
      {
        key: "cancel",
        label: "Cancel",
        ariaLabel: `Cancel order for table ${table.tableLabel}`,
        variant: "danger",
        loading: busy.cancelling,
        disabled: busy.opening || busy.cancelling,
        onClick: () => onCancelOrder(table.id),
      },
    ];
  }

  if (table.state === "payment_due" && table.currentSaleId) {
    return [
      {
        key: "collect",
        label: "Collect",
        ariaLabel: `Collect payment for table ${table.tableLabel}`,
        variant: "collect",
        onClick: () => onBeginCollect(table),
      },
      {
        key: "free-due",
        label: "Free due",
        ariaLabel: `Free with bill due for table ${table.tableLabel}`,
        variant: "muted",
        loading: busy.releasing,
        disabled: busy.releasing,
        onClick: () => onFreeDue(table.id),
      },
    ];
  }

  if (table.state === "paid" && table.currentSaleId) {
    return [
      {
        key: "free-paid",
        label: "Free",
        ariaLabel: `Free paid table ${table.tableLabel}`,
        variant: "muted",
        loading: busy.releasing,
        disabled: busy.releasing,
        onClick: () => onFreePaid(table.id),
      },
    ];
  }

  return [];
};

const SimpleTileFooterButton = ({ action, divided }: { action: TileAction; divided?: boolean }) => (
  <Button
    type="button"
    variant="ghost"
    size="xs"
    className={cn(
      "h-8 min-w-0 flex-1 rounded-none border-0 border-t border-border/60 px-1 text-[10px] font-semibold shadow-none sm:text-[11px]",
      tileActionClassName[action.variant],
      divided && "border-r border-border/60",
    )}
    disabled={action.disabled}
    isLoading={action.loading}
    loadingText=""
    loadingIcon={<Loader2 className="size-3 animate-spin" />}
    onClick={action.onClick}
    aria-label={action.ariaLabel}
  >
    {action.label}
  </Button>
);

const PosServiceTableActions = ({
  table,
  paymentTableId,
  paymentAmount,
  paymentMethod,
  busy,
  onAllocateOrFree,
  onStartOrder,
  onOpenOrder,
  onCancelOrder,
  onBeginCollect,
  onSubmitPayment,
  onPaymentAmountChange,
  onPaymentMethodChange,
  onFreeDue,
  onFreePaid,
}: Omit<PosServiceTableCardProps, "layout">) => {
  const action = getPosServiceTableAction(table.state);
  const buttonClassName = "mt-2 min-w-28 rounded-lg";
  const size = "sm" as const;

  return (
    <div className="flex flex-col items-center">
      {action ? (
        <Button
          type="button"
          size={size}
          variant={action === "free" ? "outline" : "default"}
          className={buttonClassName}
          disabled={busy.anyMutation}
          isLoading={busy.allocateOrFree}
          onClick={() => onAllocateOrFree(table.id, action)}
          aria-label={`${action === "allocate" ? "Allocate" : "Free"} table ${table.tableLabel}`}
        >
          {action === "allocate" ? <Check className="size-3.5" /> : <CircleOff className="size-3.5" />}
          {action === "allocate" ? "Allocate" : "Free"}
        </Button>
      ) : null}
      {table.state === "allocated" ? (
        <Button
          type="button"
          size={size}
          className={buttonClassName}
          disabled={busy.anyMutation}
          isLoading={busy.opening}
          onClick={() => onStartOrder(table.id)}
          aria-label={`Start order for table ${table.tableLabel}`}
        >
          <Play className="size-3.5" />
          Start order
        </Button>
      ) : null}
      {(table.state === "engaged" || table.state === "ready_to_bill") && table.currentSaleId ? (
        <Button
          type="button"
          size={size}
          className={buttonClassName}
          disabled={busy.opening || busy.cancelling}
          isLoading={busy.opening}
          onClick={() => onOpenOrder(table.id)}
          aria-label={`Open order for table ${table.tableLabel}`}
        >
          <Play className="size-3.5" />
          Open order
        </Button>
      ) : null}
      {(table.state === "engaged" || table.state === "ready_to_bill") && table.currentSaleId ? (
        <Button
          type="button"
          size={size}
          variant="outline"
          className={cn(buttonClassName, "text-destructive hover:text-destructive")}
          disabled={busy.opening || busy.cancelling}
          isLoading={busy.cancelling}
          onClick={() => onCancelOrder(table.id)}
          aria-label={`Cancel order for table ${table.tableLabel}`}
        >
          <Trash2 className="size-3.5" />
          Cancel order
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
                onChange={(event) => onPaymentAmountChange(event.target.value)}
                placeholder="Amount"
                aria-label={`Payment amount for table ${table.tableLabel}`}
              />
              <select
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                value={paymentMethod}
                onChange={(event) => onPaymentMethodChange(event.target.value as PaymentMethod)}
                aria-label={`Payment method for table ${table.tableLabel}`}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
              <Button
                type="button"
                size={size}
                className="rounded-lg"
                disabled={busy.collecting}
                isLoading={busy.collecting}
                onClick={() => onSubmitPayment(table)}
              >
                Collect payment
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size={size}
              className={buttonClassName}
              onClick={() => onBeginCollect(table)}
              aria-label={`Collect payment for table ${table.tableLabel}`}
            >
              Collect payment
            </Button>
          )}
          <Button
            type="button"
            size={size}
            variant="outline"
            className={buttonClassName}
            disabled={busy.releasing}
            onClick={() => onFreeDue(table.id)}
            aria-label={`Free table ${table.tableLabel} with bill due`}
          >
            Free with bill due
          </Button>
        </>
      ) : null}
      {table.state === "paid" && table.currentSaleId ? (
        <Button
          type="button"
          size={size}
          variant="outline"
          className={buttonClassName}
          disabled={busy.releasing}
          isLoading={busy.releasing}
          onClick={() => onFreePaid(table.id)}
          aria-label={`Free paid table ${table.tableLabel}`}
        >
          <CircleOff className="size-3.5" />
          Free paid table
        </Button>
      ) : null}
    </div>
  );
};

const SimpleTableTile = ({
  table,
  children,
  collecting,
}: {
  table: ServiceTableDTO;
  children: ReactNode;
  collecting: boolean;
}) => {
  const stateLabel = getPosServiceTableStateLabel(table.state);
  const occupied = table.state !== "free";
  const amountKind = table.state === "payment_due" ? "Outstanding" : "Current total";
  const amountValue =
    table.currentSaleTotal !== null ? formatCurrency(table.currentSaleTotal) : null;

  return (
    <div
      data-testid={`pos-table-${table.id}`}
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden rounded-xl border",
        collecting ? "min-h-32" : "aspect-square",
        occupied && "border-l-[3px]",
        posServiceTableSimpleToneClassName[table.state],
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 pt-2 text-center">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full ring-2", posServiceTableStatusDotClassName[table.state])}
          />
          {stateLabel}
        </span>
        <span className="mt-1 font-display text-lg font-semibold leading-none tracking-tight text-foreground sm:text-xl">
          {table.tableLabel}
        </span>
        {table.capacity !== null ? (
          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/70">
            <Users className="size-3" />
            {table.capacity}
          </span>
        ) : null}
        {amountValue ? (
          <span className="mt-1 max-w-full px-0.5 text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
            <span className="mr-1 font-medium text-foreground/70">{amountKind}</span>
            {amountValue}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
};

const PosServiceTableCard = ({ table, layout, ...actionProps }: PosServiceTableCardProps) => {
  const stateLabel = getPosServiceTableStateLabel(table.state);
  const amountKind = table.state === "payment_due" ? "Outstanding" : "Current total";
  const amountValue =
    table.currentSaleTotal !== null ? formatCurrency(table.currentSaleTotal) : null;

  if (layout === "simple") {
    const collecting =
      table.state === "payment_due" && actionProps.paymentTableId === table.id;
    const tileActions = collecting
      ? []
      : buildSimpleTileActions({ table, ...actionProps });

    return (
      <SimpleTableTile table={table} collecting={collecting}>
        {collecting ? (
          <div className="mt-auto border-t border-border/60 bg-background/90 p-1.5">
            <div className="flex flex-col gap-1">
              <input
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
                type="number"
                min="0.01"
                step="0.01"
                value={actionProps.paymentAmount}
                onChange={(event) => actionProps.onPaymentAmountChange(event.target.value)}
                placeholder="Amount"
                aria-label={`Payment amount for table ${table.tableLabel}`}
              />
              <select
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
                value={actionProps.paymentMethod}
                onChange={(event) =>
                  actionProps.onPaymentMethodChange(event.target.value as PaymentMethod)
                }
                aria-label={`Payment method for table ${table.tableLabel}`}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className={cn("h-7 text-[11px] font-semibold shadow-none", tileActionClassName.collect)}
                disabled={actionProps.busy.collecting}
                isLoading={actionProps.busy.collecting}
                loadingText=""
                loadingIcon={<Loader2 className="size-3 animate-spin" />}
                onClick={() => actionProps.onSubmitPayment(table)}
              >
                Collect payment
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className={cn("h-7 text-[11px] font-semibold shadow-none", tileActionClassName.muted)}
                disabled={actionProps.busy.releasing}
                onClick={() => actionProps.onFreeDue(table.id)}
                aria-label="Free with bill due"
              >
                Free due
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex">
            {tileActions.map((action, index) => (
              <SimpleTileFooterButton
                key={action.key}
                action={action}
                divided={index < tileActions.length - 1}
              />
            ))}
          </div>
        )}
      </SimpleTableTile>
    );
  }

  return (
    <div data-testid={`pos-table-${table.id}`} className="flex flex-col items-center">
      <div
        className={cn(
          "flex h-16 w-32 flex-col items-center justify-center rounded-2xl border-2 bg-card shadow-md",
          posServiceTableFloorToneClassName[table.state],
        )}
      >
        <span className="font-display text-lg font-semibold text-foreground">
          {table.tableLabel}
        </span>
        <Badge variant="outline" className={cn("mt-1", posServiceTableFloorToneClassName[table.state])}>
          {stateLabel}
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
      {amountValue ? (
        <span className="mt-1 text-xs font-semibold text-foreground">
          {amountKind} {amountValue}
        </span>
      ) : null}
      <PosServiceTableActions table={table} {...actionProps} />
    </div>
  );
};

export default PosServiceTableCard;
