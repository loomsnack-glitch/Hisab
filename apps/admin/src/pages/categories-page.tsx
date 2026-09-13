import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useParams } from "react-router-dom";
import { getCategories, getProducts, reorderCategories } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { Spinner } from "@repo/ui/components/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { Check, CircleCheck, Filter, ListOrdered, Pencil, PlusCircle, RefreshCw, Search, Tags, Trash2, X } from "lucide-react";

import DeleteCategoryButton from "@/components/catalog/delete-category-button";
import CategoryStatusBadge from "@/components/catalog/category-status-badge";
import UpsertCategoryDialog from "@/components/catalog/upsert-category-dialog";
import ReorderListDialog from "@/components/catalog/reorder-list-dialog";
import {
    catalogFilterUrlOptions,
    catalogListFilterParsers,
    type CatalogStatusFilter,
} from "@/lib/catalog-query-states";
import { catalogKeys } from "@/lib/query-keys";
import { useDebouncedUrlSearch } from "@/lib/use-debounced-url-search";

const STATUS_FILTER_OPTIONS = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
] as const;

type CategoryFilterOptionsProps = {
    selectedValues: string[];
    onChange: (value: string) => void;
    onClear: () => void;
    variant?: "popover" | "sheet";
};

const CategoryFilterOptions = ({
    selectedValues,
    onChange,
    onClear,
    variant = "popover",
}: CategoryFilterOptionsProps) => {
    const isSheet = variant === "sheet";

    return (
        <div className={cn("space-y-1", isSheet && "space-y-2")}>
            <div className={cn("flex items-center justify-between gap-3", isSheet ? "px-1 py-1" : "px-2 py-1")}>
                <div className="flex min-w-0 items-center gap-2">
                    {isSheet ? (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <CircleCheck className="size-4" />
                        </span>
                    ) : (
                        <CircleCheck className="size-3.5 shrink-0 text-muted-foreground/70" />
                    )}
                    <p
                        className={cn(
                            isSheet
                                ? "text-sm font-semibold text-foreground"
                                : "text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                        )}
                    >
                        Status
                    </p>
                </div>
                {selectedValues.length > 0 ? (
                    <button
                        type="button"
                        onClick={onClear}
                        className={cn(
                            "shrink-0 font-semibold text-primary hover:underline cursor-pointer",
                            isSheet ? "text-sm" : "text-[10px]",
                        )}
                    >
                        Clear
                    </button>
                ) : (
                    <span className={cn("invisible shrink-0 font-semibold", isSheet ? "text-sm" : "text-[10px]")}>
                        Clear
                    </span>
                )}
            </div>
            {STATUS_FILTER_OPTIONS.map((option) => {
                const isChecked = selectedValues.includes(option.value);
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-lg text-left font-medium hover:bg-muted/50 cursor-pointer",
                            isSheet ? "px-2 py-2.5 text-sm" : "gap-2 px-2 py-1.5 text-xs",
                        )}
                    >
                        <div
                            className={cn(
                                "flex items-center justify-center rounded-[4px] border border-muted-foreground/35 transition-colors",
                                isChecked ? "bg-primary text-primary-foreground border-primary" : "bg-transparent",
                                isSheet ? "size-5" : "size-4",
                            )}
                        >
                            {isChecked ? <Check className={cn("stroke-[3]", isSheet ? "size-3.5" : "size-3")} /> : null}
                        </div>
                        <span className="truncate">{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

const CategoriesPage = () => {
    const { organizationId = "" } = useParams();
    const queryClient = useQueryClient();
    const [{ search: searchQuery, statuses: statusFilters }, setFilters] = useQueryStates(
        catalogListFilterParsers,
        catalogFilterUrlOptions,
    );
    const commitSearch = useCallback((search: string) => setFilters({ search }), [setFilters]);
    const { searchInput, setSearchInput, clearSearch } = useDebouncedUrlSearch(searchQuery, commitSearch);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [draftStatusFilters, setDraftStatusFilters] = useState<string[]>([]);

    const categoriesQuery = useQuery({
        queryKey: catalogKeys.categories(organizationId),
        queryFn: () => getCategories(organizationId),
        enabled: Boolean(organizationId),
    });

    const productsQuery = useQuery({
        queryKey: catalogKeys.products(organizationId),
        queryFn: () => getProducts(organizationId),
        enabled: Boolean(organizationId),
    });

    const categories = categoriesQuery.data?.status === "success" ? categoriesQuery.data.data?.categories ?? [] : [];
    const products = productsQuery.data?.status === "success" ? productsQuery.data.data?.products ?? [] : [];

    const productsByCategoryId = useMemo(() => {
        const grouped = new Map<string, typeof products>();
        for (const product of products) {
            const existing = grouped.get(product.categoryId) ?? [];
            existing.push(product);
            grouped.set(product.categoryId, existing);
        }
        return grouped;
    }, [products]);

    const categoryOrderItems = useMemo(
        () => categories.map((category) => ({
            id: category.id,
            name: category.name,
            description: `${productsByCategoryId.get(category.id)?.length ?? 0} product${(productsByCategoryId.get(category.id)?.length ?? 0) === 1 ? "" : "s"}`,
            leading: <Tags className="size-4 shrink-0 text-primary" />,
        })),
        [categories, productsByCategoryId],
    );

    const saveCategoryOrder = async (categoryIds: string[]) => {
        const response = await reorderCategories(organizationId, { categoryIds });
        if (response.status === "success") {
            await queryClient.invalidateQueries({ queryKey: catalogKeys.categories(organizationId) });
            await queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
        }
        return response;
    };

    const filteredCategories = useMemo(() => {
        return categories.filter((category) => {
            if (statusFilters.length > 0 && !statusFilters.includes(category.status)) {
                return false;
            }
            if (!searchQuery.trim()) {
                return true;
            }
            return category.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        });
    }, [categories, searchQuery, statusFilters]);

    const toggleStatusFilter = (value: string) => {
        void setFilters((current) => ({
            statuses: current.statuses.includes(value as CatalogStatusFilter)
                ? current.statuses.filter((item) => item !== value)
                : [...current.statuses, value as CatalogStatusFilter],
        }));
    };

    const toggleDraftStatusFilter = (value: string) => {
        setDraftStatusFilters((previous) =>
            previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
        );
    };

    const resetFilters = () => {
        clearSearch();
        void setFilters({ statuses: [] });
    };

    const handleMobileFiltersOpenChange = (open: boolean) => {
        if (open) {
            setDraftStatusFilters(statusFilters);
        }
        setMobileFiltersOpen(open);
    };

    const applyMobileFilters = () => {
        void setFilters({ statuses: draftStatusFilters as CatalogStatusFilter[] });
        setMobileFiltersOpen(false);
    };

    if (categoriesQuery.isPending || productsQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (
        categoriesQuery.isError
        || productsQuery.isError
        || categoriesQuery.data?.status === "error"
        || productsQuery.data?.status === "error"
    ) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load categories</EmptyTitle>
                            <EmptyDescription>
                                {(categoriesQuery.error as { message?: string })?.message
                                    ?? (productsQuery.error as { message?: string })?.message
                                    ?? categoriesQuery.data?.message
                                    ?? productsQuery.data?.message
                                    ?? "Categories could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => {
                                    categoriesQuery.refetch();
                                    productsQuery.refetch();
                                }}
                            >
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {categories.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Tags />
                                </EmptyMedia>
                                <EmptyTitle>No categories yet</EmptyTitle>
                                <EmptyDescription>
                                    Start by creating a category like "Beverages" or "Snacks" to organize your product catalog.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertCategoryDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleMobileFiltersOpenChange(true)}
                                aria-label="Filter categories"
                                className={cn(
                                    "relative h-10 w-10 shrink-0 rounded-full border-border/60 bg-card/60 p-0 shadow-2xs sm:hidden",
                                    statusFilters.length > 0
                                        ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                        : "text-muted-foreground",
                                )}
                            >
                                <Filter className="size-4" />
                                {statusFilters.length > 0 ? (
                                    <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold leading-none text-primary-foreground ring-2 ring-card">
                                        {statusFilters.length}
                                    </span>
                                ) : null}
                            </Button>

                            <div className="relative flex-1 min-w-[180px] max-w-sm group/search">
                                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                                <Input
                                    type="text"
                                    placeholder="Search categories..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all duration-200 text-sm w-full shadow-2xs"
                                />
                                {searchInput ? (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                                        aria-label="Clear search"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                ) : null}
                            </div>

                            <Popover>
                                <PopoverTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "hidden sm:flex h-9 rounded-full bg-card border-border/50 hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 shadow-2xs items-center gap-1.5 px-3.5 text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200",
                                                statusFilters.length > 0
                                                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                                    : "text-muted-foreground",
                                            )}
                                        >
                                            <CircleCheck className={cn(
                                                "size-3.5 transition-colors",
                                                statusFilters.length > 0
                                                    ? "text-primary stroke-[2.5]"
                                                    : "text-muted-foreground/70",
                                            )} />
                                            <span>Status</span>
                                            {statusFilters.length > 0 ? (
                                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                                                    {statusFilters.length}
                                                </span>
                                            ) : null}
                                        </Button>
                                    }
                                />
                                <PopoverContent align="start" className="w-[180px] p-2 bg-card border-border/50 rounded-xl shadow-md z-50">
                                    <CategoryFilterOptions
                                        selectedValues={statusFilters}
                                        onChange={toggleStatusFilter}
                                        onClear={() => void setFilters({ statuses: [] })}
                                    />
                                </PopoverContent>
                            </Popover>

                            {statusFilters.length > 0 ? (
                                <Button
                                    variant="ghost"
                                    onClick={() => void setFilters({ statuses: [] })}
                                    className="hidden sm:flex h-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-semibold gap-1.5 px-3 shrink-0 cursor-pointer animate-in fade-in slide-in-from-left-2 duration-200"
                                >
                                    <X className="size-3.5" />
                                    <span>Clear Filters</span>
                                </Button>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <ReorderListDialog
                                title="Rearrange categories"
                                items={categoryOrderItems}
                                onSave={saveCategoryOrder}
                                trigger={
                                    <Button variant="outline" className="rounded-full h-10 px-4 text-xs sm:text-sm font-medium">
                                        <ListOrdered className="size-3.5" />
                                        Rearrange
                                    </Button>
                                }
                            />
                            <UpsertCategoryDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 sm:px-5 text-xs sm:text-sm font-medium shadow-xs shadow-primary/20">
                                        <PlusCircle className="size-3.5" />
                                        Add category
                                    </Button>
                                }
                            />
                        </div>
                    </div>

                    {filteredCategories.length > 0 && (
                        <div className="flex items-center px-1 py-0.5">
                            <span className="text-xs text-muted-foreground/70">
                                Showing {filteredCategories.length} categor{filteredCategories.length === 1 ? "y" : "ies"}
                            </span>
                        </div>
                    )}

                    {filteredCategories.length === 0 ? (
                        <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                            <p>No categories match your search or filters.</p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-4 rounded-full"
                                onClick={resetFilters}
                            >
                                Clear all filters
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredCategories.map((category) => {
                                const categoryProducts = productsByCategoryId.get(category.id) ?? [];
                                return (
                                    <Card
                                        key={category.id}
                                        className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                    >
                                        <div className="flex items-center justify-between gap-2.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                    <Tags className="size-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                        {category.name}
                                                    </h4>
                                                </div>
                                            </div>
                                            <CategoryStatusBadge status={category.status} />
                                        </div>

                                        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                                            <Badge variant="outline" className="rounded-full text-[11px] px-2.5 py-0.5">
                                                {categoryProducts.length} product{categoryProducts.length === 1 ? "" : "s"}
                                            </Badge>

                                            <div className="flex items-center gap-0.5">
                                                <Tooltip>
                                                    <TooltipTrigger render={<span className="inline-flex" />}>
                                                        <UpsertCategoryDialog
                                                            organizationId={organizationId}
                                                            category={category}
                                                            trigger={
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    aria-label={`Edit ${category.name}`}
                                                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-primary/40"
                                                                >
                                                                    <Pencil className="size-3.5" />
                                                                </Button>
                                                            }
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit category</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger render={<span className="inline-flex" />}>
                                                        <DeleteCategoryButton
                                                            organizationId={organizationId}
                                                            category={category}
                                                            trigger={
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    aria-label={`Delete ${category.name}`}
                                                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-destructive/40"
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </Button>
                                                            }
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete category</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <Sheet open={mobileFiltersOpen} onOpenChange={handleMobileFiltersOpenChange}>
                <SheetContent
                    side="bottom"
                    className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-2xl px-0 pt-4 sm:hidden"
                >
                    <SheetHeader className="shrink-0 space-y-0 px-6 pb-4 pt-0 pr-14 text-left">
                        <div className="flex items-center justify-between gap-3">
                            <SheetTitle className="text-lg">Filter categories</SheetTitle>
                            {draftStatusFilters.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setDraftStatusFilters([])}
                                    className="shrink-0 text-sm font-semibold text-primary hover:underline"
                                >
                                    Clear all
                                </button>
                            ) : (
                                <span className="invisible shrink-0 text-sm font-semibold">Clear all</span>
                            )}
                        </div>
                    </SheetHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border/50 px-6 py-4">
                        <CategoryFilterOptions
                            variant="sheet"
                            selectedValues={draftStatusFilters}
                            onChange={toggleDraftStatusFilter}
                            onClear={() => setDraftStatusFilters([])}
                        />
                    </div>

                    <SheetFooter className="shrink-0 border-t border-border/50 px-6 py-4">
                        <Button type="button" onClick={applyMobileFilters} className="w-full rounded-xl">
                            Apply filters
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default CategoriesPage;
