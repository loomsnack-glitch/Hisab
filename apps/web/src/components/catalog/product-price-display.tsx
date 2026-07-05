import { cn } from "@repo/ui/lib/utils";

import { formatCurrency } from "@/lib/format";

type ProductPriceDisplayProps = {
    price: number | string;
    discount?: number | string | null;
    size?: "sm" | "md" | "lg";
    align?: "left" | "center" | "right";
    /** Color for the price when there is no discount */
    singleTone?: "foreground" | "primary";
    className?: string;
};

const sizeStyles = {
    sm: {
        original: "text-[11px]",
        discounted: "text-sm font-extrabold",
        single: "text-sm font-bold",
    },
    md: {
        original: "text-xs",
        discounted: "text-base font-extrabold",
        single: "text-base font-bold",
    },
    lg: {
        original: "text-sm",
        discounted: "text-xl font-extrabold",
        single: "text-lg font-bold",
    },
} as const;

export const getDiscountedPrice = (
    price: number | string,
    discount?: number | string | null,
) => {
    const originalPrice = Number(price ?? 0);
    const discountAmount = Number(discount ?? 0);

    return Math.max(0, originalPrice - discountAmount);
};

const ProductPriceDisplay = ({
    price,
    discount,
    size = "md",
    align = "center",
    singleTone = "primary",
    className,
}: ProductPriceDisplayProps) => {
    const originalPrice = Number(price ?? 0);
    const discountAmount = Number(discount ?? 0);
    const hasDiscount = discountAmount > 0;
    const finalPrice = getDiscountedPrice(originalPrice, discountAmount);
    const styles = sizeStyles[size];
    const alignClass =
        align === "center" ? "text-center items-center" : align === "right" ? "text-right items-end" : "text-left items-start";

    if (!hasDiscount) {
        return (
            <p
                className={cn(
                    styles.single,
                    "tabular-nums tracking-tight",
                    singleTone === "primary" ? "text-primary" : "text-foreground",
                    alignClass,
                    className,
                )}
            >
                {formatCurrency(originalPrice)}
            </p>
        );
    }

    return (
        <div
            className={cn(
                "flex flex-col gap-0.5",
                alignClass,
                className,
            )}
        >
            <span
                className={cn(
                    styles.original,
                    "font-medium text-muted-foreground/75 line-through decoration-muted-foreground/40 tabular-nums",
                )}
            >
                {formatCurrency(originalPrice)}
            </span>
            <span
                className={cn(
                    styles.discounted,
                    "text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight leading-none",
                )}
            >
                {formatCurrency(finalPrice)}
            </span>
        </div>
    );
};

export default ProductPriceDisplay;
