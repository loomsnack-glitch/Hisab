import { useEffect, useMemo, useState } from "react";
import { addCalendarDays, kolkataCalendarDate } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Calendar as DateCalendar } from "@repo/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type SalesDateMode = "date" | "range";
type SalesDatePreset = "today" | "yesterday" | "this-week" | "this-month" | "custom" | "all";

const salesDatePresetOptions: Array<{ value: SalesDatePreset; label: string }> = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this-week", label: "This week" },
    { value: "this-month", label: "This month" },
    { value: "custom", label: "Custom" },
    { value: "all", label: "All dates" },
];

const getSalesDatePresetOptions = (mode: SalesDateMode, allowAllDates: boolean) =>
    salesDatePresetOptions.filter((preset) => {
        if (preset.value === "all" && !allowAllDates) return false;
        return mode === "date"
            ? preset.value === "today" || preset.value === "yesterday" || preset.value === "custom"
            : preset.value === "this-week" ||
              preset.value === "this-month" ||
              preset.value === "custom" ||
              preset.value === "all";
    });

const formatSalesDate = (calendarDate: string) => {
    const [yearText, monthText, dayText] = calendarDate.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
};

const parseCalendarDate = (value: string) => {
    const [yearText, monthText, dayText] = value.split("-");
    return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
};

const toCalendarDate = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const kolkataWeekStart = (today: string) => {
    const [yearText, monthText, dayText] = today.split("-");
    const weekday = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText), 12)).getUTCDay();
    return addCalendarDays(today, -((weekday + 6) % 7));
};

const inferDatePreset = (startDate: string | undefined, endDate: string | undefined, dateScope: "all" | undefined, today: string): SalesDatePreset => {
    if (dateScope === "all") return "all";
    if (!startDate && !endDate) return "today";
    if (startDate && endDate && startDate === endDate) {
        if (startDate === today) return "today";
        if (startDate === addCalendarDays(today, -1)) return "yesterday";
        return "custom";
    }
    if (startDate === kolkataWeekStart(today) && endDate === today) return "this-week";
    if (startDate === `${today.slice(0, 7)}-01` && endDate === today) return "this-month";
    return "custom";
};

export type ConsoleInspectionDateFilterValue = {
    startDate?: string;
    endDate?: string;
    dateScope?: "all";
};

type ConsoleInspectionDateFilterProps = {
    startDate?: string;
    endDate?: string;
    dateScope?: "all";
    allowAllDates?: boolean;
    triggerAriaLabel: string;
    onApply: (next: ConsoleInspectionDateFilterValue) => void;
};

