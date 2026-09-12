import type { ReactNode } from "react";
import { formatSaleServiceModeLabel, type SaleSummaryDTO, type SalesListSummary } from "@repo/types";
import {
    BillingBillsToolbar,
    BillingClearFiltersButton,
    BillingDateFilterPanel,
    BillingPaymentMethodBadges,
    BillingPaymentStatusBadge,
    BillingSaleMeta,
    BillingSaleRow,
    BillingSalesList,
    BillingSalesSummaryBar,
    BillsDateNavigator,
    billsDatePickerCalendarClassName,
    billsDatePickerCalendarClassNames,
    clampSalesDateToLatest,
    getLatestSelectableSalesDate,
    getSalesDatePickerDisabledDays,
    type BillsDateAppliedState,
    type BillsDateMode,
    type BillsDatePreset,
} from "@repo/ui/components/billing";
import { Button } from "@repo/ui/components/button";
import { Calendar as DateCalendar } from "@repo/ui/components/calendar";
import { DataTableFacetedFilter } from "@repo/ui/components/data-table-faceted-filter";
import { DataTableSortFilter } from "@repo/ui/components/data-table-sort-filter";
import { FilterOptionsList } from "@repo/ui/components/filter-options-list";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { formatCurrency } from "@repo/ui/lib/money";
import { ArrowUpDown, Filter, Store, Trash2, Wallet } from "lucide-react";

import type { BillPaymentMethod, SaleSort } from "@/lib/billing/composer";
import { getSalesDatePresetOptions } from "@/lib/billing/sales-date";
import { formatDateTime } from "@/lib/format";

const salesSortOptions: Array<{ value: SaleSort; label: string }> = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "highest", label: "Highest \u20B9" },
    { value: "lowest", label: "Lowest \u20B9" },
];

const salesPaymentMethodFilterOptions: Array<{ value: BillPaymentMethod; label: string }> = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
];

export type BillingBillsPanelStore = {
    id: string;
    name: string;
};

export type BillingBillsStoreModel = {
    showStoreSwitcher: boolean;
    stores: BillingBillsPanelStore[];
    selectedStoreId: string;
    onStoreChange: (storeId: string) => void;
};

export type BillingBillsToolbarModel = {
    paymentMethodSelection: Set<BillPaymentMethod>;
    onPaymentMethodSelectionChange: (values: Set<BillPaymentMethod>) => void;
    sortBy: SaleSort;
    onSortChange: (sort: SaleSort) => void;
    hasToolbarFilters: boolean;
    onClearToolbarFilters: () => void;
    toolbarFilterCount: number;
};

export type BillingBillsDateModel = {
    applied: BillsDateAppliedState;
    popoverOpen: boolean;
    onPopoverOpenChange: (open: boolean) => void;
    onShiftDate?: (days: number) => void;
    filter: BillsDateMode;
    onFilterChange: (mode: BillsDateMode) => void;
    preset: BillsDatePreset;
    onPresetSelect: (preset: BillsDatePreset) => void;
    specificDate: Date;
    onSpecificDateChange: (date: Date) => void;
    customFromDate: Date | null;
    customToDate: Date | null;
    onCustomRangeChange: (from: Date | null, to: Date | null) => void;
    onConfirm: () => void;
};

export type BillingBillsMobileFilterModel = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draftStoreId: string;
    onDraftStoreChange: (storeId: string) => void;
    draftPaymentMethodSelection: Set<BillPaymentMethod>;
    onDraftPaymentToggle: (value: string) => void;
    onDraftPaymentClear: () => void;
    draftSortBy: SaleSort;
    onDraftSortChange: (sort: SaleSort) => void;
    draftFilterCount: number;
    onClearDraftFilters: () => void;
    onApply: () => void;
};

