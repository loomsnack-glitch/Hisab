import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    clearMoneyAccountPaymentRoute,
    getMoneyAccountPaymentRoutes,
    getMoneyAccounts,
    getStoreCommercialStatus,
    upsertMoneyAccountPaymentRoute,
} from "@repo/services";
import {
    MONEY_ACCOUNT_PAYMENT_ROUTE_METHOD_LABELS,
    MONEY_ACCOUNT_SCOPE_LABELS,
    type MoneyAccountDTO,
    type MoneyAccountPaymentRouteMethod,
    type StoreDTO,
} from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { CreditCard, Route as RouteIcon, Smartphone } from "lucide-react";
import { toast } from "sonner";

import CatalogAccessPaused from "@/components/commercial/catalog-access-paused";
import { featureAccessPausedState } from "@/lib/commercial-access-paused-state";
import { isQueryCommercialAccessDenied } from "@/lib/commercial-access";
import { commercialLicenseKeys, moneyAccountKeys } from "@/lib/query-keys";
import { getStoreLicensePath } from "@/lib/store-workspace-routes";
import { adminNestedTabPageHeightClass } from "@/lib/workspace-page-layout";

type StorePaymentRoutingFormProps = {
    organizationId: string;
    store: StoreDTO;
};

type PaymentRouteOption = {
    value: string;
    label: string;
};

const NONE_VALUE = "";

const isEligibleDestination = (account: MoneyAccountDTO, storeId: string) =>
    account.status === "active" &&
    (account.scope === "organization_wide" || account.storeId === storeId);

const destinationLabel = (account: MoneyAccountDTO) =>
    `${account.name} · ${account.scope === "organization_wide" ? "Every store" : MONEY_ACCOUNT_SCOPE_LABELS[account.scope]}`;

const methodMeta: Record<
    MoneyAccountPaymentRouteMethod,
    { icon: typeof Smartphone; iconClassName: string; hint: string }
> = {
    upi: {
        icon: Smartphone,
        iconClassName: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        hint: "Route future UPI collections to one Money Account.",
    },
    card: {
        icon: CreditCard,
        iconClassName: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        hint: "Route future Card collections to one Money Account.",
    },
};

