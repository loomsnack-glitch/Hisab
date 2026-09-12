import type { CSSProperties, ReactNode } from "react";
import { ShoppingCart, X } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";

export function BillingMobileCartBar({
    itemCount,
    total,
    onOpen,
}: {
    itemCount: number;
    total: ReactNode;
    onOpen: () => void;
}) {
    return (
        <div className="fixed inset-x-3 z-[45] max-lg:bottom-[calc(var(--pos-mobile-nav-height)+0.125rem)] lg:hidden">
            <button
                type="button"
                onClick={onOpen}
                className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-primary px-4 text-left text-primary-foreground shadow-xl shadow-primary/25"
                aria-label="Open current order"
            >
                <span className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15">
                        <ShoppingCart className="size-5" />
                    </span>
                    <span>
                        <span className="block text-sm font-bold">
                            {itemCount} item{itemCount === 1 ? "" : "s"} in cart
                        </span>
                        <span className="block text-xs text-primary-foreground/75">Tap to review order</span>
                    </span>
                </span>
                <span className="text-lg font-bold">{total}</span>
            </button>
        </div>
    );
}

export function BillingCartPanel({
    mobileOpen,
    onMobileOpenChange,
    itemCount,
    onClear,
    maxHeight,
    children,
    footer,
}: {
    mobileOpen: boolean;
    onMobileOpenChange: (open: boolean) => void;
    itemCount: number;
    onClear?: () => void;
    maxHeight?: string;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <>
            {!mobileOpen ? null : (
                <div
                    className="fixed inset-0 z-30 bg-black/40 touch-none lg:hidden"
                    onClick={() => onMobileOpenChange(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={cn(
                    "flex min-h-0 w-full flex-col overflow-hidden border-t border-border/50 bg-card/95 backdrop-blur-sm lg:static lg:h-full lg:w-[320px] lg:border-t-0 lg:border-l",
                    mobileOpen
                        ? "max-lg:fixed max-lg:inset-x-0 max-lg:top-[calc(var(--pos-header-height)+env(safe-area-inset-top,0px))] max-lg:bottom-[var(--pos-mobile-nav-height)] max-lg:z-[45] max-lg:max-h-none max-lg:overflow-hidden max-lg:overscroll-contain"
                        : "hidden lg:flex",
                )}
                style={mobileOpen ? undefined : ({ maxHeight } satisfies CSSProperties)}
            >
                <div className="flex justify-center pt-1.5 pb-0 lg:hidden">
                    <div className="h-1.5 w-10 rounded-full bg-border/60" />
                </div>

                <div className="shrink-0 border-b border-border/40 px-2 py-1">
                    <div className="flex items-center justify-between">
                        <div className="flex min-w-0 items-baseline gap-1.5">
                            <h2 className="text-sm font-bold text-foreground">Current Order</h2>
                            <span className="truncate text-[10px] text-muted-foreground">
                                {itemCount === 0
                                    ? "0 items in cart"
                                    : `${itemCount} item${itemCount !== 1 ? "s" : ""} in cart`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {itemCount > 0 && onClear ? (
                                <button
                                    type="button"
                                    onClick={onClear}
                                    className="min-h-7 rounded-lg px-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-destructive"
                                >
                                    Clear
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => onMobileOpenChange(false)}
                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
                                aria-label="Close current order"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-2 py-1.5">
                    {itemCount === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <ShoppingCart className="size-10 text-muted-foreground/30" />
                            <p className="mt-3 text-sm font-medium text-muted-foreground">Cart is empty</p>
                            <p className="mt-1 text-xs text-muted-foreground/60">Click products to add</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">{children}</div>
                    )}
                </div>

                {footer ? <div className="shrink-0 border-t border-border/40 bg-card px-3 py-2.5">{footer}</div> : null}
            </aside>
        </>
    );
}
