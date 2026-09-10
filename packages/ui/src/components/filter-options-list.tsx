import type { ReactNode } from "react"
import { Check } from "lucide-react"

import { cn } from "@repo/ui/lib/utils"

export type FilterOption = {
    label: string
    value: string
}

type FilterOptionsListProps = {
    title: string
    options: readonly FilterOption[]
    mode: "single" | "multiple"
    selectedValues: readonly string[]
    onToggle: (value: string) => void
    onClear?: () => void
    getOptionMeta?: (option: FilterOption) => ReactNode
}

function FilterOptionsList({
    title,
    options,
    mode,
    selectedValues,
    onToggle,
    onClear,
    getOptionMeta,
}: FilterOptionsListProps) {
    const canClear = mode === "multiple" && selectedValues.length > 0 && onClear

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 px-2 py-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {title}
                </p>
                {canClear ? (
                    <button
                        type="button"
                        onClick={onClear}
                        className="shrink-0 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                        Clear
                    </button>
                ) : (
                    <span className="invisible shrink-0 text-[10px] font-semibold">Clear</span>
                )}
            </div>
            <div className="max-h-[min(60dvh,16rem)] overflow-y-auto overscroll-contain">
                {options.map((option) => {
                    const isSelected = selectedValues.includes(option.value)

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onToggle(option.value)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium hover:bg-muted/50 cursor-pointer"
                        >
                            {mode === "multiple" ? (
                                <div
                                    className={cn(
                                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-muted-foreground/35 transition-colors",
                                        isSelected
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "bg-transparent",
                                    )}
                                >
                                    {isSelected ? <Check className="size-3 stroke-[3]" /> : null}
                                </div>
                            ) : (
                                <div
                                    className={cn(
                                        "flex size-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/35 transition-colors",
                                        isSelected ? "border-primary" : "opacity-50",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "size-2 rounded-full bg-primary transition-opacity",
                                            isSelected ? "opacity-100" : "opacity-0",
                                        )}
                                    />
                                </div>
                            )}
                            <span className="min-w-0 truncate">{option.label}</span>
                            {getOptionMeta ? (
                                <span className="ml-auto shrink-0">{getOptionMeta(option)}</span>
                            ) : null}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export { FilterOptionsList }
