import { useMemo, useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUnits, getVendorItems, getVendors } from "@repo/services";
import type { UnitDTO, VendorDTO, VendorItemDTO, VendorItemStatus } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { Check, Filter, Package, Pencil, PlusCircle, RefreshCw, Search, X } from "lucide-react";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertVendorItemDialog from "@/components/vendors/upsert-vendor-item-dialog";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { unitKeys, vendorKeys } from "@/lib/query-keys";

type VendorItemsCatalogueProps = {
    organizationId: string;
};

type VendorItemGroup = {
    vendor: VendorDTO;
    items: VendorItemDTO[];
};

const statusFilterOptions: { label: string; value: VendorItemStatus }[] = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
];

const unitLabel = (units: UnitDTO[], unitId: string) => {
    const unit = units.find((candidate) => candidate.id === unitId);
    if (!unit) return "Unknown unit";
    return unit.status === "inactive" ? `${unit.name} (${unit.label}, inactive)` : `${unit.name} (${unit.label})`;
};

const VendorItemsCatalogue = ({ organizationId }: VendorItemsCatalogueProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilters, setStatusFilters] = useState<VendorItemStatus[]>(["active"]);

    const vendorsQuery = useQuery({
        queryKey: vendorKeys.list(organizationId),
        queryFn: () => getVendors(organizationId),
        enabled: Boolean(organizationId),
    });
    const itemsQuery = useQuery({
        queryKey: vendorKeys.items(organizationId),
        queryFn: () => getVendorItems(organizationId),
        enabled: Boolean(organizationId),
    });
    const unitsQuery = useQuery({
        queryKey: unitKeys.list(organizationId),
        queryFn: () => getUnits(organizationId),
        enabled: Boolean(organizationId),
    });

    const vendors = vendorsQuery.data?.status === "success" ? vendorsQuery.data.data?.vendors ?? [] : [];
    const vendorItems = itemsQuery.data?.status === "success" ? itemsQuery.data.data?.vendorItems ?? [] : [];
    const units = unitsQuery.data?.status === "success" ? unitsQuery.data.data?.units ?? [] : [];

    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return vendorItems.filter((item) => {
            if (statusFilters.length > 0 && !statusFilters.includes(item.status)) {
                return false;
            }
            if (!query) return true;
            const vendorName = vendors.find((vendor) => vendor.id === item.vendorId)?.name ?? "";
            const unit = units.find((candidate) => candidate.id === item.unitId);
            return (
                item.name.toLowerCase().includes(query)
                || vendorName.toLowerCase().includes(query)
                || (unit?.name.toLowerCase().includes(query) ?? false)
                || (unit?.label.toLowerCase().includes(query) ?? false)
            );
        });
    }, [searchQuery, statusFilters, units, vendorItems, vendors]);

    const groups = useMemo<VendorItemGroup[]>(() => {
        const itemsByVendorId = new Map<string, VendorItemDTO[]>();
        for (const item of filteredItems) {
            const existing = itemsByVendorId.get(item.vendorId) ?? [];
            existing.push(item);
            itemsByVendorId.set(item.vendorId, existing);
        }

        return vendors
            .slice()
            .sort((left, right) => left.name.localeCompare(right.name))
            .flatMap((vendor) => {
                const items = (itemsByVendorId.get(vendor.id) ?? []).slice().sort((left, right) =>
                    left.name.localeCompare(right.name),
                );
                return items.length > 0 ? [{ vendor, items }] : [];
            });
    }, [filteredItems, vendors]);

    const addItemAction = (
        trigger: ReactElement,
    ) => (
        <UpsertVendorItemDialog
            organizationId={organizationId}
            vendors={vendors}
            units={units}
            trigger={trigger}
        />
    );

    if (vendorsQuery.isPending || itemsQuery.isPending || unitsQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (
        vendorsQuery.isError
        || itemsQuery.isError
        || unitsQuery.isError
        || vendorsQuery.data?.status === "error"
        || itemsQuery.data?.status === "error"
        || unitsQuery.data?.status === "error"
    ) {
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

    if (vendorItems.length === 0) {
        return (
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
                                {addItemAction(
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                                        <PlusCircle className="size-3.5" />
                                        Add item
                                    </Button>,
                                )}
                            </EmptyContent>
                        ) : null}
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4" data-testid="vendor-items-catalogue">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="relative w-full sm:w-[320px] max-w-xs group/search">
                        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                        <Input
                            type="text"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all duration-200 text-sm w-full shadow-2xs"
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
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
                                    aria-label="Item status"
                                    className={cn(
                                        "h-9 rounded-full bg-card border-border/50 hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 shadow-2xs flex items-center gap-1.5 px-3.5 text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200",
                                        statusFilters.length > 0
                                            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    <Filter
                                        className={cn(
                                            "size-3.5 transition-colors",
                                            statusFilters.length > 0
                                                ? "text-primary stroke-[2.5]"
                                                : "text-muted-foreground/70",
                                        )}
                                    />
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
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider">
                                    Filter Status
                                </p>
                                {statusFilterOptions.map((option) => {
                                    const isChecked = statusFilters.includes(option.value);
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                const next = isChecked
                                                    ? statusFilters.filter((value) => value !== option.value)
                                                    : [...statusFilters, option.value];
                                                setStatusFilters(next);
                                            }}
                                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left font-medium hover:bg-muted/50 cursor-pointer"
                                        >
                                            <div
                                                className={cn(
                                                    "flex size-4 items-center justify-center rounded-full border border-muted-foreground/35 transition-colors",
                                                    isChecked
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-transparent",
                                                )}
                                            >
                                                {isChecked ? <Check className="size-3 stroke-[3]" /> : null}
                                            </div>
                                            <span className="truncate">{option.label}</span>
                                        </button>
                                    );
                                })}
                                {statusFilters.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilters([])}
                                        className="w-full text-center text-[10px] font-bold text-primary hover:underline pt-1.5 border-t border-border/40 cursor-pointer"
                                    >
                                        Clear Filter
                                    </button>
                                ) : null}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {statusFilters.length > 0 ? (
                        <Button
                            variant="ghost"
                            onClick={() => setStatusFilters([])}
                            className="h-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-semibold gap-1.5 px-3 shrink-0 cursor-pointer animate-in fade-in slide-in-from-left-2 duration-200"
                        >
                            <X className="size-3.5" />
                            <span>Clear Filters</span>
                        </Button>
                    ) : null}

                    <span className="text-xs text-muted-foreground ml-1.5 select-none font-medium">
                        {vendorItems.length} item{vendorItems.length === 1 ? "" : "s"}
                    </span>
                </div>

                {addItemAction(
                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-4 shrink-0">
                        <PlusCircle className="size-3.5" />
                        Add item
                    </Button>,
                )}
            </div>

            {groups.length === 0 ? (
                <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                    No vendor items match your filters.
                </Card>
            ) : (
                <div className="space-y-5">
                    {groups.map((group) => (
                        <section
                            key={group.vendor.id}
                            className="space-y-2.5"
                            data-testid="vendor-item-group"
                            aria-label={`${group.vendor.name} items`}
                        >
                            <div className="flex items-center gap-2.5">
                                <h3 className="font-display text-sm font-semibold text-foreground sm:text-base">
                                    {group.vendor.name}
                                </h3>
                                <ProductStatusBadge status={group.vendor.status} />
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70">
                                {group.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex flex-col gap-3 border-b border-border/40 p-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-foreground">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {unitLabel(units, item.unitId)}
                                                {" · "}
                                                {formatCurrency(item.defaultPurchasePrice)}
                                                {" · Updated "}
                                                {formatDateTime(item.updatedAt)}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                                            <ProductStatusBadge status={item.status} />
                                            <UpsertVendorItemDialog
                                                organizationId={organizationId}
                                                vendors={vendors}
                                                units={units}
                                                vendorItem={item}
                                                trigger={
                                                    <Button variant="outline" size="sm" className="rounded-full">
                                                        <Pencil className="size-3" />
                                                        Edit
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VendorItemsCatalogue;
