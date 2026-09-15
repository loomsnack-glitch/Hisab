import type { MoneyAccountHistoryQuery } from "@repo/types";

export type HistoryDateMode = "date" | "range";
export type HistoryDatePreset = "today" | "yesterday" | "this-week" | "this-month" | "custom" | "all";

export const historyDatePresetOptions: Array<{ value: HistoryDatePreset; label: string }> = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this-week", label: "This week" },
    { value: "this-month", label: "This month" },
    { value: "custom", label: "Custom" },
    { value: "all", label: "All dates" },
];

export const getHistoryDatePresetOptions = (mode: HistoryDateMode) =>
    historyDatePresetOptions.filter((preset) =>
        mode === "date"
            ? preset.value === "today" || preset.value === "yesterday" || preset.value === "custom"
            : preset.value === "this-week" ||
              preset.value === "this-month" ||
              preset.value === "custom" ||
              preset.value === "all",
    );

export const formatHistoryDate = (value: Date) =>
    value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const startOfLocalDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const nextLocalDay = (value: Date) => {
    const next = startOfLocalDay(value);
    next.setDate(next.getDate() + 1);
    return next;
};

export const getHistoryDateBounds = (
    mode: HistoryDateMode,
    selectedDate: Date,
    customFromDate: Date | null,
    customToDate: Date | null,
    preset: HistoryDatePreset,
) => {
    if (preset === "all") {
        return { from: null, to: null };
    }

    const today = startOfLocalDay(new Date());

    if (preset === "today") {
        return { from: today, to: nextLocalDay(today) };
    }

    if (preset === "yesterday") {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday, to: today };
    }

    if (preset === "this-week") {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        return { from: weekStart, to: nextLocalDay(today) };
    }

    if (preset === "this-month") {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: monthStart, to: nextLocalDay(today) };
    }

    if (mode === "date") {
        const from = startOfLocalDay(selectedDate);
        return { from, to: nextLocalDay(from) };
    }

    return {
        from: customFromDate ? startOfLocalDay(customFromDate) : null,
        to: customToDate ? nextLocalDay(customToDate) : null,
    };
};

export const toHistoryQuery = (bounds: { from: Date | null; to: Date | null }): MoneyAccountHistoryQuery => ({
    ...(bounds.from ? { occurredFrom: bounds.from.toISOString() } : {}),
    ...(bounds.to ? { occurredTo: bounds.to.toISOString() } : {}),
});

export const getDefaultHistoryDateState = () => {
    const today = startOfLocalDay(new Date());
    return {
        dateFilter: "date" as HistoryDateMode,
        datePreset: "today" as HistoryDatePreset,
        specificDate: today,
        customFromDate: null as Date | null,
        customToDate: null as Date | null,
    };
};

export const getDefaultHistoryQuery = (): MoneyAccountHistoryQuery => {
    const defaults = getDefaultHistoryDateState();
    return toHistoryQuery(
        getHistoryDateBounds(
            defaults.dateFilter,
            defaults.specificDate,
            defaults.customFromDate,
            defaults.customToDate,
            defaults.datePreset,
        ),
    );
};