const ConsoleInspectionDateFilter = ({
    startDate,
    endDate,
    dateScope,
    allowAllDates = true,
    triggerAriaLabel,
    onApply,
}: ConsoleInspectionDateFilterProps) => {
    const today = kolkataCalendarDate(new Date());
    const appliedStartDate = dateScope === "all" ? undefined : startDate;
    const appliedEndDate = dateScope === "all" ? undefined : endDate;
    const appliedIsSingleDate = Boolean(appliedStartDate && appliedEndDate && appliedStartDate === appliedEndDate);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [dateMode, setDateMode] = useState<SalesDateMode>(appliedIsSingleDate ? "date" : "range");
    const [datePreset, setDatePreset] = useState<SalesDatePreset>(() => inferDatePreset(appliedStartDate, appliedEndDate, dateScope, today));
    const [specificDate, setSpecificDate] = useState<Date>(appliedIsSingleDate ? parseCalendarDate(appliedStartDate!) : parseCalendarDate(today));
    const [customFromDate, setCustomFromDate] = useState<Date | null>(appliedStartDate ? parseCalendarDate(appliedStartDate) : null);
    const [customToDate, setCustomToDate] = useState<Date | null>(appliedEndDate ? parseCalendarDate(appliedEndDate) : null);

    useEffect(() => {
        if (datePopoverOpen) return;
        const nextStartDate = dateScope === "all" ? undefined : startDate;
        const nextEndDate = dateScope === "all" ? undefined : endDate;
        const isSingle = Boolean(nextStartDate && nextEndDate && nextStartDate === nextEndDate);
        setDateMode(isSingle ? "date" : "range");
        setDatePreset(inferDatePreset(nextStartDate, nextEndDate, dateScope, today));
        if (isSingle && nextStartDate) setSpecificDate(parseCalendarDate(nextStartDate));
        setCustomFromDate(nextStartDate ? parseCalendarDate(nextStartDate) : null);
        setCustomToDate(nextEndDate ? parseCalendarDate(nextEndDate) : null);
    }, [datePopoverOpen, dateScope, endDate, startDate, today]);

    const dateLabel = dateScope === "all" || (!appliedStartDate && !appliedEndDate)
        ? "All dates"
        : appliedIsSingleDate
            ? formatSalesDate(appliedStartDate!)
            : `${formatSalesDate(appliedStartDate ?? appliedEndDate!)} — ${formatSalesDate(appliedEndDate ?? appliedStartDate!)}`;

    const applyDateRange = (nextStartDate?: string, nextEndDate?: string, nextDateScope?: "all") => {
        if (nextDateScope === "all") {
            onApply({ startDate: undefined, endDate: undefined, dateScope: "all" });
        } else {
            onApply({ startDate: nextStartDate, endDate: nextEndDate });
        }
        setDatePopoverOpen(false);
    };

    const applyDatePreset = (preset: SalesDatePreset) => {
        setDatePreset(preset);
        if (preset === "today") {
            setSpecificDate(parseCalendarDate(today));
            setCustomFromDate(parseCalendarDate(today));
            setCustomToDate(parseCalendarDate(today));
            return;
        }
        if (preset === "yesterday") {
            const yesterday = addCalendarDays(today, -1);
            setSpecificDate(parseCalendarDate(yesterday));
            setCustomFromDate(parseCalendarDate(yesterday));
            setCustomToDate(parseCalendarDate(yesterday));
            return;
        }
        if (preset === "this-week") {
            setCustomFromDate(parseCalendarDate(kolkataWeekStart(today)));
            setCustomToDate(parseCalendarDate(today));
            return;
        }
        if (preset === "this-month") {
            setCustomFromDate(parseCalendarDate(`${today.slice(0, 7)}-01`));
            setCustomToDate(parseCalendarDate(today));
            return;
        }
        if (preset === "all") {
            setCustomFromDate(null);
            setCustomToDate(null);
        }
    };

    const confirmDateFilter = () => {
        if (datePreset === "all" && dateMode === "range") {
            applyDateRange(undefined, undefined, "all");
            return;
        }
        if (dateMode === "date") {
            const selected = toCalendarDate(specificDate);
            applyDateRange(selected, selected);
            return;
        }
        if (!customFromDate || !customToDate) return;
        const from = toCalendarDate(customFromDate);
        const to = toCalendarDate(customToDate);
        applyDateRange(from <= to ? from : to, from <= to ? to : from);
    };

    const shiftSingleDate = (days: number) => {
        if (!appliedIsSingleDate || !appliedStartDate) return;
        const next = addCalendarDays(appliedStartDate, days);
        if (next > today) return;
        applyDateRange(next, next);
    };

    const dateTrigger = useMemo(
        () => (
            <Button
                type="button"
                variant="outline"
                className="h-8 min-w-0 max-w-[280px] justify-start gap-2 rounded-lg px-2.5 text-xs"
                aria-label={triggerAriaLabel}
            >
                <Calendar className="size-3.5 shrink-0" />
                <span className="truncate">{dateLabel}</span>
            </Button>
        ),
        [dateLabel, triggerAriaLabel],
    );

    return (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
            {appliedIsSingleDate ? (
                <Button type="button" variant="outline" size="icon" className="size-8 shrink-0 rounded-lg" aria-label="Previous date" onClick={() => shiftSingleDate(-1)}>
                    <ChevronLeft className="size-4" />
                </Button>
            ) : null}
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger render={dateTrigger} />
                <PopoverContent align="start" className="w-[240px] max-w-[calc(100vw-1rem)] overflow-hidden p-2">
                    <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex min-w-0 rounded-md border border-border/50 bg-muted/30 p-px">
                            {(["date", "range"] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => {
                                        setDateMode(mode);
                                        setDatePreset(mode === "date" ? "custom" : datePreset === "today" || datePreset === "yesterday" ? "custom" : datePreset);
                                    }}
                                    className={cn(
                                        "min-w-0 flex-1 rounded px-1.5 py-1 text-center text-[11px] font-semibold transition-colors",
                                        dateMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {mode === "date" ? "Date" : "Date range"}
                                </button>
                            ))}
                        </div>
                        <div className="flex min-w-0 flex-wrap gap-1">
                            {getSalesDatePresetOptions(dateMode, allowAllDates).map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => applyDatePreset(preset.value)}
                                    className={cn(
                                        "min-w-0 max-w-full rounded-full border px-2 py-0.5 text-center text-[11px] font-medium transition-colors",
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
                            {dateMode === "date" ? (
                                <DateCalendar
                                    mode="single"
                                    className="mx-auto p-1 [--cell-size:--spacing(6)]"
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
                                    selected={{ from: customFromDate ?? undefined, to: customToDate ?? undefined }}
                                    onSelect={(range) => {
                                        setDatePreset("custom");
                                        setCustomFromDate(range?.from ?? null);
                                        setCustomToDate(range?.to ?? null);
                                    }}
                                    autoFocus
                                />
                            )}
                        </div>
                        <div className="flex justify-end border-t border-border/50 pt-3">
                            <Button
                                type="button"
                                size="sm"
                                className="rounded-lg"
                                disabled={dateMode === "range" && datePreset === "custom" && (!customFromDate || !customToDate)}
                                onClick={confirmDateFilter}
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
            {appliedIsSingleDate ? (
                <Button type="button" variant="outline" size="icon" className="size-8 shrink-0 rounded-lg" aria-label="Next date" onClick={() => shiftSingleDate(1)}>
                    <ChevronRight className="size-4" />
                </Button>
            ) : null}
        </div>
    );
};

export default ConsoleInspectionDateFilter;
