import type { ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";

export function BillingSaleMeta({
    serviceModeLabel,
    itemCount,
    createdAt,
    createdAtLabel,
}: {
    serviceModeLabel: string;
    itemCount: number;
    createdAt?: string;
    createdAtLabel: string;
}) {
    return (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground/75">
                {serviceModeLabel}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
                {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
            <time
                className="min-w-0 basis-full text-[11px] leading-tight text-muted-foreground sm:basis-auto sm:text-xs"
                dateTime={createdAt}
            >
                {createdAtLabel}
            </time>
        </div>
    );
}

export function BillingSaleRow({
    tokenNumber,
    kotNumbers,
    serviceTableLabel,
    saleNumber,
    isDraft,
    customerName,
    meta,
    amount,
    amountHint,
    statusBadges,
    actions,
    className,
}: {
    tokenNumber?: string | number | null;
    kotNumbers?: Array<string | number> | null;
    serviceTableLabel?: string | null;
    saleNumber?: string | number | null;
    isDraft?: boolean;
    customerName?: string | null;
    meta?: ReactNode;
    amount: ReactNode;
    amountHint?: ReactNode;
    statusBadges?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    const kotLabel =
        kotNumbers && kotNumbers.length > 0 ? `KOT ${kotNumbers.join(", ")}` : null;

    return (
        <div
            className={cn(
                "flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/70 px-3 py-2 transition-all hover:border-primary/20 hover:bg-card/90 hover:shadow-xs",
                className,
            )}
        >
            <div className="min-w-0 flex-1 pr-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <div className="flex shrink-0 items-center gap-1.5">
                        {tokenNumber ? (
                            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                                Token {tokenNumber}
                            </span>
                        ) : null}
                        {kotLabel ? (
                            <span className="text-xs font-semibold text-muted-foreground">{kotLabel}</span>
                        ) : null}
                        {serviceTableLabel ? (
                            <span className="text-xs font-semibold text-muted-foreground">
                                Table {serviceTableLabel}
                            </span>
                        ) : null}
                        {saleNumber ? (
                            <span className="rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/70">
                                Bill {saleNumber}
                            </span>
                        ) : isDraft ? (
                            <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500">
                                Draft
                            </span>
                        ) : null}
                    </div>
                    {customerName ? (
                        <span className="min-w-0 max-w-full truncate rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400">
                            {customerName}
                        </span>
                    ) : null}
                </div>
                {meta}
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {statusBadges ? <div className="hidden sm:block">{statusBadges}</div> : null}

                <div className="w-20 text-right">
                    <p className="text-sm font-bold text-foreground">{amount}</p>
                    {amountHint}
                </div>

                {actions ? <div className="flex w-28 items-center justify-end gap-1">{actions}</div> : null}
            </div>
        </div>
    );
}
