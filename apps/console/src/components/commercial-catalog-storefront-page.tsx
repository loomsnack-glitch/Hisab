import { useEffect } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
    getCommercialPlan as getCommercialPlanRequest,
    listCommercialModules as listCommercialModulesRequest,
    listCommercialPlans as listCommercialPlansRequest,
} from "@repo/services";
import type {
    CommercialModuleListItemDTO,
    CommercialPlanDetailDTO,
    CommercialPlanListItemDTO,
    CommercialPlanModuleMembershipDTO,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import {
    ArrowRight,
    Check,
    Crown,
    Eye,
    Layers,
    Package,
    Sparkles,
    Zap,
} from "lucide-react";

import {
    commercialCatalogUnauthorizedCode,
    formatCommercialCatalogInr,
    formatCommercialCatalogTerm,
} from "@/components/commercial-catalog-ui";

const storefrontPlansQueryKey = ["platform-owner", "commercial-catalog", "storefront", "plans"] as const;
const storefrontModulesQueryKey = ["platform-owner", "commercial-catalog", "storefront", "modules"] as const;

const planTaglines: Record<string, string> = {
    trial: "Explore every capability with no commitment",
    core: "Essential tools for everyday business operations",
    pro: "The complete suite for growing restaurants",
};

const planCtaLabels: Record<string, string> = {
    trial: "Start free trial",
    core: "Get Core",
    pro: "Get Pro",
};

const moduleIcons: Record<string, typeof Package> = {
    core_operations: Zap,
    basic_catalog: Package,
    finance: Layers,
    kot_system: Sparkles,
    restaurant_operations: Crown,
    integrations: Sparkles,
};

const sortStorefrontPlans = (plans: CommercialPlanListItemDTO[]) =>
    [...plans].sort((left, right) => {
        if (left.planType === "trial" && right.planType !== "trial") return -1;
        if (right.planType === "trial" && left.planType !== "trial") return 1;
        return left.priceInr - right.priceInr;
    });

const resolveFeaturedPlanKey = (plans: CommercialPlanListItemDTO[]) => {
    const paidPlans = plans.filter((plan) => plan.planType === "paid");
    if (paidPlans.length === 0) return null;
    const proPlan = paidPlans.find((plan) => plan.key === "pro");
    if (proPlan) return proPlan.key;
    return paidPlans.reduce((highest, plan) => (plan.priceInr > highest.priceInr ? plan : highest)).key;
};

const formatPriceHeadline = (plan: CommercialPlanListItemDTO) => {
    if (plan.planType === "trial" || plan.priceInr === 0) return "Free";
    return formatCommercialCatalogInr(plan.priceInr);
};

type CommercialCatalogStorefrontPageProps = {
    listCommercialPlans?: typeof listCommercialPlansRequest;
    getCommercialPlan?: typeof getCommercialPlanRequest;
    listCommercialModules?: typeof listCommercialModulesRequest;
    onUnauthorized?: () => Promise<void>;
};

const CommercialCatalogStorefrontPage = ({
    listCommercialPlans = listCommercialPlansRequest,
    getCommercialPlan = getCommercialPlanRequest,
    listCommercialModules = listCommercialModulesRequest,
    onUnauthorized,
}: CommercialCatalogStorefrontPageProps) => {
    const plansQuery = useQuery({
        queryKey: storefrontPlansQueryKey,
        queryFn: () => listCommercialPlans({ status: "active" }),
        retry: false,
    });

    const activePlans = plansQuery.data?.status === "success" ? plansQuery.data.data?.plans ?? [] : [];
    const sortedPlans = sortStorefrontPlans(activePlans);
    const featuredPlanKey = resolveFeaturedPlanKey(sortedPlans);
    const plansErrorCode = commercialCatalogUnauthorizedCode(plansQuery.error, plansQuery.data);

    useEffect(() => {
        if (plansErrorCode === 401) void onUnauthorized?.();
    }, [plansErrorCode, onUnauthorized]);

    const planDetailQueries = useQueries({
        queries: sortedPlans.map((plan) => ({
            queryKey: ["platform-owner", "commercial-catalog", "storefront", "plan", plan.id],
            queryFn: () => getCommercialPlan(plan.id),
            retry: false,
            enabled: plansQuery.isSuccess,
        })),
    });

    const planDetails: CommercialPlanDetailDTO[] = planDetailQueries
        .filter((query) => query.data?.status === "success")
        .map((query) => query.data!.data!.plan);

    const modulesQuery = useQuery({
        queryKey: storefrontModulesQueryKey,
        queryFn: () => listCommercialModules({ status: "active" }),
        retry: false,
    });
    const addOnModules = (modulesQuery.data?.status === "success" ? modulesQuery.data.data?.modules ?? [] : [])
        .filter((moduleItem) => moduleItem.isSeparatelyPurchasable);
    const modulesErrorCode = commercialCatalogUnauthorizedCode(modulesQuery.error, modulesQuery.data);

    useEffect(() => {
        if (modulesErrorCode === 401) void onUnauthorized?.();
    }, [modulesErrorCode, onUnauthorized]);

    const isLoading = plansQuery.isPending || planDetailQueries.some((query) => query.isPending);
    const hasError = plansQuery.isError || plansQuery.data?.status === "error";

    if (isLoading) {
        return <p aria-busy="true">Loading storefront preview…</p>;
    }

    if (hasError) {
        return (
            <Alert variant="destructive" role="alert">
                <AlertTitle>Storefront preview could not be loaded</AlertTitle>
                <AlertDescription>
                    {(plansQuery.error as { message?: string } | null)?.message
                        ?? plansQuery.data?.message
                        ?? "Active Plans are unavailable."}
                </AlertDescription>
            </Alert>
        );
    }

    if (sortedPlans.length === 0) {
        return (
            <section className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
                <Eye className="mx-auto size-10 text-muted-foreground/60" />
                <h2 className="mt-4 text-lg font-semibold">No active Plans to preview</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Publish at least one active Plan to see how customers will experience your pricing page.
                </p>
            </section>
        );
    }

    const detailByPlanId = new Map(planDetails.map((plan) => [plan.id, plan]));

    return (
        <section className="space-y-10">
            <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-background px-6 py-8 sm:px-8">
                <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-primary/5 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                                Preview
                            </Badge>
                            <span className="text-xs text-muted-foreground">Customer-facing view</span>
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Choose the right plan for your business</h2>
                        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                            This is how active Plans and add-on Modules appear during purchase. Only published, active catalog items are shown.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
                        <Eye className="size-3.5 text-primary" />
                        Read-only preview — actions are disabled
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
                {sortedPlans.map((planItem) => {
                    const planDetail = detailByPlanId.get(planItem.id);
                    const revision = planDetail?.currentRevision;
                    const isFeatured = planItem.key === featuredPlanKey;
                    const isTrial = planItem.planType === "trial";

                    return (
                        <PlanPurchaseCard
                            key={planItem.id}
                            plan={planItem}
                            modules={revision?.modules ?? []}
                            featureCount={revision?.resolvedFeatures.length ?? 0}
                            isFeatured={isFeatured}
                            isTrial={isTrial}
                        />
                    );
                })}
            </div>

            {addOnModules.length > 0 ? (
                <div className="space-y-5">
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold tracking-tight">Optional add-ons</h3>
                        <p className="text-sm text-muted-foreground">
                            Modules customers can purchase separately on top of any Plan.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {addOnModules.map((moduleItem) => (
                            <AddOnModuleCard key={moduleItem.id} module={moduleItem} />
                        ))}
                    </div>
                </div>
            ) : null}
        </section>
    );
};

type PlanPurchaseCardProps = {
    plan: CommercialPlanListItemDTO;
    modules: CommercialPlanModuleMembershipDTO[];
    featureCount: number;
    isFeatured: boolean;
    isTrial: boolean;
};

const PlanPurchaseCard = ({
    plan,
    modules,
    featureCount,
    isFeatured,
    isTrial,
}: PlanPurchaseCardProps) => {
    const tagline = plan.description.trim() || planTaglines[plan.key] || "Everything you need to run your business";
    const ctaLabel = planCtaLabels[plan.key] ?? (isTrial ? "Start free trial" : "Choose plan");

    return (
        <article
            className={cn(
                "relative flex flex-col rounded-2xl border bg-card shadow-sm transition-shadow duration-300",
                isFeatured
                    ? "border-primary/40 shadow-lg ring-1 ring-primary/20 lg:-mt-2 lg:mb-2"
                    : "border-border/70 hover:border-border hover:shadow-md",
            )}
        >
            {isFeatured ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide shadow-sm">
                        Most popular
                    </Badge>
                </div>
            ) : null}

            <div className={cn("rounded-t-2xl px-6 pt-8 pb-5", isFeatured ? "bg-gradient-to-b from-primary/10 to-transparent" : "bg-muted/20")}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-xl font-semibold tracking-tight">{plan.displayName}</h3>
                        {isTrial ? (
                            <Badge variant="outline" className="mt-2 rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                Free trial
                            </Badge>
                        ) : null}
                    </div>
                </div>

                <div className="mt-5 flex items-end gap-1.5">
                    <span className="text-4xl font-bold tracking-tight tabular-nums">{formatPriceHeadline(plan)}</span>
                    {!isTrial && plan.priceInr > 0 ? (
                        <span className="mb-1 text-sm text-muted-foreground">/ {formatCommercialCatalogTerm(plan.term)}</span>
                    ) : null}
                </div>
                {isTrial ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                        for {formatCommercialCatalogTerm(plan.term)} · no payment required
                    </p>
                ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Billed per {plan.term.unit}</p>
                )}

                <p className="mt-4 text-sm leading-relaxed text-foreground/80">{tagline}</p>
            </div>

            <div className="flex flex-1 flex-col px-6 py-5">
                <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{modules.length} module{modules.length === 1 ? "" : "s"}</span>
                    <span>{featureCount} feature{featureCount === 1 ? "" : "s"}</span>
                </div>

                <ul className="flex-1 space-y-4">
                    {modules.map((moduleItem) => {
                        const ModuleIcon = moduleIcons[moduleItem.key] ?? Package;
                        return (
                            <li key={moduleItem.moduleRevisionId} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                                        isFeatured ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                                    )}>
                                        <ModuleIcon className="size-3.5" />
                                    </span>
                                    <span className="text-sm font-medium">{moduleItem.displayName}</span>
                                </div>
                                <ul className="ml-9 space-y-1.5">
                                    {moduleItem.features.map((feature) => (
                                        <li key={feature.featureRevisionId} className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                            <span>{feature.displayName}</span>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        );
                    })}
                </ul>

                <Button
                    type="button"
                    disabled
                    className={cn(
                        "mt-6 h-11 w-full rounded-xl text-sm font-semibold",
                        isFeatured && "bg-primary text-primary-foreground",
                    )}
                    variant={isFeatured ? "default" : "outline"}
                >
                    {ctaLabel}
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </article>
    );
};

const AddOnModuleCard = ({ module }: { module: CommercialModuleListItemDTO }) => (
    <article className="flex flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center">
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wide">Add-on</Badge>
                <h4 className="font-semibold">{module.displayName}</h4>
            </div>
            <p className="text-sm text-muted-foreground">
                {module.description.trim() || "Purchase separately and attach to any active Plan."}
            </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <p className="text-lg font-semibold tabular-nums">
                {formatCommercialCatalogInr(module.priceInr)}
                <span className="text-sm font-normal text-muted-foreground"> / {formatCommercialCatalogTerm(module.term)}</span>
            </p>
            <Button type="button" variant="outline" disabled className="rounded-full text-xs">
                Add to plan
            </Button>
        </div>
    </article>
);

export default CommercialCatalogStorefrontPage;
export type { CommercialCatalogStorefrontPageProps };
