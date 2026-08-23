import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import {
    addCalendarDays,
    kolkataCalendarDate,
    type PaymentMethod,
    type PlatformBillingInspectionQueryJSON,
    type PlatformSaleInspectionDetailDTO,
    type PlatformSaleInspectionListDTO,
    type PlatformSaleInspectionSummaryDTO,
    type SalesListSummary,
    type SalesSort,
    formatSaleServiceModeLabel,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Calendar as DateCalendar } from "@repo/ui/components/calendar";
import { Card, CardContent } from "@repo/ui/components/card";
import {
    DataTableFilterTrigger,
    DataTableFilterValue,
} from "@repo/ui/components/data-table-filter-trigger";
import { DataTableSortFilter } from "@repo/ui/components/data-table-sort-filter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import {
    ArrowLeft,
    Banknote,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    Clock,
    CreditCard,
    ReceiptText,
    RotateCcw,
    Search,
    Smartphone,
    User,
} from "lucide-react";

import { organizationInspectionPath, type BillingInspectionFilters } from "@/lib/organization-inspection-url";

type SalesDateMode = "date" | "range";
type SalesDatePreset = "today" | "yesterday" | "this-week" | "this-month" | "custom" | "all";

const salesSortOptions: Array<{ value: SalesSort; label: string }> = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "highest", label: "Highest \u20B9" },
    { value: "lowest", label: "Lowest \u20B9" },
];

const salesPaymentMethodOptions: Array<{ value: PaymentMethod | "all"; label: string }> = [
    { value: "all", label: "All" },
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank transfer" },
    { value: "other", label: "Other" },
];

const saleStatusOptions = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "completed", label: "Completed" },
    { value: "voided", label: "Voided" },
] as const;

const paymentStatusOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Due" },
    { value: "partial", label: "Partial" },
    { value: "paid", label: "Paid" },
] as const;

const salesDatePresetOptions: Array<{ value: SalesDatePreset; label: string }> = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this-week", label: "This week" },
    { value: "this-month", label: "This month" },
    { value: "custom", label: "Custom" },
    { value: "all", label: "All dates" },
];

const saleStatusStyles: Record<string, string> = {
    draft: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    voided: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const paymentStatusStyles: Record<string, string> = {
    pending: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    partial: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const getSalesDatePresetOptions = (mode: SalesDateMode) =>
    salesDatePresetOptions.filter((preset) =>
        mode === "date"
            ? preset.value === "today" || preset.value === "yesterday" || preset.value === "custom"
            : preset.value === "this-week" ||
              preset.value === "this-month" ||
              preset.value === "custom" ||
              preset.value === "all",
    );

const formatCurrency = (value: number | string | null | undefined) => {
    const numericValue = Number(value ?? 0);
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number.isFinite(numericValue) ? numericValue : 0);
};

const formatDateTime = (value: string | Date | null | undefined) => {
    if (!value) return "Never";
    return new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

const formatSalesDate = (calendarDate: string) => {
    const [yearText, monthText, dayText] = calendarDate.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
};

const parseCalendarDate = (value: string) => {
    const [yearText, monthText, dayText] = value.split("-");
    return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
};

const toCalendarDate = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const kolkataWeekStart = (today: string) => {
    const [yearText, monthText, dayText] = today.split("-");
    const weekday = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText), 12)).getUTCDay();
    return addCalendarDays(today, -((weekday + 6) % 7));
};

