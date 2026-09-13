import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { cn } from "@repo/ui/lib/utils";
import { Building2, Check, CircleCheck, Filter, Search, X } from "lucide-react";

import { CATALOG_STATUSES, type CatalogStatusFilter } from "@/lib/catalog-query-states";

const STATUS_FILTER_OPTIONS = CATALOG_STATUSES.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

type CatalogStatusFilterOptionsProps = {
    title: string;
    selectedValues: readonly string[];
    onChange: (value: string) => void;
    onClear: () => void;
    variant?: "popover" | "sheet";
};

const CatalogStatusFilterOptions = ({
    title,
    selectedValues,
    onChange,
    onClear,
    variant = "popover",
}: CatalogStatusFilterOptionsProps) => {
    const isSheet = variant === "sheet";

    return (
        <div className={cn("space-y-1", isSheet && "space-y-2")}>
            <div className={cn("flex items-center justify-between gap-3", isSheet ? "px-1 py-1" : "px-2 py-1")}>
                <div className="flex min-w-0 items-center gap-2">
                    {isSheet ? (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            {title === "Org status" ? (
                                <Building2 className="size-4" />
                            ) : (
                                <CircleCheck className="size-4" />
                            )}
                        </span>
                    ) : title === "Org status" ? (
                        <Building2 className="size-3.5 shrink-0 text-muted-foreground/70" />
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
                        {title}
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

type StatusFilterButtonProps = {
    label: string;
    selectedValues: readonly string[];
    onChange: (value: string) => void;
    onClear: () => void;
};

const StatusFilterButton = ({ label, selectedValues, onChange, onClear }: StatusFilterButtonProps) => (
    <Popover>
        <PopoverTrigger
            render={
                <Button
                    variant="outline"
                    className={cn(
                        "hidden sm:flex h-9 rounded-full bg-card border-border/50 hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 shadow-2xs items-center gap-1.5 px-3.5 text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200",
                        selectedValues.length > 0
                            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                            : "text-muted-foreground",
                    )}
                >
                    {label === "Org status" ? (
                        <Building2
                            className={cn(
                                "size-3.5 transition-colors",
                                selectedValues.length > 0 ? "text-primary stroke-[2.5]" : "text-muted-foreground/70",
                            )}
                        />
                    ) : (
                        <CircleCheck
                            className={cn(
                                "size-3.5 transition-colors",
                                selectedValues.length > 0 ? "text-primary stroke-[2.5]" : "text-muted-foreground/70",
                            )}
                        />
                    )}
                    <span>{label}</span>
                    {selectedValues.length > 0 ? (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                            {selectedValues.length}
                        </span>
                    ) : null}
                </Button>
            }
        />
        <PopoverContent align="start" className="w-[180px] p-2 bg-card border-border/50 rounded-xl shadow-md z-50">
            <CatalogStatusFilterOptions
                title={label}
                selectedValues={selectedValues}
                onChange={onChange}
                onClear={onClear}
            />
        </PopoverContent>
    </Popover>
);

type CatalogStatusFilterBarProps = {
    searchPlaceholder: string;
    searchInput: string;
    onSearchInputChange: (value: string) => void;
    onClearSearch: () => void;
    statusFilters: readonly string[];
    onToggleStatus: (value: string) => void;
    onSetStatuses: (statuses: CatalogStatusFilter[]) => void;
    orgStatusFilters?: readonly string[];
    onToggleOrgStatus?: (value: string) => void;
    onSetOrgStatuses?: (statuses: CatalogStatusFilter[]) => void;
    filterAriaLabel: string;
    mobileSheetTitle: string;
    children?: React.ReactNode;
};

const CatalogStatusFilterBar = ({
    searchPlaceholder,
    searchInput,
    onSearchInputChange,
    onClearSearch,
    statusFilters,
    onToggleStatus,
    onSetStatuses,
    orgStatusFilters,
    onToggleOrgStatus,
    onSetOrgStatuses,
    filterAriaLabel,
    mobileSheetTitle,
    children,
}: CatalogStatusFilterBarProps) => {
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [draftStatusFilters, setDraftStatusFilters] = useState<string[]>([]);
    const [draftOrgStatusFilters, setDraftOrgStatusFilters] = useState<string[]>([]);
    const showOrgStatus = orgStatusFilters != null && onToggleOrgStatus != null && onSetOrgStatuses != null;
    const selectedFilterCount = statusFilters.length + (showOrgStatus ? orgStatusFilters.length : 0);
    const hasSelectedFilters = selectedFilterCount > 0;

    const handleMobileFiltersOpenChange = (open: boolean) => {
        if (open) {
            setDraftStatusFilters([...statusFilters]);
            if (showOrgStatus) {
                setDraftOrgStatusFilters([...orgStatusFilters]);
            }
        }
        setMobileFiltersOpen(open);
    };

    const toggleDraftStatus = (value: string) => {
        setDraftStatusFilters((previous) =>
            previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
        );
    };

    const toggleDraftOrgStatus = (value: string) => {
        setDraftOrgStatusFilters((previous) =>
            previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
        );
    };

    const clearAllFilters = () => {
        onSetStatuses([]);
        onSetOrgStatuses?.([]);
    };

    return (
        <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleMobileFiltersOpenChange(true)}
                        aria-label={filterAriaLabel}
                        className={cn(
                            "relative h-10 w-10 shrink-0 rounded-full border-border/60 bg-card/60 p-0 shadow-2xs sm:hidden",
                            hasSelectedFilters
                                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                : "text-muted-foreground",
                        )}
                    >
                        <Filter className="size-4" />
                        {hasSelectedFilters ? (
                            <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold leading-none text-primary-foreground ring-2 ring-card">
                                {selectedFilterCount}
                            </span>
                        ) : null}
                    </Button>

                    <div className="relative flex-1 min-w-[180px] max-w-sm group/search">
                        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                        <Input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchInput}
                            onChange={(event) => onSearchInputChange(event.target.value)}
                            className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all duration-200 text-sm w-full shadow-2xs"
                        />
                        {searchInput ? (
                            <button
                                type="button"
                                onClick={onClearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                                aria-label="Clear search"
                            >
                                <X className="size-3.5" />
                            </button>
                        ) : null}
                    </div>

                    <StatusFilterButton
                        label="Status"
                        selectedValues={statusFilters}
                        onChange={onToggleStatus}
                        onClear={() => onSetStatuses([])}
                    />

                    {showOrgStatus ? (
                        <StatusFilterButton
                            label="Org status"
                            selectedValues={orgStatusFilters}
                            onChange={onToggleOrgStatus}
                            onClear={() => onSetOrgStatuses([])}
                        />
                    ) : null}

                    {hasSelectedFilters ? (
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

                {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
            </div>

            <Sheet open={mobileFiltersOpen} onOpenChange={handleMobileFiltersOpenChange}>
                <SheetContent
                    side="bottom"
                    className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-2xl px-0 pt-4 sm:hidden"
                >
                    <SheetHeader className="shrink-0 space-y-0 px-6 pb-4 pt-0 pr-14 text-left">
                        <div className="flex items-center justify-between gap-3">
                            <SheetTitle className="text-lg">{mobileSheetTitle}</SheetTitle>
                            {draftStatusFilters.length > 0 || (showOrgStatus && draftOrgStatusFilters.length > 0) ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDraftStatusFilters([]);
                                        setDraftOrgStatusFilters([]);
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
                        <CatalogStatusFilterOptions
                            title="Status"
                            variant="sheet"
                            selectedValues={draftStatusFilters}
                            onChange={toggleDraftStatus}
                            onClear={() => setDraftStatusFilters([])}
                        />
                        {showOrgStatus ? (
                            <CatalogStatusFilterOptions
                                title="Org status"
                                variant="sheet"
                                selectedValues={draftOrgStatusFilters}
                                onChange={toggleDraftOrgStatus}
                                onClear={() => setDraftOrgStatusFilters([])}
                            />
                        ) : null}
                    </div>

                    <SheetFooter className="shrink-0 border-t border-border/50 px-6 py-4">
                        <Button
                            type="button"
                            onClick={() => {
                                onSetStatuses(draftStatusFilters as CatalogStatusFilter[]);
                                if (showOrgStatus) {
                                    onSetOrgStatuses(draftOrgStatusFilters as CatalogStatusFilter[]);
                                }
                                setMobileFiltersOpen(false);
                            }}
                            className="w-full rounded-xl"
                        >
                            Apply filters
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default CatalogStatusFilterBar;
