import type { ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";

export function BillingEmptyState({
    icon,
    title,
    description,
    className,
    children,
}: {
    icon?: ReactNode;
    title: string;
    description?: string;
    className?: string;
    children?: ReactNode;
}) {
    return (
        <div
            className={cn(
                "flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 p-5 text-center",
                className,
            )}
        >
            {icon}
            <p className={cn("font-medium text-foreground", icon ? "mt-3" : null)}>{title}</p>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
            {children}
        </div>
    );
}
