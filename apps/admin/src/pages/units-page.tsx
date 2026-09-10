import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getUnits } from "@repo/services";
import type { UnitKind } from "@repo/types";
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
import { Check, Filter, Pencil, Plus, PlusCircle, RefreshCw, Ruler, Search, X } from "lucide-react";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertUnitDialog from "@/components/units/upsert-unit-dialog";
import { unitKeys } from "@/lib/query-keys";

const SOURCE_FILTER_OPTIONS = [
    { label: "Standard", value: "predefined" },
    { label: "Custom", value: "custom" },
] as const;

const STATUS_FILTER_OPTIONS = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
] as const;

const unitKindLabel: Record<UnitKind, string> = {
    predefined: "Standard",
    custom: "Custom",
};

type UnitFilterOptionsProps = {
    title: string;
    options: ReadonlyArray<{ label: string; value: string }>;
    selectedValues: string[];
    onChange: (value: string) => void;
    onClear: () => void;
    variant?: "popover" | "sheet";
};

const UnitFilterOptions = ({
    title,
    options,
    selectedValues,
    onChange,
    onClear,
    variant = "popover",
}: UnitFilterOptionsProps) => {
    const isSheet = variant === "sheet";

    return (
        <div className={cn("space-y-1", isSheet && "space-y-2")}>
            <div className={cn("flex items-center justify-between gap-3", isSheet ? "px-1 py-1" : "px-2 py-1")}>
                <p
                    className={cn(
                        "font-bold text-muted-foreground uppercase tracking-wider",
                        isSheet ? "text-xs" : "text-[10px]",
                    )}
                >
                    {title}
                </p>
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
                                "flex items-center justify-center rounded-full border border-muted-foreground/35 transition-colors",
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

const UnitKindBadge = ({ kind }: { kind: UnitKind }) => (
    <Badge
        variant="outline"
        className={cn(
            "rounded-full text-[10px] font-semibold",
            kind === "custom"
                ? "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                : "border-border/60 bg-muted/30 text-muted-foreground",
        )}
    >
        {unitKindLabel[kind]}
    </Badge>
);

const UnitsPage = () => {
    const { organizationId = "" } = useParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [kindFilters, setKindFilters] = useState<string[]>([]);
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [draftKindFilters, setDraftKindFilters] = useState<string[]>([]);
    const [draftStatusFilters, setDraftStatusFilters] = useState<string[]>([]);

    const unitsQuery = useQuery({
        queryKey: unitKeys.list(organizationId),
        queryFn: () => getUnits(organizationId),
        enabled: Boolean(organizationId),
    });

    const units = unitsQuery.data?.status === "success" ? unitsQuery.data.data?.units ?? [] : [];

    const activeFilterCount = kindFilters.length + statusFilters.length;
    const draftFilterCount = draftKindFilters.length + draftStatusFilters.length;

    const toggleKindFilter = (value: string) => {
        setKindFilters((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
    };

    const toggleStatusFilter = (value: string) => {
        setStatusFilters((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
    };

    const toggleDraftKindFilter = (value: string) => {
        setDraftKindFilters((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
    };

    const toggleDraftStatusFilter = (value: string) => {
        setDraftStatusFilters((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
    };

    const clearAllFilters = () => {
        setKindFilters([]);
        setStatusFilters([]);
    };

    const clearDraftFilters = () => {
        setDraftKindFilters([]);
        setDraftStatusFilters([]);
    };

    const handleMobileFiltersOpenChange = (open: boolean) => {
        if (open) {
            setDraftKindFilters(kindFilters);
            setDraftStatusFilters(statusFilters);
        }
        setMobileFiltersOpen(open);
    };

    const applyMobileFilters = () => {
        setKindFilters(draftKindFilters);
        setStatusFilters(draftStatusFilters);
        setMobileFiltersOpen(false);
    };

    const filteredUnits = useMemo(() => {
        let result = units;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter((unit) =>
                unit.name.toLowerCase().includes(query) || unit.label.toLowerCase().includes(query),
            );
        }

        if (kindFilters.length > 0) {
            result = result.filter((unit) => kindFilters.includes(unit.kind));
        }

        if (statusFilters.length > 0) {
            result = result.filter((unit) => statusFilters.includes(unit.status));
        }

        return result;
    }, [kindFilters, searchQuery, statusFilters, units]);

    const hasActiveFilters = searchQuery.trim().length > 0 || activeFilterCount > 0;

    if (unitsQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (unitsQuery.isError || unitsQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load units</EmptyTitle>
                            <EmptyDescription>
                                {(unitsQuery.error as { message?: string })?.message
                                    ?? unitsQuery.data?.message
                                    ?? "Units could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => unitsQuery.refetch()}
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
        <div className="space-y-3" data-testid="units-page">
            {units.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Ruler />
                                </EmptyMedia>
                                <EmptyTitle>No units yet</EmptyTitle>
                                <EmptyDescription>
                                    Create a custom Unit, or wait for standard Units to finish seeding.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertUnitDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleMobileFiltersOpenChange(true)}
                                aria-label="Filter units"
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
                                    placeholder="Search units..."
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-all duration-200 text-sm w-full shadow-2xs"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                                        aria-label="Clear search"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            <UpsertUnitDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button
                                        type="button"
                                        aria-label="Add unit"
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
                                                kindFilters.length > 0
                                                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                                    : "text-muted-foreground",
                                            )}
                                        >
                                            <Filter className={cn(
                                                "size-3.5 transition-colors",
                                                kindFilters.length > 0
                                                    ? "text-primary stroke-[2.5]"
                                                    : "text-muted-foreground/70",
                                            )} />
                                            <span>Source</span>
                                            {kindFilters.length > 0 && (
                                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                                                    {kindFilters.length}
                                                </span>
                                            )}
                                        </Button>
                                    }
                                />
                                <PopoverContent align="start" className="w-[180px] p-2 bg-card border-border/50 rounded-xl shadow-md z-50">
                                    <UnitFilterOptions
                                        title="Filter Source"
                                        options={SOURCE_FILTER_OPTIONS}
                                        selectedValues={kindFilters}
                                        onChange={toggleKindFilter}
                                        onClear={() => setKindFilters([])}
                                    />
                                </PopoverContent>
                            </Popover>

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
                                            <Filter className={cn(
                                                "size-3.5 transition-colors",
                                                statusFilters.length > 0
                                                    ? "text-primary stroke-[2.5]"
                                                    : "text-muted-foreground/70",
                                            )} />
                                            <span>Availability</span>
                                            {statusFilters.length > 0 && (
                                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                                                    {statusFilters.length}
                                                </span>
                                            )}
                                        </Button>
                                    }
                                />
                                <PopoverContent align="start" className="w-[180px] p-2 bg-card border-border/50 rounded-xl shadow-md z-50">
                                    <UnitFilterOptions
                                        title="Filter Availability"
                                        options={STATUS_FILTER_OPTIONS}
                                        selectedValues={statusFilters}
                                        onChange={toggleStatusFilter}
                                        onClear={() => setStatusFilters([])}
                                    />
                                </PopoverContent>
                            </Popover>

                            {activeFilterCount > 0 && (
                                <Button
                                    variant="ghost"
                                    onClick={clearAllFilters}
                                    className="hidden sm:flex h-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-semibold gap-1.5 px-3 shrink-0 cursor-pointer animate-in fade-in slide-in-from-left-2 duration-200"
                                >
                                    <X className="size-3.5" />
                                    <span>Clear Filters</span>
                                </Button>
                            )}
                        </div>

                        <div className="hidden sm:flex flex-wrap items-center gap-2">
                            <UpsertUnitDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 sm:px-5 text-xs sm:text-sm font-medium shadow-xs shadow-primary/20">
                                        <PlusCircle className="size-4" />
                                        Add unit
                                    </Button>
                                }
                            />
                        </div>
                    </div>

                    {filteredUnits.length > 0 && (
                        <div className="flex items-center justify-between px-1 pt-0 pb-0.5">
                            <span className="text-xs text-muted-foreground/70">
                                Showing {filteredUnits.length} unit{filteredUnits.length === 1 ? "" : "s"}
                            </span>
                        </div>
                    )}

                    {filteredUnits.length === 0 ? (
                        <Card className="border-border/60 bg-card/80 shadow-md">
                            <CardContent className="pt-6">
                                <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-8">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <Ruler />
                                        </EmptyMedia>
                                        <EmptyTitle>No units found</EmptyTitle>
                                        <EmptyDescription>
                                            {hasActiveFilters
                                                ? "Try adjusting your search or filters."
                                                : "Add your first custom unit to get started."}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    {hasActiveFilters ? (
                                        <EmptyContent>
                                            <Button
                                                variant="outline"
                                                className="rounded-full"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    clearAllFilters();
                                                }}
                                            >
                                                Clear all filters
                                            </Button>
                                        </EmptyContent>
                                    ) : null}
                                </Empty>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 transition-all duration-300 ease-out animate-in fade-in-40 slide-in-from-bottom-2">
                            {filteredUnits.map((unit) => (
                                <Card
                                    key={unit.id}
                                    className={cn(
                                        "group relative overflow-hidden rounded-2xl border shadow-2xs transition-all duration-200 min-w-0 hover:shadow-md",
                                        unit.status === "inactive" && "opacity-[0.82] hover:opacity-100",
                                        unit.status === "inactive"
                                            ? "border-border/50 bg-muted/20 hover:border-border/60"
                                            : "border-border/60 bg-card/70 hover:border-primary/30 hover:bg-card/95",
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "absolute inset-x-0 top-0 h-0.5",
                                            unit.kind === "custom"
                                                ? "bg-gradient-to-r from-violet-500/70 via-violet-400/40 to-transparent"
                                                : "bg-gradient-to-r from-primary/70 via-primary/40 to-transparent",
                                        )}
                                    />

                                    <div className="p-3.5 sm:p-4">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div
                                                className={cn(
                                                    "relative flex h-[3.75rem] w-[3.75rem] sm:h-16 sm:w-16 shrink-0 flex-col items-center justify-center rounded-xl border px-1 ring-1 transition-transform duration-200 group-hover:scale-[1.03]",
                                                    unit.kind === "custom"
                                                        ? "border-violet-500/25 bg-gradient-to-br from-violet-500/15 to-violet-500/5 text-violet-700 ring-violet-500/10 dark:text-violet-200"
                                                        : "border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-primary/10",
                                                )}
                                            >
                                                <span className="font-mono text-sm sm:text-[15px] font-bold uppercase leading-none tracking-tight text-center line-clamp-2 break-all">
                                                    {unit.label}
                                                </span>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <Tooltip>
                                                        <TooltipTrigger render={<div className="min-w-0 flex-1" />}>
                                                            <h4 className="font-display text-sm sm:text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-2 break-words capitalize">
                                                                {unit.name}
                                                            </h4>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs text-xs capitalize">
                                                            {unit.name}
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
                                                            <UpsertUnitDialog
                                                                organizationId={organizationId}
                                                                unit={unit}
                                                                trigger={
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        aria-label={`Edit ${unit.name}`}
                                                                        className="h-8 w-8 rounded-lg text-muted-foreground opacity-70 transition-opacity hover:bg-muted/60 hover:text-foreground hover:opacity-100 group-hover:opacity-100 cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-primary/40"
                                                                    >
                                                                        <Pencil className="size-3.5" />
                                                                    </Button>
                                                                }
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent>Edit unit</TooltipContent>
                                                    </Tooltip>
                                                </div>

                                                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                                                    <UnitKindBadge kind={unit.kind} />
                                                    {unit.status === "inactive" ? (
                                                        <ProductStatusBadge status={unit.status} />
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                                                        >
                                                            Active
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    <Sheet open={mobileFiltersOpen} onOpenChange={handleMobileFiltersOpenChange}>
                        <SheetContent
                            side="bottom"
                            className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-2xl px-0 pb-0 pt-4 sm:hidden"
                        >
                            <SheetHeader className="shrink-0 space-y-0 px-6 pb-4 pt-0 pr-14 text-left">
                                <div className="flex items-center justify-between gap-3">
                                    <SheetTitle className="text-lg">Filter units</SheetTitle>
                                    {draftFilterCount > 0 ? (
                                        <button
                                            type="button"
                                            onClick={clearDraftFilters}
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
                                <div className="space-y-6">
                                    <UnitFilterOptions
                                        variant="sheet"
                                        title="Filter Source"
                                        options={SOURCE_FILTER_OPTIONS}
                                        selectedValues={draftKindFilters}
                                        onChange={toggleDraftKindFilter}
                                        onClear={() => setDraftKindFilters([])}
                                    />
                                    <UnitFilterOptions
                                        variant="sheet"
                                        title="Filter Availability"
                                        options={STATUS_FILTER_OPTIONS}
                                        selectedValues={draftStatusFilters}
                                        onChange={toggleDraftStatusFilter}
                                        onClear={() => setDraftStatusFilters([])}
                                    />
                                </div>
                            </div>

                            <SheetFooter className="shrink-0 border-t border-border/50 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                                <Button
                                    type="button"
                                    onClick={applyMobileFilters}
                                    className="w-full rounded-xl"
                                >
                                    Apply filters
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </>
            )}
        </div>
    );
};

export default UnitsPage;
