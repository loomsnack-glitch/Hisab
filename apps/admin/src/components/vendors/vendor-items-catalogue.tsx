import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useQueryStates } from "nuqs";
import { getUnits, getVendorItems, getVendors } from "@repo/services";
import type { UnitDTO, VendorDTO, VendorItemDTO, VendorItemListQuery, VendorItemStatus } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { Spinner } from "@repo/ui/components/spinner";
import { createTablePaginationState, DataTablePagination } from "@repo/ui/components/table-pagination";
import { cn } from "@repo/ui/lib/utils";
import { Check, CircleCheck, Filter, Package, Pencil, Plus, PlusCircle, RefreshCw, Search, Truck, X } from "lucide-react";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertVendorItemDialog from "@/components/vendors/upsert-vendor-item-dialog";
import { formatCurrency } from "@/lib/format";
import { unitKeys, vendorKeys } from "@/lib/query-keys";
import { useDebouncedUrlSearch } from "@/lib/use-debounced-url-search";
import { vendorFilterUrlOptions, vendorItemsFilterParsers } from "@/lib/vendor-query-states";

type VendorItemsCatalogueProps = {
    organizationId: string;
};

const vendorItemPaginationColumns: ColumnDef<VendorItemDTO>[] = [{ accessorKey: "id", header: "ID" }];

const STATUS_FILTER_OPTIONS: { label: string; value: VendorItemStatus }[] = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
];

const unitLabel = (units: UnitDTO[], unitId: string) => {
    const unit = units.find((candidate) => candidate.id === unitId);
    if (!unit) return "Unknown unit";
    return unit.status === "inactive" ? `${unit.name} (${unit.label}, inactive)` : `${unit.name} (${unit.label})`;
};

type VendorItemFilterOptionsProps = {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    options: ReadonlyArray<{ label: string; value: string }>;
    selectedValues: string[];
    onChange: (value: string) => void;
    onClear: () => void;
    variant?: "popover" | "sheet";
};

