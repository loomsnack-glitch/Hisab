import type { PaymentMethod, ServiceTableDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Loader2, Users } from "lucide-react";
import type { ReactNode } from "react";

import { formatCurrency } from "@/lib/format";
import {
  getPosServiceTableStateLabel,
  hasActiveTableWorkspace,
  posServiceTableSimpleToneClassName,
  posServiceTableStatusDotClassName,
  type PosServiceTableAction,
} from "@/lib/pos-service-table";

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
}: PosServiceTableCardProps): TileAction[] => {
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

  if (hasActiveTableWorkspace(table)) {
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

const PosServiceTableCard = (props: PosServiceTableCardProps) => {
  const { table, paymentTableId, ...actionProps } = props;
  const collecting =
    table.state === "payment_due" && paymentTableId === table.id;
  const tileActions = collecting ? [] : buildSimpleTileActions(props);

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
};

export default PosServiceTableCard;
