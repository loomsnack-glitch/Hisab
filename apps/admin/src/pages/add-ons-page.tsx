import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useParams } from "react-router-dom";
import { deleteAddOn, getAddOns } from "@repo/services";
import type { AddOnDTO } from "@repo/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { Spinner } from "@repo/ui/components/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { Check, CircleCheck, Filter, Pencil, PlusCircle, Puzzle, RefreshCw, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PriceDisplay } from "@repo/ui/components/price-display";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertAddOnDialog from "@/components/catalog/upsert-add-on-dialog";
import {
    catalogFilterUrlOptions,
    catalogListFilterParsers,
    type CatalogStatusFilter,
} from "@/lib/catalog-query-states";
import { catalogKeys } from "@/lib/query-keys";
import { useDebouncedUrlSearch } from "@/lib/use-debounced-url-search";

const DeleteAddOnButton = ({
    organizationId,
    addOn,
    trigger,
}: {
    organizationId: string;
    addOn: AddOnDTO;
    trigger?: React.ReactElement;
}) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => deleteAddOn(organizationId, addOn.id),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: catalogKeys.addOns(organizationId) });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to delete add-on");
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger
                render={
                    trigger ?? (
                        <Button variant="destructive" size="sm" className="rounded-full h-8 text-xs px-3">
                            <Trash2 className="size-3" />
                            Delete
                        </Button>
                    )
                }
            />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia>
                        <Trash2 />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Delete add-on</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="font-medium text-foreground">{addOn.name}</span> will be removed. This only
                        works if it is not attached to any products. Prefer setting status to inactive once it has been
                        used.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        className="rounded-xl"
                        isLoading={mutation.isPending}
                        loadingText="Deleting..."
                        onClick={() => mutation.mutate()}
                    >
                        Delete add-on
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const STATUS_FILTER_OPTIONS = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
] as const;

type AddOnFilterOptionsProps = {
    selectedValues: string[];
    onChange: (value: string) => void;
    onClear: () => void;
    variant?: "popover" | "sheet";
};

const AddOnFilterOptions = ({
    selectedValues,
    onChange,
    onClear,
    variant = "popover",
}: AddOnFilterOptionsProps) => {
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

const AddOnsPage = () => {
    const { organizationId = "" } = useParams();
    const [{ search: searchQuery, statuses: statusFilters }, setFilters] = useQueryStates(
        catalogListFilterParsers,
        catalogFilterUrlOptions,
    );
    const commitSearch = useCallback((search: string) => setFilters({ search }), [setFilters]);
    const { searchInput, setSearchInput, clearSearch } = useDebouncedUrlSearch(searchQuery, commitSearch);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [draftStatusFilters, setDraftStatusFilters] = useState<string[]>([]);

    const addOnsQuery = useQuery({
        queryKey: catalogKeys.addOns(organizationId),
        queryFn: () => getAddOns(organizationId),
        enabled: Boolean(organizationId),
    });

    const addOns = addOnsQuery.data?.status === "success" ? addOnsQuery.data.data?.addOns ?? [] : [];

    const filteredAddOns = useMemo(() => {
        return addOns.filter((addOn) => {
            if (statusFilters.length > 0 && !statusFilters.includes(addOn.status)) {
                return false;
            }
            if (!searchQuery.trim()) {
                return true;
            }
            return addOn.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        });
    }, [addOns, searchQuery, statusFilters]);

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

    if (addOnsQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (addOnsQuery.isError || addOnsQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load add-ons</EmptyTitle>
                            <EmptyDescription>
                                {(addOnsQuery.error as { message?: string })?.message
                                    ?? addOnsQuery.data?.message
                                    ?? "Add-ons could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => addOnsQuery.refetch()}
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
            {addOns.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Puzzle />
                                </EmptyMedia>
                                <EmptyTitle>No add-ons yet</EmptyTitle>
                                <EmptyDescription>
                                    Create reusable extras like Extra Cheese or Mayo, then attach them to products.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertAddOnDialog organizationId={organizationId} />
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
                                aria-label="Filter add-ons"
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
                                    placeholder="Search add-ons..."
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
                                    <AddOnFilterOptions
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

                        <UpsertAddOnDialog
                            organizationId={organizationId}
                            trigger={
                                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 sm:px-5 text-xs sm:text-sm font-medium shadow-xs shadow-primary/20">
                                    <PlusCircle className="size-3.5" />
                                    Add add-on
                                </Button>
                            }
                        />
                    </div>

                    {filteredAddOns.length > 0 && (
                        <div className="flex items-center px-1 py-0.5">
                            <span className="text-xs text-muted-foreground/70">
                                Showing {filteredAddOns.length} add-on{filteredAddOns.length === 1 ? "" : "s"}
                            </span>
                        </div>
                    )}

                    {filteredAddOns.length === 0 ? (
                        <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                            <p>No add-ons match your search or filters.</p>
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
                            {filteredAddOns.map((addOn) => (
                                <Card
                                    key={addOn.id}
                                    className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                >
                                    <div className="flex items-center justify-between gap-2.5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <Puzzle className="size-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                    {addOn.name}
                                                </h4>
                                            </div>
                                        </div>
                                        <ProductStatusBadge status={addOn.status} />
                                    </div>

                                    <div className="mt-3 flex items-end justify-between gap-2 border-t border-border/40 pt-2.5">
                                        <div className="flex min-w-0 flex-col items-start gap-0.5">
                                            <PriceDisplay
                                                price={addOn.price}
                                                discount={addOn.discount}
                                                size="sm"
                                                align="left"
                                                singleTone="foreground"
                                                compact
                                            />
                                        </div>

                                        <div className="flex items-center gap-0.5">
                                            <Tooltip>
                                                <TooltipTrigger render={<span className="inline-flex" />}>
                                                    <UpsertAddOnDialog
                                                        organizationId={organizationId}
                                                        addOn={addOn}
                                                        trigger={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={`Edit ${addOn.name}`}
                                                                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-primary/40"
                                                            >
                                                                <Pencil className="size-3.5" />
                                                            </Button>
                                                        }
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent>Edit add-on</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger render={<span className="inline-flex" />}>
                                                    <DeleteAddOnButton
                                                        organizationId={organizationId}
                                                        addOn={addOn}
                                                        trigger={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={`Delete ${addOn.name}`}
                                                                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-destructive/40"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        }
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent>Delete add-on</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </Card>
                            ))}
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
                            <SheetTitle className="text-lg">Filter add-ons</SheetTitle>
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
                        <AddOnFilterOptions
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

export default AddOnsPage;
