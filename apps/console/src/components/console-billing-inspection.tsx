import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import {
    addCalendarDays,
    kolkataCalendarDate,
    type PaymentMethod,
    type PlatformBillingInspectionQueryJSON,
    type PlatformSaleInspectionDetailDTO,
    type PlatformSaleInspectionListDTO,
    type PlatformSaleInspectionSummaryDTO,
    type SalesSort,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Calendar as DateCalendar } from "@repo/ui/components/calendar";
import { Card, CardContent } from "@repo/ui/components/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import {
    ArrowLeft,
    ArrowUpDown,
    Banknote,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    Clock,
    CreditCard,
    Filter,
    ReceiptText,
    Search,
    Smartphone,
    Store,
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

const FilterPill = ({
    active,
    children,
    onClick,
    tone = "neutral",
}: {
    active: boolean;
    children: string;
    onClick: () => void;
    tone?: "neutral" | "primary";
}) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer",
            active
                ? tone === "primary"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-foreground text-background shadow-md shadow-foreground/5"
                : "bg-muted/40 border border-border/10 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        )}
    >
        {children}
    </button>
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
            <DialogContent className="max-h-[92vh] w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-4xl overflow-y-auto overflow-x-hidden rounded-[32px] border-border/70 bg-background/95 p-0 shadow-2xl backdrop-blur-xl">
                {isLoading ? (
                    <div className="flex min-h-[420px] items-center justify-center" aria-busy="true" aria-label="Loading bill">
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
                    <div className="space-y-0">
                        <div className="border-b border-border/60 px-6 py-5 sm:px-8">
                            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <DialogHeader className="min-w-0 flex-1 space-y-3">
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="min-w-0">
                                            <DialogTitle className="whitespace-nowrap font-display text-3xl font-semibold tracking-tight">
                                                {sale.saleNumber ? `Bill ${sale.saleNumber}` : "Draft bill"}
                                            </DialogTitle>
                                        </div>
                                        <div className="flex items-center gap-2 pb-1">
                                            <span className={cn("rounded-full border px-2.5 py-0.5 text-xs capitalize", saleStatusStyles[sale.status])}>
                                                {sale.status}
                                            </span>
                                            <span className={cn("rounded-full border px-2.5 py-0.5 text-xs capitalize", paymentStatusStyles[sale.paymentStatus])}>
                                                {sale.paymentStatus}
                                            </span>
                                        </div>
                                    </div>
                                    <DialogDescription className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="size-3.5" />
                                            Created: <span className="text-foreground/80">{formatDateTime(sale.createdAt)}</span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="size-3.5" />
                                            Store: <span className="font-semibold text-foreground/80">{sale.store.name}</span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <User className="size-3.5" />
                                            Customer:{" "}
                                            <span className="font-semibold text-foreground/80">
                                                {sale.customer?.name || sale.customerName || "Walk-in Customer"}
                                            </span>
                                        </span>
                                    </DialogDescription>
                                </DialogHeader>
                                <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl" onClick={onClose}>
                                    <ArrowLeft className="size-4" />
                                    Back to billing
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-6 px-6 py-6 sm:px-8 grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-5">
                                <Card className="rounded-[28px] border-border/60 bg-card/70">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-2">
                                            <ReceiptText className="size-4 text-primary" />
                                            <h3 className="font-semibold text-foreground">Line items</h3>
                                        </div>
                                        <div className="mt-4 space-y-2">
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
                                                    <div key={item.id} className="rounded-2xl border border-border/50 bg-background/40 px-4 py-3.5">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-start gap-3">
                                                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                                    <ReceiptText className="size-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-sm text-foreground/90">{item.productNameSnapshot}</p>
                                                                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground/75">
                                                                            Qty {Number(item.quantity)}
                                                                        </span>
                                                                        <span>×</span>
                                                                        <span>{formatCurrency(item.unitPriceSnapshot)}</span>
                                                                        {displayedItemDiscount > 0 ? (
                                                                            <span className="font-medium text-rose-500">
                                                                                (Disc. -{formatCurrency(displayedItemDiscount)}
                                                                                {itemDiscountLabel ? `, ${itemDiscountLabel}` : ""})
                                                                            </span>
                                                                        ) : null}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm font-bold text-foreground">{formatCurrency(configuredLineTotal)}</p>
                                                        </div>
                                                        {addOns.length > 0 ? (
                                                            <div className="ml-3.5 mt-3 space-y-2 border-l border-border/60 pl-4">
                                                                {addOns.map((addOn) => (
                                                                    <div key={addOn.id} className="flex items-center justify-between gap-3">
                                                                        <div>
                                                                            <p className="text-sm text-foreground/85">+ {addOn.addOnNameSnapshot}</p>
                                                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                                                Qty {Number(addOn.totalQuantity)} × {formatCurrency(addOn.unitPriceSnapshot)}
                                                                            </p>
                                                                        </div>
                                                                        <p className="text-sm font-semibold text-foreground/90">{formatCurrency(addOn.lineTotal)}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                        {bundleComponents.length > 0 ? (
                                                            <div className="ml-3.5 mt-3 space-y-2 border-l border-border/60 pl-4">
                                                                {bundleComponents.map((component) => (
                                                                    <div key={component.id} className="space-y-1.5">
                                                                        <p className="text-sm text-foreground/85">{component.productNameSnapshot}</p>
                                                                        <p className="text-xs text-muted-foreground">Qty {Number(component.totalQuantity)}</p>
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
                                    </CardContent>
                                </Card>

                                <Card className="rounded-[28px] border-border/60 bg-card/70">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-2">
                                            <CircleDollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
                                            <h3 className="font-semibold text-foreground">Payments</h3>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            {sale.payments.length === 0 ? (
                                                <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 px-4 py-6 text-center text-sm text-muted-foreground">
                                                    No money collected yet for this bill.
                                                </div>
                                            ) : (
                                                sale.payments.map((payment) => {
                                                    const method = payment.method.toLowerCase();
                                                    const Icon =
                                                        method === "cash"
                                                            ? Banknote
                                                            : method === "card"
                                                              ? CreditCard
                                                              : method === "upi"
                                                                ? Smartphone
                                                                : CircleDollarSign;
                                                    const colorClass =
                                                        method === "cash"
                                                            ? "bg-emerald-500/10 text-emerald-500"
                                                            : method === "card"
                                                              ? "bg-purple-500/10 text-purple-500"
                                                              : method === "upi"
                                                                ? "bg-blue-500/10 text-blue-500"
                                                                : "bg-zinc-500/10 text-zinc-400";
                                                    return (
                                                        <div
                                                            key={payment.id}
                                                            className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/40 px-4 py-3.5"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", colorClass)}>
                                                                    <Icon className="size-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold capitalize text-foreground/90">
                                                                        {payment.method.replace("_", " ")}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                                        {formatDateTime(payment.collectedAt)}
                                                                        {payment.referenceNumber ? ` • Ref: ${payment.referenceNumber}` : ""}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm font-bold text-foreground">{formatCurrency(payment.amount)}</p>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-[28px] border-border/60 bg-card/70">
                                    <CardContent className="p-5">
                                        <h3 className="font-semibold text-foreground">Device attribution</h3>
                                        <p className="mt-1 text-xs text-muted-foreground">Console-safe operational metadata only.</p>
                                        <div className="mt-3 space-y-1 text-sm">
                                            <p>{`Created by ${sale.createdByDevice?.name ?? "Unknown device"}`}</p>
                                            <p>{`Last updated by ${sale.updatedByDevice?.name ?? "Unknown device"}`}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-5">
                                <Card className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-xl shadow-black/35">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.1),_transparent_40%)]" />
                                    <CardContent className="relative space-y-5 p-6">
                                        <div className="space-y-1.5 border-b border-white/5 pb-2">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">Settlement Total</p>
                                            <p className="text-4xl font-extrabold tracking-tight text-white">{formatCurrency(sale.grandTotal)}</p>
                                        </div>
                                        <div className="space-y-3.5 text-xs">
                                            <div className="flex items-center justify-between gap-4 text-white/70">
                                                <span className="font-medium">Items subtotal</span>
                                                <span className="font-semibold text-white/90">{formatCurrency(discountedItemsSubtotal)}</span>
                                            </div>
                                            {itemDiscountTotal > 0 ? (
                                                <div className="flex items-center justify-between gap-4 text-white/60">
                                                    <span className="font-medium">Item discount included</span>
                                                    <span className="font-semibold text-white/80">
                                                        {formatCurrency(itemDiscountTotal)}
                                                        {itemDiscountPercentage ? ` (${itemDiscountPercentage})` : ""}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {Number(sale.orderDiscountAmount) > 0 ? (
                                                <div className="flex items-center justify-between gap-4 text-white/70">
                                                    <span className="font-medium">Order discount</span>
                                                    <span className="font-semibold text-white/90">
                                                        -{formatCurrency(sale.orderDiscountAmount)}
                                                        {orderDiscountPercentage ? ` (${orderDiscountPercentage})` : ""}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <div className="flex items-center justify-between gap-4 text-white/70">
                                                <span className="font-medium">Collected</span>
                                                <span className="font-semibold text-emerald-400">{formatCurrency(sale.paidTotal)}</span>
                                            </div>
                                            <div className="my-2 border-t border-white/10" />
                                            <div className="flex items-center justify-between gap-4 pt-1.5">
                                                <span className="text-sm font-bold text-white/80">Due Amount</span>
                                                <span className={cn("text-lg font-extrabold", Number(sale.dueTotal) > 0 ? "text-amber-400" : "text-emerald-400")}>
                                                    {formatCurrency(sale.dueTotal)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-[28px] border-border/60 bg-card/70">
                                    <CardContent className="p-5">
                                        <h3 className="font-medium">Receipt preview</h3>
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
    const appliedStartDate = filters.startDate;
    const appliedEndDate = filters.endDate;
    const appliedIsSingleDate = Boolean(appliedStartDate && appliedEndDate && appliedStartDate === appliedEndDate);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [dateMode, setDateMode] = useState<SalesDateMode>(appliedIsSingleDate ? "date" : "range");
    const [datePreset, setDatePreset] = useState<SalesDatePreset>(appliedStartDate || appliedEndDate ? "custom" : "all");
    const [specificDate, setSpecificDate] = useState<Date>(appliedIsSingleDate ? parseCalendarDate(appliedStartDate!) : parseCalendarDate(today));
    const [customFromDate, setCustomFromDate] = useState<Date | null>(appliedStartDate ? parseCalendarDate(appliedStartDate) : null);
    const [customToDate, setCustomToDate] = useState<Date | null>(appliedEndDate ? parseCalendarDate(appliedEndDate) : null);

    useEffect(() => {
        if (datePopoverOpen) return;
        const isSingle = Boolean(filters.startDate && filters.endDate && filters.startDate === filters.endDate);
        setDateMode(isSingle ? "date" : "range");
        setDatePreset(filters.startDate || filters.endDate ? "custom" : "all");
        if (isSingle && filters.startDate) setSpecificDate(parseCalendarDate(filters.startDate));
        setCustomFromDate(filters.startDate ? parseCalendarDate(filters.startDate) : null);
        setCustomToDate(filters.endDate ? parseCalendarDate(filters.endDate) : null);
    }, [datePopoverOpen, filters.endDate, filters.startDate]);

    const stores = salesList?.stores ?? [];
    const sales = salesList?.sales ?? [];
    const selectedStoreName = stores.find((store) => store.id === filters.storeId)?.name;
    const dateLabel = !appliedStartDate && !appliedEndDate
        ? "All dates"
        : appliedIsSingleDate
            ? formatSalesDate(appliedStartDate!)
            : `${formatSalesDate(appliedStartDate ?? appliedEndDate!)} — ${formatSalesDate(appliedEndDate ?? appliedStartDate!)}`;

    const applyDateRange = (startDate?: string, endDate?: string) => {
        onUpdateFilters({ startDate, endDate });
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
            applyDateRange(undefined, undefined);
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
    const draftCount = sales.filter((saleRow) => saleRow.status === "draft").length;
    const openDueCount = sales.filter((saleRow) => saleRow.status === "completed" && saleRow.paymentStatus !== "paid").length;
    const organizationNotFound = salesErrorCode === 404 || salesErrorMessage === "Organization not found";

    const dateTrigger = useMemo(
        () => (
            <Button type="button" variant="outline" className="h-8 min-w-0 max-w-[280px] justify-start gap-2 rounded-lg px-2.5 text-xs">
                <Calendar className="size-3.5 shrink-0" />
                <span className="truncate">{dateLabel}</span>
            </Button>
        ),
        [dateLabel],
    );

    return (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-xl shadow-black/5">
            <header className="flex flex-col gap-3 border-b border-border/50 bg-card/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-display text-xl font-bold tracking-tight text-foreground">Billing history</h2>
                    <p className="text-xs text-muted-foreground">Read-only inspection · not the Dashboard reporting period</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <form
                        className="relative min-w-0 flex-1 sm:w-56 sm:flex-none"
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
                            placeholder="Search bill number or customer"
                            className="h-9 rounded-xl pl-8 text-sm"
                        />
                    </form>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Store className="size-4" />
                        <span className="hidden sm:inline">Store:</span>
                    </div>
                    <Select
                        value={filters.storeId ?? "all"}
                        onValueChange={(value) => onUpdateFilters({ storeId: value === "all" ? undefined : value || undefined })}
                    >
                        <SelectTrigger aria-label="Store filter" className="h-9 min-w-[160px] max-w-[240px] rounded-xl bg-background/80 px-3 text-sm">
                            <SelectValue placeholder="All stores">{selectedStoreName ?? "All stores"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent align="end">
                            <SelectItem value="all">All stores</SelectItem>
                            {stores.map((storeOption) => (
                                <SelectItem key={storeOption.id} value={storeOption.id}>{storeOption.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:min-w-0">
                    <div className="mb-6 space-y-4">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                            <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                            {salesSortOptions.map((option) => (
                                <FilterPill
                                    key={option.value}
                                    active={(filters.sort ?? "newest") === option.value}
                                    onClick={() => onUpdateFilters({ sort: option.value })}
                                >
                                    {option.label}
                                </FilterPill>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                            <div className="flex flex-wrap items-center gap-2">
                                <Filter className="size-3.5 shrink-0 text-muted-foreground" />
                                {salesPaymentMethodOptions.map((option) => (
                                    <FilterPill
                                        key={option.value}
                                        tone="primary"
                                        active={(filters.paymentMethod ?? "all") === option.value}
                                        onClick={() =>
                                            onUpdateFilters({
                                                paymentMethod: option.value === "all"
                                                    ? undefined
                                                    : option.value as PlatformBillingInspectionQueryJSON["paymentMethod"],
                                            })}
                                    >
                                        {option.label}
                                    </FilterPill>
                                ))}
                            </div>
                            <div className="hidden h-4 w-px bg-border/40 sm:block" />
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                                {appliedIsSingleDate ? (
                                    <Button type="button" variant="outline" size="icon" className="size-8 shrink-0 rounded-lg" aria-label="Previous date" onClick={() => shiftSingleDate(-1)}>
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                ) : null}
                                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                                    <PopoverTrigger render={dateTrigger} />
                                    <PopoverContent align="start" className="w-[240px] max-w-[calc(100vw-1rem)] overflow-hidden p-2">
                                        <div className="flex min-w-0 flex-col gap-2">
                                            <div className="flex min-w-0 rounded-md border border-border/50 bg-muted/30 p-px">
                                                {(["date", "range"] as const).map((mode) => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => {
                                                            setDateMode(mode);
                                                            setDatePreset(mode === "date" ? "custom" : datePreset === "today" || datePreset === "yesterday" ? "custom" : datePreset);
                                                        }}
                                                        className={cn(
                                                            "min-w-0 flex-1 rounded px-1.5 py-1 text-center text-[11px] font-semibold transition-colors",
                                                            dateMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
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
                                                    disabled={dateMode === "range" && datePreset === "custom" && (!customFromDate || !customToDate)}
                                                    onClick={confirmDateFilter}
                                                >
                                                    Confirm
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                {appliedIsSingleDate ? (
                                    <Button type="button" variant="outline" size="icon" className="size-8 shrink-0 rounded-lg" aria-label="Next date" onClick={() => shiftSingleDate(1)}>
                                        <ChevronRight className="size-4" />
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {saleStatusOptions.map((option) => (
                                <FilterPill
                                    key={option.value}
                                    active={(filters.status ?? "all") === option.value}
                                    onClick={() =>
                                        onUpdateFilters({
                                            status: option.value === "all" ? undefined : option.value,
                                        })}
                                >
                                    {option.label}
                                </FilterPill>
                            ))}
                            <div className="hidden h-4 w-px bg-border/40 sm:block" />
                            {paymentStatusOptions.map((option) => (
                                <FilterPill
                                    key={option.value}
                                    tone="primary"
                                    active={(filters.paymentStatus ?? "all") === option.value}
                                    onClick={() =>
                                        onUpdateFilters({
                                            paymentStatus: option.value === "all" ? undefined : option.value,
                                        })}
                                >
                                    {option.label}
                                </FilterPill>
                            ))}
                        </div>
                    </div>

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
                                const href = organizationInspectionPath(organizationId, "billing", saleRow.id, filters);
                                const storeHref = organizationInspectionPath(organizationId, "stores", saleRow.store.id);
                                const billLabel = saleRow.saleNumber ? `Bill ${saleRow.saleNumber}` : "Draft";
                                return (
                                    <div
                                        key={saleRow.id}
                                        className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/70 px-3 py-2 transition-all hover:border-primary/20 hover:bg-card/90 hover:shadow-xs"
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <a
                                                    href={href}
                                                    className="shrink-0 whitespace-nowrap text-xs font-bold text-amber-500 dark:text-amber-400"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        onOpenSale(saleRow.id);
                                                    }}
                                                >
                                                    {billLabel}
                                                </a>
                                                <p className="min-w-0 truncate text-xs font-semibold text-foreground/80">
                                                    {saleRow.customerName || "Walk-in customer"}
                                                </p>
                                            </div>
                                            <p className="truncate text-[10px] text-muted-foreground/80">
                                                {saleRow.itemCount} item{saleRow.itemCount !== 1 ? "s" : ""} · {formatDateTime(saleRow.createdAt)}
                                            </p>
                                            <a
                                                href={storeHref}
                                                className="truncate text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                                                onClick={(event) => onFollowLink(event, storeHref)}
                                            >
                                                {saleRow.store.name}
                                            </a>
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

                <aside className="hidden w-full flex-col border-t border-border/50 bg-card/90 lg:flex lg:w-[320px] lg:border-t-0 lg:border-l">
                    <div className="grid gap-3 px-5 py-5">
                        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Store</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{selectedStoreName ?? "All stores"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Bills in view</p>
                            <p className="mt-2 text-3xl font-semibold text-foreground">{sales.length}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Drafts, paid bills, open dues, and voided bills for this view.</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Drafts</p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{draftCount}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Open dues</p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{openDueCount}</p>
                        </div>
                    </div>
                </aside>
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
