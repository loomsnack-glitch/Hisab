import type { LucideIcon } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";

export type BillingChoiceOption<T extends string> = {
    value: T;
    label: string;
    icon?: LucideIcon;
    activeClassName?: string;
};

export function BillingChoiceGroup<T extends string>({
    value,
    onChange,
    options,
    columns = 3,
    disabled,
    ariaLabel,
    className,
}: {
    value: T;
    onChange: (value: T) => void;
    options: Array<BillingChoiceOption<T>>;
    columns?: 2 | 3;
    disabled?: boolean;
    ariaLabel?: string;
    className?: string;
}) {
    return (
        <div
            className={cn(columns === 2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-1", className)}
            role={ariaLabel ? "radiogroup" : undefined}
            aria-label={ariaLabel}
        >
            {options.map((option) => {
                const Icon = option.icon;
                const isSelected = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        role={ariaLabel ? "radio" : undefined}
                        aria-checked={ariaLabel ? isSelected : undefined}
                        aria-pressed={ariaLabel ? undefined : isSelected}
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "flex h-8 min-h-8 items-center justify-center gap-1.5 rounded-lg px-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isSelected
                                ? cn(
                                      option.activeClassName ??
                                          "border border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20",
                                      option.activeClassName ? "shadow-md" : null,
                                  )
                                : "border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

export function BillingSegmentedTabs<T extends string>({
    value,
    onChange,
    options,
    ariaLabel,
    className,
}: {
    value: T;
    onChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
    ariaLabel?: string;
    className?: string;
}) {
    return (
        <div
            className={cn("grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1", className)}
            role="tablist"
            aria-label={ariaLabel}
        >
            {options.map((option) => {
                const isActive = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "rounded-lg py-2 text-xs font-semibold transition-all",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

export function BillingPresetPills<T extends string>({
    value,
    onChange,
    options,
    className,
}: {
    value: T;
    onChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
    className?: string;
}) {
    return (
        <div className={cn("flex min-w-0 flex-wrap gap-1.5", className)}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "min-w-0 max-w-full rounded-full border px-2.5 py-1 text-center text-[11px] font-medium whitespace-normal break-words transition-colors",
                        option.value === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