export type BillingBillsListModel = {
    summary: SalesListSummary | null;
    sales: SaleSummaryDTO[];
    needsDateRange?: boolean;
    isPending?: boolean;
    isError?: boolean;
    errorMessage?: string;
    footer?: ReactNode;
    canMutate?: boolean;
    resumingDraftId?: string | null;
    resumePending?: boolean;
    deletePending?: boolean;
    onResumeDraft?: (saleId: string) => void;
    onDeleteDraft?: (saleId: string) => void;
    onOpenSale: (saleId: string) => void;
};

export type BillingBillsPanelProps = {
    store: BillingBillsStoreModel;
    toolbar: BillingBillsToolbarModel;
    date: BillingBillsDateModel;
    mobileFilters: BillingBillsMobileFilterModel;
    list: BillingBillsListModel;
};

export function BillingBillsPanel({ store, toolbar, date, mobileFilters, list }: BillingBillsPanelProps) {
    const { showStoreSwitcher, stores, selectedStoreId, onStoreChange } = store;
    const {
        paymentMethodSelection,
        onPaymentMethodSelectionChange,
        sortBy,
        onSortChange,
        hasToolbarFilters,
        onClearToolbarFilters,
        toolbarFilterCount,
    } = toolbar;
    const {
        applied: appliedDate,
        popoverOpen: datePopoverOpen,
        onPopoverOpenChange: onDatePopoverOpenChange,
        onShiftDate,
        filter: dateFilter,
        onFilterChange: onDateFilterChange,
        preset: datePreset,
        onPresetSelect: onDatePresetSelect,
        specificDate,
        onSpecificDateChange,
        customFromDate,
        customToDate,
        onCustomRangeChange,
        onConfirm: onConfirmDateFilter,
    } = date;
    const {
        open: mobileFiltersOpen,
        onOpenChange: onMobileFiltersOpenChange,
        draftStoreId,
        onDraftStoreChange,
        draftPaymentMethodSelection,
        onDraftPaymentToggle,
        onDraftPaymentClear,
        draftSortBy,
        onDraftSortChange,
        draftFilterCount,
        onClearDraftFilters,
        onApply: onApplyMobileFilters,
    } = mobileFilters;
    const {
        summary,
        sales,
        needsDateRange,
        isPending,
        isError,
        errorMessage,
        footer,
        canMutate,
        resumingDraftId,
        resumePending,
        deletePending,
        onResumeDraft,
        onDeleteDraft,
        onOpenSale,
    } = list;
    const dateConfirmDisabled =
        dateFilter === "range" && datePreset === "custom" && (!customFromDate || !customToDate);

    return (
        <>
            <BillingBillsToolbar
                mobileFilterButton={
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onMobileFiltersOpenChange(true)}
                        aria-label="Filter bills"
                        className={cn(
                            "relative z-10 h-10 w-10 shrink-0 rounded-full border-border/60 bg-card/60 p-0 shadow-2xs lg:hidden",
                            toolbarFilterCount > 0
                                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                : "text-muted-foreground",
                        )}
                    >
                        <Filter className="size-4" />
                        {toolbarFilterCount > 0 ? (
                            <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold leading-none text-primary-foreground ring-2 ring-card">
                                {toolbarFilterCount}
                            </span>
                        ) : null}
                    </Button>
                }
                desktopFilters={
                    <>
                        {showStoreSwitcher && stores.length > 0 ? (
                            <DataTableSortFilter
                                title="Store"
                                icon={Store}
                                value={selectedStoreId}
                                onValueChange={onStoreChange}
                                options={stores.map((store) => ({
                                    value: store.id,
                                    label: store.name,
                                }))}
                            />
                        ) : null}
                        <DataTableFacetedFilter
                            title="Payment"
                            icon={Wallet}
                            options={salesPaymentMethodFilterOptions}
                            selectedValues={paymentMethodSelection}
                            onSelectedValuesChange={(values) =>
                                onPaymentMethodSelectionChange(
                                    new Set(Array.from(values) as BillPaymentMethod[]),
                                )
                            }
                        />
                        <DataTableSortFilter
                            title="Sort"
                            icon={ArrowUpDown}
                            value={sortBy}
                            onValueChange={(value) => onSortChange(value as SaleSort)}
                            options={salesSortOptions}
                        />
                    </>
                }
                dateNavigator={
                    <BillsDateNavigator
                        applied={appliedDate}
                        open={datePopoverOpen}
                        onOpenChange={onDatePopoverOpenChange}
                        onShiftDate={appliedDate.mode === "date" ? onShiftDate : undefined}
                        popoverContent={
                            <BillingDateFilterPanel
                                mode={dateFilter}
                                onModeChange={onDateFilterChange}
                                presets={getSalesDatePresetOptions(dateFilter)}
                                selectedPreset={datePreset}
                                onPresetSelect={onDatePresetSelect}
                                confirmDisabled={dateConfirmDisabled}
                                onConfirm={onConfirmDateFilter}
                                calendar={
                                    dateFilter === "date" ? (
                                        <DateCalendar
                                            mode="single"
                                            className={billsDatePickerCalendarClassName}
                                            classNames={billsDatePickerCalendarClassNames}
                                            disabled={getSalesDatePickerDisabledDays()}
                                            endMonth={getLatestSelectableSalesDate()}
                                            selected={specificDate}
                                            onSelect={(date) => {
                                                if (date) {
                                                    onSpecificDateChange(clampSalesDateToLatest(date));
                                                }
                                            }}
                                            autoFocus
                                        />
                                    ) : (
                                        <DateCalendar
                                            mode="range"
                                            className={billsDatePickerCalendarClassName}
                                            classNames={billsDatePickerCalendarClassNames}
                                            disabled={getSalesDatePickerDisabledDays()}
                                            endMonth={getLatestSelectableSalesDate()}
                                            selected={{
                                                from: customFromDate ?? undefined,
                                                to: customToDate ?? undefined,
                                            }}
                                            onSelect={(range) => {
                                                onCustomRangeChange(
                                                    range?.from ? clampSalesDateToLatest(range.from) : null,
                                                    range?.to ? clampSalesDateToLatest(range.to) : null,
                                                );
                                            }}
                                            autoFocus
                                        />
                                    )
                                }
                            />
                        }
                    />
                }
                trailing={
                    <BillingClearFiltersButton visible={hasToolbarFilters} onClick={onClearToolbarFilters} />
                }
            />

            <Sheet open={mobileFiltersOpen} onOpenChange={onMobileFiltersOpenChange}>
                <SheetContent
                    side="bottom"
                    className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-2xl px-0 pb-0 pt-4 lg:hidden"
                >
                    <SheetHeader className="shrink-0 space-y-0 px-6 pb-4 pt-0 pr-14 text-left">
                        <div className="flex items-center justify-between gap-3">
                            <SheetTitle className="text-lg">Filter bills</SheetTitle>
                            {draftFilterCount > 0 ? (
                                <button
                                    type="button"
                                    onClick={onClearDraftFilters}
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
                            {showStoreSwitcher && stores.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2.5 px-1 py-1">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <Store className="size-4" />
                                        </span>
                                        <p className="text-sm font-semibold text-foreground">Store</p>
                                    </div>
                                    <FilterOptionsList
                                        hideHeader
                                        mode="single"
                                        options={stores.map((store) => ({
                                            value: store.id,
                                            label: store.name,
                                        }))}
                                        selectedValues={draftStoreId ? [draftStoreId] : []}
                                        onToggle={onDraftStoreChange}
                                    />
                                </div>
                            ) : null}

                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5 px-1 py-1">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Wallet className="size-4" />
                                    </span>
                                    <p className="text-sm font-semibold text-foreground">Payment</p>
                                </div>
                                <FilterOptionsList
                                    hideHeader
                                    mode="multiple"
                                    options={salesPaymentMethodFilterOptions}
                                    selectedValues={Array.from(draftPaymentMethodSelection)}
                                    onToggle={onDraftPaymentToggle}
                                    onClear={onDraftPaymentClear}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5 px-1 py-1">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <ArrowUpDown className="size-4" />
                                    </span>
                                    <p className="text-sm font-semibold text-foreground">Sort</p>
                                </div>
                                <FilterOptionsList
                                    hideHeader
                                    mode="single"
                                    options={salesSortOptions}
                                    selectedValues={[draftSortBy]}
                                    onToggle={(value) => onDraftSortChange(value as SaleSort)}
                                />
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="shrink-0 border-t border-border/50 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                        <Button type="button" onClick={onApplyMobileFilters} className="w-full rounded-xl">
                            Apply filters
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <BillingSalesSummaryBar summary={summary} />

            <BillingSalesList
                needsDateRange={needsDateRange}
                isPending={isPending}
                isError={isError}
                errorMessage={errorMessage}
                isEmpty={sales.length === 0}
                footer={footer}
            >
                {sales.map((sale) => {
                    const isDraft = sale.status === "draft";
                    return (
                        <BillingSaleRow
                            key={sale.id}
                            tokenNumber={sale.tokenNumber}
                            kotNumbers={sale.kotNumbers}
                            serviceTableLabel={sale.serviceTableLabel}
                            saleNumber={sale.saleNumber}
                            isDraft={isDraft && !sale.saleNumber}
                            customerName={sale.customer?.name}
                            meta={
                                <BillingSaleMeta
                                    serviceModeLabel={formatSaleServiceModeLabel(sale.serviceMode)}
                                    itemCount={sale.itemCount}
                                    createdAt={typeof sale.createdAt === "string" ? sale.createdAt : undefined}
                                    createdAtLabel={formatDateTime(sale.createdAt)}
                                />
                            }
                            amount={formatCurrency(sale.grandTotal)}
                            amountHint={
                                sale.status !== "draft" && sale.status !== "voided" ? (
                                    <p
                                        className={cn(
                                            "mt-0.5 text-[9px] font-bold",
                                            Number(sale.dueTotal) > 0
                                                ? "text-amber-600 dark:text-amber-400"
                                                : "text-emerald-500 dark:text-emerald-400",
                                        )}
                                    >
                                        {Number(sale.dueTotal) > 0
                                            ? `Due ${formatCurrency(sale.dueTotal)}`
                                            : "Paid in full"}
                                    </p>
                                ) : (
                                    <p className="mt-0.5 text-[9px] font-bold text-emerald-500 dark:text-emerald-400">
                                        {sale.grandTotal > 0 ? `+${Math.round(sale.grandTotal / 10)} pts` : ""}
                                    </p>
                                )
                            }
                            statusBadges={
                                <div className="flex flex-col items-end gap-1">
                                    <BillingPaymentStatusBadge
                                        status={sale.status}
                                        paymentStatus={sale.paymentStatus}
                                    />
                                    <BillingPaymentMethodBadges
                                        status={sale.status}
                                        paymentMethods={sale.paymentMethods}
                                    />
                                </div>
                            }
                            actions={
                                canMutate && isDraft ? (
                                    <>
                                        <Button
                                            size="sm"
                                            className="h-7 rounded-lg bg-primary px-2.5 text-[11px] text-primary-foreground hover:bg-primary/90"
                                            disabled={resumePending || deletePending}
                                            aria-busy={resumingDraftId === sale.id}
                                            onClick={() => onResumeDraft?.(sale.id)}
                                        >
                                            {resumingDraftId === sale.id ? <Spinner className="size-3.5" /> : "Resume"}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="size-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            aria-label={`Delete draft ${sale.saleNumber ?? sale.id}`}
                                            disabled={resumePending || deletePending}
                                            onClick={() => onDeleteDraft?.(sale.id)}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 rounded-lg px-2.5 text-[11px]"
                                        onClick={() => onOpenSale(sale.id)}
                                    >
                                        Open Details
                                    </Button>
                                )
                            }
                        />
                    );
                })}
            </BillingSalesList>
        </>
    );
}
