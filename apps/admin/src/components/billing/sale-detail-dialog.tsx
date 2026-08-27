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
    resendPosWhatsAppInvoice,
    resendWhatsAppInvoice,
    retryWhatsAppInvoice,
    voidPosSale,
    voidSale,
} from "@repo/services";
import type { CreatePaymentJSON, PaymentMethod, SaleDetailDTO, VoidSaleJSON } from "@repo/types";
import { formatSaleServiceModeLabel } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Separator } from "@repo/ui/components/separator";
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
    Hash,
    Link2,
    Printer,
    ReceiptText,
    Smartphone,
    User,
    Pencil,
    UtensilsCrossed,
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

const paymentMethodIcon = (method: string) => {
    const normalized = method.toLowerCase();
    if (normalized === "cash") return Banknote;
    if (normalized === "card") return CreditCard;
    if (normalized === "upi") return Smartphone;
    return CircleDollarSign;
};

const paymentMethodColor = (method: string) => {
    const normalized = method.toLowerCase();
    if (normalized === "cash") return "text-emerald-600 dark:text-emerald-400";
    if (normalized === "card") return "text-violet-600 dark:text-violet-400";
    if (normalized === "upi") return "text-sky-600 dark:text-sky-400";
    return "text-muted-foreground";
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
            const isSending = ["queued", "sending"].includes(whatsappInvoice?.messageStatus ?? "")
                || ["pending", "processing", "reconciling"].includes(whatsappInvoice?.outboxStatus ?? "");
            const canResend = Boolean(whatsappInvoice?.messageStatus) && !canRetry && !isSending;
            if (mode === "device") {
                return canRetry
                    ? retryPosWhatsAppInvoice(saleId as string)
                    : canResend
                      ? resendPosWhatsAppInvoice(saleId as string)
                      : queuePosWhatsAppInvoice(saleId as string);
            }
            return canRetry
                ? retryWhatsAppInvoice(organizationId, storeId, saleId as string)
                : canResend
                  ? resendWhatsAppInvoice(organizationId, storeId, saleId as string)
                  : queueWhatsAppInvoice(organizationId, storeId, saleId as string);
        },
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message || "Invoice could not be queued for WhatsApp");
                return;
            }
            toast.success(whatsappInvoice?.messageStatus ? "Invoice sent again" : "Invoice queued for WhatsApp");
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

    const isInvoiceSending = ["queued", "sending"].includes(whatsappInvoice?.messageStatus ?? "")
        || ["pending", "processing", "reconciling"].includes(whatsappInvoice?.outboxStatus ?? "");
    const whatsappInvoiceLabel = whatsappInvoiceMutation.isPending
        ? "Queueing..."
        : isInvoiceSending
            ? "Sending..."
            : whatsappInvoice?.outboxStatus === "retryable" || whatsappInvoice?.outboxStatus === "dead_letter"
                ? "Retry WhatsApp"
                : whatsappInvoice?.messageStatus
                    ? "Send again"
                    : "WhatsApp";

    return (
        <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
            <DialogContent
                className="gap-0 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto overflow-x-hidden rounded-2xl border-border/70 bg-background p-0 shadow-2xl sm:max-w-5xl"
                showCloseButton
            >
                {saleQuery.isPending ? (
                    <div className="flex min-h-[360px] items-center justify-center">
                        <Spinner className="size-6 text-primary" />
                    </div>
                ) : saleQuery.isError || saleQuery.data?.status === "error" || !sale ? (
                    <div className="p-8">
                        <Card className="rounded-xl border-border/70">
                            <CardContent className="flex min-h-[200px] items-center justify-center">
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
                    <div>
                        {/* Header */}
                        <div className="border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center gap-2 pr-10">
                                    {canMutate && sale.status === "completed" && onEdit ? (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => {
                                                onEdit(sale);
                                                onOpenChange(false);
                                            }}
                                            className="h-8 rounded-lg px-2.5"
                                        >
                                            <Pencil className="size-4" />
                                            Edit
                                        </Button>
                                    ) : null}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrint}
                                        className="h-8 rounded-lg px-2.5"
                                    >
                                        <Printer className="size-4" />
                                        Print
                                    </Button>
                                    {sale.status === "completed" ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={whatsappInvoiceMutation.isPending || whatsappInvoiceQuery.isPending || isInvoiceSending}
                                            onClick={() => whatsappInvoiceMutation.mutate()}
                                            className="h-8 rounded-lg px-2.5"
                                        >
                                            <Smartphone className="size-4 text-[#25D366]" />
                                            {whatsappInvoiceLabel}
                                        </Button>
                                    ) : null}
                                    {sale.status === "completed" && sale.paymentStatus !== "paid" && sale.customerId ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={dueReminderMutation.isPending || whatsappDueReminderQuery.isPending}
                                            onClick={() => dueReminderMutation.mutate()}
                                            className="h-8 rounded-lg px-2.5"
                                        >
                                            <Clock className="size-4 text-orange-500" />
                                            {dueReminderMutation.isPending
                                                ? "Queueing..."
                                                : whatsappDueReminder
                                                  ? "Remind again"
                                                  : "Remind due"}
                                        </Button>
                                    ) : null}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadTxt}
                                        className="h-8 rounded-lg px-2.5"
                                    >
                                        <Download className="size-4" />
                                        Download
                                    </Button>
                                </div>

                                <DialogHeader className="min-w-0 space-y-3 text-left">
                                    {(sale.tokenNumber ||
                                        sale.serviceTableLabel ||
                                        (sale.kotHistory && sale.kotHistory.length > 0) ||
                                        (sale.kotNumbers && sale.kotNumbers.length > 0)) && (
                                        <div className="flex flex-wrap gap-2">
                                            {sale.tokenNumber ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground">
                                                    <Hash className="size-3.5 shrink-0" />
                                                    Token {sale.tokenNumber}
                                                </span>
                                            ) : null}
                                            {sale.serviceTableLabel ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground">
                                                    <UtensilsCrossed className="size-3.5 shrink-0" />
                                                    Table {sale.serviceTableLabel}
                                                </span>
                                            ) : null}
                                            {sale.kotHistory && sale.kotHistory.length > 0 ? (
                                                sale.kotHistory.map((kot) => (
                                                    <span
                                                        key={kot.kotNumber}
                                                        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground"
                                                    >
                                                        <ReceiptText className="size-3.5 shrink-0" />
                                                        {kot.kotNumber} ·{" "}
                                                        {kot.fulfillmentType === "pick_up" ? "Pick-Up" : "Dine-In"}
                                                    </span>
                                                ))
                                            ) : sale.kotNumbers && sale.kotNumbers.length > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground">
                                                    <ReceiptText className="size-3.5 shrink-0" />
                                                    KOT {sale.kotNumbers.join(", ")}
                                                </span>
                                            ) : null}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                        <DialogTitle className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                                            {sale.saleNumber ? `Bill ${sale.saleNumber}` : "Draft bill"}
                                        </DialogTitle>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Badge
                                                className={cn("rounded-md border text-xs capitalize", saleStatusStyles[sale.status])}
                                            >
                                                {sale.status}
                                            </Badge>
                                            <Badge
                                                className={cn(
                                                    "rounded-md border text-xs capitalize",
                                                    paymentStatusStyles[sale.paymentStatus],
                                                )}
                                            >
                                                {sale.paymentStatus}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="rounded-md text-xs text-muted-foreground"
                                            >
                                                {formatSaleServiceModeLabel(sale.serviceMode)}
                                            </Badge>
                                            {sale.status === "completed" && whatsappInvoice?.messageStatus ? (
                                                <Badge
                                                    className="rounded-md border border-[#25D366]/25 bg-[#25D366]/10 text-xs text-[#168c45] dark:text-[#6ee7a1]"
                                                >
                                                    WhatsApp {whatsappInvoice.messageStatus}
                                                </Badge>
                                            ) : null}
                                            {sale.status === "completed" &&
                                            sale.paymentStatus !== "paid" &&
                                            sale.customerId &&
                                            whatsappDueReminder?.messageStatus ? (
                                                <Badge
                                                    className="rounded-md border border-orange-500/25 bg-orange-500/10 text-xs text-orange-700 dark:text-orange-300"
                                                >
                                                    Reminder {whatsappDueReminder.messageStatus}
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>

                                    <DialogDescription className="flex flex-col gap-2 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <User className="size-4 shrink-0" />
                                            <span className="font-medium text-foreground">
                                                {sale.customer?.name || "Walk-in Customer"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="size-4 shrink-0" />
                                            <span>{formatDateTime(sale.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="size-4 shrink-0" />
                                            <span>Updated {formatDateTime(sale.updatedAt)}</span>
                                        </div>
                                        {sale.replacementOfSaleId ? (
                                            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                                                <Link2 className="size-4 shrink-0" />
                                                <span>
                                                    Edited from{" "}
                                                    {sale.replacementOfSaleNumber
                                                        ? `Bill ${sale.replacementOfSaleNumber}`
                                                        : "linked bill"}
                                                </span>
                                            </div>
                                        ) : sale.replacementSaleId ? (
                                            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                                                <Link2 className="size-4 shrink-0" />
                                                <span>
                                                    Edited as{" "}
                                                    {sale.replacementSaleNumber
                                                        ? `Bill ${sale.replacementSaleNumber}`
                                                        : "linked bill"}
                                                </span>
                                            </div>
                                        ) : null}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="grid gap-6 px-5 py-5 sm:px-6 md:grid-cols-[1fr_280px] md:gap-8">
                            <div className="space-y-6 min-w-0">
                                {/* Line items */}
                                <section className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            Items
                                            <span className="ml-2 text-muted-foreground font-normal">
                                                ({sale.items.length})
                                            </span>
                                        </h3>
                                    </div>
                                    <div className="rounded-xl border border-border/60 overflow-hidden">
                                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-0 border-b border-border/60 bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid-cols-[1fr_80px_96px]">
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
                                                const itemDiscountPct = formatDiscountPercentage(
                                                    displayedItemDiscount,
                                                    Number(item.unitPriceSnapshot) * Number(item.quantity),
                                                );
                                                const configuredLineTotal =
                                                    Number(item.lineTotal) +
                                                    addOns.reduce((total, addOn) => total + Number(addOn.lineTotal), 0);

                                                return (
                                                    <div key={item.id} className="px-4 py-3">
                                                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-start sm:grid-cols-[1fr_80px_96px]">
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-sm text-foreground leading-snug">
                                                                    {item.productNameSnapshot}
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                                    {formatCurrency(item.unitPriceSnapshot)} each
                                                                    {displayedItemDiscount > 0 && (
                                                                        <span className="text-rose-500">
                                                                            {" "}
                                                                            · -{formatCurrency(displayedItemDiscount)}
                                                                            {itemDiscountPct ? ` (${itemDiscountPct})` : ""}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground text-right tabular-nums">
                                                                {Number(item.quantity)}
                                                            </p>
                                                            <p className="text-sm font-semibold text-foreground text-right tabular-nums">
                                                                {formatCurrency(configuredLineTotal)}
                                                            </p>
                                                        </div>

                                                        {addOns.length > 0 ? (
                                                            <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-border/40">
                                                                {addOns.map((addOn) => {
                                                                    const addOnDiscountAmount = Number(addOn.discountAmount);
                                                                    const addOnDiscountPct = formatDiscountPercentage(
                                                                        addOnDiscountAmount,
                                                                        Number(addOn.unitPriceSnapshot) * Number(addOn.totalQuantity),
                                                                    );

                                                                    return (
                                                                        <div
                                                                            key={addOn.id}
                                                                            className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-start sm:grid-cols-[1fr_80px_96px]"
                                                                        >
                                                                            <div className="min-w-0">
                                                                                <p className="text-sm text-foreground/85">
                                                                                    + {addOn.addOnNameSnapshot}
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    {formatCurrency(addOn.unitPriceSnapshot)} each
                                                                                    {addOnDiscountAmount > 0
                                                                                        ? ` · -${formatCurrency(addOnDiscountAmount)}${addOnDiscountPct ? ` (${addOnDiscountPct})` : ""}`
                                                                                        : ""}
                                                                                </p>
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground text-right tabular-nums">
                                                                                {Number(addOn.totalQuantity)}
                                                                            </p>
                                                                            <p className="text-sm font-medium text-foreground/90 text-right tabular-nums">
                                                                                {formatCurrency(addOn.lineTotal)}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : null}

                                                        {bundleComponents.length > 0 ? (
                                                            <div className="mt-2 space-y-2 pl-3 border-l-2 border-border/40">
                                                                {bundleComponents.map((component) => (
                                                                    <div key={component.id} className="space-y-1">
                                                                        <p className="text-sm text-foreground/85">
                                                                            {component.productNameSnapshot}
                                                                            <span className="text-muted-foreground">
                                                                                {" "}
                                                                                × {Number(component.totalQuantity)}
                                                                            </span>
                                                                            {Number(component.priceAdjustmentSnapshot ?? 0) !== 0 ? (
                                                                                <span className="text-muted-foreground">
                                                                                    {" "}
                                                                                    ·{" "}
                                                                                    {Number(component.priceAdjustmentSnapshot) > 0
                                                                                        ? "+"
                                                                                        : ""}
                                                                                    {formatCurrency(component.priceAdjustmentSnapshot)}
                                                                                </span>
                                                                            ) : null}
                                                                        </p>
                                                                        {(component.addOns ?? []).length > 0 ? (
                                                                            <div className="space-y-0.5 pl-2">
                                                                                {(component.addOns ?? []).map((addOn) => {
                                                                                    const addOnDiscountAmount =
                                                                                        Number(addOn.unitDiscountSnapshot) *
                                                                                        Number(addOn.totalQuantity);
                                                                                    const addOnDiscountPct = formatDiscountPercentage(
                                                                                        addOnDiscountAmount,
                                                                                        Number(addOn.unitPriceSnapshot) * Number(addOn.totalQuantity),
                                                                                    );

                                                                                    return (
                                                                                        <p
                                                                                            key={addOn.id}
                                                                                            className="text-xs text-muted-foreground"
                                                                                        >
                                                                                            + {addOn.addOnNameSnapshot} ×{" "}
                                                                                            {Number(addOn.totalQuantity)} ·{" "}
                                                                                            {formatCurrency(
                                                                                                (Number(addOn.unitPriceSnapshot) -
                                                                                                    Number(addOn.unitDiscountSnapshot)) *
                                                                                                    Number(addOn.totalQuantity),
                                                                                            )}
                                                                                            {addOnDiscountAmount > 0
                                                                                                ? ` · -${formatCurrency(addOnDiscountAmount)}${addOnDiscountPct ? ` (${addOnDiscountPct})` : ""}`
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
                                    </div>
                                </section>

                                {/* Payments */}
                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Payments
                                        {sale.payments.length > 0 ? (
                                            <span className="ml-2 text-muted-foreground font-normal">
                                                ({sale.payments.length})
                                            </span>
                                        ) : null}
                                    </h3>
                                    {sale.payments.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                                            No payments collected yet.
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-border/60 divide-y divide-border/50">
                                            {sale.payments.map((payment) => {
                                                const Icon = paymentMethodIcon(payment.method);
                                                const colorClass = paymentMethodColor(payment.method);

                                                return (
                                                    <div
                                                        key={payment.id}
                                                        className="flex items-center justify-between gap-4 px-4 py-3"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={cn("shrink-0", colorClass)}>
                                                                <Icon className="size-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium capitalize text-foreground">
                                                                    {payment.method.replace("_", " ")}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {formatDateTime(payment.collectedAt)}
                                                                    {payment.referenceNumber
                                                                        ? ` · Ref ${payment.referenceNumber}`
                                                                        : ""}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                                                            {formatCurrency(payment.amount)}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>

                                {canMutate && sale.status === "completed" && Number(sale.paidTotal) === 0 ? (
                                    <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-foreground">Void bill</h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Available because no payment has been collected yet.
                                            </p>
                                        </div>

                                        <Field>
                                            <FieldLabel>Reason</FieldLabel>
                                            <FieldContent>
                                                <Textarea
                                                    className="min-h-20 rounded-lg bg-background"
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
                                            className="w-full rounded-lg"
                                            disabled={voidSaleMutation.isPending || !voidDraft.reason.trim()}
                                            onClick={() => voidSaleMutation.mutate()}
                                        >
                                            {voidSaleMutation.isPending ? "Voiding..." : "Void bill"}
                                        </Button>
                                    </section>
                                ) : null}
                            </div>

                            {/* Summary sidebar */}
                            <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
                                <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Bill total
                                        </p>
                                        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                                            {formatCurrency(sale.grandTotal)}
                                        </p>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2.5 text-sm">
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Items subtotal</span>
                                            <span className="font-medium tabular-nums">
                                                {formatCurrency(discountedItemsSubtotal)}
                                            </span>
                                        </div>
                                        {itemDiscountTotal > 0 && (
                                            <div className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">Item discounts</span>
                                                <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">
                                                    -{formatCurrency(itemDiscountTotal)}
                                                    {itemDiscountPercentage ? ` (${itemDiscountPercentage})` : ""}
                                                </span>
                                            </div>
                                        )}
                                        {Number(sale.orderDiscountAmount) > 0 && (
                                            <div className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">Order discount</span>
                                                <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">
                                                    -{formatCurrency(sale.orderDiscountAmount)}
                                                    {orderDiscountPercentage ? ` (${orderDiscountPercentage})` : ""}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Collected</span>
                                            <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(sale.paidTotal)}
                                            </span>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="flex justify-between items-baseline gap-4">
                                        <span className="font-semibold text-foreground">Due</span>
                                        <span
                                            className={cn(
                                                "text-xl font-bold tabular-nums",
                                                Number(sale.dueTotal) > 0
                                                    ? "text-amber-600 dark:text-amber-400"
                                                    : "text-emerald-600 dark:text-emerald-400",
                                            )}
                                        >
                                            {formatCurrency(sale.dueTotal)}
                                        </span>
                                    </div>
                                </div>

                                {formError ? (
                                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                                        {formError}
                                    </div>
                                ) : null}

                                {canMutate && sale.status === "completed" && Number(sale.dueTotal) > 0 ? (
                                    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-foreground">Collect payment</h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Record the next payment for this bill.
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
                                                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
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
                                                    className="h-10 rounded-lg"
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
                                                    className="h-10 rounded-lg"
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
                                                    className="min-h-20 rounded-lg"
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
                                            className="w-full rounded-lg"
                                            disabled={
                                                collectPaymentMutation.isPending ||
                                                paymentValues.amount <= 0 ||
                                                paymentValues.amount > Number(sale.dueTotal)
                                            }
                                            onClick={() => collectPaymentMutation.mutate()}
                                        >
                                            {collectPaymentMutation.isPending ? "Collecting..." : "Collect payment"}
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SaleDetailDialog;
