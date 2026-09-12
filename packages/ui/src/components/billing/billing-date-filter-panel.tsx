import type { ReactNode } from "react";

import { Button } from "@repo/ui/components/button";

import { BillingPresetPills, BillingSegmentedTabs } from "./billing-choice-group";
import type { BillsDateMode, BillsDatePreset } from "./bills-date-navigator";

export function BillingDateFilterPanel({
    mode,
    onModeChange,
    presets,
    selectedPreset,
    onPresetSelect,
    calendar,
    confirmDisabled,
    onConfirm,
}: {
    mode: BillsDateMode;
    onModeChange: (mode: BillsDateMode) => void;
    presets: Array<{ value: BillsDatePreset; label: string }>;
    selectedPreset: BillsDatePreset;
    onPresetSelect: (preset: BillsDatePreset) => void;
    calendar: ReactNode;
    confirmDisabled?: boolean;
    onConfirm: () => void;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-3">
            <BillingSegmentedTabs
                ariaLabel="Date filter mode"
                value={mode}
                onChange={onModeChange}
                options={[
                    { value: "date", label: "Day" },
                    { value: "range", label: "Range" },
                ]}
            />
            <BillingPresetPills value={selectedPreset} onChange={onPresetSelect} options={presets} />
            <div className="w-full">{calendar}</div>
            <div className="flex justify-end border-t border-border/50 pt-3">
                <Button type="button" size="sm" className="rounded-lg" disabled={confirmDisabled} onClick={onConfirm}>
                    Confirm
                </Button>
            </div>
        </div>
    );
}
