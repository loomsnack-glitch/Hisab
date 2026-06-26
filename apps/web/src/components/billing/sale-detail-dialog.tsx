import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collectPayment, getSale, voidSale } from "@repo/services";
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
import { AlertTriangle, CircleDollarSign, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { billingKeys } from "@/lib/query-keys";
import { formatCurrency, formatDateTime } from "@/lib/format";

type SaleDetailDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
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
    organizationId,
    storeId,
    saleId,
}: SaleDetailDialogProps) => {
    const queryClient = useQueryClient();
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
        queryFn: () => getSale(organizationId, storeId, saleId as string),
        enabled: open && Boolean(saleId),
    });

    const sale = saleQuery.data?.status === "success" ? saleQuery.data.data?.sale ?? null : null;

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
        mutationFn: () => collectPayment(organizationId, storeId, saleId as string, paymentDraft),
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
        mutationFn: () => voidSale(organizationId, storeId, saleId as string, voidDraft),
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-[32px] border-border/70 bg-background/95 p-0 shadow-2xl backdrop-blur-xl">
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
                        <div className="border-b border-border/60 px-6 py-5 sm:px-8">
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
                                <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                    <span>Created {formatDateTime(sale.createdAt)}</span>
                                    <span>Updated {formatDateTime(sale.updatedAt)}</span>
                                    {sale.customer?.name ? <span>Customer: {sale.customer.name}</span> : <span>Walk-in sale</span>}
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-5">
                                <Card className="rounded-[28px] border-border/60 bg-card/70">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-2">
                                            <ReceiptText className="size-4 text-primary" />
                                            <h3 className="font-semibold text-foreground">Line items</h3>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            {sale.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/75 px-4 py-3"
                                                >
                                                    <div>
                                                        <p className="font-medium text-foreground">{item.productNameSnapshot}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {item.quantity} × {formatCurrency(item.unitPriceSnapshot)}
                                                            {Number(item.discountAmount) > 0 ? ` • Discount ${formatCurrency(item.discountAmount)}` : ""}
                                                        </p>
                                                    </div>
                                                    <p className="font-semibold text-foreground">{formatCurrency(item.lineTotal)}</p>
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
                                        <div className="mt-4 space-y-3">
                                            {sale.payments.length === 0 ? (
                                                <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-5 text-sm text-muted-foreground">
                                                    No money collected yet for this bill.
                                                </div>
                                            ) : (
                                                sale.payments.map((payment) => (
                                                    <div
                                                        key={payment.id}
                                                        className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/75 px-4 py-3"
                                                    >
                                                        <div>
                                                            <p className="font-medium capitalize text-foreground">
                                                                {payment.method.replace("_", " ")}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {formatDateTime(payment.collectedAt)}
                                                                {payment.referenceNumber ? ` • Ref ${payment.referenceNumber}` : ""}
                                                            </p>
                                                        </div>
                                                        <p className="font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-5">
                                <Card className="rounded-[28px] border-border/60 bg-slate-950 text-white shadow-xl shadow-slate-950/20">
                                    <CardContent className="space-y-4 p-5">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Settlement</p>
                                            <p className="text-3xl font-semibold tracking-tight">{formatCurrency(sale.grandTotal)}</p>
                                        </div>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-center justify-between text-white/75">
                                                <span>Subtotal</span>
                                                <span>{formatCurrency(sale.subtotal)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-white/75">
                                                <span>Discount</span>
                                                <span>{formatCurrency(sale.discountTotal)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-white/75">
                                                <span>Collected</span>
                                                <span>{formatCurrency(sale.paidTotal)}</span>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold">
                                                <span>Due</span>
                                                <span>{formatCurrency(sale.dueTotal)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {formError ? (
                                    <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                        {formError}
                                    </div>
                                ) : null}

                                {sale.status === "completed" && Number(sale.dueTotal) > 0 ? (
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

                                {sale.status === "completed" && Number(sale.paidTotal) === 0 ? (
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
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SaleDetailDialog;
