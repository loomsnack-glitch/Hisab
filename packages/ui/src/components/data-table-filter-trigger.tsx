import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

type DataTableFilterTriggerProps = React.ComponentProps<"button"> & {
    active?: boolean
}

function DataTableFilterTrigger({
    className,
    active = false,
    children,
    ...props
}: DataTableFilterTriggerProps) {
    return (
        <button
            type="button"
            className={cn(
                "inline-flex h-9 max-w-full shrink-0 items-center gap-1.5 rounded-full border bg-card px-3.5 text-xs font-semibold shadow-2xs transition-all duration-200 cursor-pointer",
                "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
                "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "disabled:pointer-events-none disabled:opacity-50",
                "[&_svg]:size-3.5 [&_svg]:shrink-0",
                active
                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                    : "border-border/50 text-muted-foreground",
                className,
            )}
            {...props}
        >
            {children}
        </button>
    )
}

function DataTableFilterValue({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex min-w-0 items-center gap-2">
            <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
            <span className="inline-flex min-w-0 items-center gap-1">{children}</span>
        </span>
    )
}

function dataTableFilterIconClassName(active: boolean) {
    return cn(
        "transition-colors",
        active ? "text-primary stroke-[2.5]" : "text-muted-foreground/70",
    )
}

export { DataTableFilterTrigger, DataTableFilterValue, dataTableFilterIconClassName }
