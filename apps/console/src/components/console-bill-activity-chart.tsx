import type { PlatformBillActivityDTO } from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { Receipt } from "lucide-react";

import ConsoleInspectionDateFilter from "@/components/console-inspection-date-filter";
import type { OverviewBillActivityFilters } from "@/lib/organization-inspection-url";

type ConsoleBillActivityChartProps = {
    filters: OverviewBillActivityFilters;
    onUpdateFilters: (next: OverviewBillActivityFilters) => void;
    isLoading: boolean;
    isError: boolean;
    errorMessage?: string | null;
    activity?: PlatformBillActivityDTO;
};

const yAxisTicks = (maxCount: number) => {
    const top = Math.max(maxCount, 1);
    const step = top <= 4 ? 1 : Math.ceil(top / 4);
    const ticks: number[] = [];
    for (let value = 0; value <= top; value += step) ticks.push(value);
    if (ticks[ticks.length - 1] !== top) ticks.push(top);
    return ticks;
};

const shouldShowTick = (index: number, total: number, granularity: "hour" | "day") => {
    if (total <= 8) return true;
    if (granularity === "hour") return index % 3 === 0 || index === total - 1;
    if (total <= 16) return index % 2 === 0 || index === total - 1;
    return index === 0 || index === total - 1 || index % Math.ceil(total / 8) === 0;
};

const ConsoleBillActivityChart = ({
    filters,
    onUpdateFilters,
    isLoading,
    isError,
    errorMessage,
    activity,
}: ConsoleBillActivityChartProps) => {
    const points = activity?.points ?? [];
    const maxCount = points.reduce((max, point) => Math.max(max, point.billCount), 0);
    const ticks = yAxisTicks(maxCount);
    const totalBillCount = activity?.totalBillCount ?? 0;

    return (
        <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <CardTitle className="font-display text-base font-semibold">
                        <h2 className="text-sm font-semibold text-foreground">Bills over time</h2>
                    </CardTitle>
                    <CardDescription>No. of Bills across the selected time frame · not the Dashboard reporting period</CardDescription>
                </div>
                <CardAction className="static justify-self-start sm:justify-self-end">
                    <ConsoleInspectionDateFilter
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        allowAllDates={false}
                        triggerAriaLabel="Bill activity time frame"
                        onApply={(next) => onUpdateFilters({ startDate: next.startDate, endDate: next.endDate })}
                    />
                </CardAction>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex min-h-[28vh] items-center justify-center" aria-busy="true" aria-label="Loading bill activity">
                        <Spinner className="size-6 text-primary" />
                    </div>
                ) : isError ? (
                    <Alert variant="destructive" role="alert">
                        <AlertTitle>Bill activity could not be loaded</AlertTitle>
                        <AlertDescription>{errorMessage ?? "The bill activity graph is unavailable."}</AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                            {totalBillCount} {totalBillCount === 1 ? "bill" : "bills"} in this time frame
                        </p>
                        <div className="flex min-h-[240px] gap-3">
                            <span className="self-center text-[10px] font-medium tracking-wide text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                                No. of Bills
                            </span>
                            <div className="flex h-[200px] w-6 shrink-0 flex-col-reverse justify-between py-1 text-right text-[10px] text-muted-foreground">
                                {ticks.map((tick) => (
                                    <span key={tick}>{tick}</span>
                                ))}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div
                                    className="flex h-[200px] items-end gap-px border-b border-border/60 pb-0 sm:gap-0.5"
                                    role="img"
                                    aria-label="No. of Bills by time frame"
                                >
                                    {points.map((point) => {
                                        const height = maxCount === 0 ? 0 : (point.billCount / maxCount) * 100;
                                        return (
                                            <div key={point.bucketKey} className="flex h-full min-w-0 flex-1 items-end justify-center">
                                                <div
                                                    className={cn(
                                                        "w-full max-w-6 rounded-t-sm bg-primary/80",
                                                        point.billCount === 0 && "bg-muted",
                                                    )}
                                                    style={{ height: `${Math.max(height, point.billCount > 0 ? 6 : 2)}%` }}
                                                    title={`${point.label}: ${point.billCount}`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-1 flex gap-px sm:gap-0.5">
                                    {points.map((point, index) => (
                                        <div key={`${point.bucketKey}-label`} className="min-w-0 flex-1 text-center">
                                            {shouldShowTick(index, points.length, activity?.granularity ?? "hour") ? (
                                                <span className="block truncate text-[9px] text-muted-foreground">{point.label}</span>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-2 text-center text-[10px] font-medium tracking-wide text-muted-foreground">Time frame</p>
                            </div>
                        </div>
                        {totalBillCount === 0 ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Receipt className="size-3.5" />
                                No bills in this time frame.
                            </div>
                        ) : null}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ConsoleBillActivityChart;
