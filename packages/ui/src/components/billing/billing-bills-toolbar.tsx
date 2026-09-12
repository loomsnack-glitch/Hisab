import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

export function BillingBillsToolbar({
    mobileFilterButton,
    desktopFilters,
    dateNavigator,
    trailing,
    className,
}: {
    mobileFilterButton?: ReactNode;
    desktopFilters?: ReactNode;
    dateNavigator: ReactNode;
    trailing?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "relative mb-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-x-2",
                className,
            )}
        >
            <div className="absolute top-1/2 left-0 z-10 flex min-w-0 -translate-y-1/2 items-center gap-2 lg:static lg:translate-y-0 lg:justify-self-start">
                {mobileFilterButton}
                {desktopFilters ? (
                    <div className="hidden flex-wrap items-center gap-2 lg:flex">{desktopFilters}</div>
                ) : null}
            </div>

            <div className="flex justify-center px-10 sm:px-12 lg:justify-self-center lg:px-1">
                <div className="min-w-0 max-w-full">{dateNavigator}</div>
            </div>

            <div className="absolute top-1/2 right-0 hidden -translate-y-1/2 lg:static lg:block lg:translate-y-0 lg:justify-self-end">
                {trailing ?? <span className="inline-block h-8 w-px" aria-hidden="true" />}
            </div>
        </div>
    );
}

export function BillingClearFiltersButton({
    visible,
    onClick,
}: {
    visible: boolean;
    onClick: () => void;
}) {
    if (!visible) {
        return <span className="inline-block h-8 w-px" aria-hidden="true" />;
    }

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full px-2.5 text-muted-foreground"
            onClick={onClick}
        >
            <RotateCcw className="size-3.5" />
            Clear
        </Button>
    );
}
