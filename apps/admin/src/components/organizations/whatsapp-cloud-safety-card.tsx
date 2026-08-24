import { useState } from "react";
import { AlertTriangle, Ban, Gauge, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
    deadLetterWhatsAppCloudOutbox,
    getWhatsAppCloudOutboxOperations,
    getWhatsAppCloudSafety,
    reconcileWhatsAppCloudOutbox,
    retryWhatsAppCloudOutbox,
} from "@repo/services";
import type { WhatsAppCloudOutboxOperationDTO } from "@repo/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@repo/ui/components/alert-dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { whatsappKeys } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

type Props = { organizationId: string };

const WhatsAppCloudSafetyCard = ({ organizationId }: Props) => {
    const query = useQuery({
        queryKey: whatsappKeys.cloudSafety(organizationId),
        queryFn: () => getWhatsAppCloudSafety(organizationId),
        enabled: Boolean(organizationId),
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
    const safety = query.data?.status === "success" ? query.data.data : null;
    const operationsQuery = useQuery({
        queryKey: whatsappKeys.cloudOutbox(organizationId),
        queryFn: () => getWhatsAppCloudOutboxOperations(organizationId),
        enabled: Boolean(organizationId),
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
    const [deadLetterTarget, setDeadLetterTarget] = useState<WhatsAppCloudOutboxOperationDTO | null>(null);
    const reconcileMutation = useMutation({
        mutationFn: () => reconcileWhatsAppCloudOutbox(organizationId),
        onSuccess: response => {
            if (response.status === "success") {
                toast.success(response.message);
                void query.refetch();
            } else toast.error(response.message);
        },
        onError: () => toast.error("Cloud outbox reconciliation failed"),
    });
    const outboxActionMutation = useMutation({
        mutationFn: ({ outboxId, action }: { outboxId: string; action: "retry" | "dead-letter" }) => action === "retry"
            ? retryWhatsAppCloudOutbox(organizationId, outboxId)
            : deadLetterWhatsAppCloudOutbox(organizationId, outboxId),
        onSuccess: response => {
            if (response.status === "success") {
                toast.success(response.message);
                setDeadLetterTarget(null);
                void Promise.all([query.refetch(), operationsQuery.refetch()]);
            } else toast.error(response.message);
        },
        onError: () => toast.error("Cloud outbox action failed"),
    });
    const reconciliationIssues = safety
        ? safety.reconciliation.missingReservedEvents + safety.reconciliation.missingSettlementEvents + safety.reconciliation.missingReleaseEvents
        : 0;

    return (
        <Card className="border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                    <CardTitle className="flex items-center gap-2 font-display text-lg"><ShieldCheck className="size-5 text-primary" />Cloud sending controls</CardTitle>
                    <CardDescription>Ganatri’s internal quotas and delivery-job health.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full">Internal</Badge>
                    <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => reconcileMutation.mutate()} disabled={reconcileMutation.isPending} aria-label="Reconcile stale Cloud submissions" title="Reconcile stale Cloud submissions">
                        <RefreshCw className={`size-4 ${reconcileMutation.isPending ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Reconcile now</span>
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Refresh WhatsApp Cloud safety">
                        <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {query.isPending ? <p className="text-sm text-muted-foreground">Loading sending safety…</p> : null}
                {query.isError || query.data?.status === "error" ? <p className="text-sm text-destructive">Safety status is unavailable. Retry after the backend is ready.</p> : null}
                {safety ? (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="rounded-full"><Gauge className="mr-1 size-3.5" />Send interval {safety.policy.accountSendIntervalSeconds}s</Badge>
                            <Badge variant="outline" className="rounded-full">Customer cooldown {safety.policy.customerCooldownSeconds}s</Badge>
                            <Badge variant="outline" className="rounded-full">Retryable {safety.outbox.retryableCount.toLocaleString()}</Badge>
                            <Badge variant={safety.outbox.deadLetterCount ? "destructive" : "secondary"} className="rounded-full">Dead letters {safety.outbox.deadLetterCount.toLocaleString()}</Badge>
                            <Badge variant={reconciliationIssues ? "destructive" : "secondary"} className="rounded-full">{reconciliationIssues ? <AlertTriangle className="mr-1 size-3.5" /> : null}{reconciliationIssues ? `${reconciliationIssues} internal reconciliation warning${reconciliationIssues === 1 ? "" : "s"}` : "Internal reconciliation healthy"}</Badge>
                        </div>
                        <div className="border-t border-border/60 pt-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">Recent Cloud operations</p>
                                <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg" onClick={() => void operationsQuery.refetch()} disabled={operationsQuery.isFetching}>
                                    <RefreshCw className={`size-3.5 ${operationsQuery.isFetching ? "animate-spin" : ""}`} />
                                    <span className="sr-only">Refresh Cloud operations</span>
                                </Button>
                            </div>
                            {operationsQuery.isPending ? <p className="text-xs text-muted-foreground">Loading operations…</p> : null}
                            {operationsQuery.data?.status === "error" || operationsQuery.isError ? <p className="text-xs text-destructive">Cloud operations are unavailable.</p> : null}
                            {operationsQuery.data?.status === "success" && operationsQuery.data.data?.operations.length === 0 ? <p className="text-xs text-muted-foreground">No pending or failed Cloud operations.</p> : null}
                            <div className="space-y-2">
                                {operationsQuery.data?.status === "success" ? operationsQuery.data.data?.operations.map(operation => (
                                    <div key={operation.id} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-medium">{operation.storeName}</p>
                                                <Badge variant={operation.status === "dead_letter" ? "destructive" : operation.status === "reconciling" ? "outline" : "secondary"} className="rounded-full text-[10px]">{operation.status.replace("_", " ")}</Badge>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">{operation.kind} · attempt {operation.attemptCount} · updated {formatDateTime(operation.updatedAt)}</p>
                                            {operation.lastErrorCode ? <p className="mt-1 truncate text-xs text-destructive">{operation.lastErrorCode}</p> : null}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {operation.status === "retryable" ? <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => outboxActionMutation.mutate({ outboxId: operation.id, action: "retry" })} disabled={outboxActionMutation.isPending}>
                                                <RotateCcw className="size-3.5" /> Retry
                                            </Button> : null}
                                            {operation.status === "pending" || operation.status === "retryable" ? <Button type="button" variant="ghost" size="sm" className="rounded-lg text-destructive hover:text-destructive" onClick={() => setDeadLetterTarget(operation)} disabled={outboxActionMutation.isPending} aria-label={`Dead-letter ${operation.storeName}`}>
                                                <Ban className="size-3.5" /> <span className="hidden sm:inline">Dead-letter</span>
                                            </Button> : null}
                                            {operation.status === "reconciling" ? <span className="text-xs text-muted-foreground">Awaiting provider evidence</span> : null}
                                        </div>
                                    </div>
                                )) : null}
                            </div>
                        </div>
                    </div>
                ) : null}
            </CardContent>
            <AlertDialog open={Boolean(deadLetterTarget)} onOpenChange={open => { if (!open) setDeadLetterTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Dead-letter this Cloud submission?</AlertDialogTitle>
                        <AlertDialogDescription>This stops the queued submission, releases its reserved quota, and records the operator action. It will not send the message.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={outboxActionMutation.isPending} onClick={event => { event.preventDefault(); if (deadLetterTarget) outboxActionMutation.mutate({ outboxId: deadLetterTarget.id, action: "dead-letter" }); }}>Dead-letter</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};

export default WhatsAppCloudSafetyCard;
