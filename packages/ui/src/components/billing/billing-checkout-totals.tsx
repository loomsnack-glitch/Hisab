import type { ReactNode } from "react";

import { formatCurrency } from "@repo/ui/lib/money";
import { cn } from "@repo/ui/lib/utils";

export type BillingCheckoutTotalsProps = {
    variant?: "compact" | "detailed";
    itemCount?: number;
    subtotal: number;
    lineDiscountTotal?: number;
    lineDiscountPercentage?: string | null;
    orderDiscountAmount?: number;
    orderDiscountPercentage?: string | null;
    grandTotal: number;
    dueTotal?: number;
    className?: string;
};

export function BillingCheckoutTotals({
    variant = "compact",
    itemCount,
    subtotal,
    lineDiscountTotal = 0,
    lineDiscountPercentage,
    orderDiscountAmount = 0,
    orderDiscountPercentage,
    grandTotal,
    dueTotal = 0,
    className,
}: BillingCheckoutTotalsProps) {
    const rows: Array<{ key: string; label: string; value: ReactNode; className?: string }> = [
        { key: "subtotal", label: "Subtotal", value: formatCurrency(subtotal) },
    ];

    if (lineDiscountTotal > 0) {
        rows.push({
            key: "item-discounts",
            label: "Item discounts",
            value: `-${formatCurrency(lineDiscountTotal)}${lineDiscountPercentage ? ` (${lineDiscountPercentage})` : ""}`,
            className: "text-emerald-600 dark:text-emerald-400",
        });
    }

    if (orderDiscountAmount > 0) {
        rows.push({
            key: "order-discount",
            label: "Order discount",
            value: `-${formatCurrency(orderDiscountAmount)}${orderDiscountPercentage ? ` (${orderDiscountPercentage})` : ""}`,
            className: "text-emerald-600 dark:text-emerald-400",
        });
    }

    if (variant === "compact") {
        return (
            <div className={cn("mb-2 space-y-0.5 rounded-lg bg-background/40 px-2.5 py-2 text-[11px]", className)}>
                {rows.map((row) => (
                    <div key={row.key} className={cn("flex justify-between text-muted-foreground", row.className)}>
                        <span>{row.label}</span>
                        <span>{row.value}</span>
                    </div>
                ))}
                <div className="flex justify-between pt-1 text-sm font-bold text-foreground">
                    <span>Total</span>
                    <span>{formatCurrency(grandTotal)}</span>
                </div>
                {dueTotal > 0 ? (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                        <span>Due after bill</span>
                        <span>{formatCurrency(dueTotal)}</span>
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className={cn("space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4", className)}>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span>Order total</span>
                {typeof itemCount === "number" ? (
                    <span>
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                ) : null}
            </div>
            {rows.map((row) => (
                <div key={row.key} className={cn("flex items-center justify-between text-muted-foreground", row.className)}>
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                </div>
            ))}
            <div className="flex items-end justify-between border-t border-border/50 pt-3 text-foreground">
                <span>Total</span>
                <span className="text-2xl font-bold tracking-tight">{formatCurrency(grandTotal)}</span>
            </div>
            {dueTotal > 0 ? (
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                    <span>Due after bill</span>
                    <span className="font-semibold">{formatCurrency(dueTotal)}</span>
                </div>
            ) : null}
        </div>
    );
}
