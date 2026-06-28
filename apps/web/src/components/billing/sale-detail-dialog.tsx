import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collectPayment, collectPosPayment, getPosSale, getSale, voidPosSale, voidSale } from "@repo/services";
import type { CreatePaymentJSON, PaymentMethod, VoidSaleJSON } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";
import {
    AlertTriangle,
    Banknote,
    Calendar,
    CircleDollarSign,
    Clock,
    CreditCard,
    Download,
    Printer,
    ReceiptText,
    Smartphone,
    User,
} from "lucide-react";
import { toast } from "sonner";

import type { BillingWorkspaceMode } from "@/lib/billing-mode";
import { billingKeys } from "@/lib/query-keys";
import { formatCurrency, formatDateTime } from "@/lib/format";

type SaleDetailDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: BillingWorkspaceMode;
    organizationId: string;
    storeId: string;
    saleId: string | null;
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank transfer" },
    { value: "other", label: "Other" },
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

const SaleDetailDialog = ({
    open,
    onOpenChange,
    mode = "admin",
    organizationId,
    storeId,
    saleId,
}: SaleDetailDialogProps) => {
    const queryClient = useQueryClient();
    const canMutate = mode === "device";
    const [paymentDraft, setPaymentDraft] = useState<CreatePaymentJSON>({
        amount: 0,
        method: "cash",
        referenceNumber: "",
        notes: "",
    });
    const [voidDraft, setVoidDraft] = useState<VoidSaleJSON>({ reason: "" });
    const [formError, setFormError] = useState<string | null>(null);

    const saleQuery = useQuery({
        queryKey: saleId ? billingKeys.sale(organizationId, storeId, saleId) : ["billing", "sale", "idle"],
        queryFn: () => mode === "device" ? getPosSale(saleId as string) : getSale(organizationId, storeId, saleId as string),
        enabled: open && Boolean(saleId),
    });

    const sale = saleQuery.data?.status === "success" ? saleQuery.data.data?.sale ?? null : null;
    const itemDiscountTotal = sale
        ? sale.items.reduce((total, item) => total + Number(item.discountAmount ?? 0), 0)
        : 0;
    const discountedItemsSubtotal = sale
        ? Math.max(Number(sale.subtotal ?? 0) - itemDiscountTotal, 0)
        : 0;

    useEffect(() => {
        if (sale) {
            setPaymentDraft({
                amount: Number(sale.dueTotal ?? 0),
                method: "cash",
                referenceNumber: "",
                notes: "",
            });
            setVoidDraft({ reason: "" });
            setFormError(null);
        }
    }, [sale]);

    const invalidateBilling = () => {
        queryClient.invalidateQueries({ queryKey: billingKeys.organization(organizationId) });
    };

    const collectPaymentMutation = useMutation({
        mutationFn: () =>
            mode === "device"
                ? collectPosPayment(saleId as string, paymentDraft)
                : collectPayment(organizationId, storeId, saleId as string, paymentDraft),
        onSuccess: (response) => {
            if (response.status !== "success") {
                setFormError(response.message || "Failed to collect payment");
                return;
            }

            toast.success("Payment collected");
            setFormError(null);
            invalidateBilling();
        },
        onError: (error: { message?: string }) => {
            setFormError(error?.message || "Failed to collect payment");
        },
    });

    const voidSaleMutation = useMutation({
        mutationFn: () =>
            mode === "device"
                ? voidPosSale(saleId as string, voidDraft)
                : voidSale(organizationId, storeId, saleId as string, voidDraft),
        onSuccess: (response) => {
            if (response.status !== "success") {
                setFormError(response.message || "Failed to void sale");
                return;
            }

            toast.success("Sale voided");
            setFormError(null);
            invalidateBilling();
        },
        onError: (error: { message?: string }) => {
            setFormError(error?.message || "Failed to void sale");
        },
    });

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadTxt = () => {
        if (!sale) return;

        const separator = "------------------------------------------";
        const doubleSeparator = "==========================================";

        let text = "";
        text += `${doubleSeparator}\n`;
        text += `             INVOICE / RECEIPT\n`;
        text += `${doubleSeparator}\n`;
        text += `Bill #: ${sale.saleNumber ? sale.saleNumber : "Draft"}\n`;
        text += `Date: ${formatDateTime(sale.createdAt)}\n`;
        text += `Status: ${sale.status.toUpperCase()} (${sale.paymentStatus.toUpperCase()})\n`;
        text += `Customer: ${sale.customer?.name || "Walk-in Customer"}\n`;
        text += `${separator}\n`;
        text += `ITEM                    QTY    PRICE    TOTAL\n`;
        text += `${separator}\n`;

        sale.items.forEach((item) => {
            const name = item.productNameSnapshot.padEnd(20).substring(0, 20);
            const qty = String(Number(item.quantity)).padStart(5);
            const price = String(item.unitPriceSnapshot).padStart(8);
            const total = String(item.lineTotal).padStart(8);
            text += `${name}${qty}${price}${total}\n`;
            if (Number(item.discountAmount) > 0) {
                text += `  * Disc: -${item.discountAmount}\n`;
            }
        });

        text += `${separator}\n`;
        text += `Items Subtotal:`.padEnd(30) + String(discountedItemsSubtotal).padStart(12) + "\n";
        if (itemDiscountTotal > 0) {
            text += `Item Discount Included:`.padEnd(30) + String(itemDiscountTotal).padStart(12) + "\n";
        }
        if (Number(sale.orderDiscountAmount) > 0) {
            text += `Order Discount:`.padEnd(30) + String(sale.orderDiscountAmount).padStart(12) + "\n";
        }
        text += `Settlement Total:`.padEnd(30) + String(sale.grandTotal).padStart(12) + "\n";
        text += `Collected:`.padEnd(30) + String(sale.paidTotal).padStart(12) + "\n";
        text += `Due:`.padEnd(30) + String(sale.dueTotal).padStart(12) + "\n";
        text += `${doubleSeparator}\n`;
        text += `           Thank you for shopping!\n`;
        text += `${doubleSeparator}\n`;

        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Receipt_${sale.saleNumber || "draft"}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-4xl sm:max-w-4xl md:max-w-4xl lg:max-w-4xl overflow-y-auto overflow-x-hidden rounded-[32px] border-border/70 bg-background/95 p-0 shadow-2xl backdrop-blur-xl">
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }
                        #printable-bill, #printable-bill * {
                            visibility: visible !important;
                        }
                        #printable-bill {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            background: white !important;
                            color: black !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        #printable-bill-grid {
                            display: flex !important;
                            flex-direction: column !important;
                            gap: 20px !important;
                        }
                        .no-print, .no-print * {
                            display: none !important;
                            visibility: hidden !important;
                        }
                    }
                `}</style>
                {saleQuery.isPending ? (
                    <div className="flex min-h-[420px] items-center justify-center">
                        <Spinner className="size-6 text-primary" />
                    </div>
                ) : saleQuery.isError || saleQuery.data?.status === "error" || !sale ? (
                    <div className="p-8">
                        <Card className="rounded-[28px] border-border/70 bg-card/70">
                            <CardContent className="flex min-h-[240px] items-center justify-center">
                                <div className="space-y-3 text-center">
                                    <AlertTriangle className="mx-auto size-6 text-amber-500" />
                                    <p className="font-medium text-foreground">Unable to load this bill</p>
                                    <p className="text-sm text-muted-foreground">
                                        {saleQuery.data?.message || (saleQuery.error as { message?: string })?.message || "Please try again."}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {/* Interactive screen header */}
                        <div className="border-b border-border/60 px-6 py-5 sm:px-8 no-print">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <DialogHeader className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <DialogTitle className="font-display text-3xl font-semibold tracking-tight">
                                            {sale.saleNumber ? `Bill #${sale.saleNumber}` : "Draft bill"}
                                        </DialogTitle>
                                        <Badge className={cn("rounded-full border text-xs", saleStatusStyles[sale.status])}>
                                            {sale.status}
                                        </Badge>
                                        <Badge className={cn("rounded-full border text-xs", paymentStatusStyles[sale.paymentStatus])}>
                                            {sale.paymentStatus}
                                        </Badge>
                                    </div>
                                    <DialogDescription className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="size-3.5" />
                                            <span>Created: <span className="text-foreground/80">{formatDateTime(sale.createdAt)}</span></span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="size-3.5" />
                                            <span>Updated: <span className="text-foreground/80">{formatDateTime(sale.updatedAt)}</span></span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <User className="size-3.5" />
                                            <span>Customer: <span className="text-foreground/80 font-semibold">{sale.customer?.name || "Walk-in Customer"}</span></span>
                                        </div>
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <div className="flex items-center gap-2 self-start sm:self-auto mr-8 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrint}
                                        className="rounded-xl flex items-center gap-1.5 h-9 cursor-pointer"
                                    >
                                        <Printer className="size-4" />
                                        <span>Print</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadTxt}
                                        className="rounded-xl flex items-center gap-1.5 h-9 cursor-pointer"
                                    >
                                        <Download className="size-4" />
                                        <span>Download</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Printable container */}
                        <div id="printable-bill">
                            {/* Hidden-by-default Header for printing only */}
                            <div className="border-b border-border/60 px-6 py-5 print:block hidden">
                                <h1 className="font-display text-2xl font-bold tracking-tight text-black">
                                    {sale.saleNumber ? `Bill #${sale.saleNumber}` : "Draft bill"}
                                </h1>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-700 mt-2">
                                    <span>Created: {formatDateTime(sale.createdAt)}</span>
                                    <span>Customer: {sale.customer?.name || "Walk-in Customer"}</span>
                                </div>
                            </div>

                            <div id="printable-bill-grid" className="grid gap-6 px-6 py-6 sm:px-8 grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-5">
                                <Card className="rounded-[28px] border-border/60 bg-card/70">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-2">
                                            <ReceiptText className="size-4 text-primary" />
                                            <h3 className="font-semibold text-foreground">Line items</h3>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            {sale.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="group flex items-center justify-between rounded-2xl border border-border/50 bg-background/40 hover:bg-background/80 px-4 py-3.5 transition-all duration-200"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                            <ReceiptText className="size-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm text-foreground/90">{item.productNameSnapshot}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold text-foreground/75">
                                                                    Qty {Number(item.quantity)}
                                                                </span>
                                                                <span>×</span>
                                                                <span>{formatCurrency(item.unitPriceSnapshot)}</span>
                                                                {Number(item.discountAmount) > 0 && (
                                                                    <span className="text-rose-500 font-medium">
                                                                        (Disc. -{formatCurrency(item.discountAmount)})
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="font-bold text-sm text-foreground">{formatCurrency(item.lineTotal)}</p>
                                                </div>
                                            ))}
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
                                                    const Icon = method === "cash" ? Banknote : method === "card" ? CreditCard : method === "upi" ? Smartphone : CircleDollarSign;
                                                    const colorClass = method === "cash" ? "bg-emerald-500/10 text-emerald-500" : method === "card" ? "bg-purple-500/10 text-purple-500" : method === "upi" ? "bg-blue-500/10 text-blue-500" : "bg-zinc-500/10 text-zinc-400";
                                                    return (
                                                        <div
                                                            key={payment.id}
                                                            className="group flex items-center justify-between rounded-2xl border border-border/50 bg-background/40 hover:bg-background/80 px-4 py-3.5 transition-all duration-200"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold", colorClass)}>
                                                                    <Icon className="size-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-sm capitalize text-foreground/90">
                                                                        {payment.method.replace("_", " ")}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {formatDateTime(payment.collectedAt)}
                                                                        {payment.referenceNumber ? ` • Ref: ${payment.referenceNumber}` : ""}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <p className="font-bold text-sm text-foreground">{formatCurrency(payment.amount)}</p>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-5">
                                <Card className="rounded-[28px] border border-primary/20 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-xl shadow-black/35 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.1),_transparent_40%)]" />
                                    <CardContent className="relative space-y-5 p-6">
                                        <div className="space-y-1.5 pb-2 border-b border-white/5">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">Settlement Total</p>
                                            <p className="text-4xl font-extrabold tracking-tight text-white">{formatCurrency(sale.grandTotal)}</p>
                                        </div>
                                        <div className="space-y-3.5 text-xs">
                                            <div className="flex items-center justify-between gap-4 text-white/70 w-full">
                                                <span className="font-medium">Items subtotal</span>
                                                <span className="font-semibold text-white/90">{formatCurrency(discountedItemsSubtotal)}</span>
                                            </div>
                                            {itemDiscountTotal > 0 && (
                                                <div className="flex items-center justify-between gap-4 text-white/60 w-full">
                                                    <span className="font-medium">Item discount included</span>
                                                    <span className="font-semibold text-white/80">{formatCurrency(itemDiscountTotal)}</span>
                                                </div>
                                            )}
                                            {Number(sale.orderDiscountAmount) > 0 && (
                                                <div className="flex items-center justify-between gap-4 text-white/70 w-full">
                                                    <span className="font-medium">Order discount</span>
                                                    <span className="font-semibold text-white/90">-{formatCurrency(sale.orderDiscountAmount)}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between gap-4 text-white/70 w-full">
                                                <span className="font-medium">Collected</span>
                                                <span className="font-semibold text-emerald-400">{formatCurrency(sale.paidTotal)}</span>
                                            </div>
                                            <div className="border-t border-white/10 my-2" />
                                            <div className="flex items-center justify-between gap-4 pt-1.5 w-full">
                                                <span className="text-sm font-bold text-white/80">Due Amount</span>
                                                <span className={cn(
                                                    "text-lg font-extrabold",
                                                    Number(sale.dueTotal) > 0 ? "text-amber-400" : "text-emerald-400"
                                                )}>
                                                    {formatCurrency(sale.dueTotal)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {formError ? (
                                    <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                        {formError}
                                    </div>
                                ) : null}

                                {canMutate && sale.status === "completed" && Number(sale.dueTotal) > 0 ? (
                                    <Card className="rounded-[28px] border-border/60 bg-card/70 no-print">
                                        <CardContent className="space-y-4 p-5">
                                            <div>
                                                <h3 className="font-semibold text-foreground">Collect payment</h3>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Add the next money movement for this receivable sale.
                                                </p>
                                            </div>

                                            <Field>
                                                <FieldLabel>Method</FieldLabel>
                                                <FieldContent>
                                                    <Select
                                                        value={paymentDraft.method}
                                                        onValueChange={(value) =>
                                                            setPaymentDraft((current) => ({
                                                                ...current,
                                                                method: value as PaymentMethod,
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger className="h-11 w-full rounded-2xl">
                                                            <SelectValue placeholder="Select payment method" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {paymentMethods.map((method) => (
                                                                <SelectItem key={method.value} value={method.value}>
                                                                    {method.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FieldContent>
                                            </Field>

                                            <Field>
                                                <FieldLabel>Amount</FieldLabel>
                                                <FieldContent>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="h-11 rounded-2xl"
                                                        value={paymentDraft.amount}
                                                        onChange={(event) =>
                                                            setPaymentDraft((current) => ({
                                                                ...current,
                                                                amount: Number(event.target.value || 0),
                                                            }))
                                                        }
                                                    />
                                                    <FieldError
                                                        errors={
                                                            paymentDraft.amount > Number(sale.dueTotal)
                                                                ? [{ message: "Amount cannot exceed the remaining due total" }]
                                                                : undefined
                                                        }
                                                    />
                                                </FieldContent>
                                            </Field>

                                            <Field>
                                                <FieldLabel>Reference</FieldLabel>
                                                <FieldContent>
                                                    <Input
                                                        className="h-11 rounded-2xl"
                                                        placeholder="Optional reference number"
                                                        value={paymentDraft.referenceNumber ?? ""}
                                                        onChange={(event) =>
                                                            setPaymentDraft((current) => ({
                                                                ...current,
                                                                referenceNumber: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </FieldContent>
                                            </Field>

                                            <Field>
                                                <FieldLabel>Notes</FieldLabel>
                                                <FieldContent>
                                                    <Textarea
                                                        className="min-h-24 rounded-2xl"
                                                        placeholder="Optional payment note"
                                                        value={paymentDraft.notes ?? ""}
                                                        onChange={(event) =>
                                                            setPaymentDraft((current) => ({
                                                                ...current,
                                                                notes: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </FieldContent>
                                            </Field>

                                            <Button
                                                className="w-full rounded-2xl"
                                                disabled={
                                                    collectPaymentMutation.isPending
                                                    || paymentDraft.amount <= 0
                                                    || paymentDraft.amount > Number(sale.dueTotal)
                                                }
                                                onClick={() => collectPaymentMutation.mutate()}
                                            >
                                                {collectPaymentMutation.isPending ? "Collecting..." : "Collect payment"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : null}

                                {canMutate && sale.status === "completed" && Number(sale.paidTotal) === 0 ? (
                                    <Card className="rounded-[28px] border-destructive/20 bg-destructive/5 no-print">
                                        <CardContent className="space-y-4 p-5">
                                            <div>
                                                <h3 className="font-semibold text-foreground">Void bill</h3>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    This is available because no payment has been collected yet.
                                                </p>
                                            </div>

                                            <Field>
                                                <FieldLabel>Reason</FieldLabel>
                                                <FieldContent>
                                                    <Textarea
                                                        className="min-h-24 rounded-2xl bg-background/80"
                                                        placeholder="Why is this bill being voided?"
                                                        value={voidDraft.reason}
                                                        onChange={(event) => setVoidDraft({ reason: event.target.value })}
                                                    />
                                                </FieldContent>
                                            </Field>

                                            <Button
                                                variant="destructive"
                                                className="w-full rounded-2xl"
                                                disabled={voidSaleMutation.isPending || !voidDraft.reason.trim()}
                                                onClick={() => voidSaleMutation.mutate()}
                                            >
                                                {voidSaleMutation.isPending ? "Voiding..." : "Void bill"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SaleDetailDialog;
