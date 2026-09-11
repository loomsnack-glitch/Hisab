import type { ReactNode } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";

export type BillsDateMode = "date" | "range";
export type BillsDatePreset = "today" | "yesterday" | "this-week" | "this-month" | "custom" | "all";

export type BillsDateAppliedState = {
    mode: BillsDateMode;
    preset: BillsDatePreset;
    specificDate: Date;
    fromDate: Date | null;
    toDate: Date | null;
};

const formatDayMonth = (value: Date) =>
    value.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const formatDayMonthYear = (value: Date) =>
    value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const startOfLocalDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate());

export function getLatestSelectableSalesDate() {
    return startOfLocalDay(new Date());
}

export function clampSalesDateToLatest(date: Date) {
    const latest = getLatestSelectableSalesDate();
    const normalized = startOfLocalDay(date);
    return normalized.getTime() > latest.getTime() ? latest : normalized;
}

export function canShiftSalesDateForward(date: Date) {
    return startOfLocalDay(date).getTime() < getLatestSelectableSalesDate().getTime();
}

export function getSalesDatePickerDisabledDays() {
    return { after: getLatestSelectableSalesDate() };
}

export function resolveSingleDayDatePreset(date: Date): Extract<BillsDatePreset, "today" | "yesterday" | "custom"> {
    const today = startOfLocalDay(new Date());
    const selected = startOfLocalDay(date);

    if (selected.getTime() === today.getTime()) {
        return "today";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (selected.getTime() === yesterday.getTime()) {
        return "yesterday";
    }

    return "custom";
}

function getBillsDateLabel(applied: BillsDateAppliedState) {
    if (applied.mode === "date") {
        const preset = resolveSingleDayDatePreset(applied.specificDate);
        if (preset === "today") {
            return "Today";
        }
        if (preset === "yesterday") {
            return "Yesterday";
        }
        return formatDayMonthYear(applied.specificDate);
    }

    if (applied.preset === "all") {
        return "All dates";
    }

    if (applied.preset === "this-week") {
        return "This week";
    }

    if (applied.preset === "this-month") {
        return applied.fromDate
            ? applied.fromDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
            : "This month";
    }

    if (applied.fromDate && applied.toDate) {
        const sameYear = applied.fromDate.getFullYear() === applied.toDate.getFullYear();
        const sameMonth = sameYear && applied.fromDate.getMonth() === applied.toDate.getMonth();

        if (sameMonth) {
            return `${applied.fromDate.getDate()}–${formatDayMonthYear(applied.toDate)}`;
        }

        if (sameYear) {
            return `${formatDayMonth(applied.fromDate)} – ${formatDayMonthYear(applied.toDate)}`;
        }

        return `${formatDayMonthYear(applied.fromDate)} – ${formatDayMonthYear(applied.toDate)}`;
    }

    return "Pick dates";
}

export const billsDatePickerCalendarClassName = "w-full p-0 [--cell-size:2rem]";

export const billsDatePickerCalendarClassNames = {
    root: "w-full",
    months: "relative flex w-full flex-col",
    month: "relative flex w-full flex-col gap-2",
    nav: "absolute inset-x-0 top-0 z-10 flex h-9 w-full items-center justify-between",
    month_caption: "flex h-9 w-full items-center justify-center px-9",
    month_grid: "w-full",
    weekdays: "flex w-full",
    weekday: "flex flex-1 items-center justify-center",
    weeks: "w-full",
    week: "mt-2 flex w-full",
    day: "group/day relative flex aspect-square min-w-0 flex-1 basis-0 select-none p-0 text-center",
    day_button: "mx-0 size-auto h-full w-full min-w-0 max-w-none aspect-square rounded-md",
};

type BillsDateNavigatorProps = {
    applied: BillsDateAppliedState;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onShiftDate?: (days: number) => void;
    popoverContent: ReactNode;
};

export function BillsDateNavigator({
    applied,
    open,
    onOpenChange,
    onShiftDate,
    popoverContent,
}: BillsDateNavigatorProps) {
    const label = getBillsDateLabel(applied);
    const isSingleDay = applied.mode === "date";
    const showChevrons = isSingleDay && Boolean(onShiftDate);
    const canGoForward = isSingleDay && canShiftSalesDateForward(applied.specificDate);

    return (
        <div className="inline-flex max-w-full min-w-0 items-center gap-1">
            {showChevrons ? (
                <button
                    type="button"
                    aria-label="Previous date"
                    onClick={() => onShiftDate?.(-1)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-2xs transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ChevronLeft className="size-4" />
                </button>
            ) : null}

            <Popover open={open} onOpenChange={onOpenChange}>
                <PopoverTrigger
                    render={
                        <button
                            type="button"
                            aria-label={`Change date filter, currently ${label}`}
                            className={cn(
                                "inline-flex h-9 max-w-full min-w-0 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium shadow-2xs transition-colors hover:bg-muted/60",
                                isSingleDay
                                    ? "border-primary/25 text-foreground"
                                    : "border-border/60 text-foreground",
                            )}
                        >
                            <Calendar
                                className={cn(
                                    "size-3.5 shrink-0",
                                    isSingleDay ? "text-primary" : "text-muted-foreground",
                                )}
                            />
                            <span className="truncate">{label}</span>
                            {!isSingleDay ? (
                                <span className="shrink-0 text-[10px] font-normal text-muted-foreground">
                                    range
                                </span>
                            ) : null}
                        </button>
                    }
                />
                <PopoverContent
                    align="center"
                    className="w-[min(calc(100vw-1.5rem),20rem)] overflow-hidden p-3"
                >
                    {popoverContent}
                </PopoverContent>
            </Popover>

            {showChevrons ? (
                <button
                    type="button"
                    aria-label="Next date"
                    disabled={!canGoForward}
                    onClick={() => onShiftDate?.(1)}
                    className={cn(
                        "inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-2xs transition-colors hover:bg-muted hover:text-foreground",
                        !canGoForward && "pointer-events-none opacity-40",
                    )}
                >
                    <ChevronRight className="size-4" />
                </button>
            ) : null}
        </div>
    );
}
