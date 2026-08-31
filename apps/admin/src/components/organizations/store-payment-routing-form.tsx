import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    clearMoneyAccountPaymentRoute,
    getMoneyAccountPaymentRoutes,
    getMoneyAccounts,
    upsertMoneyAccountPaymentRoute,
} from "@repo/services";
import {
    MONEY_ACCOUNT_PAYMENT_ROUTE_METHOD_LABELS,
    MONEY_ACCOUNT_SCOPE_LABELS,
    type MoneyAccountDTO,
    type MoneyAccountPaymentRouteMethod,
    type StoreDTO,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Field, FieldContent, FieldLabel } from "@repo/ui/components/field";
import { Spinner } from "@repo/ui/components/spinner";
import { Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";

import { moneyAccountKeys } from "@/lib/query-keys";

type StorePaymentRoutingFormProps = {
    organizationId: string;
    store: StoreDTO;
};

const NONE_VALUE = "";

const isEligibleDestination = (account: MoneyAccountDTO, storeId: string) =>
    account.status === "active" &&
    (account.scope === "organization_wide" || account.storeId === storeId);

const destinationLabel = (account: MoneyAccountDTO) =>
    `${account.name} · ${account.scope === "organization_wide" ? "Every store" : MONEY_ACCOUNT_SCOPE_LABELS[account.scope]}`;

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

    const routes =
        routesQuery.data?.status === "success" ? routesQuery.data.data?.routes ?? [] : [];
    const moneyAccounts =
        moneyAccountsQuery.data?.status === "success"
            ? moneyAccountsQuery.data.data?.moneyAccounts ?? []
            : [];

    const selectedUpiAccountId =
        routes.find((route) => route.paymentMethod === "upi")?.moneyAccountId ?? NONE_VALUE;
    const selectedCardAccountId =
        routes.find((route) => route.paymentMethod === "card")?.moneyAccountId ?? NONE_VALUE;

    const eligibleAccounts = moneyAccounts.filter((account) => isEligibleDestination(account, store.id));

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
        onSuccess: (response) => {
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

    const renderMethodField = (paymentMethod: MoneyAccountPaymentRouteMethod, selectedId: string) => (
        <Field>
            <FieldLabel htmlFor={`${paymentMethod}-payment-route`}>
                {MONEY_ACCOUNT_PAYMENT_ROUTE_METHOD_LABELS[paymentMethod]} payments
            </FieldLabel>
            <FieldContent>
                <select
                    id={`${paymentMethod}-payment-route`}
                    className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                    value={selectedId}
                    disabled={saveMutation.isPending}
                    onChange={(event) =>
                        saveMutation.mutate({
                            paymentMethod,
                            moneyAccountId: event.target.value,
                        })
                    }
                >
                    <option value={NONE_VALUE}>Not routed</option>
                    {eligibleAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                            {destinationLabel(account)}
                        </option>
                    ))}
                    {selectedId && !eligibleAccounts.some((account) => account.id === selectedId)
                        ? moneyAccounts
                              .filter((account) => account.id === selectedId)
                              .map((account) => (
                                  <option key={account.id} value={account.id}>
                                      {destinationLabel(account)}
                                  </option>
                              ))
                        : null}
                </select>
            </FieldContent>
        </Field>
    );

    return (
        <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
            <CardHeader>
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <RouteIcon className="size-4" />
                    </div>
                    <div>
                        <CardTitle className="font-display text-xl">Payment routing</CardTitle>
                        <CardDescription>
                            Send this store's future UPI and Card payments to one Money Account each. Both methods may
                            share the same account. Changing a route does not move earlier collections.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {routesQuery.isPending || moneyAccountsQuery.isPending ? (
                    <div className="flex min-h-32 items-center justify-center">
                        <Spinner className="size-5 text-primary" />
                    </div>
                ) : routesQuery.isError ||
                  routesQuery.data?.status === "error" ||
                  moneyAccountsQuery.isError ||
                  moneyAccountsQuery.data?.status === "error" ? (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            {(routesQuery.error as { message?: string })?.message ??
                                routesQuery.data?.message ??
                                (moneyAccountsQuery.error as { message?: string })?.message ??
                                moneyAccountsQuery.data?.message ??
                                "Payment routing could not be loaded right now."}
                        </p>
                        <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => {
                                routesQuery.refetch();
                                moneyAccountsQuery.refetch();
                            }}
                        >
                            Try again
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {renderMethodField("upi", selectedUpiAccountId)}
                        {renderMethodField("card", selectedCardAccountId)}
                        {eligibleAccounts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Add an active Organization-wide or {store.name} Money Account before routing UPI or Card
                                payments.
                            </p>
                        ) : null}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default StorePaymentRoutingForm;
