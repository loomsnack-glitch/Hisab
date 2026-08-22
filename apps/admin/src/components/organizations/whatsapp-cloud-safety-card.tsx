import { AlertTriangle, Gauge, RefreshCw, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getWhatsAppCloudSafety } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { whatsappKeys } from "@/lib/query-keys";

type Props = { organizationId: string };

const limitLabel = (value: number | null, suffix = "") => value === null ? "Unlimited" : `${value.toLocaleString()}${suffix}`;

const WhatsAppCloudSafetyCard = ({ organizationId }: Props) => {
    const query = useQuery({
        queryKey: whatsappKeys.cloudSafety(organizationId),
        queryFn: () => getWhatsAppCloudSafety(organizationId),
        enabled: Boolean(organizationId),
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
    const safety = query.data?.status === "success" ? query.data.data : null;
    const reconciliationIssues = safety
        ? safety.reconciliation.missingReservedEvents + safety.reconciliation.missingSettlementEvents + safety.reconciliation.missingReleaseEvents
        : 0;

    return (
        <Card className="border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                    <CardTitle className="flex items-center gap-2 font-display text-lg"><ShieldCheck className="size-5 text-primary" />Sending safety</CardTitle>
                    <CardDescription>Organization-level Cloud limits and reconciliation health.</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Refresh WhatsApp Cloud safety">
                    <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
                </Button>
            </CardHeader>
            <CardContent>
                {query.isPending ? <p className="text-sm text-muted-foreground">Loading sending safety…</p> : null}
                {query.isError || query.data?.status === "error" ? <p className="text-sm text-destructive">Safety status is unavailable. Retry after the backend is ready.</p> : null}
                {safety ? (
                    <div className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                            <div className="rounded-xl border border-border/60 bg-background/70 p-3"><p className="text-xs text-muted-foreground">Cloud messages this period</p><p className="mt-1 text-lg font-semibold">{safety.usage.units.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ {limitLabel(safety.policy.monthlyMessageLimit)}</span></p></div>
                            <div className="rounded-xl border border-border/60 bg-background/70 p-3"><p className="text-xs text-muted-foreground">Estimated spend</p><p className="mt-1 text-lg font-semibold">{safety.policy.currencyCode} {(safety.usage.costMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
                            <div className="rounded-xl border border-border/60 bg-background/70 p-3"><p className="text-xs text-muted-foreground">Recipient window</p><p className="mt-1 text-lg font-semibold">{limitLabel(safety.policy.recipientWindowLimit)} <span className="text-xs font-normal text-muted-foreground">per window</span></p></div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="rounded-full"><Gauge className="mr-1 size-3.5" />Send interval {safety.policy.accountSendIntervalSeconds}s</Badge>
                            <Badge variant="outline" className="rounded-full">Customer cooldown {safety.policy.customerCooldownSeconds}s</Badge>
                            <Badge variant={reconciliationIssues ? "destructive" : "secondary"} className="rounded-full">{reconciliationIssues ? <AlertTriangle className="mr-1 size-3.5" /> : null}{reconciliationIssues ? `${reconciliationIssues} reconciliation warning${reconciliationIssues === 1 ? "" : "s"}` : "Reconciliation healthy"}</Badge>
                        </div>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
};

export default WhatsAppCloudSafetyCard;
