import { useEffect, useRef } from "react";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

export type CatalogCategoryFilterPill = {
    id: string;
    name: string;
    inactive?: boolean;
};

type CatalogCategoryFilterPillsProps = {
    categories: CatalogCategoryFilterPill[];
    selectedCategoryId: string;
    onSelect: (categoryId: string) => void;
    wrap?: boolean;
};

const CatalogCategoryFilterPills = ({
    categories,
    selectedCategoryId,
    onSelect,
    wrap = false,
}: CatalogCategoryFilterPillsProps) => {
    const categoryPillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    useEffect(() => {
        const el = categoryPillRefs.current[selectedCategoryId];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }, [selectedCategoryId]);

    return (
        <div
            className={cn(
                "flex min-w-0 items-center gap-1.5 overflow-x-auto py-0 scrollbar-none",
                wrap && "sm:flex-wrap sm:overflow-x-hidden sm:gap-2",
            )}
        >
            <Button
                ref={(el) => {
                    categoryPillRefs.current.all = el;
                }}
                variant={selectedCategoryId === "all" ? "default" : "outline"}
                className={cn(
                    "h-8.5 shrink-0 cursor-pointer rounded-full px-4 text-xs font-medium transition-all",
                    selectedCategoryId === "all"
                        ? "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                        : "border-border/60 bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-card hover:text-foreground",
                )}
                onClick={() => onSelect("all")}
            >
                All
            </Button>
            {categories.map((category) => {
                const isSelected = selectedCategoryId === category.id;
                return (
                    <Button
                        key={category.id}
                        ref={(el) => {
                            categoryPillRefs.current[category.id] = el;
                        }}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                            "h-8.5 shrink-0 cursor-pointer rounded-full px-4 text-xs font-medium transition-all",
                            isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                                : "border-border/60 bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-card hover:text-foreground",
                            category.inactive && "opacity-60 blur-[0.4px]",
                        )}
                        onClick={() => onSelect(category.id)}
                    >
                        <span className={cn(category.inactive && "line-through decoration-2")}>
                            {category.name}
                        </span>
                    </Button>
                );
            })}
        </div>
    );
};

export default CatalogCategoryFilterPills;
