import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { getMoneyAccountPaymentRoutes, getMoneyAccounts, updateStore } from "@repo/services";
import { type StoreDTO } from "@repo/types";
import { z } from "zod";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldContent } from "@repo/ui/components/field";
import { Label } from "@repo/ui/components/label";
import { LayoutGrid, UtensilsCrossed, Wallet } from "lucide-react";
import { toast } from "sonner";

import {
    getStoreMoneyAccountTrackingReadiness,
    type TrackingMethodReadiness,
} from "@/lib/money-account-tracking-readiness";
import { moneyAccountKeys, organizationKeys } from "@/lib/query-keys";

type StoreFeatureSettingsFormProps = {
    organizationId: string;
    store: StoreDTO;
};

const StoreFeatureSettingsFormSchema = z.object({
    kotSystemEnabled: z.boolean(),
    tableManagementEnabled: z.boolean(),
    moneyAccountTrackingEnabled: z.boolean(),
});

type StoreFeatureSettingsFormValues = z.infer<typeof StoreFeatureSettingsFormSchema>;

const getDefaultValues = (store: StoreDTO): StoreFeatureSettingsFormValues => ({
    kotSystemEnabled: store.kotSystemEnabled,
    tableManagementEnabled: store.tableManagementEnabled,
    moneyAccountTrackingEnabled: store.moneyAccountTrackingEnabled,
});

const readinessLabel = (
    method: "Store Cash Account" | "UPI route" | "Card route",
    readiness: TrackingMethodReadiness,
    trackingEnabled: boolean,
) => {
    const blockedWhileOn = trackingEnabled
        ? "blocked until repaired"
        : "will be blocked while tracking is on";

    if (readiness.state === "ready") {
        return `${method}: ready · ${readiness.accountName}`;
    }
    if (readiness.state === "inactive_destination") {
        return `${method}: needs repair · ${readiness.accountName} is inactive. Future ${
            method === "UPI route" ? "UPI" : "Card"
        } payments are ${blockedWhileOn}. Historic Movements remain visible.`;
    }
    if (method === "Store Cash Account") {
        return `${method}: missing. Cash payments are ${blockedWhileOn} until an active Cash Money Account exists.`;
    }
    return `${method}: not set. ${method === "UPI route" ? "UPI" : "Card"} payments are ${blockedWhileOn} until an administrator chooses an active Money Account.`;
};

