import { formatCurrency, getAverageBillPerOrder } from "@repo/ui/lib/money";

export type BillingSalesSummary = {
    completedCount: number | string | null | undefined;
    salesTotal: number | string | null | undefined;
    collectedTotal: number | string | null | undefined;
    dueTotal: number | string | null | undefined;
};

export function BillingSalesSummaryBar({ summary }: { summary: BillingSalesSummary | null | undefined }) {
    if (!summary) {
        return null;
    }

    return (
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-3.5 text-xs sm:grid-cols-5 sm:gap-4 sm:px-4">
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Sales</p>
                <p className="whitespace-nowrap text-sm font-semibold sm:text-base">{summary.completedCount}</p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">
                    {formatCurrency(summary.salesTotal)}
                </p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Collected</p>
                <p className="whitespace-nowrap text-sm font-semibold text-emerald-600 dark:text-emerald-400 sm:text-base">
                    {formatCurrency(summary.collectedTotal)}
                </p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Due</p>
                <p className="whitespace-nowrap text-sm font-semibold text-amber-600 dark:text-amber-400 sm:text-base">
                    {formatCurrency(summary.dueTotal)}
                </p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Avg bill</p>
                <p className="whitespace-nowrap text-sm font-semibold sm:text-base">
                    {formatCurrency(getAverageBillPerOrder(summary.salesTotal, summary.completedCount))}
                </p>
            </div>
        </div>
    );
}