const formatDiscountPercentage = (
    discount: number | string | null | undefined,
    base: number | string | null | undefined,
) => {
    const discountAmount = Number(discount ?? 0);
    const baseAmount = Number(base ?? 0);
    if (!Number.isFinite(discountAmount) || !Number.isFinite(baseAmount) || discountAmount <= 0 || baseAmount <= 0) {
        return null;
    }
    const percentage = Math.min(100, Math.round((discountAmount / baseAmount) * 1000) / 10);
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(percentage)}%`;
};

const getAverageBillPerOrder = (
    salesTotal: number | string | null | undefined,
    completedCount: number | string | null | undefined,
) => {
    const total = Number(salesTotal ?? 0);
    const count = Number(completedCount ?? 0);
    if (!Number.isFinite(total) || !Number.isFinite(count) || count <= 0) {
        return 0;
    }
    return total / count;
};

const SalesSummaryBar = ({ summary }: { summary: SalesListSummary | null }) => {
    if (!summary) return null;

    return (
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-3.5 text-xs sm:grid-cols-5 sm:gap-4 sm:px-4">
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Sales</p>
                <p className="whitespace-nowrap text-sm font-semibold sm:text-base">{summary.completedCount}</p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">
                    {formatCurrency(summary.salesTotal)}
                </p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Collected</p>
                <p className="whitespace-nowrap text-sm font-semibold text-emerald-600 dark:text-emerald-400 sm:text-base">
                    {formatCurrency(summary.collectedTotal)}
                </p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Due</p>
                <p className="whitespace-nowrap text-sm font-semibold text-amber-600 dark:text-amber-400 sm:text-base">
                    {formatCurrency(summary.dueTotal)}
                </p>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Avg bill</p>
                <p className="whitespace-nowrap text-sm font-semibold sm:text-base">
                    {formatCurrency(getAverageBillPerOrder(summary.salesTotal, summary.completedCount))}
                </p>
            </div>
        </div>
    );
};

const inferBillingDatePreset = (filters: BillingInspectionFilters, today: string): SalesDatePreset => {
    if (filters.dateScope === "all") return "all";
    const startDate = filters.startDate;
    const endDate = filters.endDate;
    if (!startDate && !endDate) return "today";
    if (startDate && endDate && startDate === endDate) {
        if (startDate === today) return "today";
        if (startDate === addCalendarDays(today, -1)) return "yesterday";
        return "custom";
    }
    if (startDate === kolkataWeekStart(today) && endDate === today) return "this-week";
    if (startDate === `${today.slice(0, 7)}-01` && endDate === today) return "this-month";
    return "custom";
};

const renderSaleMetaRow = (sale: PlatformSaleInspectionSummaryDTO) => (
    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground/75">
            {formatSaleServiceModeLabel(sale.serviceMode)}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
            {sale.itemCount} item{sale.itemCount !== 1 ? "s" : ""}
        </span>
        <time
            className="min-w-0 basis-full text-[11px] leading-tight text-muted-foreground sm:basis-auto sm:text-xs"
            dateTime={typeof sale.createdAt === "string" ? sale.createdAt : undefined}
        >
            {formatDateTime(sale.createdAt)}
        </time>
    </div>
);

const renderPaymentStatusBadge = (sale: PlatformSaleInspectionSummaryDTO) => {
    if (sale.status === "draft") {
        return (
            <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Draft
            </span>
        );
    }
    if (sale.status === "voided") {
        return (
            <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
                Voided
            </span>
        );
    }
    if (sale.paymentStatus === "paid") {
        return (
            <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Paid
            </span>
        );
    }
    if (sale.paymentStatus === "partial") {
        return (
            <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
                Partial
            </span>
        );
    }
    return (
        <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Due
        </span>
    );
};

const renderPaymentMethodBadges = (sale: PlatformSaleInspectionSummaryDTO) => {
    if (sale.status === "draft" || sale.status === "voided") {
        return (
            <span className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                No payment
            </span>
        );
    }
    const methods = (sale.paymentMethods || "").toLowerCase();
    const badges: Array<{ key: string; label: string; className: string }> = [];
    if (methods.includes("cash")) {
        badges.push({ key: "cash", label: "Cash", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" });
    }
    if (methods.includes("upi")) {
        badges.push({ key: "upi", label: "UPI", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" });
    }
    if (methods.includes("card")) {
        badges.push({ key: "card", label: "Card", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" });
    }
    if (methods.includes("bank_transfer") || methods.includes("bank transfer")) {
        badges.push({ key: "bank", label: "Bank", className: "bg-sky-500/10 text-sky-500 border-sky-500/20" });
    }
    if (methods.includes("other")) {
        badges.push({ key: "other", label: "Other", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" });
    }
    if (badges.length === 0) {
        return (
            <span className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                Unpaid
            </span>
        );
    }
    return (
        <div className="flex flex-wrap justify-end gap-1">
            {badges.map((badge) => (
                <span
                    key={badge.key}
                    className={cn("rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", badge.className)}
                >
                    {badge.label}
                </span>
            ))}
        </div>
    );
};

const ReadOnlySaleDialog = ({
    open,
    onClose,
    isLoading,
    isError,
    errorCode,
    errorMessage,
    sale,
}: {
    open: boolean;
    onClose: () => void;
    isLoading: boolean;
    isError: boolean;
    errorCode?: number;
    errorMessage?: string;
    sale?: PlatformSaleInspectionDetailDTO | null;
}) => {
    const itemDiscountTotal = sale
        ? sale.items.reduce((total, item) => {
              const parentDiscount = Number(item.discountAmount ?? 0);
              const addOnDiscount = (item.addOns ?? []).reduce(
                  (addOnTotal, addOn) => addOnTotal + Number(addOn.discountAmount ?? 0),
                  0,
              );
              return total + parentDiscount + addOnDiscount;
          }, 0)
        : 0;
    const discountedItemsSubtotal = sale ? Math.max(Number(sale.subtotal ?? 0) - itemDiscountTotal, 0) : 0;
    const itemDiscountPercentage = formatDiscountPercentage(itemDiscountTotal, sale?.subtotal);
    const orderDiscountPercentage = formatDiscountPercentage(sale?.orderDiscountAmount, discountedItemsSubtotal);
    const notFound = errorCode === 404 || errorMessage === "Sale not found";

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
            <DialogContent
                className="gap-0 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto overflow-x-hidden rounded-2xl border-border/70 bg-background p-0 shadow-2xl sm:max-w-5xl"
                showCloseButton
            >
                {isLoading ? (
                    <div className="flex min-h-[360px] items-center justify-center" aria-busy="true" aria-label="Loading bill">
                        <DialogTitle className="sr-only">Loading bill</DialogTitle>
                        <Spinner className="size-6 text-primary" />
                    </div>
                ) : isError || !sale ? (
                    <div className="space-y-4 p-8">
                        <DialogTitle className="sr-only">Bill detail</DialogTitle>
                        <Button type="button" variant="ghost" className="rounded-full px-0" onClick={onClose}>
                            <ArrowLeft className="size-4" />
                            Back to billing
                        </Button>
                        <Alert role="alert" variant={notFound ? "default" : "destructive"}>
                            <AlertTitle>{notFound ? "Bill was not found" : "Bill could not be loaded"}</AlertTitle>
                            <AlertDescription>
                                {notFound
                                    ? "This bill is not available in this organization. Return to the billing list to continue."
                                    : (errorMessage ?? "The bill detail is unavailable.")}
                            </AlertDescription>
                        </Alert>
                    </div>
                ) : (
                    <div>
                        <div className="border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
                            <DialogHeader className="min-w-0 space-y-3 text-left">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <DialogTitle className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                                        {sale.saleNumber ? `Bill ${sale.saleNumber}` : "Draft bill"}
                                    </DialogTitle>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {sale.tokenNumber ? (
                                            <Badge className="rounded-md border border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300">
                                                Token {sale.tokenNumber}
                                            </Badge>
                                        ) : null}
                                        <Badge className={cn("rounded-md border text-xs capitalize", saleStatusStyles[sale.status])}>
                                            {sale.status}
                                        </Badge>
                                        <Badge className={cn("rounded-md border text-xs capitalize", paymentStatusStyles[sale.paymentStatus])}>
                                            {sale.paymentStatus}
                                        </Badge>
                                        <Badge variant="outline" className="rounded-md text-xs text-muted-foreground">
                                            {formatSaleServiceModeLabel(sale.serviceMode)}
                                        </Badge>
                                    </div>
                                </div>
                                <DialogDescription className="sr-only">
                                    Bill details for {sale.customer?.name || sale.customerName || "walk-in customer"} at{" "}
                                    {sale.store.name}
                                </DialogDescription>
                                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <User className="size-4 shrink-0" />
                                        <span className="font-medium text-foreground">
                                            {sale.customer?.name || sale.customerName || "Walk-in Customer"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="size-4 shrink-0" />
                                        <span>{formatDateTime(sale.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="size-4 shrink-0" />
                                        <span>Store: {sale.store.name}</span>
                                    </div>
                                </div>
                            </DialogHeader>
                        </div>

                        <div className="grid gap-6 px-5 py-5 sm:px-6 md:grid-cols-[1fr_280px] md:gap-8">
                            <div className="min-w-0 space-y-6">
                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Items
                                        <span className="ml-2 font-normal text-muted-foreground">({sale.items.length})</span>
                                    </h3>
                                    <div className="overflow-hidden rounded-xl border border-border/60">
                                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-border/60 bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid-cols-[1fr_80px_96px]">
                                            <span>Product</span>
                                            <span className="text-right">Qty</span>
                                            <span className="text-right">Amount</span>
                                        </div>
                                        <div className="divide-y divide-border/50">
                                            {sale.items.map((item) => {
                                                const addOns = item.addOns ?? [];
                                                const bundleComponents = item.bundleComponents ?? [];
                                                const comboChildAddOnDiscount = bundleComponents.reduce(
                                                    (total, component) =>
                                                        total +
                                                        (component.addOns ?? []).reduce(
                                                            (addOnTotal, addOn) =>
                                                                addOnTotal +
                                                                Number(addOn.unitDiscountSnapshot) * Number(addOn.totalQuantity),
                                                            0,
                                                        ),
                                                    0,
                                                );
                                                const displayedItemDiscount = Math.max(Number(item.discountAmount) - comboChildAddOnDiscount, 0);
                                                const itemDiscountLabel = formatDiscountPercentage(
                                                    displayedItemDiscount,
                                                    Number(item.unitPriceSnapshot) * Number(item.quantity),
                                                );
                                                const configuredLineTotal =
                                                    Number(item.lineTotal) + addOns.reduce((total, addOn) => total + Number(addOn.lineTotal), 0);

                                                return (
                                                    <div key={item.id} className="px-4 py-3">
                                                        <div className="grid grid-cols-[1fr_auto_auto] items-start gap-x-4 sm:grid-cols-[1fr_80px_96px]">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium leading-snug text-foreground">
                                                                    {item.productNameSnapshot}
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                                    {formatCurrency(item.unitPriceSnapshot)} each
                                                                    {displayedItemDiscount > 0 ? (
                                                                        <span className="text-rose-500">
                                                                            {" "}
                                                                            · -{formatCurrency(displayedItemDiscount)}
                                                                            {itemDiscountLabel ? ` (${itemDiscountLabel})` : ""}
                                                                        </span>
                                                                    ) : null}
                                                                </p>
                                                            </div>
                                                            <p className="text-right text-sm tabular-nums text-muted-foreground">
                                                                {Number(item.quantity)}
                                                            </p>
                                                            <p className="text-right text-sm font-semibold tabular-nums text-foreground">
                                                                {formatCurrency(configuredLineTotal)}
                                                            </p>
                                                        </div>
                                                        {addOns.length > 0 ? (
                                                            <div className="mt-2 space-y-1.5 border-l-2 border-border/40 pl-3">
                                                                {addOns.map((addOn) => (
                                                                    <div
                                                                        key={addOn.id}
                                                                        className="grid grid-cols-[1fr_auto_auto] items-start gap-x-4 sm:grid-cols-[1fr_80px_96px]"
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm text-foreground/85">+ {addOn.addOnNameSnapshot}</p>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {formatCurrency(addOn.unitPriceSnapshot)} each
                                                                            </p>
                                                                        </div>
                                                                        <p className="text-right text-xs tabular-nums text-muted-foreground">
                                                                            {Number(addOn.totalQuantity)}
                                                                        </p>
                                                                        <p className="text-right text-sm font-medium tabular-nums text-foreground/90">
                                                                            {formatCurrency(addOn.lineTotal)}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                        {bundleComponents.length > 0 ? (
                                                            <div className="mt-2 space-y-2 border-l-2 border-border/40 pl-3">
                                                                {bundleComponents.map((component) => (
                                                                    <div key={component.id} className="space-y-1">
                                                                        <p className="text-sm text-foreground/85">
                                                                            {component.productNameSnapshot}
                                                                            <span className="text-muted-foreground">
                                                                                {" "}
                                                                                × {Number(component.totalQuantity)}
                                                                            </span>
                                                                        </p>
                                                                        {(component.addOns ?? []).map((addOn) => (
                                                                            <p key={addOn.id} className="text-xs text-muted-foreground">
                                                                                + {addOn.addOnNameSnapshot} × {Number(addOn.totalQuantity)}
                                                                            </p>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Payments
                                        {sale.payments.length > 0 ? (
                                            <span className="ml-2 font-normal text-muted-foreground">({sale.payments.length})</span>
                                        ) : null}
                                    </h3>
                                    {sale.payments.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                                            No payments collected yet.
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border/50 rounded-xl border border-border/60">
                                            {sale.payments.map((payment) => {
                                                const method = payment.method.toLowerCase();
                                                const Icon =
                                                    method === "cash"
                                                        ? Banknote
                                                        : method === "card"
                                                          ? CreditCard
                                                          : method === "upi"
                                                            ? Smartphone
                                                            : CircleDollarSign;
                                                return (
                                                    <div
                                                        key={payment.id}
                                                        className="flex items-center justify-between gap-3 px-4 py-3"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                                            <div>
                                                                <p className="text-sm font-medium capitalize text-foreground">
                                                                    {payment.method.replace("_", " ")}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {formatDateTime(payment.collectedAt)}
                                                                    {payment.referenceNumber ? ` · Ref: ${payment.referenceNumber}` : ""}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-semibold tabular-nums text-foreground">
                                                            {formatCurrency(payment.amount)}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold text-foreground">Device attribution</h3>
                                    <p className="text-xs text-muted-foreground">Console-safe operational metadata only.</p>
                                    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                                        <p>Created by {sale.createdByDevice?.name ?? "Unknown device"}</p>
                                        <p className="mt-1 text-muted-foreground">
                                            Last updated by {sale.updatedByDevice?.name ?? "Unknown device"}
                                        </p>
                                    </div>
                                </section>
                            </div>

                            <div className="space-y-5">
                                <Card className="rounded-xl border-border/70">
                                    <CardContent className="space-y-4 p-5">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                Settlement total
                                            </p>
                                            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                                                {formatCurrency(sale.grandTotal)}
                                            </p>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-muted-foreground">Items subtotal</span>
                                                <span className="font-medium">{formatCurrency(discountedItemsSubtotal)}</span>
                                            </div>
                                            {itemDiscountTotal > 0 ? (
                                                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                                                    <span>Item discount included</span>
                                                    <span>
                                                        {formatCurrency(itemDiscountTotal)}
                                                        {itemDiscountPercentage ? ` (${itemDiscountPercentage})` : ""}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {Number(sale.orderDiscountAmount) > 0 ? (
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-muted-foreground">Order discount</span>
                                                    <span className="font-medium text-rose-500">
                                                        -{formatCurrency(sale.orderDiscountAmount)}
                                                        {orderDiscountPercentage ? ` (${orderDiscountPercentage})` : ""}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-muted-foreground">Collected</span>
                                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(sale.paidTotal)}
                                                </span>
                                            </div>
                                            <div className="border-t border-border/60 pt-2">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="font-medium">Due amount</span>
                                                    <span
                                                        className={cn(
                                                            "text-lg font-bold",
                                                            Number(sale.dueTotal) > 0
                                                                ? "text-amber-600 dark:text-amber-400"
                                                                : "text-emerald-600 dark:text-emerald-400",
                                                        )}
                                                    >
                                                        {formatCurrency(sale.dueTotal)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-xl border-border/70">
                                    <CardContent className="p-5">
                                        <h3 className="text-sm font-semibold text-foreground">Receipt preview</h3>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Historical receipt data for inspection only. Printing and messaging are not available in Console.
                                        </p>
                                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/20 p-4 font-mono text-xs">
                                            {sale.receipt.previewText}
                                        </pre>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

type ConsoleBillingInspectionProps = {
    organizationId: string;
    resourceId?: string;
    filters: BillingInspectionFilters;
    searchInput: string;
    onSearchInputChange: (value: string) => void;
    onUpdateFilters: (patch: Partial<BillingInspectionFilters>) => void;
    onOpenSale: (saleId: string) => void;
    onCloseSale: () => void;
    onFollowLink: (event: MouseEvent<HTMLAnchorElement>, path: string) => void;
    isSalesLoading: boolean;
    isSalesError: boolean;
    salesErrorCode?: number;
    salesErrorMessage?: string;
    salesList?: PlatformSaleInspectionListDTO;
    isSaleLoading: boolean;
    isSaleError: boolean;
    saleErrorCode?: number;
    saleErrorMessage?: string;
    sale?: PlatformSaleInspectionDetailDTO | null;
};

const ConsoleBillingInspection = ({
    organizationId,
    resourceId,
    filters,
    searchInput,
    onSearchInputChange,
    onUpdateFilters,
    onOpenSale,
    onCloseSale,
    onFollowLink,
    isSalesLoading,
    isSalesError,
    salesErrorCode,
    salesErrorMessage,
    salesList,
    isSaleLoading,
    isSaleError,
    saleErrorCode,
    saleErrorMessage,
    sale,
}: ConsoleBillingInspectionProps) => {
    const today = kolkataCalendarDate(new Date());
    const appliedStartDate = filters.dateScope === "all" ? undefined : filters.startDate;
    const appliedEndDate = filters.dateScope === "all" ? undefined : filters.endDate;
    const appliedIsSingleDate = Boolean(appliedStartDate && appliedEndDate && appliedStartDate === appliedEndDate);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [dateMode, setDateMode] = useState<SalesDateMode>(appliedIsSingleDate ? "date" : "range");
    const [datePreset, setDatePreset] = useState<SalesDatePreset>(() => inferBillingDatePreset(filters, today));
    const [specificDate, setSpecificDate] = useState<Date>(appliedIsSingleDate ? parseCalendarDate(appliedStartDate!) : parseCalendarDate(today));
    const [customFromDate, setCustomFromDate] = useState<Date | null>(appliedStartDate ? parseCalendarDate(appliedStartDate) : null);
    const [customToDate, setCustomToDate] = useState<Date | null>(appliedEndDate ? parseCalendarDate(appliedEndDate) : null);

    useEffect(() => {
        if (datePopoverOpen) return;
        const startDate = filters.dateScope === "all" ? undefined : filters.startDate;
        const endDate = filters.dateScope === "all" ? undefined : filters.endDate;
        const isSingle = Boolean(startDate && endDate && startDate === endDate);
        setDateMode(isSingle ? "date" : "range");
        setDatePreset(inferBillingDatePreset(filters, today));
        if (isSingle && startDate) setSpecificDate(parseCalendarDate(startDate));
        setCustomFromDate(startDate ? parseCalendarDate(startDate) : null);
        setCustomToDate(endDate ? parseCalendarDate(endDate) : null);
    }, [datePopoverOpen, filters, today]);

    const stores = salesList?.stores ?? [];
    const sales = salesList?.sales ?? [];
    const dateLabel = filters.dateScope === "all" || (!appliedStartDate && !appliedEndDate)
        ? "All dates"
        : appliedIsSingleDate
            ? formatSalesDate(appliedStartDate!)
            : `${formatSalesDate(appliedStartDate ?? appliedEndDate!)} — ${formatSalesDate(appliedEndDate ?? appliedStartDate!)}`;

    const applyDateRange = (startDate?: string, endDate?: string, dateScope?: "all") => {
        if (dateScope === "all") {
            onUpdateFilters({ startDate: undefined, endDate: undefined, dateScope: "all" });
        } else {
            onUpdateFilters({ startDate, endDate, dateScope: undefined });
        }
        setDatePopoverOpen(false);
    };

    const applyDatePreset = (preset: SalesDatePreset) => {
        setDatePreset(preset);
        if (preset === "today") {
            setSpecificDate(parseCalendarDate(today));
            setCustomFromDate(parseCalendarDate(today));
            setCustomToDate(parseCalendarDate(today));
            return;
        }
        if (preset === "yesterday") {
            const yesterday = addCalendarDays(today, -1);
            setSpecificDate(parseCalendarDate(yesterday));
            setCustomFromDate(parseCalendarDate(yesterday));
            setCustomToDate(parseCalendarDate(yesterday));
            return;
        }
        if (preset === "this-week") {
            setCustomFromDate(parseCalendarDate(kolkataWeekStart(today)));
            setCustomToDate(parseCalendarDate(today));
            return;
        }
        if (preset === "this-month") {
            setCustomFromDate(parseCalendarDate(`${today.slice(0, 7)}-01`));
            setCustomToDate(parseCalendarDate(today));
            return;
        }
        if (preset === "all") {
            setCustomFromDate(null);
            setCustomToDate(null);
        }
    };

    const confirmDateFilter = () => {
        if (datePreset === "all" && dateMode === "range") {
            applyDateRange(undefined, undefined, "all");
            return;
        }
        if (dateMode === "date") {
            const selected = toCalendarDate(specificDate);
            applyDateRange(selected, selected);
            return;
        }
        if (!customFromDate || !customToDate) return;
        const from = toCalendarDate(customFromDate);
        const to = toCalendarDate(customToDate);
        applyDateRange(from <= to ? from : to, from <= to ? to : from);
    };

    const shiftSingleDate = (days: number) => {
        if (!appliedIsSingleDate || !appliedStartDate) return;
        const next = addCalendarDays(appliedStartDate, days);
        if (next > today) return;
        applyDateRange(next, next);
    };

    const page = salesList?.pagination.page ?? 1;
    const limit = salesList?.pagination.limit ?? 20;
    const totalPages = Math.max(1, Math.ceil((salesList?.pagination.totalCount ?? 0) / limit));
    const organizationNotFound = salesErrorCode === 404 || salesErrorMessage === "Organization not found";

    const storeFilterOptions = useMemo(
        () => [
            { value: "all", label: "All stores" },
            ...stores.map((storeOption) => ({ value: storeOption.id, label: storeOption.name })),
        ],
        [stores],
    );

    const hasToolbarFilters =
        Boolean(filters.storeId) ||
        Boolean(filters.paymentMethod) ||
        Boolean(filters.status) ||
        Boolean(filters.paymentStatus) ||
        Boolean(filters.search?.trim()) ||
        (filters.sort ?? "newest") !== "newest" ||
        filters.dateScope === "all" ||
        appliedStartDate !== today ||
        appliedEndDate !== today;

    const clearToolbarFilters = () => {
        onSearchInputChange("");
        onUpdateFilters({
            storeId: undefined,
            paymentMethod: undefined,
            status: undefined,
            paymentStatus: undefined,
            search: undefined,
            sort: "newest",
            startDate: today,
            endDate: today,
            dateScope: undefined,
            page: 1,
        });
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-xl shadow-black/5">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    {storeFilterOptions.length > 1 ? (
                        <DataTableSortFilter
                            title="Store"
                            value={filters.storeId ?? "all"}
                            onValueChange={(value) =>
                                onUpdateFilters({ storeId: value === "all" ? undefined : value })
                            }
                            options={storeFilterOptions}
                        />
                    ) : null}
                    <DataTableSortFilter
                        title="Payment"
                        value={filters.paymentMethod ?? "all"}
                        onValueChange={(value) =>
                            onUpdateFilters({
                                paymentMethod:
                                    value === "all"
                                        ? undefined
                                        : (value as PlatformBillingInspectionQueryJSON["paymentMethod"]),
                            })
                        }
                        options={salesPaymentMethodOptions}
                    />
                    <DataTableSortFilter
                        title="Sort"
                        value={filters.sort ?? "newest"}
                        onValueChange={(value) => onUpdateFilters({ sort: value as SalesSort })}
                        options={salesSortOptions}
                    />
                    <DataTableSortFilter
                        title="Status"
                        value={filters.status ?? "all"}
                        onValueChange={(value) =>
                            onUpdateFilters({
                                status: value === "all" ? undefined : (value as BillingInspectionFilters["status"]),
                            })
                        }
                        options={saleStatusOptions.map((option) => ({ value: option.value, label: option.label }))}
                    />
                    <DataTableSortFilter
                        title="Due"
                        value={filters.paymentStatus ?? "all"}
                        onValueChange={(value) =>
                            onUpdateFilters({
                                paymentStatus:
                                    value === "all" ? undefined : (value as BillingInspectionFilters["paymentStatus"]),
                            })
                        }
                        options={paymentStatusOptions.map((option) => ({ value: option.value, label: option.label }))}
                    />
                    <div className="inline-flex items-center gap-1">
                        {appliedIsSingleDate ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-8 shrink-0 rounded-l-2xl rounded-r-md shadow-xs"
                                aria-label="Previous date"
                                onClick={() => shiftSingleDate(-1)}
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                        ) : null}
                        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                            <PopoverTrigger
                                render={
                                    <DataTableFilterTrigger
                                        className={cn(appliedIsSingleDate ? "rounded-md" : "rounded-full")}
                                    >
                                        <Calendar />
                                        <span>Date</span>
                                        <DataTableFilterValue>
                                            <Badge
                                                variant="secondary"
                                                className="max-w-[12rem] truncate rounded-md px-1.5 font-normal"
                                            >
                                                {dateLabel}
                                            </Badge>
                                        </DataTableFilterValue>
                                    </DataTableFilterTrigger>
                                }
                            />
                            <PopoverContent align="start" className="w-[240px] max-w-[calc(100vw-1rem)] overflow-hidden p-2">
                                <div className="flex min-w-0 flex-col gap-2">
                                    <div className="flex min-w-0 rounded-md border border-border/50 bg-muted/30 p-px">
                                        {(["date", "range"] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => {
                                                    setDateMode(mode);
                                                    setDatePreset(
                                                        mode === "date"
                                                            ? "custom"
                                                            : datePreset === "today" || datePreset === "yesterday"
                                                              ? "custom"
                                                              : datePreset,
                                                    );
                                                }}
                                                className={cn(
                                                    "min-w-0 flex-1 rounded px-1.5 py-1 text-center text-[11px] font-semibold transition-colors",
                                                    dateMode === mode
                                                        ? "bg-background text-foreground shadow-sm"
                                                        : "text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                {mode === "date" ? "Date" : "Date range"}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex min-w-0 flex-wrap gap-1">
                                        {getSalesDatePresetOptions(dateMode).map((preset) => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => applyDatePreset(preset.value)}
                                                className={cn(
                                                    "min-w-0 max-w-full rounded-full border px-2 py-0.5 text-center text-[11px] font-medium transition-colors",
                                                    datePreset === preset.value
                                                        ? "border-primary/40 bg-primary/10 text-primary"
                                                        : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                                )}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="min-w-0 max-w-full overflow-x-auto">
                                        {dateMode === "date" ? (
                                            <DateCalendar
                                                mode="single"
                                                className="mx-auto p-1 [--cell-size:--spacing(6)]"
                                                selected={specificDate}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        setSpecificDate(date);
                                                        setDatePreset("custom");
                                                    }
                                                }}
                                                autoFocus
                                            />
                                        ) : (
                                            <DateCalendar
                                                mode="range"
                                                className="mx-auto p-1 [--cell-size:--spacing(6)]"
                                                selected={{ from: customFromDate ?? undefined, to: customToDate ?? undefined }}
                                                onSelect={(range) => {
                                                    setDatePreset("custom");
                                                    setCustomFromDate(range?.from ?? null);
                                                    setCustomToDate(range?.to ?? null);
                                                }}
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-end border-t border-border/50 pt-3">
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="rounded-lg"
                                            disabled={
                                                dateMode === "range" &&
                                                datePreset === "custom" &&
                                                (!customFromDate || !customToDate)
                                            }
                                            onClick={confirmDateFilter}
                                        >
                                            Confirm
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        {appliedIsSingleDate ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-8 shrink-0 rounded-r-2xl rounded-l-md shadow-xs"
                                aria-label="Next date"
                                onClick={() => shiftSingleDate(1)}
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        ) : null}
                    </div>
                    <form
                        className="relative min-w-[180px] flex-1 sm:max-w-[220px]"
                        role="search"
                        onSubmit={(event: FormEvent<HTMLFormElement>) => {
                            event.preventDefault();
                            onUpdateFilters({ search: searchInput.trim() || undefined });
                        }}
                    >
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchInput}
                            onChange={(event) => onSearchInputChange(event.target.value)}
                            aria-label="Search bills"
                            placeholder="Search bills"
                            className="h-8 rounded-full pl-8 text-sm"
                        />
                    </form>
                    {hasToolbarFilters ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full px-2.5 text-muted-foreground"
                            onClick={clearToolbarFilters}
                        >
                            <RotateCcw className="size-3.5" />
                            Clear
                        </Button>
                    ) : null}
                </div>

                    <SalesSummaryBar summary={salesList?.summary ?? null} />

                    {isSalesLoading ? (
                        <div className="flex min-h-[320px] items-center justify-center" aria-busy="true" aria-label="Loading bills">
                            <Spinner className="size-6 text-primary" />
                        </div>
                    ) : organizationNotFound ? (
                        <Alert role="alert">
                            <AlertTitle>Organization was not found</AlertTitle>
                            <AlertDescription>This organization is not available. Return to the organizations list to continue.</AlertDescription>
                        </Alert>
                    ) : isSalesError ? (
                        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/20 bg-destructive/5 p-5 text-center">
                            <ReceiptText className="size-8 text-destructive/70" />
                            <p className="mt-3 font-medium text-foreground">Recent bills failed to load</p>
                            <p className="mt-1 text-sm text-muted-foreground">{salesErrorMessage || "Please refresh the page."}</p>
                        </div>
                    ) : sales.length === 0 ? (
                        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 p-5 text-center">
                            <ReceiptText className="size-8 text-muted-foreground/50" />
                            <p className="mt-3 font-medium text-foreground">No bills found</p>
                            <p className="mt-1 text-sm text-muted-foreground">No bills in this view yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-1.5 xl:grid-cols-2">
                            {sales.map((saleRow) => {
                                const storeHref = organizationInspectionPath(organizationId, "stores", saleRow.store.id);
                                return (
                                    <div
                                        key={saleRow.id}
                                        className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/70 px-3 py-2 transition-all hover:border-primary/20 hover:bg-card/90 hover:shadow-xs"
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    {saleRow.tokenNumber ? (
                                                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                                                            Token {saleRow.tokenNumber}
                                                        </span>
                                                    ) : null}
                                                    {saleRow.saleNumber ? (
                                                        <span className="rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/70">
                                                            Bill {saleRow.saleNumber}
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500">
                                                            Draft
                                                        </span>
                                                    )}
                                                </div>
                                                {saleRow.customerName ? (
                                                    <span className="min-w-0 max-w-full truncate rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400">
                                                        {saleRow.customerName}
                                                    </span>
                                                ) : null}
                                            </div>
                                            {renderSaleMetaRow(saleRow)}
                                            {!filters.storeId ? (
                                                <a
                                                    href={storeHref}
                                                    className="mt-0.5 inline-block truncate text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                                                    onClick={(event) => onFollowLink(event, storeHref)}
                                                >
                                                    {saleRow.store.name}
                                                </a>
                                            ) : null}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <div className="hidden sm:block">
                                                <div className="flex flex-col items-end gap-1">
                                                    {renderPaymentStatusBadge(saleRow)}
                                                    {renderPaymentMethodBadges(saleRow)}
                                                </div>
                                            </div>
                                            <div className="w-20 text-right">
                                                <p className="text-sm font-bold text-foreground">{formatCurrency(saleRow.grandTotal)}</p>
                                                {saleRow.status !== "draft" && saleRow.status !== "voided" ? (
                                                    <p className={cn("mt-0.5 text-[9px] font-bold", Number(saleRow.dueTotal) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400")}>
                                                        {Number(saleRow.dueTotal) > 0 ? `Due ${formatCurrency(saleRow.dueTotal)}` : "Paid in full"}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 rounded-lg px-2.5 text-[11px]"
                                                onClick={() => onOpenSale(saleRow.id)}
                                            >
                                                Open Details
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {salesList && salesList.pagination.totalCount > limit ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onUpdateFilters({ page: page - 1 })}>
                                    <ChevronLeft className="size-4" />
                                    Previous
                                </Button>
                                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onUpdateFilters({ page: page + 1 })}>
                                    Next
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        </div>
                    ) : null}
            </div>

            <ReadOnlySaleDialog
                open={Boolean(resourceId)}
                onClose={onCloseSale}
                isLoading={isSaleLoading}
                isError={isSaleError}
                errorCode={saleErrorCode}
                errorMessage={saleErrorMessage}
                sale={sale}
            />
        </div>
    );
};

export default ConsoleBillingInspection;
