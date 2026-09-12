import type { HTMLAttributes, ReactNode } from "react";
import { ShoppingCart } from "lucide-react";

import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";

import { BillingEmptyState } from "./billing-empty-state";

type BillingProductGridProps = HTMLAttributes<HTMLDivElement> & {
    isPending?: boolean;
    isEmpty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    children?: ReactNode;
};

export function BillingProductGrid({
    isPending,
    isEmpty,
    emptyTitle = "No products found",
    emptyDescription = "Try a different search or category.",
    children,
    className,
    ...props
}: BillingProductGridProps) {
    return (
        <div
            className={cn("min-h-0 flex-1 touch-[pan-y_pinch-zoom] overflow-y-auto overscroll-contain pt-2", className)}
            {...props}
        >
            <div className="pr-4 pb-[calc(3.625rem+env(safe-area-inset-bottom,0px))] lg:pb-2">
                {isPending ? (
                    <div className="flex min-h-[320px] items-center justify-center">
                        <Spinner className="size-8 text-primary" />
                    </div>
                ) : isEmpty ? (
                    <BillingEmptyState
                        icon={<ShoppingCart className="size-10 text-muted-foreground/50" />}
                        title={emptyTitle}
                        description={emptyDescription}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
