import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createCoTermAddOnCheckout as createCoTermAddOnCheckoutRequest,
    createPaidPlanCheckout as createPaidPlanCheckoutRequest,
    getStoreCommercialStatus,
    startStoreTrial,
} from "@repo/services";
import {
    COMMERCIAL_TERM_TIMEZONE,
    type CommercialHistoryEntryDTO,
    type CommercialQuoteDTO,
    type CoTermAddOnCheckoutResponse,
    type PaidPlanCheckoutResponse,
    type ServiceResponse,
    type StoreCommercialStatusDTO,
    type StoreLicenseBaseAccessDTO,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@repo/ui/components/empty";
import { Separator } from "@repo/ui/components/separator";
import { cn } from "@repo/ui/lib/utils";
import {
    BadgeCheck,
    CalendarClock,
    ChevronDown,
    Clock3,
    CreditCard,
    History,
    LoaderCircle,
    Check,
    Sparkles,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { formatPlanTimeRemaining, getEffectiveCommercialAccess } from "@/lib/commercial-access-summary";
import { formatCurrency } from "@/lib/format";
import { commercialLicenseKeys } from "@/lib/query-keys";
import { openRazorpayCheckout as defaultOpenRazorpayCheckout, type OpenRazorpayCheckout } from "@/lib/razorpay-checkout";
import {
    buildAccessTimelineEntries,
    currentPlanAction,
    currentTermRange,
    isLicensePlanCatalogOpen,
    LICENSE_WORKSPACE_TABS,
    parseLicenseWorkspaceTab,
    remainingTermPercent,
    resolvePreviousPaidPlan,
    visiblePaidPlans,
    orderedLicenseCatalogCards,
    shouldIncludeTrialInCatalog,
    type LicenseWorkspaceTab,
} from "@/lib/store-license-workspace";
type StoreCommercialStatusProps = {
    organizationId: string;
    storeId: string;
    variant?: "detail" | "workspace";
    createPaidPlanCheckout?: typeof createPaidPlanCheckoutRequest;
    createCoTermAddOnCheckout?: typeof createCoTermAddOnCheckoutRequest;
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
const useCurrentTime = () => {
    const [currentTime, setCurrentTime] = useState(() => new Date());

    useEffect(() => {
        const interval = window.setInterval(() => setCurrentTime(new Date()), 60_000);
        return () => window.clearInterval(interval);
    }, []);

    return currentTime;
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
    if ("kind" in plan && plan.kind === "co_term_add_on") {
        return "Starts immediately after payment is verified and ends with your current plan";
    }
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

const quoteDisplayName = (quote: CommercialQuoteDTO) =>
    quote.kind === "co_term_add_on"
        ? quote.moduleDisplayName ?? "Module"
        : quote.planDisplayName ?? "Plan";

const quoteSelectionKey = (quote: CommercialQuoteDTO) =>
    quote.kind === "co_term_add_on" ? quote.moduleKey ?? "" : quote.planKey ?? "";

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
const AccessTimeline = ({ status }: { status: StoreCommercialStatusDTO }) => {
    const entries = buildAccessTimelineEntries(status);

    if (entries.length === 0) {
        return <p className="text-sm text-muted-foreground">No Plan or Store Access Grant has started yet.</p>;
    }

    return (
        <ol className="space-y-4">
            {entries.map((entry, index) => (
                <li key={entry.id} className="relative flex gap-3 pl-1">
                    {index < entries.length - 1 ? (
                        <span className="absolute left-[0.6rem] top-6 h-[calc(100%+0.25rem)] w-px bg-border" aria-hidden="true" />
                    ) : null}
                    <span className="mt-1.5 flex size-3 shrink-0 rounded-full border-[3px] border-primary bg-background" aria-hidden="true" />
                    <div className="min-w-0 flex-1 pb-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{entry.title}</p>
                            <Badge variant={historyStatusVariant(entry.status)} className="rounded-full text-xs capitalize">
                                {entry.status}
                            </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{entry.detail}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {formatCommercialDate(entry.startsAt)} – {formatCommercialDate(entry.endsAt)} ({status.timezone})
                        </p>
                    </div>
                </li>
            ))}
        </ol>
    );
};
const LicenseWorkspaceTabs = ({
    tab,
    historyCount,
    paymentCount,
    onTabChange,
}: {
    tab: LicenseWorkspaceTab;
    historyCount: number;
    paymentCount: number;
    onTabChange: (next: LicenseWorkspaceTab) => void;
}) => (
    <nav aria-label="Store license tabs" className="border-b border-border/60 pb-px">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {LICENSE_WORKSPACE_TABS.map((item) => {
                const active = tab === item.id;
                const count = item.id === "history" ? historyCount : item.id === "payments" ? paymentCount : null;
                return (
                    <button
                        key={item.id}
                        type="button"
                        aria-current={active ? "page" : undefined}
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                            "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-150 sm:px-4 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            active
                                ? "bg-primary/10 font-semibold text-primary shadow-2xs"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                        )}
                    >
                        {item.id === "plans" ? <Sparkles className={cn("size-3.5 sm:size-4", active ? "text-primary" : "text-muted-foreground/70")} /> : null}
                        {item.id === "history" ? <History className={cn("size-3.5 sm:size-4", active ? "text-primary" : "text-muted-foreground/70")} /> : null}
                        {item.id === "payments" ? <CreditCard className={cn("size-3.5 sm:size-4", active ? "text-primary" : "text-muted-foreground/70")} /> : null}
                        <span>{item.label}</span>
                        {count ? (
                            <Badge variant={active ? "secondary" : "muted"} className="rounded-full px-1.5 py-0 text-[10px]">
                                {count}
                            </Badge>
                        ) : null}
                        {active ? <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-primary" /> : null}
                    </button>
                );
            })}
        </div>
    </nav>
);

const CurrentPlanCard = ({
    status,
    currentTime,
    onOpenCatalog,
    onStartTrial,
    startingTrial,
}: {
    status: StoreCommercialStatusDTO;
    currentTime: Date;
    onOpenCatalog: () => void;
    onStartTrial: () => void;
    startingTrial: boolean;
}) => {
    const access = getEffectiveCommercialAccess(status);
    if (!access) return null;
    const accessLabel = access.sourceKind === "store_access_grant" ? "Effective access" : "Current plan";
    const accessState = formatPlanTimeRemaining(access.endsAt, currentTime);
    const range = currentTermRange(status);
    const remainingPercent = range ? remainingTermPercent(range, currentTime) : null;
    const action = currentPlanAction(status);
    const accessSourceDetail = access.sourceKind === "store_access_grant"
        ? status.baseAccess?.status === "active"
            ? `Base Store License ends ${formatCommercialTimestamp(status.baseAccess.endsAt)}. Extended by ${access.sourceLabel}.`
            : `Provided by ${access.sourceLabel}.`
        : `Provided by ${access.sourceLabel}.`;

    return (
        <section className="overflow-hidden rounded-3xl border border-primary/15 bg-linear-to-br from-primary/12 via-card to-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">{accessLabel}</Badge>
                        <span className="text-sm font-medium text-primary">{accessState}</span>
                    </div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                        {access.displayName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Ends {formatCommercialTimestamp(access.endsAt)} ({status.timezone})
                    </p>
                    <p className="text-xs text-muted-foreground">{accessSourceDetail}</p>
                </div>
            </div>
            {remainingPercent !== null ? (
                <div className="mt-4 space-y-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-background/70">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${remainingPercent}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{remainingPercent}% of this term remaining</p>
                </div>
            ) : null}
            {status.scheduledSuccessor ? (
                <Alert variant="info" className="mt-4">
                    <CalendarClock className="size-4" aria-hidden="true" />
                    <AlertTitle>Scheduled plan change</AlertTitle>
                    <AlertDescription>
                        {status.scheduledSuccessor.planDisplayName} starts on {formatCommercialTimestamp(status.scheduledSuccessor.startsAt)} and runs until {formatCommercialTimestamp(status.scheduledSuccessor.endsAt)} ({status.timezone}).
                    </AlertDescription>
                </Alert>
            ) : null}
            <div className="mt-5 space-y-2">
                <SectionHeading>What’s enabled</SectionHeading>
                <FeatureEntitlements features={status.entitlements.features} />
            </div>
            {status.activeAddOns.length > 0 ? (
                <div className="mt-5 space-y-2">
                    <SectionHeading>Active add-ons</SectionHeading>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {status.activeAddOns.map((addOn) => (
                            <li key={addOn.id} className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                                <p className="font-medium text-foreground">{addOn.moduleDisplayName}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Ends {formatCommercialDate(addOn.endsAt)} ({status.timezone})
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
                {action?.kind === "renew" || action?.kind === "choose" ? (
                    <Button className="rounded-full" onClick={onOpenCatalog}>{action.label}</Button>
                ) : null}
                {status.trial.eligible ? (
                    <Button variant="outline" className="rounded-full" disabled={startingTrial} onClick={onStartTrial}>
                        {startingTrial ? "Starting trial..." : "Start Trial"}
                    </Button>
                ) : null}
            </div>
        </section>
    );
};

const ExpiredPlanCard = ({
    status,
    previousPlan,
    isCreating,
    catalogOpen,
    onRenewSamePlan,
    onOpenCatalog,
    onCloseCatalog,
}: {
    status: StoreCommercialStatusDTO;
    previousPlan: NonNullable<ReturnType<typeof resolvePreviousPaidPlan>>;
    isCreating: boolean;
    catalogOpen: boolean;
    onRenewSamePlan: () => void;
    onOpenCatalog: () => void;
    onCloseCatalog: () => void;
}) => (
    <section className="space-y-4 rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
            <Badge variant="destructive" className="rounded-full px-3 py-1 text-xs">
                {previousPlan.status === "expired" ? "Expired" : "Revoked"}
            </Badge>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                {previousPlan.planDisplayName}
            </h2>
            <p className="text-sm text-muted-foreground">
                This Store License ended {formatCommercialTimestamp(previousPlan.endsAt)} ({status.timezone}).
            </p>
        </div>
        {previousPlan.availablePlan ? (
            <div className="flex flex-wrap gap-2">
                <Button className="rounded-full" disabled={isCreating} onClick={onRenewSamePlan}>
                    {isCreating ? "Preparing checkout..." : `Renew with ${previousPlan.planDisplayName}`}
                </Button>
                {catalogOpen ? (
                    <Button variant="outline" className="rounded-full" onClick={onCloseCatalog}>Hide other plans</Button>
                ) : (
                    <Button variant="outline" className="rounded-full" onClick={onOpenCatalog}>See other plans</Button>
                )}
            </div>
        ) : (
            <p className="text-sm text-muted-foreground">
                {previousPlan.planDisplayName} is no longer available. Choose a current Plan below.
            </p>
        )}
    </section>
);

const TrialOfferCard = ({
    message,
    startingTrial,
    onStartTrial,
}: {
    message: string;
    startingTrial: boolean;
    onStartTrial: () => void;
}) => (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/10 p-5">
        <div className="space-y-1">
            <SectionHeading>Try before you buy</SectionHeading>
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button className="rounded-full" disabled={startingTrial} onClick={onStartTrial}>
            {startingTrial ? "Starting trial..." : "Start Trial"}
        </Button>
    </section>
);

const PlanCatalog = ({
    status,
    isCreatingPlan,
    isCreatingAddOn,
    startingTrial,
    highlightedPlanKey,
    onSelectPlan,
    onSelectAddOn,
    onStartTrial,
}: {
    status: StoreCommercialStatusDTO;
    isCreatingPlan: boolean;
    isCreatingAddOn: boolean;
    startingTrial: boolean;
    highlightedPlanKey?: string;
    onSelectPlan: (planKey: string) => void;
    onSelectAddOn: (moduleKey: string) => void;
    onStartTrial: () => void;
}) => {
    const plans = visiblePaidPlans(status);
    const includeTrial = shouldIncludeTrialInCatalog(status);
    const trialPlan = includeTrial ? status.availableTrialPlan : null;
    if (plans.length === 0 && !trialPlan && status.availableCoTermAddOns.length === 0) {
        if (status.trial.eligible) return null;
        return (
            <Empty className="border border-dashed border-border/70 bg-muted/10">
                <EmptyHeader>
                    <EmptyMedia variant="icon"><Sparkles /></EmptyMedia>
                    <EmptyTitle>No Plans are available right now</EmptyTitle>
                    <EmptyDescription>Check back once Ganatri publishes a sellable Plan for this Store.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }
    return (
        <div id="plan-options" className="space-y-6">
            {trialPlan || plans.length > 0 ? (
                <section className="space-y-4">
                    <PaidPlanCards
                        plans={plans}
                        trialPlan={trialPlan}
                        trialEligible={status.trial.eligible}
                        trialMessage={status.trial.message}
                        isCreating={isCreatingPlan}
                        startingTrial={startingTrial}
                        highlightedPlanKey={highlightedPlanKey}
                        onSelectPlan={onSelectPlan}
                        onStartTrial={onStartTrial}
                    />
                </section>
            ) : null}
            {status.availableCoTermAddOns.length > 0 ? (
                <section className="space-y-3">
                    <SectionHeading>Add eligible modules</SectionHeading>
                    <CoTermAddOnCards
                        addOns={status.availableCoTermAddOns}
                        isCreating={isCreatingAddOn}
                        onSelectAddOn={onSelectAddOn}
                    />
                </section>
            ) : null}
        </div>
    );
};

type WorkspaceLicenseControlCenterProps = {
    status: StoreCommercialStatusDTO;
    currentTime: Date;
    awaitingConfirmation: boolean;
    startingTrial: boolean;
    creatingCheckout: boolean;
    creatingAddOnCheckout: boolean;
    visibleQuote: CommercialQuoteDTO | null;
    commercialHistory: CommercialHistoryEntryDTO[];
    onStartTrial: () => void;
    onSelectPlan: (planKey: string) => void;
    onSelectAddOn: (moduleKey: string) => void;
    onPayQuote: (quote: CommercialQuoteDTO) => void;
};

const WorkspaceLicenseControlCenter = ({
    status,
    currentTime,
    awaitingConfirmation,
    startingTrial,
    creatingCheckout,
    creatingAddOnCheckout,
    visibleQuote,
    commercialHistory,
    onStartTrial,
    onSelectPlan,
    onSelectAddOn,
    onPayQuote,
}: WorkspaceLicenseControlCenterProps) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = parseLicenseWorkspaceTab(searchParams.get("tab"));
    const catalogOpen = isLicensePlanCatalogOpen(searchParams.get("browse"), status);
    const access = getEffectiveCommercialAccess(status);
    const previousPlan = resolvePreviousPaidPlan(status);
    const timelineEntries = buildAccessTimelineEntries(status);
    const showTrialOffer = status.trial.eligible && !access && !shouldIncludeTrialInCatalog(status);

    const updateParams = (mutate: (params: URLSearchParams) => void) => {
        const nextParams = new URLSearchParams(searchParams);
        mutate(nextParams);
        setSearchParams(nextParams, { replace: true });
    };

    const setTab = (next: LicenseWorkspaceTab) => {
        updateParams((params) => {
            if (next === "plans") params.delete("tab");
            else params.set("tab", next);
        });
    };

    const setCatalogOpen = (open: boolean) => {
        updateParams((params) => {
            params.delete("tab");
            if (open) params.set("browse", "1");
            else params.delete("browse");
        });
    };

    return (
        <div className="space-y-5">
            <LicenseWorkspaceTabs
                tab={tab}
                historyCount={timelineEntries.length}
                paymentCount={commercialHistory.length}
                onTabChange={setTab}
            />
            {tab === "plans" ? (
                <div className="space-y-6">
                    {visibleQuote ? (
                        <section id="checkout" className="space-y-3">
                            <SectionHeading>Complete your purchase</SectionHeading>
                            <QuoteCheckoutPanel quote={visibleQuote} awaitingConfirmation={awaitingConfirmation} onPay={() => onPayQuote(visibleQuote)} />
                        </section>
                    ) : null}
                    {access ? (
                        <CurrentPlanCard
                            status={status}
                            currentTime={currentTime}
                            onOpenCatalog={() => setCatalogOpen(true)}
                            onStartTrial={onStartTrial}
                            startingTrial={startingTrial}
                        />
                    ) : previousPlan ? (
                        <ExpiredPlanCard
                            status={status}
                            previousPlan={previousPlan}
                            isCreating={creatingCheckout}
                            catalogOpen={catalogOpen}
                            onRenewSamePlan={() => previousPlan.availablePlan && onSelectPlan(previousPlan.availablePlan.key)}
                            onOpenCatalog={() => setCatalogOpen(true)}
                            onCloseCatalog={() => setCatalogOpen(false)}
                        />
                    ) : showTrialOffer ? (
                        <TrialOfferCard
                            message={status.trial.message}
                            startingTrial={startingTrial}
                            onStartTrial={onStartTrial}
                        />
                    ) : null}
                    {catalogOpen && !visibleQuote ? (
                        <div className="space-y-3">
                            {access ? (
                                <div className="flex justify-end">
                                    <Button variant="ghost" className="rounded-full" onClick={() => setCatalogOpen(false)}>
                                        Back to current plan
                                    </Button>
                                </div>
                            ) : null}
                            <PlanCatalog
                                status={status}
                                isCreatingPlan={creatingCheckout}
                                isCreatingAddOn={creatingAddOnCheckout}
                                startingTrial={startingTrial}
                                highlightedPlanKey={previousPlan?.availablePlan?.key}
                                onSelectPlan={onSelectPlan}
                                onSelectAddOn={onSelectAddOn}
                                onStartTrial={onStartTrial}
                            />
                        </div>
                    ) : null}
                    {!catalogOpen && !visibleQuote && access && status.availableCoTermAddOns.length > 0 ? (
                        <section className="space-y-3">
                            <SectionHeading>Add eligible modules</SectionHeading>
                            <CoTermAddOnCards
                                addOns={status.availableCoTermAddOns}
                                isCreating={creatingAddOnCheckout}
                                onSelectAddOn={onSelectAddOn}
                            />
                        </section>
                    ) : null}
                </div>
            ) : null}
            {tab === "history" ? (
                <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
                    <div className="mb-5 space-y-1">
                        <SectionHeading>Access timeline</SectionHeading>
                        <p className="text-sm text-muted-foreground">
                            Every Store License and Store Access Grant keeps its own dates.
                        </p>
                    </div>
                    {timelineEntries.length === 0 ? (
                        <Empty className="border-0 py-8">
                            <EmptyHeader>
                                <EmptyMedia variant="icon"><History /></EmptyMedia>
                                <EmptyTitle>No access history yet</EmptyTitle>
                                <EmptyDescription>Start a Trial Plan or purchase a Plan to begin this Store's timeline.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <AccessTimeline status={status} />
                    )}
                </section>
            ) : null}
            {tab === "payments" ? (
                commercialHistory.length === 0 ? (
                    <Empty className="border border-dashed border-border/70 bg-muted/10">
                        <EmptyHeader>
                            <EmptyMedia variant="icon"><CreditCard /></EmptyMedia>
                            <EmptyTitle>No payment history yet</EmptyTitle>
                            <EmptyDescription>Quotes, verified payments, and refunds for this Store will appear here.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <CommercialActivityTimeline entries={commercialHistory} collapsible={false} />
                )
            ) : null}
        </div>
    );
};
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
                <p className="font-display text-xl font-semibold text-foreground">
                    {quote.kind === "co_term_add_on" ? `${quoteDisplayName(quote)} Add-On` : `${quoteDisplayName(quote)} Plan`}
                </p>
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
const CoTermAddOnCards = ({
    addOns,
    isCreating,
    onSelectAddOn,
}: {
    addOns: StoreCommercialStatusDTO["availableCoTermAddOns"];
    isCreating: boolean;
    onSelectAddOn: (moduleKey: string) => void;
}) => (
    <div className="grid gap-3 sm:grid-cols-2">
        {addOns.map((addOn) => (
            <div
                key={addOn.key}
                className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
                <div className="space-y-2">
                    <p className="font-display text-lg font-semibold text-foreground">{addOn.displayName}</p>
                    <p className="font-display text-2xl font-semibold text-foreground">
                        {formatCurrency(addOn.amountInr)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Prorated from {formatCurrency(addOn.priceInr)} GST-inclusive · {addOn.term.count} {addOn.term.unit}
                        {addOn.term.count === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Starts immediately after payment is verified and ends with your current plan
                    </p>
                </div>
                <Button
                    className="rounded-full"
                    disabled={isCreating}
                    onClick={() => onSelectAddOn(addOn.key)}
                >
                    {isCreating ? "Preparing checkout..." : `Add ${addOn.displayName}`}
                </Button>
            </div>
        ))}
    </div>
);
const formatCatalogPrice = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);

const formatCatalogTermPeriod = (term: { count: number; unit: string }) => {
    const unitLabel = term.count === 1 ? term.unit : `${term.unit}s`;
    return term.count === 1 ? `/ ${unitLabel}` : `/ ${term.count} ${unitLabel}`;
};

type CatalogModuleList = NonNullable<StoreCommercialStatusDTO["availablePaidPlans"][number]["modules"]>;

const PlanModuleList = ({
    modules,
}: {
    modules: CatalogModuleList;
}) => {
    if (modules.length === 0) return null;
    return (
        <ul className="space-y-3 text-xs sm:text-sm">
            {modules.map((moduleItem) => (
                <li key={moduleItem.key} className="space-y-1.5">
                    <p className="font-semibold text-foreground">{moduleItem.displayName}</p>
                    {moduleItem.features.length > 0 ? (
                        <ul className="space-y-1.5">
                            {moduleItem.features.map((feature) => (
                                <li key={feature.key} className="flex items-start gap-2.5">
                                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#0C73FE]/10 text-[#0C73FE] dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
                                        <Check className="size-3 stroke-[2.5]" />
                                    </span>
                                    <span className="text-muted-foreground">{feature.displayName}</span>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </li>
            ))}
        </ul>
    );
};

const CatalogPlanCard = ({
    name,
    description,
    priceLabel,
    periodLabel,
    footnote,
    modules,
    isBestValue,
    isRecommended,
    highlighted,
    highlightLabel,
    ctaLabel,
    ctaDisabled,
    featuredCta,
    onSelect,
}: {
    name: string;
    description?: string | null;
    priceLabel: string;
    periodLabel: string;
    footnote?: string;
    modules: CatalogModuleList;
    isBestValue: boolean;
    isRecommended: boolean;
    highlighted?: boolean;
    highlightLabel?: string;
    ctaLabel: string;
    ctaDisabled: boolean;
    featuredCta: boolean;
    onSelect: () => void;
}) => {
    const ribbonLabel = isBestValue ? "Best value" : isRecommended ? "Recommended" : null;
    return (
    <div className={cn("group relative flex h-full flex-col", ribbonLabel ? "mt-5 lg:mt-4" : "")}>
        {ribbonLabel ? (
            <div className="pointer-events-none absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg",
                    isBestValue
                        ? "bg-gradient-to-r from-[#0C73FE] to-[#1D4ED8] dark:from-[#38BDF8] dark:to-[#0C73FE] dark:text-zinc-950"
                        : "bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:text-zinc-950",
                )}>
                    <span className="size-1.5 rounded-full bg-white opacity-90 dark:bg-zinc-950" />
                    {ribbonLabel}
                </span>
            </div>
        ) : null}
        <div
            className={cn(
                "relative flex h-full flex-col justify-between rounded-3xl p-5 sm:p-7",
                isBestValue
                    ? "border-2 border-[#0C73FE] bg-card/95 shadow-[0_4px_32px_-4px_rgba(12,115,254,0.22)] dark:border-[#38BDF8] dark:shadow-[0_4px_32px_-4px_rgba(56,189,248,0.18)]"
                    : isRecommended
                        ? "border-2 border-emerald-600 bg-card/95 shadow-[0_4px_32px_-4px_rgba(5,150,105,0.18)] dark:border-emerald-400"
                    : "border border-border/80 bg-card/85 shadow-sm",
                highlighted && !isBestValue && !isRecommended ? "ring-1 ring-primary/20" : "",
            )}
        >
            <div className="space-y-5">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {isBestValue && isRecommended ? (
                                <Badge className="rounded-full bg-emerald-600 text-[10px] font-semibold uppercase tracking-wide text-white">
                                    Recommended
                                </Badge>
                            ) : null}
                            {highlighted && highlightLabel ? (
                                <Badge variant="secondary" className="rounded-full text-xs">{highlightLabel}</Badge>
                            ) : null}
                        </div>
                    </div>
                    {description ? (
                        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
                    ) : null}
                    <div className="flex items-baseline gap-1.5 pt-2">
                        <span className="font-display text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                            {priceLabel}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground sm:text-base">{periodLabel}</span>
                    </div>
                    {footnote ? (
                        <p className="text-xs text-muted-foreground">{footnote}</p>
                    ) : null}
                </div>
                <div className={cn(
                    "h-px w-full",
                    isBestValue
                        ? "bg-[#0C73FE]/20 dark:bg-[#38BDF8]/20"
                        : isRecommended
                            ? "bg-emerald-600/20 dark:bg-emerald-400/20"
                            : "bg-border/60",
                )} />
                <PlanModuleList modules={modules} />
            </div>
            <div className="mt-6">
                <Button
                    variant={featuredCta ? "default" : "outline"}
                    className={cn(
                        "h-11 w-full rounded-xl text-sm font-semibold",
                        featuredCta
                            ? isBestValue
                                ? "bg-[#0C73FE] text-white hover:bg-[#0C73FE]/90 dark:bg-[#38BDF8] dark:text-zinc-950 dark:hover:bg-[#38BDF8]/90"
                                : "bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-400/90"
                            : "",
                    )}
                    disabled={ctaDisabled}
                    onClick={onSelect}
                >
                    {ctaLabel}
                </Button>
            </div>
        </div>
    </div>
    );
};

const PaidPlanCards = ({
    plans,
    trialPlan,
    trialEligible = false,
    trialMessage,
    isCreating,
    startingTrial = false,
    onSelectPlan,
    onStartTrial,
    highlightedPlanKey,
}: {
    plans: StoreCommercialStatusDTO["availablePaidPlans"];
    trialPlan?: StoreCommercialStatusDTO["availableTrialPlan"];
    trialEligible?: boolean;
    trialMessage?: string;
    isCreating: boolean;
    startingTrial?: boolean;
    onSelectPlan: (planKey: string) => void;
    onStartTrial?: () => void;
    highlightedPlanKey?: string;
}) => (
    <div className="grid items-stretch gap-5 lg:grid-cols-3">
        {orderedLicenseCatalogCards({ trialPlan, plans }).map((card) => (
            card.kind === "trial" ? (
                <CatalogPlanCard
                    key={card.key}
                    name={card.trial.displayName}
                    description={card.trial.description}
                    priceLabel="Free"
                    periodLabel={formatCatalogTermPeriod(card.trial.term)}
                    footnote={trialMessage}
                    modules={card.trial.modules}
                    isBestValue={card.trial.isBestValue}
                    isRecommended={card.trial.isRecommended}
                    ctaLabel={startingTrial ? "Starting trial..." : trialEligible ? "Start Trial" : "Trial already used"}
                    ctaDisabled={startingTrial || !trialEligible || !onStartTrial}
                    featuredCta={card.trial.isRecommended}
                    onSelect={() => onStartTrial?.()}
                />
            ) : (
                <CatalogPlanCard
                    key={card.key}
                    name={card.plan.displayName}
                    description={card.plan.description}
                    priceLabel={formatCatalogPrice(card.plan.amountInr)}
                    periodLabel={formatCatalogTermPeriod(card.plan.term)}
                    footnote={`GST-inclusive · ${planTimingLabel(card.plan)}`}
                    modules={card.plan.modules ?? []}
                    isBestValue={Boolean(card.plan.isBestValue)}
                    isRecommended={Boolean(card.plan.isRecommended)}
                    highlighted={highlightedPlanKey === card.plan.key}
                    highlightLabel="Previous plan"
                    ctaLabel={isCreating ? "Preparing checkout..." : planActionLabel(card.plan)}
                    ctaDisabled={isCreating}
                    featuredCta={Boolean(card.plan.isBestValue || card.plan.isRecommended)}
                    onSelect={() => onSelectPlan(card.plan.key)}
                />
            )
        ))}
    </div>
);
const CommercialHistoryList = ({ entries }: { entries: CommercialHistoryEntryDTO[] }) => (
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
);

const CommercialActivityTimeline = ({
    entries,
    collapsible = true,
}: {
    entries: CommercialHistoryEntryDTO[];
    collapsible?: boolean;
}) => {
    const [open, setOpen] = useState(!collapsible);
    if (entries.length === 0) return null;
    if (!collapsible) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card/80">
                <CommercialHistoryList entries={entries} />
            </div>
        );
    }
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
                    <CommercialHistoryList entries={entries} />
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
};
const StoreCommercialStatus = ({
    organizationId,
    storeId,
    variant = "detail",
    createPaidPlanCheckout = createPaidPlanCheckoutRequest,
    createCoTermAddOnCheckout = createCoTermAddOnCheckoutRequest,
    openRazorpayCheckout = defaultOpenRazorpayCheckout,
}: StoreCommercialStatusProps) => {
    const queryClient = useQueryClient();
    const currentTime = useCurrentTime();
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
    const [checkoutQuote, setCheckoutQuote] = useState<PaidPlanCheckoutResponse | CoTermAddOnCheckoutResponse | null>(null);
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
    const rememberCheckout = (data: PaidPlanCheckoutResponse | CoTermAddOnCheckoutResponse) => {
        setCheckoutQuote(data);
        queryClient.setQueryData(commercialLicenseKeys.status(organizationId, storeId), {
            status: "success",
            data: { commercialStatus: data.commercialStatus },
            message: "Store commercial status fetched successfully",
            code: 200,
        });
    };
    const startRazorpayForCheckout = async (data: PaidPlanCheckoutResponse | CoTermAddOnCheckoutResponse) => {
        try {
            const result = await openRazorpayCheckout({
                keyId: data.checkout.keyId,
                orderId: data.checkout.orderId,
                amountPaise: data.checkout.amountPaise,
                currency: data.checkout.currency,
                description: data.quote.kind === "co_term_add_on"
                    ? `${quoteDisplayName(data.quote)} Add-On`
                    : `${quoteDisplayName(data.quote)} Plan`,
            });
            if (result.outcome === "browser-success") {
                setAwaitingConfirmation(true);
            }
            if (result.outcome === "failed") {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to open Razorpay Checkout");
        }
    };
    const beginCheckout = async (
        response: ServiceResponse<PaidPlanCheckoutResponse | CoTermAddOnCheckoutResponse | null>,
        fallbackMessage: string,
    ) => {
        if (response.status === "error" || !response.data) {
            toast.error(response.message ?? fallbackMessage);
            return;
        }
        rememberCheckout(response.data);
        await startRazorpayForCheckout(response.data);
    };
    const createCheckout = useMutation({
        mutationFn: (planKey: string) => createPaidPlanCheckout(organizationId, storeId, { planKey }),
        onSuccess: (response) => beginCheckout(response, "Unable to create a Commercial Quote"),
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to create a Commercial Quote");
        },
    });
    const createAddOnCheckout = useMutation({
        mutationFn: (moduleKey: string) => createCoTermAddOnCheckout(organizationId, storeId, { moduleKey }),
        onSuccess: (response) => beginCheckout(response, "Unable to create a Commercial Quote"),
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
        && (status.availablePaidPlans.length > 0
            || status.availableCoTermAddOns.length > 0
            || status.pendingCheckout),
    );
    const visibleQuote = status?.pendingCheckout ?? checkoutQuote?.quote ?? null;
    const showPaidPlans = Boolean(status?.availablePaidPlans.length) && !visibleQuote;
    const showCoTermAddOns = Boolean(status?.availableCoTermAddOns.length) && !visibleQuote;
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
        if (awaitingConfirmation && (accessGranted || (status?.activeAddOns.length ?? 0) > 0)) {
            setAwaitingConfirmation(false);
            setCheckoutQuote(null);
        }
    }, [accessGranted, awaitingConfirmation, status?.activeAddOns.length]);
    useEffect(() => {
        if (!canPurchase && !hasActivePaidAccess) {
            setCheckoutQuote(null);
        }
    }, [canPurchase, hasActivePaidAccess]);
    const payQuote = async (quote: CommercialQuoteDTO) => {
        if (checkoutQuote?.quote.id === quote.id) {
            await startRazorpayForCheckout(checkoutQuote);
            return;
        }
        const created = quote.kind === "co_term_add_on"
            ? await createCoTermAddOnCheckout(organizationId, storeId, { moduleKey: quoteSelectionKey(quote) })
            : await createPaidPlanCheckout(organizationId, storeId, { planKey: quoteSelectionKey(quote) });
        await beginCheckout(created, "Unable to create a Commercial Quote");
    };
    if (variant === "workspace") {
        return (
            <div className="space-y-6" data-testid="store-workspace-license-control-center">
                {statusQuery.isPending ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <LoaderCircle className="size-5 animate-spin text-primary" />
                    </div>
                ) : statusQuery.isError || statusQuery.data?.status === "error" || !status ? (
                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardContent className="py-6 text-sm text-muted-foreground">
                            {statusQuery.data?.message ?? "Unable to load this Store's commercial status."}
                        </CardContent>
                    </Card>
                ) : (
                    <WorkspaceLicenseControlCenter
                        status={status}
                        currentTime={currentTime}
                        awaitingConfirmation={awaitingConfirmation}
                        startingTrial={startTrial.isPending}
                        creatingCheckout={createCheckout.isPending}
                        creatingAddOnCheckout={createAddOnCheckout.isPending}
                        visibleQuote={visibleQuote}
                        commercialHistory={commercialHistory}
                        onStartTrial={() => startTrial.mutate()}
                        onSelectPlan={(planKey) => createCheckout.mutate(planKey)}
                        onSelectAddOn={(moduleKey) => createAddOnCheckout.mutate(moduleKey)}
                        onPayQuote={(quote) => void payQuote(quote)}
                    />
                )}
            </div>
        );
    }
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
                        {status.activeAddOns.length > 0 ? (
                            <section className="space-y-3">
                                <SectionHeading>Active add-ons</SectionHeading>
                                <ul className="space-y-2">
                                    {status.activeAddOns.map((addOn) => (
                                        <li
                                            key={addOn.id}
                                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3"
                                        >
                                            <div className="min-w-0 space-y-1">
                                                <p className="text-sm font-medium text-foreground">{addOn.moduleDisplayName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatCommercialDate(addOn.startsAt)}
                                                    {" – "}
                                                    {formatCommercialDate(addOn.endsAt)}
                                                    {` (${status.timezone})`}
                                                </p>
                                            </div>
                                            <Badge variant="secondary" className="rounded-full text-xs capitalize">
                                                {addOn.status}
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
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
                        {showCoTermAddOns ? (
                            <section className="space-y-3">
                                <SectionHeading>Add eligible modules</SectionHeading>
                                <CoTermAddOnCards
                                    addOns={status.availableCoTermAddOns}
                                    isCreating={createAddOnCheckout.isPending}
                                    onSelectAddOn={(moduleKey) => createAddOnCheckout.mutate(moduleKey)}
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
