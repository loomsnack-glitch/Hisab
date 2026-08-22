import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BarChart3, CheckCheck, Clock3, Eye, LoaderCircle, Megaphone, RefreshCw, Send, Users } from "lucide-react";
import type { StoreMessageLink } from "@repo/types";
import { getWhatsAppPromotionDashboard, stopWhatsAppCloudCampaign } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { formatDateTime } from "@/lib/format";
import { whatsappKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import PromotionDialog from "@/components/customers/promotion-dialog";

type Props = { organizationId: string; storeId: string; storeName: string; links?: StoreMessageLink[]; cloudEnabled?: boolean };

const formatRemaining = (seconds: number) => {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

const statusLabel: Record<string, string> = {
  queued: "Queued",
  sending: "Sending",
  completed: "Completed",
  failed: "Needs attention",
  cancelled: "Cancelled",
  draft: "Draft",
};

const statusClass: Record<string, string> = {
  queued: "border-amber-300/60 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  sending: "border-blue-300/60 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
  completed: "border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
  failed: "border-red-300/60 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200",
};

const Stat = ({ icon: Icon, label, value, tone = "text-foreground" }: { icon: typeof Users; label: string; value: number; tone?: string }) => (
  <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className="size-3.5" /><span>{label}</span></div>
    <p className={`mt-0.5 text-lg font-semibold ${tone}`}>{value.toLocaleString()}</p>
  </div>
);

const WhatsAppPromotionDashboard = ({ organizationId, storeId, storeName, links = [], cloudEnabled = false }: Props) => {
  const isDevelopment = import.meta.env.DEV;
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const [stoppingCampaignId, setStoppingCampaignId] = useState("");
  useEffect(() => setPage(1), [storeId]);
  const queryKey = whatsappKeys.promotions(organizationId, storeId, 30, page);
  const query = useQuery({
    queryKey,
    queryFn: () => getWhatsAppPromotionDashboard(organizationId, storeId, 30, 20, page),
    enabled: Boolean(organizationId && storeId),
    retry: 1,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    refetchInterval: data => {
      const dashboard = data.state.data?.status === "success" ? data.state.data.data : null;
      const active = Boolean(dashboard?.campaigns.some(c => c.queuedRecipients > 0 || c.sendingRecipients > 0 || c.retryingRecipients > 0));
      return active ? 5_000 : 30_000;
    },
    refetchIntervalInBackground: false,
  });
  const dashboard = query.data?.status === "success" ? query.data.data : null;
  const campaigns = dashboard?.campaigns ?? [];
  const stats = dashboard?.stats;
  const cooldown = dashboard?.cooldown;
  const pagination = dashboard?.pagination;
  const promotionStatusReady = query.data?.status === "success";
  const hasActiveCampaign = useMemo(() => campaigns.some(campaign => campaign.queuedRecipients > 0 || campaign.sendingRecipients > 0 || campaign.retryingRecipients > 0), [campaigns]);
  const stopCampaign = async (campaignId: string) => {
    if (!window.confirm("Stop the remaining messages in this promotion? Already delivered messages will not be changed.")) return;
    setStoppingCampaignId(campaignId);
    const response = await stopWhatsAppCloudCampaign(organizationId, campaignId);
    setStoppingCampaignId("");
    if (response.status === "success") {
      toast.success("Promotion stopped");
      await queryClient.invalidateQueries({ queryKey });
    } else toast.error(response.message);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 font-display text-xl"><Megaphone className="size-5 text-primary" />Promotions</CardTitle>
            <CardDescription>Send to opted-in customers at {storeName}, then follow delivery progress here.</CardDescription>
          </div>
          <CardAction>
            <PromotionDialog
              organizationId={organizationId}
              storeId={storeId}
              links={links}
              className="h-8 whitespace-nowrap rounded-lg px-2.5 text-xs sm:h-9 sm:px-3"
              disabled={!isDevelopment && (!promotionStatusReady || query.isPending || cooldown?.active)}
              disabledReason={!isDevelopment && !promotionStatusReady ? "Promotion status is unavailable" : !isDevelopment && cooldown?.active ? `Available again in ${formatRemaining(cooldown.remainingSeconds)}` : undefined}
              onQueued={() => queryClient.invalidateQueries({ queryKey })}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {cooldown?.active ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2"><Clock3 className="size-4 shrink-0" />One promotion per Store per hour. You can send the next one in <strong>{formatRemaining(cooldown.remainingSeconds)}</strong>.</p>
              <span className="text-xs opacity-75">This protects your WhatsApp number from bursts.</span>
            </div>
          ) : null}
          {query.isPending ? <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading promotion performance…</div> : null}
          {query.isError || query.data?.status === "error" ? <div className="flex items-center gap-2 rounded-xl border border-red-300/60 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200"><AlertCircle className="size-4" />Unable to load promotion performance. Retry in a moment.</div> : null}
          {stats ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Stat icon={BarChart3} label="Campaigns" value={stats.totalCampaigns} />
              <Stat icon={Users} label="Recipients" value={stats.totalRecipients} />
              <Stat icon={Send} label="Sent" value={stats.sentRecipients} tone="text-blue-600" />
              <Stat icon={CheckCheck} label="Delivered" value={stats.deliveredRecipients} tone="text-emerald-600" />
              <Stat icon={Eye} label="Read" value={stats.readRecipients} tone="text-violet-600" />
              <Stat icon={AlertCircle} label="Failed" value={stats.failedRecipients} tone={stats.failedRecipients ? "text-red-600" : undefined} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="size-4 text-primary" />Recent promotions</CardTitle>
          <CardDescription>{hasActiveCampaign ? "Live progress while messages are processing." : "Delivery performance from the last 30 days."}</CardDescription>
          <CardAction>
            <button type="button" className="inline-flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50" onClick={() => query.refetch()} disabled={query.isFetching} aria-label="Refresh promotion performance" title="Refresh"><RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`} /></button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {query.isFetching && !query.isPending ? <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground"><RefreshCw className="size-3 animate-spin" />Updating performance…</p> : null}
          {campaigns.length === 0 && !query.isPending ? <p className="py-8 text-center text-sm text-muted-foreground">No promotions sent from this Store yet.</p> : null}
          <div className="space-y-3">
            {campaigns.map(campaign => {
              const progress = campaign.totalRecipients ? Math.min(100, Math.round((campaign.deliveredRecipients / campaign.totalRecipients) * 100)) : 0;
              return (
                <div key={campaign.id} className="rounded-2xl border border-border/60 bg-background/50 p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2.5"><div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><Megaphone className="size-3.5" /></div><div className="min-w-0"><p className="truncate font-medium">{campaign.title}</p><p className="text-xs text-muted-foreground">{formatDateTime(campaign.createdAt)} · {campaign.totalRecipients.toLocaleString()} recipients</p></div></div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={statusClass[campaign.status] ?? ""}>{statusLabel[campaign.status] ?? campaign.status}</Badge>
                      {cloudEnabled && (campaign.status === "queued" || campaign.status === "sending") ? <button type="button" className="rounded-lg border border-red-300/70 px-2 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/30" disabled={stoppingCampaignId === campaign.id} onClick={() => void stopCampaign(campaign.id)}>{stoppingCampaignId === campaign.id ? "Stopping…" : "Stop"}</button> : null}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span>Delivered progress</span><span className="font-medium text-foreground">{progress}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-5">
                    <span>Queued <strong className="font-medium text-foreground">{campaign.queuedRecipients}</strong></span><span>Sent <strong className="font-medium text-foreground">{campaign.sentRecipients}</strong></span><span>Delivered <strong className="font-medium text-foreground">{campaign.deliveredRecipients}</strong></span><span>Read <strong className="font-medium text-foreground">{campaign.readRecipients}</strong></span><span className={campaign.failedRecipients ? "text-red-600" : ""}>Failed <strong className="font-medium">{campaign.failedRecipients}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
          {pagination && pagination.totalPages > 1 ? (
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.totalPages} · {pagination.totalItems.toLocaleString()} promotions</p>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40" disabled={page <= 1 || query.isFetching} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</button>
                <button type="button" className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40" disabled={page >= pagination.totalPages || query.isFetching} onClick={() => setPage(current => Math.min(pagination.totalPages, current + 1))}>Next</button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppPromotionDashboard;
