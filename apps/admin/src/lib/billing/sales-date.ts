import type { BillsDateMode, BillsDatePreset } from "@repo/ui/components/billing";

import {
    getHistoryDateBounds,
    getHistoryDatePresetOptions,
    nextLocalDay,
    startOfLocalDay,
} from "@/lib/date-range-filter";

export { nextLocalDay, startOfLocalDay };

export const getSalesDatePresetOptions = (mode: BillsDateMode) => getHistoryDatePresetOptions(mode);

export const getSalesDateBounds = (
    mode: BillsDateMode,
    selectedDate: Date,
    customFromDate: Date | null,
    customToDate: Date | null,
    preset: BillsDatePreset,
) => getHistoryDateBounds(mode, selectedDate, customFromDate, customToDate, preset);
