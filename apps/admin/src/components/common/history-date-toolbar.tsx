import { useMemo, useState } from "react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { DataTableFilterTrigger, DataTableFilterValue } from "@repo/ui/components/data-table-filter-trigger";
import { Calendar as DateCalendar } from "@repo/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import {
    formatHistoryDate,
    getDefaultHistoryDateState,
    getHistoryDateBounds,
    getHistoryDatePresetOptions,
    startOfLocalDay,
    toHistoryQuery,
    type HistoryDateMode,
    type HistoryDatePreset,
} from "@/lib/date-range-filter";
import type { MoneyAccountHistoryQuery } from "@repo/types";

type HistoryDateToolbarProps = {
    onQueryChange: (query: MoneyAccountHistoryQuery) => void;
};

const HistoryDateToolbar = ({ onQueryChange }: HistoryDateToolbarProps) => {
    const defaults = useMemo(() => getDefaultHistoryDateState(), []);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState<HistoryDateMode>(defaults.dateFilter);
    const [datePreset, setDatePreset] = useState<HistoryDatePreset>(defaults.datePreset);
    const [specificDate, setSpecificDate] = useState(defaults.specificDate);
    const [customFromDate, setCustomFromDate] = useState<Date | null>(defaults.customFromDate);
    const [customToDate, setCustomToDate] = useState<Date | null>(defaults.customToDate);
    const [appliedDateFilter, setAppliedDateFilter] = useState<HistoryDateMode>(defaults.dateFilter);
    const [appliedDatePreset, setAppliedDatePreset] = useState<HistoryDatePreset>(defaults.datePreset);
    const [appliedSpecificDate, setAppliedSpecificDate] = useState(defaults.specificDate);
    const [appliedCustomFromDate, setAppliedCustomFromDate] = useState<Date | null>(defaults.customFromDate);
    const [appliedCustomToDate, setAppliedCustomToDate] = useState<Date | null>(defaults.customToDate);

    const appliedBounds = useMemo(
        () =>
            getHistoryDateBounds(
                appliedDateFilter,
                appliedSpecificDate,
                appliedCustomFromDate,
                appliedCustomToDate,
                appliedDatePreset,
            ),
        [appliedDateFilter, appliedDatePreset, appliedSpecificDate, appliedCustomFromDate, appliedCustomToDate],
    );

    const appliedHistoryQuery = useMemo(() => toHistoryQuery(appliedBounds), [appliedBounds]);

    const appliedDateLabel =
        appliedDateFilter === "date"
            ? formatHistoryDate(appliedSpecificDate)
            : appliedDatePreset === "all"
              ? "All dates"
              : appliedCustomFromDate && appliedCustomToDate
                ? `${formatHistoryDate(appliedCustomFromDate)} — ${formatHistoryDate(appliedCustomToDate)}`
                : "Select date range";

    const hasActiveFilters =
        appliedDatePreset !== "today" || appliedDateFilter !== "date";

    const applyPreset = (preset: HistoryDatePreset) => {
        setDatePreset(preset);
        const today = startOfLocalDay(new Date());

        if (preset === "today") {
            setDateFilter("date");
            setSpecificDate(today);
            setCustomFromDate(null);
            setCustomToDate(null);
            setAppliedDateFilter("date");
            setAppliedDatePreset("today");
            setAppliedSpecificDate(today);
            setAppliedCustomFromDate(null);
            setAppliedCustomToDate(null);
            onQueryChange(toHistoryQuery(getHistoryDateBounds("date", today, null, null, "today")));
            setDatePopoverOpen(false);
            return;
        }

        if (preset === "yesterday") {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            setDateFilter("date");
            setSpecificDate(yesterday);
            setCustomFromDate(null);
            setCustomToDate(null);
            setAppliedDateFilter("date");
            setAppliedDatePreset("yesterday");
            setAppliedSpecificDate(yesterday);
            setAppliedCustomFromDate(null);
            setAppliedCustomToDate(null);
            onQueryChange(toHistoryQuery(getHistoryDateBounds("date", yesterday, null, null, "yesterday")));
            setDatePopoverOpen(false);
            return;
        }

        if (preset === "all") {
            setDateFilter("range");
            setCustomFromDate(null);
            setCustomToDate(null);
            setAppliedDateFilter("range");
            setAppliedDatePreset("all");
            setAppliedCustomFromDate(null);
            setAppliedCustomToDate(null);
            onQueryChange({});
            setDatePopoverOpen(false);
            return;
        }

        if (preset === "this-week" || preset === "this-month") {
            setDateFilter("range");
            setAppliedDateFilter("range");
            setAppliedDatePreset(preset);
            setAppliedCustomFromDate(null);
            setAppliedCustomToDate(null);
            onQueryChange(toHistoryQuery(getHistoryDateBounds("range", today, null, null, preset)));
            setDatePopoverOpen(false);
        }
    };

    const shiftDate = (days: number) => {
        const next = new Date(datePopoverOpen ? specificDate : appliedSpecificDate);
        next.setDate(next.getDate() + days);
        const nextDate = startOfLocalDay(next);

        setDateFilter("date");
        setDatePreset("custom");
        setSpecificDate(nextDate);
        setAppliedDateFilter("date");
        setAppliedDatePreset("custom");
        setAppliedSpecificDate(nextDate);
        setAppliedCustomFromDate(null);
        setAppliedCustomToDate(null);
        onQueryChange(toHistoryQuery(getHistoryDateBounds("date", nextDate, null, null, "custom")));
        setDatePopoverOpen(false);
    };

    const setDateMode = (mode: HistoryDateMode) => {
        setDateFilter(mode);
        setDatePreset("custom");

        if (mode === "range" && !customFromDate && !customToDate) {
            setCustomFromDate(specificDate);
            setCustomToDate(specificDate);
        }
    };

    const confirmDateFilter = () => {
        if (dateFilter === "range" && datePreset === "custom" && (!customFromDate || !customToDate)) {
            return;
        }

        setAppliedDateFilter(dateFilter);
        setAppliedDatePreset(datePreset);
        setAppliedSpecificDate(specificDate);
        setAppliedCustomFromDate(customFromDate);
        setAppliedCustomToDate(customToDate);
        onQueryChange(
            toHistoryQuery(getHistoryDateBounds(dateFilter, specificDate, customFromDate, customToDate, datePreset)),
        );
        setDatePopoverOpen(false);
    };

    const handlePopoverOpenChange = (open: boolean) => {
        if (open) {
            setDateFilter(appliedDateFilter);
            setDatePreset(appliedDatePreset);
            setSpecificDate(appliedSpecificDate);
            setCustomFromDate(appliedCustomFromDate);
            setCustomToDate(appliedCustomToDate);
        } else {
            setDateFilter(appliedDateFilter);
            setDatePreset(appliedDatePreset);
            setSpecificDate(appliedSpecificDate);
            setCustomFromDate(appliedCustomFromDate);
            setCustomToDate(appliedCustomToDate);
        }
        setDatePopoverOpen(open);
    };

    const clearFilters = () => {
        applyPreset("today");
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1">
                {appliedDateFilter === "date" ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0 rounded-l-2xl rounded-r-md shadow-xs"
                        aria-label="Previous date"
                        onClick={() => shiftDate(-1)}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                ) : null}
                <Popover open={datePopoverOpen} onOpenChange={handlePopoverOpenChange}>
                    <PopoverTrigger
                        render={
                            <DataTableFilterTrigger
                                className={cn(appliedDateFilter === "date" ? "rounded-md" : "rounded-full")}
                            >
                                <Calendar />
                                <span>Date</span>
                                <DataTableFilterValue>
                                    <Badge
                                        variant="secondary"
                                        className="max-w-[12rem] truncate rounded-md px-1.5 font-normal"
                                    >
                                        {appliedDateLabel}
                                    </Badge>
                                </DataTableFilterValue>
                            </DataTableFilterTrigger>
                        }
                    />
                    <PopoverContent align="start" className="w-[240px] max-w-[calc(100vw-1rem)] overflow-hidden p-2">
                        <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex min-w-0 rounded-md border border-border/50 bg-muted/30 p-px">
                                {(["date", "range"] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setDateMode(mode)}
                                        className={cn(
                                            "min-w-0 flex-1 rounded px-1.5 py-1 text-center text-[11px] font-semibold transition-colors",
                                            dateFilter === mode
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground",
                                        )}
                                    >
                                        {mode === "date" ? "Date" : "Date range"}
                                    </button>
                                ))}
                            </div>

                            <div className="flex min-w-0 flex-wrap gap-1">
                                {getHistoryDatePresetOptions(dateFilter).map((preset) => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        onClick={() => applyPreset(preset.value)}
                                        className={cn(
                                            "min-w-0 max-w-full rounded-full border px-2 py-0.5 text-center text-[11px] font-medium whitespace-normal break-words transition-colors",
                                            datePreset === preset.value
                                                ? "border-primary/40 bg-primary/10 text-primary"
                                                : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                        )}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>

                            <div className="min-w-0 max-w-full overflow-x-auto">
                                <div className="flex w-full min-w-max justify-center">
                                    {dateFilter === "date" ? (
                                        <DateCalendar
                                            mode="single"
                                            className="mx-auto p-1 [--cell-size:--spacing(6)]"
                                            classNames={{
                                                day_button:
                                                    "mx-auto size-(--cell-size) min-w-(--cell-size) w-(--cell-size)",
                                            }}
                                            selected={specificDate}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setSpecificDate(date);
                                                    setDatePreset("custom");
                                                }
                                            }}
                                            autoFocus
                                        />
                                    ) : (
                                        <DateCalendar
                                            mode="range"
                                            className="mx-auto p-1 [--cell-size:--spacing(6)]"
                                            classNames={{
                                                day_button:
                                                    "mx-auto size-(--cell-size) min-w-(--cell-size) w-(--cell-size)",
                                            }}
                                            selected={{
                                                from: customFromDate ?? undefined,
                                                to: customToDate ?? undefined,
                                            }}
                                            onSelect={(range) => {
                                                setDatePreset("custom");
                                                setCustomFromDate(range?.from ?? null);
                                                setCustomToDate(range?.to ?? null);
                                            }}
                                            autoFocus
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-border/50 pt-3">
                                <Button
                                    type="button"
                                    size="sm"
                                    className="rounded-lg"
                                    disabled={
                                        dateFilter === "range" &&
                                        datePreset === "custom" &&
                                        (!customFromDate || !customToDate)
                                    }
                                    onClick={confirmDateFilter}
                                >
                                    Confirm
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
                {appliedDateFilter === "date" ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0 rounded-r-2xl rounded-l-md shadow-xs"
                        aria-label="Next date"
                        onClick={() => shiftDate(1)}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                ) : null}
            </div>
            {hasActiveFilters ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full px-2.5 text-muted-foreground"
                    onClick={clearFilters}
                >
                    <RotateCcw className="size-3.5" />
                    Clear
                </Button>
            ) : null}
            <span className="sr-only" data-testid="history-date-query">
                {JSON.stringify(appliedHistoryQuery)}
            </span>
        </div>
    );
};

export default HistoryDateToolbar;
