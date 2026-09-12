import { cn } from "@repo/ui/lib/utils";

export type BillingCategoryOption = {
    id: string;
    name: string;
};

export function BillingCategoryPills({
    categories,
    value,
    onChange,
    className,
}: {
    categories: BillingCategoryOption[];
    value: string;
    onChange: (categoryId: string) => void;
    className?: string;
}) {
    return (
        <div className={cn("shrink-0 border-b border-border/50 bg-background pb-2 pr-4 pt-0", className)}>
            <div aria-label="Categories" className="scrollbar-none flex min-h-9 min-w-0 touch-pan-x gap-1.5 overflow-x-auto pb-0.5">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => onChange(category.id)}
                        aria-pressed={value === category.id}
                        className={cn(
                            "min-h-9 shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                            value === category.id
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                : "border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                    >
                        {category.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
