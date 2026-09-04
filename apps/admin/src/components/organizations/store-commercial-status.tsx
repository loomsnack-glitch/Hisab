import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createPaidPlanCheckout as createPaidPlanCheckoutRequest,
    getStoreCommercialStatus,
    startStoreTrial,
} from "@repo/services";
import {
    COMMERCIAL_TERM_TIMEZONE,
    type CommercialHistoryEntryDTO,
    type CommercialQuoteDTO,
    type PaidPlanCheckoutResponse,
    type StoreCommercialStatusDTO,
    type StoreLicenseBaseAccessDTO,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import { Separator } from "@repo/ui/components/separator";
import {
    BadgeCheck,
    CalendarClock,
    ChevronDown,
    Clock3,
    CreditCard,
    History,
    LoaderCircle,
    Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { commercialLicenseKeys } from "@/lib/query-keys";
import { openRazorpayCheckout as defaultOpenRazorpayCheckout, type OpenRazorpayCheckout } from "@/lib/razorpay-checkout";
type StoreCommercialStatusProps = {
    organizationId: string;
    storeId: string;
    createPaidPlanCheckout?: typeof createPaidPlanCheckoutRequest;
    openRazorpayCheckout?: OpenRazorpayCheckout;
};
const formatCommercialTimestamp = (value: string | Date) =>
    new Date(value).toLocaleString("en-IN", {
        timeZone: COMMERCIAL_TERM_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
    });
const formatCommercialDate = (value: string | Date) =>
    new Date(value).toLocaleDateString("en-IN", {
        timeZone: COMMERCIAL_TERM_TIMEZONE,
        dateStyle: "medium",
    });
const statusLabel = (access: StoreLicenseBaseAccessDTO | null | undefined) => {
    if (!access) return "No active plan";
    if (access.status === "active") return access.planType === "trial" ? "Trial" : "Active";
    if (access.status === "scheduled") return "Scheduled";
    if (access.status === "expired") return "Expired";
    return "Revoked";
};
const statusBadgeVariant = (access: StoreLicenseBaseAccessDTO | null | undefined) => {
    if (!access) return "muted" as const;
    if (access.status === "active") return access.planType === "trial" ? "secondary" as const : "default" as const;
    if (access.status === "scheduled") return "outline" as const;
    if (access.status === "expired" || access.status === "revoked") return "destructive" as const;
    return "outline" as const;
};
const historyStatusVariant = (status: string) => {
    if (status === "fulfilled" || status === "active") return "default" as const;
    if (status === "open" || status === "scheduled") return "outline" as const;
    if (status === "expired") return "muted" as const;
    return "destructive" as const;
};
const daysRemainingLabel = (endsAt: string | Date) => {
    const end = new Date(endsAt).getTime();
    const now = Date.now();
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    if (days === 0) return "Expires today";
    if (days === 1) return "1 day remaining";
    return `${days} days remaining`;
};
const planActionLabel = (plan: StoreCommercialStatusDTO["availablePaidPlans"][number]) => {
    if (plan.checkoutAction === "upgrade") {
        return `Upgrade to ${plan.displayName}`;
    }
    if (plan.checkoutAction === "renewal") {
        return `Renew with ${plan.displayName}`;
    }
    return `Choose ${plan.displayName}`;
};

const planTimingLabel = (
    plan: StoreCommercialStatusDTO["availablePaidPlans"][number] | CommercialQuoteDTO,
) => {
    if ("checkoutAction" in plan && plan.checkoutAction === "upgrade") {
        return "Keeps your current expiry after payment is verified";
    }
    if ("kind" in plan && plan.kind === "plan_upgrade") {
        return "Keeps your current expiry after payment is verified";
    }
    if (plan.licenseTiming === "scheduled") {
        if ("kind" in plan && plan.kind === "plan_renewal") {
            return "Starts when your current paid term ends";
        }
        if ("checkoutAction" in plan && plan.checkoutAction === "renewal") {
            return "Starts when your current paid term ends";
        }
        return "Starts when your current trial ends";
    }
    return "Starts immediately after payment is verified";
};

const prepareCommercialHistory = (entries: CommercialHistoryEntryDTO[]): CommercialHistoryEntryDTO[] => {
    const openQuotes = entries.filter((entry) => entry.kind === "quote" && entry.status === "open");
    if (openQuotes.length <= 1) return entries;
    const latestOpenQuoteId = openQuotes[0]?.id;
    return entries.filter(
        (entry) =>
            !(entry.kind === "quote" && entry.status === "open" && entry.id !== latestOpenQuoteId),
    );
};
const SectionHeading = ({ children }: { children: ReactNode }) => (
    <h3 className="text-sm font-semibold tracking-tight text-foreground">{children}</h3>
);
const LicenseStatusHero = ({
    status,
    trialUsed,
}: {
    status: StoreCommercialStatusDTO;
    trialUsed: boolean;
}) => {
    const access = status.baseAccess;
    return (
        <div className="rounded-2xl border border-border/70 bg-linear-to-br from-muted/30 via-card to-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusBadgeVariant(access)} className="rounded-full px-3 py-1 text-xs">
                            {statusLabel(access)}
                        </Badge>
                        {access?.status === "active" ? (
                            <span className="text-xs text-muted-foreground">{daysRemainingLabel(access.endsAt)}</span>
                        ) : null}
                    </div>
                    {access ? (
                        <div className="space-y-1">
                            <p className="font-display text-2xl font-semibold text-foreground">
                                {access.planDisplayName}
                            </p>
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                                <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                                <span>
                                    {formatCommercialDate(access.startsAt)}
                                    {" – "}
                                    {formatCommercialDate(access.endsAt)}
                                </span>
                                <span className="text-xs">({status.timezone})</span>
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <p className="font-display text-2xl font-semibold text-foreground">No active plan</p>
                            <p className="text-sm text-muted-foreground">
                                Start a trial or purchase a paid plan to unlock store features.
                            </p>
                        </div>
                    )}
                </div>
                {access ? (
                    <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm">
                        <p className="font-medium text-foreground">{access.planDisplayName}</p>
                        <p className="mt-1 text-muted-foreground">
                            {access.term.count} {access.term.unit}
                            {access.term.count === 1 ? "" : "s"}
                        </p>
                    </div>
                ) : null}
            </div>
            {trialUsed ? (
                <p className="mt-4 text-xs text-muted-foreground">{status.trial.message}</p>
            ) : null}
        </div>
    );
};
const FeatureEntitlements = ({ features }: { features: StoreCommercialStatusDTO["entitlements"]["features"] }) => {
    if (features.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
                No features are currently enabled on this store.
            </div>
        );
    }
    return (
        <ul className="grid gap-2 sm:grid-cols-2">
            {features.map((feature) => (
                <li
                    key={feature.key}
                    className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 text-sm"
                >
                    <Sparkles className="size-4 shrink-0 text-primary/80" aria-hidden="true" />
                    <span className="font-medium text-foreground">{feature.displayName}</span>
                </li>
            ))}
        </ul>
    );
};
const AccessGrantSummaries = ({ status }: { status: StoreCommercialStatusDTO }) => (
    <ul className="space-y-2">
        {status.accessGrants.map((grant) => (
            <li
                key={grant.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3"
            >
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full text-xs">
                            {grant.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{grant.selectionLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {formatCommercialTimestamp(grant.startsAt)}
                        {" – "}
                        {formatCommercialTimestamp(grant.endsAt)}
                        {` (${status.timezone})`}
                    </p>
                </div>
                <Badge variant="secondary" className="rounded-full text-xs capitalize">
                    {grant.status}
                </Badge>
            </li>
        ))}
    </ul>
);
const QuoteCheckoutPanel = ({
    quote,
    awaitingConfirmation,
    onPay,
}: {
    quote: CommercialQuoteDTO;
    awaitingConfirmation: boolean;
    onPay: () => void;
}) => (
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
                <p className="text-sm font-medium text-primary">Checkout ready</p>
                <p className="font-display text-xl font-semibold text-foreground">{quote.planDisplayName} Plan</p>
            </div>
            <p className="font-display text-2xl font-semibold text-foreground">{formatCurrency(quote.amountInr)}</p>
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p>GST-inclusive · {quote.term.count} {quote.term.unit}{quote.term.count === 1 ? "" : "s"}</p>
            <p className="flex items-center gap-2">
                <Clock3 className="size-4 shrink-0" aria-hidden="true" />
                Quote expires {formatCommercialTimestamp(quote.expiresAt)}
            </p>
            <p className="sm:col-span-2">
                {planTimingLabel(quote)}
                {" · "}
                {formatCommercialDate(quote.intendedStartsAt)}
                {" – "}
                {formatCommercialDate(quote.intendedEndsAt)}
            </p>
        </div>
        {quote.lineItems.length > 1 ? (
            <ul className="space-y-1 rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm">
                {quote.lineItems.map((line) => (
                    <li key={line.description} className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{line.description}</span>
                        <span className="font-medium text-foreground">{formatCurrency(line.amountInr)}</span>
                    </li>
                ))}
            </ul>
        ) : null}
        {awaitingConfirmation ? (
            <Alert variant="info">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                <AlertTitle>Confirming your payment</AlertTitle>
                <AlertDescription>
                    Access is granted only after Razorpay verifies the payment. This usually takes a few seconds.
                </AlertDescription>
            </Alert>
        ) : (
            <Button className="w-full rounded-full sm:w-auto" onClick={onPay}>
                <CreditCard className="size-4" aria-hidden="true" />
                Pay {formatCurrency(quote.amountInr)} with Razorpay
            </Button>
        )}
    </div>
);
const PaidPlanCards = ({
    plans,
    isCreating,
    onSelectPlan,
}: {
    plans: StoreCommercialStatusDTO["availablePaidPlans"];
    isCreating: boolean;
    onSelectPlan: (planKey: string) => void;
}) => (
    <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
            <div
                key={plan.key}
                className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
                <div className="space-y-2">
                    <p className="font-display text-lg font-semibold text-foreground">{plan.displayName}</p>
                    <p className="font-display text-2xl font-semibold text-foreground">
                        {formatCurrency(plan.amountInr)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        GST-inclusive · {plan.term.count} {plan.term.unit}
                        {plan.term.count === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {planTimingLabel(plan)}
                    </p>
                </div>
                <Button
                    className="rounded-full"
                    disabled={isCreating}
                    onClick={() => onSelectPlan(plan.key)}
                >
                    {isCreating ? "Preparing checkout..." : planActionLabel(plan)}
                </Button>
            </div>
        ))}
    </div>
);
const CommercialActivityTimeline = ({
    entries,
}: {
    entries: CommercialHistoryEntryDTO[];
}) => {
    const [open, setOpen] = useState(false);
    if (entries.length === 0) return null;
    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className="rounded-2xl border border-border/60 bg-muted/10">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                        <History className="size-4 text-muted-foreground" aria-hidden="true" />
                        <SectionHeading>Activity & billing history</SectionHeading>
                        <Badge variant="muted" className="rounded-full text-xs">
                            {entries.length}
                        </Badge>
                    </div>
                    <ChevronDown
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                        aria-hidden="true"
                    />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <Separator />
                    <ul className="space-y-0 px-4 py-3">
                        {entries.map((entry, index) => (
                            <li key={`${entry.kind}-${entry.id}`} className="relative pl-6 pb-4 last:pb-1">
                                {index < entries.length - 1 ? (
                                    <span
                                        className="absolute top-2 left-[7px] h-[calc(100%-0.25rem)] w-px bg-border"
                                        aria-hidden="true"
                                    />
                                ) : null}
                                <span
                                    className="absolute top-1.5 left-0 size-3.5 rounded-full border-2 border-background bg-muted-foreground/40"
                                    aria-hidden="true"
                                />
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 space-y-1">
                                        <p className="text-sm font-medium text-foreground">{entry.title}</p>
                                        <p className="text-xs text-muted-foreground">{entry.detail}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatCommercialTimestamp(entry.occurredAt)}
                                        </p>
                                    </div>
                                    <Badge variant={historyStatusVariant(entry.status)} className="rounded-full text-xs capitalize">
                                        {entry.status}
                                    </Badge>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
};
const StoreCommercialStatus = ({
    organizationId,
    storeId,
    createPaidPlanCheckout = createPaidPlanCheckoutRequest,
    openRazorpayCheckout = defaultOpenRazorpayCheckout,
}: StoreCommercialStatusProps) => {
    const queryClient = useQueryClient();
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
    const [checkoutQuote, setCheckoutQuote] = useState<PaidPlanCheckoutResponse | null>(null);
    const statusQuery = useQuery({
        queryKey: commercialLicenseKeys.status(organizationId, storeId),
        queryFn: () => getStoreCommercialStatus(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
        refetchInterval: awaitingConfirmation ? 2000 : false,
    });
    const startTrial = useMutation({
        mutationFn: () => startStoreTrial(organizationId, storeId),
        onSuccess: (response) => {
            if (response.status === "error" || !response.data) {
                toast.error(response.message ?? "Unable to start the Trial Plan");
                return;
            }
            queryClient.setQueryData(commercialLicenseKeys.status(organizationId, storeId), response);
            toast.success(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to start the Trial Plan");
        },
    });
    const createCheckout = useMutation({
        mutationFn: (planKey: string) => createPaidPlanCheckout(organizationId, storeId, { planKey }),
        onSuccess: (response) => {
            if (response.status === "error" || !response.data) {
                toast.error(response.message ?? "Unable to create a Commercial Quote");
                return;
            }
            setCheckoutQuote(response.data);
            queryClient.setQueryData(commercialLicenseKeys.status(organizationId, storeId), {
                ...response,
                data: { commercialStatus: response.data.commercialStatus },
            });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to create a Commercial Quote");
        },
    });
    const status =
        statusQuery.data?.status === "success" ? statusQuery.data.data?.commercialStatus ?? null : null;
    const hasActivePaidAccess = Boolean(
        status?.baseAccess?.planType === "paid" && status.baseAccess.status === "active",
    );
    const accessGranted = hasActivePaidAccess
        || Boolean(status?.scheduledSuccessor?.planType === "paid");
    const canPurchase = Boolean(
        status
        && (status.availablePaidPlans.length > 0 || status.pendingCheckout),
    );
    const visibleQuote = status?.pendingCheckout ?? checkoutQuote?.quote ?? null;
    const showPaidPlans = Boolean(status?.availablePaidPlans.length) && !visibleQuote;
    const showTrialOffer = Boolean(status?.trial.eligible);
    const trialUsed = Boolean(status && !status.trial.eligible && status.baseAccess?.planType === "trial");
    const commercialHistory = useMemo(() => {
        const entries = status?.commercialHistory ?? [];
        const withoutStaleOpens = hasActivePaidAccess && !status?.pendingCheckout
            ? entries.filter((entry) => !(entry.kind === "quote" && entry.status === "open"))
            : entries;
        return prepareCommercialHistory(withoutStaleOpens);
    }, [hasActivePaidAccess, status?.commercialHistory, status?.pendingCheckout]);
    useEffect(() => {
        if (awaitingConfirmation && accessGranted) {
            setAwaitingConfirmation(false);
            setCheckoutQuote(null);
        }
    }, [accessGranted, awaitingConfirmation]);
    useEffect(() => {
        if (!canPurchase && !hasActivePaidAccess) {
            setCheckoutQuote(null);
        }
    }, [canPurchase, hasActivePaidAccess]);
    const payQuote = async (quote: CommercialQuoteDTO) => {
        const checkout = checkoutQuote?.quote.id === quote.id ? checkoutQuote.checkout : null;
        if (!checkout) {
            const created = await createPaidPlanCheckout(organizationId, storeId, { planKey: quote.planKey });
            if (created.status === "error" || !created.data) {
                toast.error(created.message ?? "Unable to create a Commercial Quote");
                return;
            }
            setCheckoutQuote(created.data);
            const result = await openRazorpayCheckout({
                keyId: created.data.checkout.keyId,
                orderId: created.data.checkout.orderId,
                amountPaise: created.data.checkout.amountPaise,
                currency: created.data.checkout.currency,
                description: `${created.data.quote.planDisplayName} Plan`,
            });
            if (result.outcome === "browser-success") {
                setAwaitingConfirmation(true);
            }
            return;
        }
        const result = await openRazorpayCheckout({
            keyId: checkout.keyId,
            orderId: checkout.orderId,
            amountPaise: checkout.amountPaise,
            currency: checkout.currency,
            description: `${quote.planDisplayName} Plan`,
        });
        if (result.outcome === "browser-success") {
            setAwaitingConfirmation(true);
        }
    };
    return (
        <Card className="border-border/60 bg-card/80 shadow-sm sm:shadow-md">
            <CardHeader>
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BadgeCheck className="size-4" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="font-display text-xl">Store License</CardTitle>
                        <CardDescription>
                            Manage this store&apos;s plan, included features, and billing.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {statusQuery.isPending ? (
                    <div className="flex min-h-32 items-center justify-center">
                        <LoaderCircle className="size-5 animate-spin text-primary" />
                    </div>
                ) : statusQuery.isError || statusQuery.data?.status === "error" || !status ? (
                    <p className="text-sm text-muted-foreground">
                        {statusQuery.data?.message ?? "Unable to load this Store's commercial status."}
                    </p>
                ) : (
                    <>
                        <LicenseStatusHero status={status} trialUsed={trialUsed} />
                        {status.scheduledSuccessor ? (
                            <Alert variant="info">
                                <CalendarClock className="size-4" aria-hidden="true" />
                                <AlertTitle>Scheduled plan change</AlertTitle>
                                <AlertDescription>
                                    {status.scheduledSuccessor.planDisplayName} starts on{" "}
                                    {formatCommercialTimestamp(status.scheduledSuccessor.startsAt)} and runs until{" "}
                                    {formatCommercialTimestamp(status.scheduledSuccessor.endsAt)} ({status.timezone}).
                                </AlertDescription>
                            </Alert>
                        ) : null}
                        <section className="space-y-3">
                            <SectionHeading>Included features</SectionHeading>
                            <FeatureEntitlements features={status.entitlements.features} />
                        </section>
                        {status.accessGrants.length > 0 ? (
                            <section className="space-y-3">
                                <SectionHeading>Additional access grants</SectionHeading>
                                <AccessGrantSummaries status={status} />
                            </section>
                        ) : null}
                        {visibleQuote ? (
                            <section className="space-y-3">
                                <SectionHeading>Complete your purchase</SectionHeading>
                                <QuoteCheckoutPanel
                                    quote={visibleQuote}
                                    awaitingConfirmation={awaitingConfirmation}
                                    onPay={() => void payQuote(visibleQuote)}
                                />
                            </section>
                        ) : null}
                        {showPaidPlans ? (
                            <section className="space-y-3">
                                <SectionHeading>
                                    {hasActivePaidAccess ? "Renew or upgrade this plan" : "Choose a paid plan"}
                                </SectionHeading>
                                <PaidPlanCards
                                    plans={status.availablePaidPlans}
                                    isCreating={createCheckout.isPending}
                                    onSelectPlan={(planKey) => createCheckout.mutate(planKey)}
                                />
                            </section>
                        ) : null}
                        {showTrialOffer ? (
                            <section className="rounded-2xl border border-border/60 bg-muted/10 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <SectionHeading>Try before you buy</SectionHeading>
                                        <p className="text-sm text-muted-foreground">{status.trial.message}</p>
                                    </div>
                                    <Button
                                        className="rounded-full"
                                        disabled={startTrial.isPending}
                                        onClick={() => startTrial.mutate()}
                                    >
                                        {startTrial.isPending ? "Starting trial..." : "Start Trial"}
                                    </Button>
                                </div>
                            </section>
                        ) : null}
                        <CommercialActivityTimeline entries={commercialHistory} />
                    </>
                )}
            </CardContent>
        </Card>
    );
};
export default StoreCommercialStatus;
