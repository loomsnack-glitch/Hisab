import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { discardDraftExpense, getExpense, recordExpense, createOutgoingExpensePayment } from "@repo/services";
import {
    OUTGOING_PAYMENT_METHOD_LABELS,
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
import { ArrowLeft, Banknote, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
    ExpenseLifecycleBadge,
    ExpensePayableStatusBadge,
} from "@/components/expenses/expense-status-badges";
import UpsertExpenseDialog from "@/components/expenses/upsert-expense-dialog";
import RecordOutgoingPaymentDialog from "@/components/purchases/record-outgoing-payment-dialog";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/format";
import { expenseKeys } from "@/lib/query-keys";

const ExpenseDetailPage = () => {
    const { organizationId = "", expenseId = "" } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [discardOpen, setDiscardOpen] = useState(false);

    const expenseQuery = useQuery({
        queryKey: expenseKeys.detail(organizationId, expenseId),
        queryFn: () => getExpense(organizationId, expenseId),
        enabled: Boolean(organizationId && expenseId),
    });

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: expenseKeys.list(organizationId) });
        await queryClient.invalidateQueries({ queryKey: expenseKeys.detail(organizationId, expenseId) });
    };

    const recordMutation = useMutation({
        mutationFn: () => recordExpense(organizationId, expenseId),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                void invalidate();
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to record Expense");
        },
    });

    const discardMutation = useMutation({
        mutationFn: () => discardDraftExpense(organizationId, expenseId),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                void queryClient.invalidateQueries({ queryKey: expenseKeys.list(organizationId) });
                navigate(`/organizations/${organizationId}/expenses`);
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to discard Expense");
        },
    });

    if (expenseQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (expenseQuery.isError || expenseQuery.data?.status === "error" || !expenseQuery.data?.data) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load expense</EmptyTitle>
                            <EmptyDescription>
                                {(expenseQuery.error as { message?: string })?.message
                                    ?? expenseQuery.data?.message
                                    ?? "Expense could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => expenseQuery.refetch()}
                            >
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    const expense = expenseQuery.data.data.expense;
    const isDraft = expense.lifecycle === "draft";
    const canSettle = expense.lifecycle === "recorded" && (expense.dueAmount ?? 0) > 0;

    return (
        <div className="space-y-4" data-testid="expense-detail-page">
            <Button
                variant="ghost"
                className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                render={<Link to={`/organizations/${organizationId}/expenses`} />}
            >
                <ArrowLeft className="size-4" />
                Back to expenses
            </Button>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Banknote className="size-4" />
                            </div>
                            <div className="min-w-0 space-y-2">
                                <CardTitle className="font-display text-2xl">{expense.expenseCategoryName}</CardTitle>
                                <CardDescription>
                                    {expense.storeName}
                                    {" · "}
                                    {formatDateOnly(expense.effectiveDate)}
                                    {expense.invoiceReference ? ` · ${expense.invoiceReference}` : ""}
                                </CardDescription>
                                <div className="flex flex-wrap items-center gap-2">
                                    <ExpenseLifecycleBadge lifecycle={expense.lifecycle} />
                                    <ExpensePayableStatusBadge status={expense.payableStatus} />
                                </div>
                            </div>
                        </div>
                        {isDraft ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <UpsertExpenseDialog organizationId={organizationId} expense={expense} />
                                <Button
                                    className="rounded-full"
                                    disabled={recordMutation.isPending}
                                    onClick={() => recordMutation.mutate()}
                                >
                                    {recordMutation.isPending ? "Recording..." : "Record expense"}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-full text-destructive"
                                    onClick={() => setDiscardOpen(true)}
                                >
                                    Discard draft
                                </Button>
                            </div>
                        ) : canSettle ? (
                            <RecordOutgoingPaymentDialog
                                organizationId={organizationId}
                                storeId={expense.storeId}
                                payableLabel={expense.expenseCategoryName}
                                dueAmount={expense.dueAmount}
                                recordPayment={(data) =>
                                    createOutgoingExpensePayment(organizationId, expense.id, data)
                                }
                                onRecorded={invalidate}
                            />
                        ) : null}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(expense.total)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Paid</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(expense.paidTotal)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Due</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">
                                {expense.dueAmount === null ? "—" : formatCurrency(expense.dueAmount)}
                            </p>
                        </div>
                    </div>

                    {expense.notes ? (
                        <p className="text-sm text-muted-foreground">{expense.notes}</p>
                    ) : null}

                    <div>
                        <h3 className="mb-3 text-sm font-medium">Outgoing Payments</h3>
                        {expense.outgoingPayments.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
                                {expense.lifecycle === "recorded"
                                    ? "No Outgoing Payments recorded yet."
                                    : "Draft Expenses do not create Outgoing Payments."}
                            </p>
                        ) : (
                            <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                                {expense.outgoingPayments.map((payment) => (
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
                                        </div>
                                        <p className="shrink-0 text-sm font-semibold tabular-nums">
                                            {formatCurrency(payment.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Paid {formatCurrency(expense.paidTotal)}
                        {expense.recordedAt ? ` · Recorded ${formatDateTime(expense.recordedAt)}` : ""}
                    </p>
                </CardContent>
            </Card>

            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard this Draft Expense?</AlertDialogTitle>
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
        </div>
    );
};

export default ExpenseDetailPage;