const StorePaymentRoutingForm = ({ organizationId, store }: StorePaymentRoutingFormProps) => {
    const queryClient = useQueryClient();

    const routesQuery = useQuery({
        queryKey: moneyAccountKeys.paymentRoutes(organizationId, store.id),
        queryFn: () => getMoneyAccountPaymentRoutes(organizationId, store.id),
        enabled: Boolean(organizationId && store.id),
    });

    const moneyAccountsQuery = useQuery({
        queryKey: moneyAccountKeys.list(organizationId),
        queryFn: () => getMoneyAccounts(organizationId),
        enabled: Boolean(organizationId),
    });

    const commercialStatusQuery = useQuery({
        queryKey: commercialLicenseKeys.status(organizationId, store.id),
        queryFn: () => getStoreCommercialStatus(organizationId, store.id),
        enabled: Boolean(organizationId && store.id),
    });

    const routes =
        routesQuery.data?.status === "success" ? routesQuery.data.data?.routes ?? [] : [];
    const moneyAccounts =
        moneyAccountsQuery.data?.status === "success"
            ? moneyAccountsQuery.data.data?.moneyAccounts ?? []
            : [];

    const selectedUpiAccountId =
        routes.find(route => route.paymentMethod === "upi")?.moneyAccountId ?? NONE_VALUE;
    const selectedCardAccountId =
        routes.find(route => route.paymentMethod === "card")?.moneyAccountId ?? NONE_VALUE;

    const eligibleAccounts = moneyAccounts.filter(account => isEligibleDestination(account, store.id));
    const accountById = new Map(moneyAccounts.map(account => [account.id, account]));
    const routedCount = [selectedUpiAccountId, selectedCardAccountId].filter(Boolean).length;
    const commercialStatus = commercialStatusQuery.data?.status === "success"
        ? commercialStatusQuery.data.data?.commercialStatus ?? null
        : null;
    const commercialAccessDenied = isQueryCommercialAccessDenied(routesQuery)
        || isQueryCommercialAccessDenied(moneyAccountsQuery);
    const accessState = commercialStatus ? featureAccessPausedState(commercialStatus, "money_account_tracking") : null;
    const retryingCommercialAccess = routesQuery.isFetching
        || moneyAccountsQuery.isFetching
        || commercialStatusQuery.isFetching;

    const buildAccountOptions = (selectedId: string): PaymentRouteOption[] => {
        const options = eligibleAccounts.map(account => ({
            value: account.id,
            label: destinationLabel(account),
        }));

        if (selectedId && !eligibleAccounts.some(account => account.id === selectedId)) {
            const account = accountById.get(selectedId);
            if (account) {
                options.push({
                    value: account.id,
                    label: `${destinationLabel(account)} (inactive)`,
                });
            }
        }

        return options;
    };

    const upiOptions = buildAccountOptions(selectedUpiAccountId);
    const cardOptions = buildAccountOptions(selectedCardAccountId);

    const destinationNeedsRepair = (selectedId: string) => {
        if (!selectedId) {
            return null;
        }
        const account = accountById.get(selectedId);
        if (!account || account.status !== "active") {
            return account?.name ?? "This Money Account";
        }
        return null;
    };

    const saveMutation = useMutation({
        mutationFn: async ({
            paymentMethod,
            moneyAccountId,
        }: {
            paymentMethod: MoneyAccountPaymentRouteMethod;
            moneyAccountId: string;
        }) => {
            if (!moneyAccountId) {
                return clearMoneyAccountPaymentRoute(organizationId, store.id, paymentMethod);
            }

            return upsertMoneyAccountPaymentRoute(organizationId, store.id, {
                paymentMethod,
                moneyAccountId,
            });
        },
        onSuccess: response => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({
                    queryKey: moneyAccountKeys.paymentRoutes(organizationId, store.id),
                });
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to save payment routing");
        },
    });

    const renderMethodField = (
        paymentMethod: MoneyAccountPaymentRouteMethod,
        selectedId: string,
        options: PaymentRouteOption[],
    ) => {
        const inactiveName = destinationNeedsRepair(selectedId);
        const methodLabel = MONEY_ACCOUNT_PAYMENT_ROUTE_METHOD_LABELS[paymentMethod];
        const meta = methodMeta[paymentMethod];
        const Icon = meta.icon;
        const selectedOption = selectedId ? options.find(option => option.value === selectedId) ?? null : null;

        return (
            <div className="rounded-xl border border-border/60 bg-muted/15 p-3.5 space-y-3">
                <div className="flex items-start gap-3">
                    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", meta.iconClassName)}>
                        <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground">
                            {MONEY_ACCOUNT_PAYMENT_ROUTE_METHOD_LABELS[paymentMethod]} payments
                        </p>
                        <p className="text-xs text-muted-foreground">{meta.hint}</p>
                    </div>
                </div>

                <ReactSelect
                    options={options}
                    value={selectedOption}
                    onChange={option =>
                        saveMutation.mutate({
                            paymentMethod,
                            moneyAccountId: option?.value ?? "",
                        })
                    }
                    placeholder="Not routed"
                    isClearable
                    isDisabled={saveMutation.isPending}
                    isLoading={routesQuery.isPending || moneyAccountsQuery.isPending}
                    classNames={{
                        control: () => "!min-h-11 rounded-xl bg-background/80",
                        menu: () => "rounded-xl",
                    }}
                />

                {inactiveName ? (
                    <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                        {inactiveName} is inactive. Future {methodLabel} payments are blocked until you choose an active
                        Money Account. Historic Movements stay on this account.
                    </p>
                ) : null}
            </div>
        );
    };

    if (
        !routesQuery.isPending
        && !moneyAccountsQuery.isPending
        && commercialAccessDenied
        && accessState
    ) {
        return (
            <div className={adminNestedTabPageHeightClass}>
                <CatalogAccessPaused
                    className="h-full min-h-0"
                    badge={accessState.badge}
                    title={accessState.title}
                    message={accessState.description}
                    actionLabel={accessState.actionLabel}
                    actionHref={getStoreLicensePath(organizationId, store.id)}
                    featureIcon={RouteIcon}
                    retrying={retryingCommercialAccess}
                    onRetry={() => {
                        void routesQuery.refetch();
                        void moneyAccountsQuery.refetch();
                        void commercialStatusQuery.refetch();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="max-w-xl">
            <Card className="group overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-2xs transition-all duration-200 hover:border-primary/20 hover:shadow-md">
                <CardContent className="p-0">
                    <div className="relative overflow-hidden border-b border-border/50 px-5 py-5 sm:px-6">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_55%)]" />
                        <div className="relative flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                                    <RouteIcon className="size-5" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Collections</p>
                                    <h3 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                        Payment routing
                                    </h3>
                                </div>
                            </div>
                            <Badge variant="outline" className="rounded-full shrink-0">
                                {routedCount}/2 routed
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-4 px-5 py-4 sm:px-6">
                        {routesQuery.isPending || moneyAccountsQuery.isPending ? (
                            <div className="flex min-h-32 items-center justify-center">
                                <Spinner className="size-6 text-primary" />
                            </div>
                        ) : routesQuery.isError ||
                          routesQuery.data?.status === "error" ||
                          moneyAccountsQuery.isError ||
                          moneyAccountsQuery.data?.status === "error" ? (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                                <p className="text-sm text-destructive">
                                    {(routesQuery.error as { message?: string })?.message ??
                                        routesQuery.data?.message ??
                                        (moneyAccountsQuery.error as { message?: string })?.message ??
                                        moneyAccountsQuery.data?.message ??
                                        "Payment routing could not be loaded right now."}
                                </p>
                                <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => {
                                        routesQuery.refetch();
                                        moneyAccountsQuery.refetch();
                                    }}
                                >
                                    Try again
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {renderMethodField("upi", selectedUpiAccountId, upiOptions)}
                                {renderMethodField("card", selectedCardAccountId, cardOptions)}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default StorePaymentRoutingForm;
