import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    collectPayment,
    collectPosPayment,
    getPosSale,
    getPosWhatsAppDueReminderStatus,
    getPosWhatsAppInvoiceStatus,
    getSale,
    getWhatsAppDueReminderStatus,
    getWhatsAppInvoiceStatus,
    queuePosWhatsAppInvoice,
    queuePosWhatsAppDueReminder,
    queueWhatsAppInvoice,
    queueWhatsAppDueReminder,
    retryPosWhatsAppInvoice,
    retryWhatsAppInvoice,
    voidPosSale,
    voidSale,
} from "@repo/services";
import type { CreatePaymentJSON, PaymentMethod, SaleDetailDTO, VoidSaleJSON } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
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
    Link2,
    Printer,
    ReceiptText,
    Smartphone,
    User,
    Pencil,
} from "lucide-react";
import { toast } from "sonner";

import type { BillingWorkspaceMode } from "@/lib/billing-mode";
import { billingKeys, whatsappKeys } from "@/lib/query-keys";
import { formatCurrency, formatDateTime, formatDiscountPercentage } from "@/lib/format";
import { buildReceiptText, type ReceiptContext } from "@/lib/receipt-text";
import { printReceiptText } from "@/lib/print-receipt-text";
import { useOptionalPosPrinter } from "@/providers/pos-printer-provider";

type SaleDetailDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: BillingWorkspaceMode;
    organizationId: string;
    storeId: string;
    saleId: string | null;
    receiptContext: ReceiptContext;
    onEdit?: (sale: SaleDetailDTO) => void;
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
    receiptContext,
    onEdit,
}: SaleDetailDialogProps) => {
    const queryClient = useQueryClient();
    const canMutate = mode === "device";
    const [paymentDraft, setPaymentDraft] = useState<CreatePaymentJSON | null>(null);
    const [voidDraft, setVoidDraft] = useState<VoidSaleJSON>({ reason: "" });
    const [formError, setFormError] = useState<string | null>(null);
    const posPrinter = useOptionalPosPrinter();

    const saleQuery = useQuery({
        queryKey: saleId ? billingKeys.sale(organizationId, storeId, saleId) : ["billing", "sale", "idle"],
        queryFn: () =>
            mode === "device" ? getPosSale(saleId as string) : getSale(organizationId, storeId, saleId as string),
        enabled: open && Boolean(saleId),
    });

    const sale = saleQuery.data?.status === "success" ? (saleQuery.data.data?.sale ?? null) : null;
    const whatsappInvoiceQuery = useQuery({
        queryKey: saleId
            ? mode === "device"
                ? whatsappKeys.posInvoice(saleId)
                : whatsappKeys.invoice(organizationId, storeId, saleId)
            : ["whatsapp", "invoice", "idle"],
        queryFn: () =>
            mode === "device"
                ? getPosWhatsAppInvoiceStatus(saleId as string)
                : getWhatsAppInvoiceStatus(organizationId, storeId, saleId as string),
        enabled: open && Boolean(saleId),
    });

    const whatsappInvoice = whatsappInvoiceQuery.data?.status === "success"
        ? (whatsappInvoiceQuery.data.data ?? null)
        : null;
    const whatsappDueReminderQuery = useQuery({
        queryKey: saleId
            ? mode === "device"
                ? whatsappKeys.posDueReminder(saleId)
                : whatsappKeys.dueReminder(organizationId, storeId, saleId)
            : ["whatsapp", "due-reminder", "idle"],
        queryFn: () =>
            mode === "device"
                ? getPosWhatsAppDueReminderStatus(saleId as string)
                : getWhatsAppDueReminderStatus(organizationId, storeId, saleId as string),
        enabled: open && Boolean(saleId) && Boolean(sale?.customerId),
    });
    const whatsappDueReminder = whatsappDueReminderQuery.data?.status === "success"
        ? (whatsappDueReminderQuery.data.data ?? null)
        : null;
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

    const defaultPaymentDraft: CreatePaymentJSON = {
        amount: Number(sale?.dueTotal ?? 0),
        method: "cash",
        referenceNumber: "",
        notes: "",
    };
    const paymentValues = paymentDraft ?? defaultPaymentDraft;
    const updatePaymentDraft = (patch: Partial<CreatePaymentJSON>) => {
        setPaymentDraft((current) => ({
            ...(current ?? defaultPaymentDraft),
            ...patch,
        }));
    };

    const invalidateBilling = () => {
        queryClient.invalidateQueries({
            queryKey: billingKeys.organization(organizationId),
        });
    };

    const collectPaymentMutation = useMutation({
        mutationFn: () =>
            mode === "device"
                ? collectPosPayment(saleId as string, paymentValues)
                : collectPayment(organizationId, storeId, saleId as string, paymentValues),
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

    const whatsappInvoiceMutation = useMutation({
        mutationFn: () => {
            const canRetry = whatsappInvoice?.outboxStatus === "retryable" || whatsappInvoice?.outboxStatus === "dead_letter";
            if (mode === "device") {
                return canRetry ? retryPosWhatsAppInvoice(saleId as string) : queuePosWhatsAppInvoice(saleId as string);
            }
            return canRetry
                ? retryWhatsAppInvoice(organizationId, storeId, saleId as string)
                : queueWhatsAppInvoice(organizationId, storeId, saleId as string);
        },
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message || "Invoice could not be queued for WhatsApp");
                return;
            }
            toast.success("Invoice queued for WhatsApp");
            void whatsappInvoiceQuery.refetch();
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Invoice could not be queued for WhatsApp");
        },
    });

    const dueReminderMutation = useMutation({
        mutationFn: () => {
            if (!sale?.customerId) throw new Error("This bill has no customer");
            return mode === "device"
                ? queuePosWhatsAppDueReminder(sale.customerId, undefined, sale.id)
                : queueWhatsAppDueReminder(organizationId, storeId, sale.customerId, undefined, sale.id);
        },
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message || "Due reminder could not be queued");
                return;
            }
            toast.success("Due reminder queued for WhatsApp");
            void whatsappDueReminderQuery.refetch();
        },
        onError: (error: { message?: string }) => toast.error(error?.message || "Due reminder could not be queued"),
    });

    const handlePrint = async () => {
        if (!sale) return;

        if (mode === "device") {
            if (!posPrinter?.supported) {
                toast.error("WebUSB is unavailable; use Chrome or Edge on localhost or HTTPS");
                return;
            }

            if (!posPrinter.connected) {
                toast.error("Connect the 80mm USB printer before printing");
                return;
            }

            try {
                await posPrinter.printSale(sale, receiptContext);
                toast.success("Receipt sent to printer");
            } catch (error) {
                toast.error((error as { message?: string })?.message || "Receipt printing failed");
            }
            return;
        }

        printReceiptText({
            text: buildReceiptText(sale, receiptContext),
            title: sale.saleNumber ? `Bill_${sale.saleNumber}` : "Receipt",
        });
    };

    const handleDownloadTxt = () => {
        if (!sale) return;

        const text = buildReceiptText(sale, receiptContext);

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
        <>
        <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
            <DialogContent className="max-h-[92vh] w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-4xl sm:max-w-4xl md:max-w-4xl lg:max-w-4xl overflow-y-auto overflow-x-hidden rounded-[32px] border-border/70 bg-background/95 p-0 shadow-2xl backdrop-blur-xl">
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
                                        {saleQuery.data?.message ||
                                            (
                                                saleQuery.error as {
                                                    message?: string;
                                                }
                                            )?.message ||
                                            "Please try again."}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {/* Interactive screen header */}
                        <div className="border-b border-border/60 px-6 py-5 sm:px-8">
                            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <DialogHeader className="min-w-0 flex-1 space-y-3">
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="min-w-0">
                                            {sale.tokenNumber ? (
                                                <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                                                    Token {sale.tokenNumber}
                                                </p>
                                            ) : null}
                                            <DialogTitle className="whitespace-nowrap font-display text-3xl font-semibold tracking-tight">
                                                {sale.saleNumber ? `Bill ${sale.saleNumber}` : "Draft bill"}
                                            </DialogTitle>
                                        </div>
                                        <div className="flex items-center gap-2 pb-1">
                                            <Badge
                                                className={cn("rounded-full border text-xs", saleStatusStyles[sale.status])}
                                            >
                                                {sale.status}
                                            </Badge>
                                            {sale.status === "completed" ? (
                                                <Badge className="rounded-full border border-[#25D366]/25 bg-[#25D366]/10 text-xs text-[#168c45] dark:text-[#6ee7a1]">
                                                    WhatsApp {whatsappInvoice?.messageStatus ?? "not sent"}
                                                </Badge>
                                            ) : null}
                                            {sale.status === "completed" && sale.paymentStatus !== "paid" && sale.customerId ? (
                                                <Badge className="rounded-full border border-orange-500/25 bg-orange-500/10 text-xs text-orange-700 dark:text-orange-300">
                                                    Due reminder {whatsappDueReminder?.messageStatus ?? "not sent"}
                                                </Badge>
                                            ) : null}
                                            <Badge
                                                className={cn(
                                                    "rounded-full border text-xs",
                                                    paymentStatusStyles[sale.paymentStatus],
                                                )}
                                            >
                                                {sale.paymentStatus}
                                            </Badge>
                                        </div>
                                    </div>
                                    <DialogDescription className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="size-3.5" />
                                            <span>
                                                Created:{" "}
                                                <span className="text-foreground/80">
                                                    {formatDateTime(sale.createdAt)}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="size-3.5" />
                                            <span>
                                                Updated:{" "}
                                                <span className="text-foreground/80">
                                                    {formatDateTime(sale.updatedAt)}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <User className="size-3.5" />
                                            <span>
                                                Customer:{" "}
                                                <span className="text-foreground/80 font-semibold">
                                                    {sale.customer?.name || "Walk-in Customer"}
                                                </span>
                                            </span>
                                        </div>
                                        {sale.replacementOfSaleId ? (
                                            <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                                                <Link2 className="size-3.5" />
                                                <span>
                                                    Edited from:{" "}
                                                    {sale.replacementOfSaleNumber
                                                        ? `Bill ${sale.replacementOfSaleNumber}`
                                                        : "linked bill"}
                                                </span>
                                            </div>
                                        ) : sale.replacementSaleId ? (
                                            <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                                                <Link2 className="size-3.5" />
                                                <span>
                                                    Edited as:{" "}
                                                    {sale.replacementSaleNumber
                                                        ? `Bill ${sale.replacementSaleNumber}`
                                                        : "linked bill"}
                                                </span>
                                            </div>
                                        ) : null}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex min-w-0 w-full flex-wrap items-center gap-2 pr-8 sm:w-auto sm:max-w-[52%] sm:justify-end">
                                    {canMutate && sale.status === "completed" && onEdit ? (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => {
                                                onEdit(sale);
                                                onOpenChange(false);
                                            }}
                                            className="h-9 rounded-xl px-2.5 cursor-pointer"
                                            title="Edit bill"
                                        >
                                            <Pencil className="size-4" />
                                            <span className="hidden lg:inline">Edit bill</span>
                                        </Button>
                                    ) : null}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrint}
                                        className="h-9 rounded-xl px-2.5 cursor-pointer"
                                        title="Print bill"
                                    >
                                        <Printer className="size-4" />
                                        <span className="hidden lg:inline">Print</span>
                                    </Button>
                                    {sale.status === "completed" ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={whatsappInvoiceMutation.isPending || whatsappInvoiceQuery.isPending}
                                            onClick={() => whatsappInvoiceMutation.mutate()}
                                            className="h-9 rounded-xl px-2.5 cursor-pointer"
                                            title="Send bill on WhatsApp"
                                        >
                                            <Smartphone className="size-4 text-[#25D366]" />
                                                <span className="hidden lg:inline">
                                                {whatsappInvoiceMutation.isPending
                                                    ? "Queueing..."
                                                    : whatsappInvoice?.outboxStatus === "retryable" || whatsappInvoice?.outboxStatus === "dead_letter"
                                                      ? "Retry WhatsApp"
                                                      : whatsappInvoice?.messageStatus
                                                        ? "Send again"
                                                        : "WhatsApp"}
                                            </span>
                                        </Button>
                                    ) : null}
                                    {sale.status === "completed" && sale.paymentStatus !== "paid" && sale.customerId ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={dueReminderMutation.isPending || whatsappDueReminderQuery.isPending}
                                            onClick={() => dueReminderMutation.mutate()}
                                            className="h-9 rounded-xl px-2.5 cursor-pointer"
                                            title="Send due reminder"
                                        >
                                            <Clock className="size-4 text-orange-500" />
                                            <span className="hidden lg:inline">{dueReminderMutation.isPending ? "Queueing..." : whatsappDueReminder ? "Remind again" : "Remind due"}</span>
                                        </Button>
                                    ) : null}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadTxt}
                                        className="h-9 rounded-xl px-2.5 cursor-pointer"
                                        title="Download bill text"
                                    >
                                        <Download className="size-4" />
                                        <span className="hidden lg:inline">Download</span>
                                    </Button>
                                </div>
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
                                                                Number(addOn.unitDiscountSnapshot) *
                                                                    Number(addOn.totalQuantity),
                                                            0,
                                                        ),
                                                    0,
                                                );
                                                const displayedItemDiscount = Math.max(
                                                    Number(item.discountAmount) - comboChildAddOnDiscount,
                                                    0,
                                                );
                                                const itemDiscountPercentage = formatDiscountPercentage(
                                                    displayedItemDiscount,
                                                    Number(item.unitPriceSnapshot) * Number(item.quantity),
                                                );
                                                const configuredLineTotal =
                                                    Number(item.lineTotal) +
                                                    addOns.reduce((total, addOn) => total + Number(addOn.lineTotal), 0);

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="rounded-2xl border border-border/50 bg-background/40 px-4 py-3.5"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-start gap-3">
                                                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                                    <ReceiptText className="size-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-sm text-foreground/90">
                                                                        {item.productNameSnapshot}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold text-foreground/75">
                                                                            Qty {Number(item.quantity)}
                                                                        </span>
                                                                        <span>×</span>
                                                                        <span>
                                                                            {formatCurrency(item.unitPriceSnapshot)}
                                                                        </span>
                                                                        {displayedItemDiscount > 0 && (
                                                                            <span className="text-rose-500 font-medium">
                                                                                (Disc. -
                                                                                {formatCurrency(displayedItemDiscount)}
                                                                                {itemDiscountPercentage
                                                                                    ? `, ${itemDiscountPercentage}`
                                                                                    : ""})
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <p className="font-bold text-sm text-foreground">
                                                                {formatCurrency(configuredLineTotal)}
                                                            </p>
                                                        </div>

                                                        {addOns.length > 0 ? (
                                                            <div className="mt-3 space-y-2 border-l border-border/60 ml-3.5 pl-4">
                                                                {addOns.map((addOn) => {
                                                                    const addOnDiscountAmount = Number(addOn.discountAmount);
                                                                    const addOnDiscountPercentage = formatDiscountPercentage(
                                                                        addOnDiscountAmount,
                                                                        Number(addOn.unitPriceSnapshot) * Number(addOn.totalQuantity),
                                                                    );

                                                                    return (
                                                                        <div
                                                                            key={addOn.id}
                                                                            className="flex items-center justify-between gap-3"
                                                                        >
                                                                            <div>
                                                                                <p className="text-sm text-foreground/85">
                                                                                    + {addOn.addOnNameSnapshot}
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                                    Qty {Number(addOn.totalQuantity)} ×{" "}
                                                                                    {formatCurrency(addOn.unitPriceSnapshot)}
                                                                                    {addOnDiscountAmount > 0
                                                                                        ? ` (Disc. -${formatCurrency(addOnDiscountAmount)}${addOnDiscountPercentage ? `, ${addOnDiscountPercentage}` : ""})`
                                                                                        : ""}
                                                                                </p>
                                                                            </div>
                                                                            <p className="text-sm font-semibold text-foreground/90">
                                                                                {formatCurrency(addOn.lineTotal)}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : null}

                                                        {bundleComponents.length > 0 ? (
                                                            <div className="mt-3 space-y-2 border-l border-border/60 ml-3.5 pl-4">
                                                                {bundleComponents.map((component) => (
                                                                    <div key={component.id} className="space-y-1.5">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div>
                                                                                <p className="text-sm text-foreground/85">
                                                                                    {component.productNameSnapshot}
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                                    Qty{" "}
                                                                                    {Number(component.totalQuantity)}
                                                                                    {Number(
                                                                                        component.priceAdjustmentSnapshot ??
                                                                                            0,
                                                                                    ) !== 0
                                                                                        ? ` • Adjustment ${Number(component.priceAdjustmentSnapshot) > 0 ? "+" : ""}${formatCurrency(component.priceAdjustmentSnapshot)}`
                                                                                        : ""}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        {(component.addOns ?? []).length > 0 ? (
                                                                            <div className="space-y-1 border-l border-border/50 ml-2 pl-3">
                                                                                {(component.addOns ?? []).map((addOn) => {
                                                                                    const addOnDiscountAmount =
                                                                                        Number(addOn.unitDiscountSnapshot) *
                                                                                        Number(addOn.totalQuantity);
                                                                                    const addOnDiscountPercentage = formatDiscountPercentage(
                                                                                        addOnDiscountAmount,
                                                                                        Number(addOn.unitPriceSnapshot) * Number(addOn.totalQuantity),
                                                                                    );

                                                                                    return (
                                                                                        <p
                                                                                            key={addOn.id}
                                                                                            className="text-xs text-muted-foreground"
                                                                                        >
                                                                                            + {addOn.addOnNameSnapshot}{" "}
                                                                                            × {Number(addOn.totalQuantity)} •{" "}
                                                                                            {formatCurrency(
                                                                                                (Number(addOn.unitPriceSnapshot) -
                                                                                                    Number(addOn.unitDiscountSnapshot)) *
                                                                                                    Number(addOn.totalQuantity),
                                                                                            )}
                                                                                            {addOnDiscountAmount > 0
                                                                                                ? ` (Disc. -${formatCurrency(addOnDiscountAmount)}${addOnDiscountPercentage ? `, ${addOnDiscountPercentage}` : ""})`
                                                                                                : ""}
                                                                                        </p>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        ) : null}
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
                                                            className="group flex items-center justify-between rounded-2xl border border-border/50 bg-background/40 hover:bg-background/80 px-4 py-3.5 transition-all duration-200"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div
                                                                    className={cn(
                                                                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold",
                                                                        colorClass,
                                                                    )}
                                                                >
                                                                    <Icon className="size-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-sm capitalize text-foreground/90">
                                                                        {payment.method.replace("_", " ")}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {formatDateTime(payment.collectedAt)}
                                                                        {payment.referenceNumber
                                                                            ? ` • Ref: ${payment.referenceNumber}`
                                                                            : ""}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <p className="font-bold text-sm text-foreground">
                                                                {formatCurrency(payment.amount)}
                                                            </p>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {canMutate && sale.status === "completed" && Number(sale.paidTotal) === 0 ? (
                                    <Card className="rounded-[28px] border-destructive/20 bg-destructive/5">
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
                                                        onChange={(event) =>
                                                            setVoidDraft({
                                                                reason: event.target.value,
                                                            })
                                                        }
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

                            <div className="space-y-5">
                                <Card className="rounded-[28px] border border-primary/20 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-xl shadow-black/35 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.1),_transparent_40%)]" />
                                    <CardContent className="relative space-y-5 p-6">
                                        <div className="space-y-1.5 pb-2 border-b border-white/5">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">
                                                Settlement Total
                                            </p>
                                            <p className="text-4xl font-extrabold tracking-tight text-white">
                                                {formatCurrency(sale.grandTotal)}
                                            </p>
                                        </div>
                                        <div className="space-y-3.5 text-xs">
                                            <div className="flex items-center justify-between gap-4 text-white/70 w-full">
                                                <span className="font-medium">Items subtotal</span>
                                                <span className="font-semibold text-white/90">
                                                    {formatCurrency(discountedItemsSubtotal)}
                                                </span>
                                            </div>
                                            {itemDiscountTotal > 0 && (
                                                <div className="flex items-center justify-between gap-4 text-white/60 w-full">
                                                    <span className="font-medium">Item discount included</span>
                                                    <span className="font-semibold text-white/80">
                                                        {formatCurrency(itemDiscountTotal)}
                                                        {itemDiscountPercentage ? ` (${itemDiscountPercentage})` : ""}
                                                    </span>
                                                </div>
                                            )}
                                            {Number(sale.orderDiscountAmount) > 0 && (
                                                <div className="flex items-center justify-between gap-4 text-white/70 w-full">
                                                    <span className="font-medium">Order discount</span>
                                                    <span className="font-semibold text-white/90">
                                                        -{formatCurrency(sale.orderDiscountAmount)}
                                                        {orderDiscountPercentage ? ` (${orderDiscountPercentage})` : ""}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between gap-4 text-white/70 w-full">
                                                <span className="font-medium">Collected</span>
                                                <span className="font-semibold text-emerald-400">
                                                    {formatCurrency(sale.paidTotal)}
                                                </span>
                                            </div>
                                            <div className="border-t border-white/10 my-2" />
                                            <div className="flex items-center justify-between gap-4 pt-1.5 w-full">
                                                <span className="text-sm font-bold text-white/80">Due Amount</span>
                                                <span
                                                    className={cn(
                                                        "text-lg font-extrabold",
                                                        Number(sale.dueTotal) > 0
                                                            ? "text-amber-400"
                                                            : "text-emerald-400",
                                                    )}
                                                >
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
                                    <Card className="rounded-[28px] border-border/60 bg-card/70">
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
                                                    <select
                                                        value={paymentValues.method}
                                                        onChange={(event) =>
                                                            updatePaymentDraft({
                                                                method: event.target.value as PaymentMethod,
                                                            })
                                                        }
                                                        aria-label="Payment method"
                                                        className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                                                    >
                                                        {paymentMethods.map((method) => (
                                                            <option key={method.value} value={method.value}>
                                                                {method.label}
                                                            </option>
                                                        ))}
                                                    </select>
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
                                                        value={paymentValues.amount}
                                                        onChange={(event) =>
                                                            updatePaymentDraft({
                                                                amount: Number(event.target.value || 0),
                                                            })
                                                        }
                                                    />
                                                    <FieldError
                                                        errors={
                                                            paymentValues.amount > Number(sale.dueTotal)
                                                                ? [
                                                                      {
                                                                          message:
                                                                              "Amount cannot exceed the remaining due total",
                                                                      },
                                                                  ]
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
                                                        value={paymentValues.referenceNumber ?? ""}
                                                        onChange={(event) =>
                                                            updatePaymentDraft({
                                                                referenceNumber: event.target.value,
                                                            })
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
                                                        value={paymentValues.notes ?? ""}
                                                        onChange={(event) =>
                                                            updatePaymentDraft({
                                                                notes: event.target.value,
                                                            })
                                                        }
                                                    />
                                                </FieldContent>
                                            </Field>

                                            <Button
                                                className="w-full rounded-2xl"
                                                disabled={
                                                    collectPaymentMutation.isPending ||
                                                    paymentValues.amount <= 0 ||
                                                    paymentValues.amount > Number(sale.dueTotal)
                                                }
                                                onClick={() => collectPaymentMutation.mutate()}
                                            >
                                                {collectPaymentMutation.isPending ? "Collecting..." : "Collect payment"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : null}

                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
        </>
    );
};

export default SaleDetailDialog;
