import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { discardDraftPurchase, getPurchase, recordPurchase, createOutgoingPurchasePayment, reverseOutgoingPurchasePayment, voidPurchase } from "@repo/services";
import {
    OUTGOING_PAYMENT_METHOD_LABELS,
    OUTGOING_PAYMENT_REVERSAL_KIND_LABELS,
    isOutgoingPaymentActive,
} from "@repo/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { ArrowLeft, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import {
    PayableStatusBadge,
    PurchaseLifecycleBadge,
} from "@/components/purchases/purchase-status-badges";
import UpsertPurchaseDialog from "@/components/purchases/upsert-purchase-dialog";
import RecordOutgoingPaymentDialog from "@/components/purchases/record-outgoing-payment-dialog";
import PayableReasonDialog from "@/components/purchases/payable-reason-dialog";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/format";
import { moneyAccountKeys, purchaseKeys } from "@/lib/query-keys";

const PurchaseDetailPage = () => {
    const { organizationId = "", purchaseId = "" } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [discardOpen, setDiscardOpen] = useState(false);
    const [voidOpen, setVoidOpen] = useState(false);
    const [reversePaymentId, setReversePaymentId] = useState<string | null>(null);

    const purchaseQuery = useQuery({
        queryKey: purchaseKeys.detail(organizationId, purchaseId),
        queryFn: () => getPurchase(organizationId, purchaseId),
        enabled: Boolean(organizationId && purchaseId),
    });

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: purchaseKeys.list(organizationId) });
        await queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(organizationId, purchaseId) });
        await queryClient.invalidateQueries({ queryKey: moneyAccountKeys.all });
    };

    const recordMutation = useMutation({
        mutationFn: () => recordPurchase(organizationId, purchaseId),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                void invalidate();
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to record Purchase");
        },
    });

    const discardMutation = useMutation({
        mutationFn: () => discardDraftPurchase(organizationId, purchaseId),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                void queryClient.invalidateQueries({ queryKey: purchaseKeys.list(organizationId) });
                navigate(`/organizations/${organizationId}/purchases`);
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to discard Purchase");
        },
    });

    const reverseMutation = useMutation({
        mutationFn: (reason: string) =>
            reverseOutgoingPurchasePayment(
                organizationId,
                purchaseId,
                reversePaymentId as string,
                { reason },
            ),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                setReversePaymentId(null);
                void invalidate();
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to reverse Outgoing Payment");
        },
    });

    const voidMutation = useMutation({
        mutationFn: (reason: string) => voidPurchase(organizationId, purchaseId, { reason }),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                setVoidOpen(false);
                void invalidate();
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to void Purchase");
        },
    });

    if (purchaseQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (purchaseQuery.isError || purchaseQuery.data?.status === "error" || !purchaseQuery.data?.data) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load purchase</EmptyTitle>
                            <EmptyDescription>
                                {(purchaseQuery.error as { message?: string })?.message
                                    ?? purchaseQuery.data?.message
                                    ?? "Purchase could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => purchaseQuery.refetch()}
                            >
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    const purchase = purchaseQuery.data.data.purchase;
    const isDraft = purchase.lifecycle === "draft";
    const canSettle = purchase.lifecycle === "recorded" && (purchase.dueAmount ?? 0) > 0;

    return (
        <div className="space-y-4" data-testid="purchase-detail-page">
            <Button
                variant="ghost"
                className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                render={<Link to={`/organizations/${organizationId}/purchases`} />}
            >
                <ArrowLeft className="size-4" />
                Back to purchases
            </Button>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <ShoppingBag className="size-4" />
                            </div>
                            <div className="min-w-0 space-y-2">
                                <CardTitle className="font-display text-2xl">{purchase.vendorName}</CardTitle>
                                <CardDescription>
                                    {purchase.storeName}
                                    {" · "}
                                    {formatDateOnly(purchase.effectiveDate)}
                                    {purchase.invoiceReference ? ` · ${purchase.invoiceReference}` : ""}
                                </CardDescription>
                                <div className="flex flex-wrap items-center gap-2">
                                    <PurchaseLifecycleBadge lifecycle={purchase.lifecycle} />
                                    <PayableStatusBadge status={purchase.payableStatus} />
                                </div>
                            </div>
                        </div>
                        {isDraft ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <UpsertPurchaseDialog organizationId={organizationId} purchase={purchase} />
                                <Button
                                    className="rounded-full"
                                    disabled={recordMutation.isPending}
                                    onClick={() => recordMutation.mutate()}
                                >
                                    {recordMutation.isPending ? "Recording..." : "Record purchase"}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-full text-destructive"
                                    onClick={() => setDiscardOpen(true)}
                                >
                                    Discard draft
                                </Button>
                            </div>
                        ) : purchase.lifecycle === "recorded" ? (
                            <div className="flex flex-wrap items-center gap-2">
                                {canSettle ? (
                                    <RecordOutgoingPaymentDialog
                                        organizationId={organizationId}
                                        storeId={purchase.storeId}
                                        payableLabel={purchase.vendorName}
                                        dueAmount={purchase.dueAmount}
                                        recordPayment={(data) =>
                                            createOutgoingPurchasePayment(organizationId, purchase.id, data)
                                        }
                                        onRecorded={invalidate}
                                    />
                                ) : null}
                                <Button
                                    variant="outline"
                                    className="rounded-full text-destructive"
                                    onClick={() => setVoidOpen(true)}
                                >
                                    Void purchase
                                </Button>
                            </div>
                        ) : (
                            <UpsertPurchaseDialog
                                organizationId={organizationId}
                                copyFrom={purchase}
                                onRecorded={(created) => {
                                    navigate(`/organizations/${organizationId}/purchases/${created.id}`);
                                }}
                            />
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lines</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(purchase.linesTotal)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Adjustment</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(purchase.adjustment)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(purchase.total)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Paid</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(purchase.paidTotal)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Due</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">
                                {purchase.dueAmount === null ? "—" : formatCurrency(purchase.dueAmount)}
                            </p>
                        </div>
                    </div>

                    {purchase.voidReason ? (
                        <p className="text-sm text-muted-foreground">
                            Voided{purchase.voidedAt ? ` ${formatDateTime(purchase.voidedAt)}` : ""}
                            {`: ${purchase.voidReason}`}
                        </p>
                    ) : null}

                    {purchase.notes ? (
                        <p className="text-sm text-muted-foreground">{purchase.notes}</p>
                    ) : null}

                    <div>
                        <h3 className="mb-3 text-sm font-medium">Purchase Lines</h3>
                        {purchase.lines.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
                                This Draft Purchase has no lines yet.
                            </p>
                        ) : (
                            <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                                {purchase.lines.map((line) => (
                                    <div key={line.id} className="flex items-start justify-between gap-3 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="font-medium text-foreground">{line.vendorItemName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {line.quantity} {line.unitLabel}
                                                {" · "}
                                                {formatCurrency(line.agreedUnitPrice)} each
                                            </p>
                                        </div>
                                        <p className="shrink-0 text-sm font-semibold tabular-nums">
                                            {formatCurrency(line.lineTotal)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="mb-3 text-sm font-medium">Outgoing Payments</h3>
                        {purchase.outgoingPayments.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
                                {purchase.lifecycle === "recorded"
                                    ? "No Outgoing Payments recorded yet."
                                    : "Draft Purchases do not create Outgoing Payments."}
                            </p>
                        ) : (
                            <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                                {purchase.outgoingPayments.map((payment) => (
                                    <div key={payment.id} className="flex items-start justify-between gap-3 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="font-medium text-foreground">
                                                {OUTGOING_PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                                                {payment.moneyAccountName ? ` · ${payment.moneyAccountName}` : ""}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDateTime(payment.paidAt)}
                                                {payment.reference ? ` · ${payment.reference}` : ""}
                                            </p>
                                            {payment.reversedAt ? (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {payment.reversalKind
                                                        ? OUTGOING_PAYMENT_REVERSAL_KIND_LABELS[payment.reversalKind]
                                                        : "Reversed"}
                                                    {`: ${payment.reversalReason}`}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                            <p className="text-sm font-semibold tabular-nums">
                                                {formatCurrency(payment.amount)}
                                            </p>
                                            {purchase.lifecycle === "recorded" && isOutgoingPaymentActive(payment) ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-full text-destructive"
                                                    onClick={() => setReversePaymentId(payment.id)}
                                                >
                                                    Reverse payment
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Paid {formatCurrency(purchase.paidTotal)}
                        {purchase.recordedAt ? ` · Recorded ${formatDateTime(purchase.recordedAt)}` : ""}
                    </p>
                </CardContent>
            </Card>

            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard this Draft Purchase?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The draft will be removed. No payable balance, Outgoing Payment, or Money Account Movement has been created.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={discardMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={discardMutation.isPending}
                            onClick={(event) => {
                                event.preventDefault();
                                discardMutation.mutate();
                            }}
                        >
                            {discardMutation.isPending ? "Discarding..." : "Discard draft"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <PayableReasonDialog
                open={voidOpen}
                title="Void this Purchase?"
                description="Remaining due is cancelled and every still-active Outgoing Payment is reversed. Historical records stay in place."
                confirmLabel="Void purchase"
                pendingLabel="Voiding..."
                placeholder="Why is this Purchase being voided?"
                pending={voidMutation.isPending}
                onOpenChange={setVoidOpen}
                onConfirm={(reason) => voidMutation.mutate(reason)}
            />

            <PayableReasonDialog
                open={reversePaymentId != null}
                title="Reverse this Outgoing Payment?"
                description="The original payment stays on the Purchase. Totals are recalculated and any tracked Money Account debit is compensated."
                confirmLabel="Reverse payment"
                pendingLabel="Reversing..."
                placeholder="Why is this Outgoing Payment being reversed?"
                pending={reverseMutation.isPending}
                onOpenChange={(open) => {
                    if (!open) {
                        setReversePaymentId(null);
                    }
                }}
                onConfirm={(reason) => reverseMutation.mutate(reason)}
            />
        </div>
    );
};

export default PurchaseDetailPage;
