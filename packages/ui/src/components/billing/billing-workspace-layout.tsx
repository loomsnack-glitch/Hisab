import type { ReactNode, Ref } from "react";
import { cn } from "@repo/ui/lib/utils";

const defaultLayoutClassName =
    "billing-pos-layout flex min-h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] flex-col gap-0 max-lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))] lg:min-h-0 lg:overflow-hidden";

export function BillingWorkspaceLayout({
    className,
    left,
    right,
    leftRef,
    leftClassName,
    leftMaxHeight,
    children,
}: {
    className?: string;
    left: ReactNode;
    right?: ReactNode;
    leftRef?: Ref<HTMLDivElement>;
    leftClassName?: string;
    leftMaxHeight?: string;
    children?: ReactNode;
}) {
    return (
        <div className={cn(defaultLayoutClassName, className)}>
            {children}
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <div
                    ref={leftRef}
                    className={cn("min-h-0 flex-1 lg:min-w-0", leftClassName)}
                    style={leftMaxHeight ? { maxHeight: leftMaxHeight } : undefined}
                >
                    {left}
                </div>
                {right}
            </div>
        </div>
    );
}
