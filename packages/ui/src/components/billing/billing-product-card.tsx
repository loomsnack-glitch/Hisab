import type { ReactNode } from "react";
import { Boxes, ShoppingCart, SlidersHorizontal } from "lucide-react";

import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";

export function BillingProductCard({
    name,
    inCart,
    cartQuantity,
    imageUrl,
    disabled,
    loading,
    hasAddOns,
    isCombo,
    onClick,
    ariaLabel,
    price,
    badge,
}: {
    name: string;
    inCart?: boolean;
    cartQuantity?: number;
    imageUrl?: string | null;
    disabled?: boolean;
    loading?: boolean;
    hasAddOns?: boolean;
    isCombo?: boolean;
    onClick: () => void;
    ariaLabel: string;
    price?: ReactNode;
    badge?: ReactNode;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-label={ariaLabel}
            className={cn(
                "group relative flex min-h-[76px] w-full cursor-pointer touch-[pan-y_pinch-zoom] items-center gap-2 rounded-xl border px-2 py-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
                inCart
                    ? "border-primary/40 bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border/50 bg-card/80 hover:border-primary/30 hover:bg-card",
            )}
        >
            {inCart && cartQuantity ? (
                <span className="absolute -top-2 -right-2 z-10 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-center text-xs font-bold leading-none text-primary-foreground shadow-md shadow-primary/25">
                    {cartQuantity}
                </span>
            ) : null}
            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/40 shadow-inner">
                {loading ? (
                    <Spinner className="size-4 text-primary" />
                ) : imageUrl ? (
                    <img src={imageUrl} alt={name} className="h-full w-full rounded-lg border border-border/40 object-cover" />
                ) : isCombo ? (
                    <Boxes className="size-5 text-sky-600/70 dark:text-sky-400/70" />
                ) : (
                    <ShoppingCart className="size-5 text-muted-foreground/50" />
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="min-w-0 whitespace-normal break-words text-base font-semibold leading-snug text-foreground">
                    {name}
                </p>
                <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">{price}</div>
                    <div className="shrink-0">{badge}</div>
                </div>
            </div>
            {hasAddOns ? (
                <span
                    title="Click the product to customize add-ons"
                    className="mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/5 text-primary/80 transition-colors group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary"
                >
                    <SlidersHorizontal className="size-[18px]" aria-label="Add-ons available" />
                </span>
            ) : null}
        </button>
    );
}
