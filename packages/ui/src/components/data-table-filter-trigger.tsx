import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

function DataTableFilterTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<"button">) {
    return (
        <button
            type="button"
            className={cn(
                "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-dashed border-border bg-background px-3 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
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

export { DataTableFilterTrigger, DataTableFilterValue }