const StoreFeatureSettingsForm = ({ organizationId, store }: StoreFeatureSettingsFormProps) => {
    const queryClient = useQueryClient();
    const form = useForm<StoreFeatureSettingsFormValues>({
        resolver: zodResolver(StoreFeatureSettingsFormSchema),
        defaultValues: getDefaultValues(store),
    });
    const trackingEnabled = form.watch("moneyAccountTrackingEnabled");

    const moneyAccountsQuery = useQuery({
        queryKey: moneyAccountKeys.list(organizationId),
        queryFn: () => getMoneyAccounts(organizationId),
        enabled: Boolean(organizationId),
    });
    const routesQuery = useQuery({
        queryKey: moneyAccountKeys.paymentRoutes(organizationId, store.id),
        queryFn: () => getMoneyAccountPaymentRoutes(organizationId, store.id),
        enabled: Boolean(organizationId && store.id),
    });

    const moneyAccounts =
        moneyAccountsQuery.data?.status === "success"
            ? moneyAccountsQuery.data.data?.moneyAccounts ?? []
            : [];
    const routes =
        routesQuery.data?.status === "success" ? routesQuery.data.data?.routes ?? [] : [];
    const readiness =
        moneyAccountsQuery.isSuccess && routesQuery.isSuccess
            ? getStoreMoneyAccountTrackingReadiness(store.id, moneyAccounts, routes)
            : null;

    useEffect(() => {
        form.reset(getDefaultValues(store));
    }, [form, store]);

    const updateMutation = useMutation({
        mutationFn: (values: StoreFeatureSettingsFormValues) =>
            updateStore(organizationId, store.id, {
                name: store.name,
                address: store.address ?? "",
                kotSystemEnabled: values.kotSystemEnabled,
                tableManagementEnabled: values.tableManagementEnabled,
                moneyAccountTrackingEnabled: values.moneyAccountTrackingEnabled,
            }),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) });
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to update store settings");
        },
    });

    const onSubmit: SubmitHandler<StoreFeatureSettingsFormValues> = (values) => {
        updateMutation.mutate(values);
    };

    return (
        <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
            <CardHeader>
                <CardTitle className="font-display text-xl">Store features</CardTitle>
                <CardDescription>
                    Enable optional systems for this store. These settings are saved per store.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field>
                        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                            <Controller
                                control={form.control}
                                name="kotSystemEnabled"
                                render={({ field }) => (
                                    <Checkbox
                                        id="kot-system-enabled"
                                        checked={field.value}
                                        onCheckedChange={(checked) => field.onChange(checked === true)}
                                        aria-label="Enable KOT system"
                                    />
                                )}
                            />
                            <FieldContent className="gap-1">
                                <Label htmlFor="kot-system-enabled" className="flex items-center gap-2 text-sm font-medium">
                                    <UtensilsCrossed className="size-4 text-primary" />
                                    KOT system
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Enable kitchen order ticket workflows for this store.
                                </p>
                            </FieldContent>
                        </div>
                    </Field>

                    <Field>
                        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                            <Controller
                                control={form.control}
                                name="tableManagementEnabled"
                                render={({ field }) => (
                                    <Checkbox
                                        id="table-management-enabled"
                                        checked={field.value}
                                        onCheckedChange={(checked) => field.onChange(checked === true)}
                                        aria-label="Enable table management"
                                    />
                                )}
                            />
                            <FieldContent className="gap-1">
                                <Label
                                    htmlFor="table-management-enabled"
                                    className="flex items-center gap-2 text-sm font-medium"
                                >
                                    <LayoutGrid className="size-4 text-primary" />
                                    Table management
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Enable table service and floor management for this store.
                                </p>
                            </FieldContent>
                        </div>
                    </Field>

                    <Field>
                        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                            <Controller
                                control={form.control}
                                name="moneyAccountTrackingEnabled"
                                render={({ field }) => (
                                    <Checkbox
                                        id="money-account-tracking-enabled"
                                        checked={field.value}
                                        onCheckedChange={(checked) => field.onChange(checked === true)}
                                        aria-label="Enable Money Account Tracking"
                                    />
                                )}
                            />
                            <FieldContent className="gap-1">
                                <Label
                                    htmlFor="money-account-tracking-enabled"
                                    className="flex items-center gap-2 text-sm font-medium"
                                >
                                    <Wallet className="size-4 text-primary" />
                                    Money Account Tracking
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    When enabled, Cash, UPI, and Card POS collections immediately increase the configured
                                    Money Accounts. When disabled, POS keeps recording Payments without new Movements.
                                    Opening Balances, routes, calculated balances, and history stay readable.
                                </p>
                                {readiness ? (
                                    <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                                        <li>{readinessLabel("Store Cash Account", readiness.cash, trackingEnabled)}</li>
                                        <li>{readinessLabel("UPI route", readiness.upi, trackingEnabled)}</li>
                                        <li>{readinessLabel("Card route", readiness.card, trackingEnabled)}</li>
                                    </ul>
                                ) : null}
                                {trackingEnabled ? (
                                    <p className="mt-2 text-[11px] text-muted-foreground">
                                        Tracking is on for this Store. Bank Transfer and Other stay untracked.
                                    </p>
                                ) : (
                                    <p className="mt-2 text-[11px] text-muted-foreground">
                                        Tracking is off. POS continues as today. Retained Money Account history remains
                                        readable even if this Store later becomes unavailable.
                                    </p>
                                )}
                            </FieldContent>
                        </div>
                    </Field>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            className="rounded-xl"
                            disabled={updateMutation.isPending || !form.formState.isDirty}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save settings"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default StoreFeatureSettingsForm;
