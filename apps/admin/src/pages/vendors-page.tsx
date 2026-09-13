import { useCallback, useEffect, useDeferredValue, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { Link, Navigate, Outlet, useLocation, useParams, useSearchParams } from "react-router-dom";
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { getPurchases, getVendorItems, getVendors } from "@repo/services";
import type { VendorDTO, VendorListQuery, VendorStatus } from "@repo/types";
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
import UpsertVendorDialog from "@/components/vendors/upsert-vendor-dialog";
import VendorItemsCatalogue from "@/components/vendors/vendor-items-catalogue";
import { formatCurrency } from "@/lib/format";
import { purchaseKeys, vendorKeys } from "@/lib/query-keys";
import { useDebouncedUrlSearch } from "@/lib/use-debounced-url-search";
import { getVendorItemsHref, vendorFilterUrlOptions, vendorListFilterParsers } from "@/lib/vendor-query-states";
import { adminWorkspacePageHeightClass } from "@/lib/workspace-page-layout";

const STATUS_FILTER_OPTIONS = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
] as const;

const vendorTabs = [
    { label: "Vendors", path: "list", icon: Truck },
    { label: "Items", path: "items", icon: Package },
] as const;

const vendorPaginationColumns: ColumnDef<VendorDTO>[] = [{ accessorKey: "id", header: "ID" }];

type VendorFilterOptionsProps = {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    options: ReadonlyArray<{ label: string; value: string }>;
    selectedValues: string[];
    onChange: (value: string) => void;
    onClear: () => void;
    variant?: "popover" | "sheet";
};

