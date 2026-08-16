import type { PaymentMethod, ServiceTableDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Check, CircleOff, Play, Trash2, Users } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import {
  getPosServiceTableAction,
  getPosServiceTableStateLabel,
  posServiceTableFloorToneClassName,
  posServiceTableSimpleToneClassName,
  type PosServiceTableAction,
} from "@/lib/pos-service-table";
import type { ServiceTableViewMode } from "@/lib/service-table-view";

export type PosServiceTableBusyState = {
  allocateOrFree: boolean;
  opening: boolean;
  cancelling: boolean;
  markingReady: boolean;
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
  onMarkReady: (tableId: string) => void;
  onBeginCollect: (table: ServiceTableDTO) => void;
  onSubmitPayment: (table: ServiceTableDTO) => void;
  onPaymentAmountChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onFreeDue: (tableId: string) => void;
  onFreePaid: (tableId: string) => void;
};

const PosServiceTableActions = ({
  table,
  compact,
  paymentTableId,
  paymentAmount,
  paymentMethod,
  busy,
  onAllocateOrFree,
  onStartOrder,
  onOpenOrder,
  onCancelOrder,
  onMarkReady,
  onBeginCollect,
  onSubmitPayment,
  onPaymentAmountChange,
  onPaymentMethodChange,
  onFreeDue,
  onFreePaid,
}: Omit<PosServiceTableCardProps, "layout"> & { compact: boolean }) => {
  const action = getPosServiceTableAction(table.state);
  const buttonClassName = compact ? "min-w-0 flex-1 rounded-md" : "mt-2 min-w-28 rounded-lg";
  const size = compact ? "xs" : "sm";

  return (
    <div className={cn(compact ? "mt-2 flex w-full flex-col gap-1" : "flex flex-col items-center")}>
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
      {table.state === "engaged" && table.currentSaleId ? (
        <Button
          type="button"
          size={size}
          className={buttonClassName}
          disabled={busy.markingReady}
          isLoading={busy.markingReady}
          onClick={() => onMarkReady(table.id)}
          aria-label={`Mark table ${table.tableLabel} Ready to bill`}
        >
          <Check className="size-3.5" />
          Ready to bill
        </Button>
      ) : null}
      {table.state === "payment_due" && table.currentSaleId ? (
        <>
          {paymentTableId === table.id ? (
            <div className={cn("flex flex-col gap-1.5", compact ? "w-full" : "mt-2 w-36")}>
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

const PosServiceTableCard = ({ table, layout, ...actionProps }: PosServiceTableCardProps) => {
  const stateLabel = getPosServiceTableStateLabel(table.state);
  const amountLabel =
    table.currentSaleTotal !== null
      ? `${table.state === "payment_due" ? "Outstanding" : "Current total"} ${formatCurrency(table.currentSaleTotal)}`
      : null;

  if (layout === "simple") {
    return (
      <div
        data-testid={`pos-table-${table.id}`}
        className={cn(
          "flex min-h-40 flex-col items-center rounded-xl border-2 p-2.5 text-center shadow-sm",
          posServiceTableSimpleToneClassName[table.state],
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
          {stateLabel}
        </span>
        <span className="mt-1 font-display text-2xl font-semibold leading-none text-foreground">
          {table.tableLabel}
        </span>
        {table.capacity !== null ? (
          <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-foreground/70">
            <Users className="size-3" />
            {table.capacity}
          </span>
        ) : null}
        {amountLabel ? (
          <span className="mt-1 text-xs font-semibold text-foreground">{amountLabel}</span>
        ) : null}
        <PosServiceTableActions table={table} compact {...actionProps} />
      </div>
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
      {amountLabel ? (
        <span className="mt-1 text-xs font-semibold text-foreground">{amountLabel}</span>
      ) : null}
      <PosServiceTableActions table={table} compact={false} {...actionProps} />
    </div>
  );
};

export default PosServiceTableCard;