const VendorItemFilterOptions = ({
    label,
    icon: Icon,
    options,
    selectedValues,
    onChange,
    onClear,
    variant = "popover",
}: VendorItemFilterOptionsProps) => {
    const isSheet = variant === "sheet";

    return (
        <div className={cn("space-y-1", isSheet && "space-y-2")}>
            <div className={cn("flex items-center justify-between gap-3", isSheet ? "px-1 py-1" : "px-2 py-1")}>
                <div className="flex min-w-0 items-center gap-2">
                    {isSheet ? (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Icon className="size-4" />
                        </span>
                    ) : (
                        <Icon className="size-3.5 shrink-0 text-muted-foreground/70" />
                    )}
                    <p
                        className={cn(
                            isSheet
                                ? "text-sm font-semibold text-foreground"
                                : "text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                        )}
                    >
                        {label}
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
            {options.map((option) => {
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

const VendorItemsCatalogue = ({ organizationId }: VendorItemsCatalogueProps) => {
    const [{ search: searchQuery, statuses: statusFilters, vendorIds: vendorFilters }, setFilters] = useQueryStates(
        vendorItemsFilterParsers,
        vendorFilterUrlOptions,
    );
    const commitSearch = useCallback((search: string) => setFilters({ search }), [setFilters]);
    const { searchInput, setSearchInput, clearSearch } = useDebouncedUrlSearch(searchQuery, commitSearch);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [addItemChoiceOpen, setAddItemChoiceOpen] = useState(false);
    const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
    const [defaultVendorId, setDefaultVendorId] = useState<string | undefined>(undefined);
    const [draftStatusFilters, setDraftStatusFilters] = useState<VendorItemStatus[]>(["active"]);
    const [draftVendorFilters, setDraftVendorFilters] = useState<string[]>([]);
    const [pagination, setPagination] = useState(createTablePaginationState);
    const deferredSearch = useDeferredValue(searchQuery.trim());
    const currentPage = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;

    const itemFilterParams = useMemo(
        () => ({
            search: deferredSearch || undefined,
            statuses: statusFilters.length > 0 ? statusFilters : undefined,
            vendorIds: vendorFilters.length > 0 ? vendorFilters : undefined,
        }),
        [deferredSearch, statusFilters, vendorFilters],
    );

    const pagedItemQueryParams = useMemo<VendorItemListQuery>(
        () => ({
            ...itemFilterParams,
            page: currentPage,
            limit: pageSize,
        }),
        [currentPage, itemFilterParams, pageSize],
    );

    const vendorsQuery = useQuery({
        queryKey: vendorKeys.list(organizationId),
        queryFn: () => getVendors(organizationId),
        enabled: Boolean(organizationId),
    });
    const itemsQuery = useQuery({
        queryKey: vendorKeys.pagedItems(organizationId, pagedItemQueryParams),
        queryFn: async () => {
            const response = await getVendorItems(organizationId, pagedItemQueryParams);
            if (response.status === "error") {
                throw new Error(response.message || "Vendor Items could not be loaded right now.");
            }
            return response;
        },
        enabled: Boolean(organizationId),
        placeholderData: keepPreviousData,
    });
    const unitsQuery = useQuery({
        queryKey: unitKeys.list(organizationId),
        queryFn: () => getUnits(organizationId),
        enabled: Boolean(organizationId),
    });

    const vendors = vendorsQuery.data?.status === "success" ? vendorsQuery.data.data?.vendors ?? [] : [];
    const pagedItemData = itemsQuery.data?.status === "success" ? itemsQuery.data.data : null;
    const vendorItems = pagedItemData?.vendorItems ?? [];
    const units = unitsQuery.data?.status === "success" ? unitsQuery.data.data?.units ?? [] : [];
    const totalItemCount = pagedItemData?.pageInfo?.totalCount ?? 0;
    const pageCount = pagedItemData?.pageInfo?.totalPages ?? Math.max(1, Math.ceil(totalItemCount / pageSize));

    const vendorById = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);
    const vendorFilterOptions = useMemo(
        () =>
            vendors.map((vendor) => ({
                label: vendor.status === "inactive" ? `${vendor.name} (inactive)` : vendor.name,
                value: vendor.id,
            })),
        [vendors],
    );

    const itemsTable = useReactTable({
        data: vendorItems,
        columns: vendorItemPaginationColumns,
        pageCount,
        state: { pagination },
        onPaginationChange: setPagination,
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
        autoResetPageIndex: false,
    });

    const activeFilterCount = statusFilters.length + vendorFilters.length;
    const draftFilterCount = draftStatusFilters.length + draftVendorFilters.length;
    const hasCustomFilters =
        Boolean(searchQuery.trim())
        || vendorFilters.length > 0
        || statusFilters.length !== 1
        || statusFilters[0] !== "active";
    const hasActiveFilters = Boolean(searchQuery.trim()) || activeFilterCount > 0;

    const toggleStatusFilter = (value: string) => {
        void setFilters((current) => ({
            statuses: current.statuses.includes(value as VendorItemStatus)
                ? current.statuses.filter((item) => item !== value)
                : [...current.statuses, value as VendorItemStatus],
        }));
    };

    const toggleDraftStatusFilter = (value: string) => {
        setDraftStatusFilters((previous) =>
            previous.includes(value as VendorItemStatus)
                ? previous.filter((item) => item !== value)
                : [...previous, value as VendorItemStatus],
        );
    };

    const toggleVendorFilter = (value: string) => {
        void setFilters((current) => ({
            vendorIds: current.vendorIds.includes(value)
                ? current.vendorIds.filter((item) => item !== value)
                : [...current.vendorIds, value],
        }));
    };

    const toggleDraftVendorFilter = (value: string) => {
        setDraftVendorFilters((previous) =>
            previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
        );
    };

    const clearAllFilters = () => {
        void setFilters({ statuses: [], vendorIds: [] });
    };

    const handleMobileFiltersOpenChange = (open: boolean) => {
        if (open) {
            setDraftStatusFilters(statusFilters);
            setDraftVendorFilters(vendorFilters);
        }
        setMobileFiltersOpen(open);
    };

    const applyMobileFilters = () => {
        void setFilters({
            statuses: draftStatusFilters,
            vendorIds: draftVendorFilters,
        });
        setMobileFiltersOpen(false);
    };

    useEffect(() => {
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    }, [itemFilterParams]);

    useEffect(() => {
        if (!pagedItemData?.pageInfo?.totalPages) return;
        if (pagination.pageIndex + 1 > pagedItemData.pageInfo.totalPages) {
            setPagination((previous) => ({
                ...previous,
                pageIndex: Math.max(0, pagedItemData.pageInfo.totalPages - 1),
            }));
        }
    }, [pagination.pageIndex, pagedItemData?.pageInfo?.totalPages]);

    const filteredVendor = vendorFilters.length === 1 ? vendorById.get(vendorFilters[0] ?? "") : undefined;

    const openAddItemDialog = (vendorId?: string) => {
        setDefaultVendorId(vendorId);
        setAddItemDialogOpen(true);
    };

    const handleAddItemClick = () => {
        if (filteredVendor) {
            setAddItemChoiceOpen(true);
            return;
        }
        openAddItemDialog();
    };

    const addItemOverlays = (
        <>
            <Sheet open={addItemChoiceOpen} onOpenChange={setAddItemChoiceOpen}>
                <SheetContent
                    side="bottom"
                    showCloseButton={false}
                    className="mx-auto w-full max-w-md gap-0 overflow-visible border-0 bg-transparent px-4 pt-2 shadow-none data-[side=bottom]:bottom-[var(--pos-mobile-nav-height,0px)] data-[side=bottom]:border-0 data-[side=bottom]:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
                >
                    <div className="space-y-2 pb-2" data-testid="vendor-item-add-choice">
                        {filteredVendor ? (
                            <button
                                type="button"
                                aria-label={`Add item to ${filteredVendor.name}`}
                                onClick={() => {
                                    setAddItemChoiceOpen(false);
                                    openAddItemDialog(filteredVendor.id);
                                }}
                                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left shadow-md transition-colors hover:bg-card/95"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Truck className="size-5" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-foreground">{filteredVendor.name}</span>
                                    <span className="block text-xs font-medium text-muted-foreground">Add an item to this vendor</span>
                                </span>
                            </button>
                        ) : null}
                        <button
                            type="button"
                            aria-label="Add item to another vendor"
                            onClick={() => {
                                setAddItemChoiceOpen(false);
                                openAddItemDialog();
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left shadow-md transition-colors hover:bg-card/95"
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground">
                                <PlusCircle className="size-5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-foreground">Another vendor</span>
                                <span className="block text-xs font-medium text-muted-foreground">Choose a different vendor</span>
                            </span>
                        </button>
                    </div>
                </SheetContent>
            </Sheet>

            <UpsertVendorItemDialog
                organizationId={organizationId}
                vendors={vendors}
                units={units}
                defaultVendorId={defaultVendorId}
                open={addItemDialogOpen}
                onOpenChange={(open) => {
                    setAddItemDialogOpen(open);
                    if (!open) {
                        setDefaultVendorId(undefined);
                    }
                }}
                trigger={null}
            />
        </>
    );

    const isBootstrapping =
        (vendorsQuery.isPending && !vendorsQuery.data)
        || (itemsQuery.isPending && !itemsQuery.data)
        || (unitsQuery.isPending && !unitsQuery.data);

    if (isBootstrapping) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    const hasError =
        vendorsQuery.isError
        || itemsQuery.isError
        || unitsQuery.isError
        || vendorsQuery.data?.status === "error"
        || itemsQuery.data?.status === "error"
        || unitsQuery.data?.status === "error";

    if (hasError && itemsQuery.data?.status !== "success") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load vendor items</EmptyTitle>
                            <EmptyDescription>
                                {(itemsQuery.error as { message?: string })?.message
                                    ?? (vendorsQuery.error as { message?: string })?.message
                                    ?? (unitsQuery.error as { message?: string })?.message
                                    ?? itemsQuery.data?.message
                                    ?? vendorsQuery.data?.message
                                    ?? unitsQuery.data?.message
                                    ?? "Vendor Items could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => {
                                    vendorsQuery.refetch();
                                    itemsQuery.refetch();
                                    unitsQuery.refetch();
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

    if (totalItemCount === 0 && !hasCustomFilters) {
        return (
            <>
            <Card className="border-border/60 bg-card/80 shadow-md">
                <CardContent className="pt-6">
                    <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Package />
                            </EmptyMedia>
                            <EmptyTitle>No vendor items yet</EmptyTitle>
                            <EmptyDescription>
                                {vendors.length === 0
                                    ? "Add a Vendor first, then record the goods it offers."
                                    : "Add a Vendor Item with its Unit and default purchase price."}
                            </EmptyDescription>
                        </EmptyHeader>
                        {vendors.length > 0 ? (
                            <EmptyContent>
                                <Button
                                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={handleAddItemClick}
                                >
                                    <PlusCircle className="size-3.5" />
                                    Add item
                                </Button>
                            </EmptyContent>
                        ) : null}
                    </Empty>
                </CardContent>
            </Card>
            {addItemOverlays}
            </>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" data-testid="vendor-items-catalogue">
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleMobileFiltersOpenChange(true)}
                        aria-label="Filter items"
                        className={cn(
                            "relative h-10 w-10 shrink-0 rounded-full border-border/60 bg-card/60 p-0 shadow-2xs sm:hidden",
                            activeFilterCount > 0
                                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                : "text-muted-foreground",
                        )}
                    >
                        <Filter className="size-4" />
                        {activeFilterCount > 0 ? (
                            <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold leading-none text-primary-foreground ring-2 ring-card">
                                {activeFilterCount}
                            </span>
                        ) : null}
                    </Button>

                    <div className="relative flex-1 min-w-[180px] max-w-sm group/search">
                        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                        <Input
                            type="text"
                            placeholder="Search items..."
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-all duration-200 text-sm w-full shadow-2xs"
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

                    <Button
                        type="button"
                        aria-label="Add item"
                        className="h-10 w-10 shrink-0 rounded-full bg-primary p-0 text-primary-foreground shadow-xs shadow-primary/20 hover:bg-primary/90 sm:hidden"
                        onClick={handleAddItemClick}
                    >
                        <Plus className="size-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger
                            render={
                                <Button
                                    variant="outline"
                                    aria-label="Item status"
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
                            <VendorItemFilterOptions
                                label="Status"
                                icon={CircleCheck}
                                options={STATUS_FILTER_OPTIONS}
                                selectedValues={statusFilters}
                                onChange={toggleStatusFilter}
                                onClear={() => void setFilters({ statuses: [] })}
                            />
                        </PopoverContent>
                    </Popover>

                    <Popover>
                        <PopoverTrigger
                            render={
                                <Button
                                    variant="outline"
                                    aria-label="Vendor"
                                    className={cn(
                                        "hidden sm:flex h-9 rounded-full bg-card border-border/50 hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 shadow-2xs items-center gap-1.5 px-3.5 text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200",
                                        vendorFilters.length > 0
                                            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    <Truck className={cn(
                                        "size-3.5 transition-colors",
                                        vendorFilters.length > 0
                                            ? "text-primary stroke-[2.5]"
                                            : "text-muted-foreground/70",
                                    )} />
                                    <span>Vendor</span>
                                    {vendorFilters.length > 0 ? (
                                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                                            {vendorFilters.length}
                                        </span>
                                    ) : null}
                                </Button>
                            }
                        />
                        <PopoverContent align="start" className="w-[220px] p-2 bg-card border-border/50 rounded-xl shadow-md z-50">
                            <VendorItemFilterOptions
                                label="Vendor"
                                icon={Truck}
                                options={vendorFilterOptions}
                                selectedValues={vendorFilters}
                                onChange={toggleVendorFilter}
                                onClear={() => void setFilters({ vendorIds: [] })}
                            />
                        </PopoverContent>
                    </Popover>

                    {activeFilterCount > 0 ? (
                        <Button
                            variant="ghost"
                            onClick={clearAllFilters}
                            className="hidden sm:flex h-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-semibold gap-1.5 px-3 shrink-0 cursor-pointer animate-in fade-in slide-in-from-left-2 duration-200"
                        >
                            <X className="size-3.5" />
                            <span>Clear Filters</span>
                        </Button>
                    ) : null}
                </div>

                <div className="hidden sm:flex flex-wrap items-center gap-2">
                    <Button
                        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 sm:px-5 text-xs sm:text-sm font-medium shadow-xs shadow-primary/20"
                        onClick={handleAddItemClick}
                    >
                        <PlusCircle className="size-4" />
                        Add item
                    </Button>
                </div>
            </div>

            {totalItemCount === 0 ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card p-6 text-center">
                    <Package className="size-8 text-muted-foreground/50" />
                    <p className="mt-3 font-medium">No vendor items found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {hasActiveFilters ? "Try a different search or filter." : "Add a Vendor Item with its Unit and default purchase price."}
                    </p>
                    {hasActiveFilters ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4 rounded-full"
                            onClick={() => {
                                clearSearch();
                                void setFilters({ statuses: [], vendorIds: [] });
                            }}
                        >
                            Clear all filters
                        </Button>
                    ) : null}
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card md:flex">
                        <div className="min-h-0 flex-1 overflow-auto">
                            <table className="min-w-[860px] w-full text-left text-sm">
                                <thead className="sticky top-0 z-10 border-b border-border/50 bg-card/90 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-md">
                                    <tr>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Vendor</th>
                                        <th className="px-4 py-3">Unit</th>
                                        <th className="px-4 py-3">Price</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {vendorItems.map((item) => (
                                        <VendorItemTableRow
                                            key={item.id}
                                            item={item}
                                            vendor={vendorById.get(item.vendorId)}
                                            organizationId={organizationId}
                                            vendors={vendors}
                                            units={units}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <DataTablePagination
                            table={itemsTable}
                            count={totalItemCount}
                            countLabel="items"
                            className="shrink-0 border-t border-border/40 bg-card/90 px-4 pt-3.5 backdrop-blur-md"
                        />
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
                        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-auto">
                            {vendorItems.map((item) => (
                                <VendorItemCard
                                    key={item.id}
                                    item={item}
                                    vendor={vendorById.get(item.vendorId)}
                                    organizationId={organizationId}
                                    vendors={vendors}
                                    units={units}
                                />
                            ))}
                        </div>

                        <DataTablePagination
                            table={itemsTable}
                            count={totalItemCount}
                            countLabel="items"
                            className="shrink-0 px-0 pb-0 pt-2"
                        />
                    </div>
                </div>
            )}

            <Sheet open={mobileFiltersOpen} onOpenChange={handleMobileFiltersOpenChange}>
                <SheetContent
                    side="bottom"
                    className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-2xl px-0 pt-4 sm:hidden"
                >
                    <SheetHeader className="shrink-0 space-y-0 px-6 pb-4 pt-0 pr-14 text-left">
                        <div className="flex items-center justify-between gap-3">
                            <SheetTitle className="text-lg">Filter items</SheetTitle>
                            {draftFilterCount > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDraftStatusFilters([]);
                                        setDraftVendorFilters([]);
                                    }}
                                    className="shrink-0 text-sm font-semibold text-primary hover:underline"
                                >
                                    Clear all
                                </button>
                            ) : (
                                <span className="invisible shrink-0 text-sm font-semibold">Clear all</span>
                            )}
                        </div>
                    </SheetHeader>

                    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain border-t border-border/50 px-6 py-4">
                        <VendorItemFilterOptions
                            variant="sheet"
                            label="Vendor"
                            icon={Truck}
                            options={vendorFilterOptions}
                            selectedValues={draftVendorFilters}
                            onChange={toggleDraftVendorFilter}
                            onClear={() => setDraftVendorFilters([])}
                        />
                        <VendorItemFilterOptions
                            variant="sheet"
                            label="Status"
                            icon={CircleCheck}
                            options={STATUS_FILTER_OPTIONS}
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

            {addItemOverlays}
        </div>
    );
};

type VendorItemRowProps = {
    item: VendorItemDTO;
    vendor?: VendorDTO;
    organizationId: string;
    vendors: VendorDTO[];
    units: UnitDTO[];
};

const VendorItemTableRow = ({ item, vendor, organizationId, vendors, units }: VendorItemRowProps) => (
    <tr className="hover:bg-muted/20">
        <td className="px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="size-3.5" />
                </div>
                <p className="truncate font-semibold">{item.name}</p>
            </div>
        </td>
        <td className="px-4 py-3">
            <div className="min-w-0">
                <p className="truncate font-medium">{vendor?.name ?? "Unknown vendor"}</p>
                {vendor?.status === "inactive" ? (
                    <p className="truncate text-xs text-muted-foreground">Inactive vendor</p>
                ) : null}
            </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{unitLabel(units, item.unitId)}</td>
        <td className="px-4 py-3 font-semibold">{formatCurrency(item.defaultPurchasePrice)}</td>
        <td className="px-4 py-3">
            <ProductStatusBadge status={item.status} />
        </td>
        <td className="px-4 py-3">
            <div className="flex items-center justify-end">
                <UpsertVendorItemDialog
                    organizationId={organizationId}
                    vendors={vendors}
                    units={units}
                    vendorItem={item}
                    trigger={
                        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${item.name}`}>
                            <Pencil className="size-4" />
                        </Button>
                    }
                />
            </div>
        </td>
    </tr>
);

const VendorItemCard = ({ item, vendor, organizationId, vendors, units }: VendorItemRowProps) => (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Package className="size-4" />
                </div>
                <div className="min-w-0">
                    <p className="truncate font-semibold">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{vendor?.name ?? "Unknown vendor"}</p>
                </div>
            </div>
            <ProductStatusBadge status={item.status} />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
            <div>
                <p className="text-sm font-semibold">{formatCurrency(item.defaultPurchasePrice)}</p>
                <p className="text-[11px] text-muted-foreground">{unitLabel(units, item.unitId)}</p>
            </div>
            <UpsertVendorItemDialog
                organizationId={organizationId}
                vendors={vendors}
                units={units}
                vendorItem={item}
                trigger={
                    <Button variant="outline" size="sm" className="rounded-full h-8 text-xs px-3">
                        <Pencil className="size-3" />
                        Edit
                    </Button>
                }
            />
        </div>
    </div>
);

export default VendorItemsCatalogue;