const VendorFilterOptions = ({
    label,
    icon: Icon,
    options,
    selectedValues,
    onChange,
    onClear,
    variant = "popover",
}: VendorFilterOptionsProps) => {
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

const VendorsDirectory = ({ organizationId }: { organizationId: string }) => {
    const [{ search: searchQuery, statuses: statusFilters }, setFilters] = useQueryStates(
        vendorListFilterParsers,
        vendorFilterUrlOptions,
    );
    const commitSearch = useCallback((search: string) => setFilters({ search }), [setFilters]);
    const { searchInput, setSearchInput, clearSearch } = useDebouncedUrlSearch(searchQuery, commitSearch);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [draftStatusFilters, setDraftStatusFilters] = useState<string[]>([]);
    const [pagination, setPagination] = useState(createTablePaginationState);
    const deferredSearch = useDeferredValue(searchQuery.trim());
    const currentPage = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;

    const vendorFilterParams = useMemo(
        () => ({
            search: deferredSearch || undefined,
            statuses: statusFilters.length > 0 ? (statusFilters as VendorStatus[]) : undefined,
        }),
        [deferredSearch, statusFilters],
    );

    const pagedVendorQueryParams = useMemo<VendorListQuery>(
        () => ({
            ...vendorFilterParams,
            page: currentPage,
            limit: pageSize,
        }),
        [currentPage, pageSize, vendorFilterParams],
    );

    const vendorsQuery = useQuery({
        queryKey: vendorKeys.paged(organizationId, pagedVendorQueryParams),
        queryFn: async () => {
            const response = await getVendors(organizationId, pagedVendorQueryParams);
            if (response.status === "error") {
                throw new Error(response.message || "Vendors could not be loaded right now.");
            }
            return response;
        },
        enabled: Boolean(organizationId),
        placeholderData: keepPreviousData,
    });
    const purchasesQuery = useQuery({
        queryKey: purchaseKeys.list(organizationId),
        queryFn: () => getPurchases(organizationId),
        enabled: Boolean(organizationId),
    });
    const vendorItemsQuery = useQuery({
        queryKey: vendorKeys.items(organizationId),
        queryFn: () => getVendorItems(organizationId),
        enabled: Boolean(organizationId),
    });

    const pagedVendorData = vendorsQuery.data?.status === "success" ? vendorsQuery.data.data : null;
    const vendors = pagedVendorData?.vendors ?? [];
    const totalVendorCount = pagedVendorData?.pageInfo?.totalCount ?? 0;
    const pageCount = pagedVendorData?.pageInfo?.totalPages ?? Math.max(1, Math.ceil(totalVendorCount / pageSize));
    const outstandingByVendorId = useMemo(() => {
        const outstanding =
            purchasesQuery.data?.status === "success"
                ? purchasesQuery.data.data?.vendorOutstanding ?? []
                : [];
        return new Map(outstanding.map((entry) => [entry.vendorId, entry.outstandingAmount]));
    }, [purchasesQuery.data]);
    const itemCountByVendorId = useMemo(() => {
        const vendorItems =
            vendorItemsQuery.data?.status === "success"
                ? vendorItemsQuery.data.data?.vendorItems ?? []
                : [];
        const counts = new Map<string, number>();
        for (const item of vendorItems) {
            counts.set(item.vendorId, (counts.get(item.vendorId) ?? 0) + 1);
        }
        return counts;
    }, [vendorItemsQuery.data]);

    const vendorsTable = useReactTable({
        data: vendors,
        columns: vendorPaginationColumns,
        pageCount,
        state: { pagination },
        onPaginationChange: setPagination,
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
        autoResetPageIndex: false,
    });

    const activeFilterCount = statusFilters.length;
    const draftFilterCount = draftStatusFilters.length;
    const hasCustomFilters =
        Boolean(searchQuery.trim())
        || statusFilters.length !== 1
        || statusFilters[0] !== "active";
    const isLoading = vendorsQuery.isPending && !vendorsQuery.data;
    const hasError = vendorsQuery.isError || vendorsQuery.data?.status === "error";

    useEffect(() => {
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    }, [vendorFilterParams]);

    useEffect(() => {
        if (!pagedVendorData?.pageInfo?.totalPages) return;
        if (pagination.pageIndex + 1 > pagedVendorData.pageInfo.totalPages) {
            setPagination((previous) => ({
                ...previous,
                pageIndex: Math.max(0, pagedVendorData.pageInfo.totalPages - 1),
            }));
        }
    }, [pagination.pageIndex, pagedVendorData?.pageInfo?.totalPages]);

    const toggleStatusFilter = (value: string) => {
        void setFilters((current) => ({
            statuses: current.statuses.includes(value as VendorStatus)
                ? current.statuses.filter((item) => item !== value)
                : [...current.statuses, value as VendorStatus],
        }));
    };

    const toggleDraftStatusFilter = (value: string) => {
        setDraftStatusFilters((previous) =>
            previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
        );
    };

    const clearAllFilters = () => {
        void setFilters({ statuses: [] });
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
        void setFilters({ statuses: draftStatusFilters as VendorStatus[] });
        setMobileFiltersOpen(false);
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleMobileFiltersOpenChange(true)}
                        aria-label="Filter vendors"
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
                            placeholder="Search vendors..."
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

                    <UpsertVendorDialog
                        organizationId={organizationId}
                        trigger={
                            <Button
                                type="button"
                                aria-label="Add vendor"
                                className="h-10 w-10 shrink-0 rounded-full bg-primary p-0 text-primary-foreground shadow-xs shadow-primary/20 hover:bg-primary/90 sm:hidden"
                            >
                                <Plus className="size-4" />
                            </Button>
                        }
                    />

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
                            <VendorFilterOptions
                                label="Status"
                                icon={CircleCheck}
                                options={STATUS_FILTER_OPTIONS}
                                selectedValues={statusFilters}
                                onChange={toggleStatusFilter}
                                onClear={() => void setFilters({ statuses: [] })}
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
                    <UpsertVendorDialog
                        organizationId={organizationId}
                        trigger={
                            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 sm:px-5 text-xs sm:text-sm font-medium shadow-xs shadow-primary/20">
                                <PlusCircle className="size-4" />
                                Add vendor
                            </Button>
                        }
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-border/70 bg-card">
                    <Spinner className="size-6 text-primary" />
                </div>
            ) : hasError ? (
                <Card className="min-h-0 flex-1 border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardContent className="p-0">
                        <Empty className="rounded-2xl border-0">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <RefreshCw />
                                </EmptyMedia>
                                <EmptyTitle>Unable to load vendors</EmptyTitle>
                                <EmptyDescription>
                                    {(vendorsQuery.error as { message?: string })?.message
                                        ?? vendorsQuery.data?.message
                                        ?? "Vendors could not be loaded right now."}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button
                                    variant="outline"
                                    className="rounded-full"
                                    onClick={() => void vendorsQuery.refetch()}
                                >
                                    Try again
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : vendors.length === 0 ? (
                hasCustomFilters ? (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card p-6 text-center">
                        <Truck className="size-8 text-muted-foreground/50" />
                        <p className="mt-3 font-medium">No vendors found</p>
                        <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4 rounded-full"
                            onClick={resetFilters}
                        >
                            Clear all filters
                        </Button>
                    </div>
                ) : (
                    <Card className="min-h-0 flex-1 border-border/60 bg-card/80 shadow-md">
                        <CardContent className="flex h-full flex-col justify-center pt-6">
                            <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Truck />
                                    </EmptyMedia>
                                    <EmptyTitle>No vendors yet</EmptyTitle>
                                    <EmptyDescription>
                                        Add a Vendor your Organization buys goods from.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <UpsertVendorDialog organizationId={organizationId} />
                                </EmptyContent>
                            </Empty>
                        </CardContent>
                    </Card>
                )
            ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card md:flex">
                        <div className="min-h-0 flex-1 overflow-auto">
                            <table className="min-w-[760px] w-full text-left text-sm">
                                <thead className="sticky top-0 z-10 border-b border-border/50 bg-card/90 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-md">
                                    <tr>
                                        <th className="px-4 py-3">Vendor</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Outstanding</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {vendors.map((vendor) => (
                                        <VendorTableRow
                                            key={vendor.id}
                                            vendor={vendor}
                                            organizationId={organizationId}
                                            outstandingAmount={outstandingByVendorId.get(vendor.id) ?? 0}
                                            itemCount={itemCountByVendorId.get(vendor.id) ?? 0}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <DataTablePagination
                            table={vendorsTable}
                            count={totalVendorCount}
                            countLabel="vendors"
                            className="shrink-0 border-t border-border/40 bg-card/90 px-4 pt-3.5 backdrop-blur-md"
                        />
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
                        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-auto">
                            {vendors.map((vendor) => (
                                <VendorCard
                                    key={vendor.id}
                                    vendor={vendor}
                                    organizationId={organizationId}
                                    outstandingAmount={outstandingByVendorId.get(vendor.id) ?? 0}
                                    itemCount={itemCountByVendorId.get(vendor.id) ?? 0}
                                />
                            ))}
                        </div>

                        <DataTablePagination
                            table={vendorsTable}
                            count={totalVendorCount}
                            countLabel="vendors"
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
                            <SheetTitle className="text-lg">Filter vendors</SheetTitle>
                            {draftFilterCount > 0 ? (
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
                        <VendorFilterOptions
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
        </div>
    );
};

type VendorRowProps = {
    vendor: VendorDTO;
    organizationId: string;
    outstandingAmount: number;
    itemCount: number;
};

const formatVendorItemCount = (count: number) => (count > 99 ? "99+" : String(count));

const VendorItemsIcon = ({ count }: { count: number }) => (
    <span className="relative inline-flex">
        <Package className="size-4" />
        {count > 0 ? (
            <span
                className="absolute -right-2.5 -top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
                aria-hidden="true"
            >
                {formatVendorItemCount(count)}
            </span>
        ) : null}
    </span>
);

const vendorItemsAriaLabel = (vendorName: string, itemCount: number) =>
    itemCount > 0
        ? `View ${itemCount} item${itemCount === 1 ? "" : "s"} for ${vendorName}`
        : `View items for ${vendorName}`;

const VendorTableRow = ({ vendor, organizationId, outstandingAmount, itemCount }: VendorRowProps) => (
    <tr className="hover:bg-muted/20">
        <td className="px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Truck className="size-3.5" />
                </div>
                <div className="min-w-0">
                    <p className="truncate font-semibold">{vendor.name}</p>
                    {vendor.description ? (
                        <p className="truncate text-xs text-muted-foreground">{vendor.description}</p>
                    ) : null}
                </div>
            </div>
        </td>
        <td className="px-4 py-3">
            <ProductStatusBadge status={vendor.status} />
        </td>
        <td className="px-4 py-3 font-semibold">{formatCurrency(outstandingAmount)}</td>
        <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-1">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={vendorItemsAriaLabel(vendor.name, itemCount)}
                    render={<Link to={getVendorItemsHref(organizationId, vendor.id)} />}
                >
                    <VendorItemsIcon count={itemCount} />
                </Button>
                <UpsertVendorDialog
                    organizationId={organizationId}
                    vendor={vendor}
                    trigger={
                        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${vendor.name}`}>
                            <Pencil className="size-4" />
                        </Button>
                    }
                />
            </div>
        </td>
    </tr>
);

const VendorCard = ({ vendor, organizationId, outstandingAmount, itemCount }: VendorRowProps) => (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Truck className="size-4" />
                </div>
                <div className="min-w-0">
                    <p className="truncate font-semibold">{vendor.name}</p>
                    {vendor.description ? (
                        <p className="truncate text-xs text-muted-foreground">{vendor.description}</p>
                    ) : null}
                </div>
            </div>
            <ProductStatusBadge status={vendor.status} />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
            <p className="text-sm font-semibold">{formatCurrency(outstandingAmount)}</p>
            <div className="flex items-center gap-1">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={vendorItemsAriaLabel(vendor.name, itemCount)}
                    render={<Link to={getVendorItemsHref(organizationId, vendor.id)} />}
                >
                    <VendorItemsIcon count={itemCount} />
                </Button>
                <UpsertVendorDialog
                    organizationId={organizationId}
                    vendor={vendor}
                    trigger={
                        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${vendor.name}`}>
                            <Pencil className="size-4" />
                        </Button>
                    }
                />
            </div>
        </div>
    </div>
);

export const VendorsIndexRedirect = () => {
    const [searchParams] = useSearchParams();
    return <Navigate to={searchParams.get("tab") === "items" ? "items" : "list"} replace />;
};

export const VendorsListPage = () => {
    const { organizationId = "" } = useParams();

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="vendors-directory">
            <VendorsDirectory organizationId={organizationId} />
        </div>
    );
};

export const VendorItemsTabPage = () => {
    const { organizationId = "" } = useParams();

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="vendor-items-catalogue-tab">
            <VendorItemsCatalogue organizationId={organizationId} />
        </div>
    );
};

const VendorsPage = () => {
    const { organizationId = "" } = useParams();
    const location = useLocation();
    const basePath = `/organizations/${organizationId}/vendors`;
    const activeTab = vendorTabs.find((tab) => location.pathname.includes(`${basePath}/${tab.path}`))?.path ?? "list";

    return (
        <div className={adminWorkspacePageHeightClass} data-testid="vendors-page">
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div className="shrink-0 border-b border-border/60 pb-px">
                <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label="Vendors navigation tabs">
                    {vendorTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.path;

                        return (
                            <Link
                                key={tab.path}
                                to={`${basePath}/${tab.path}`}
                                className={cn(
                                    "relative inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-150 rounded-lg whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                    isActive
                                        ? "text-primary font-semibold bg-primary/10 shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                                )}
                            >
                                <Icon className={cn("size-3.5 sm:size-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground/70")} />
                                <span>{tab.label}</span>
                                {isActive ? (
                                    <span className="absolute -bottom-px left-2 right-2 h-0.5 bg-primary rounded-full" />
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <Outlet />
            </div>
        </div>
    );
};

export default VendorsPage;
