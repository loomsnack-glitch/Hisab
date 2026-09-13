import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { updateStore } from "@repo/services";
import { type StoreDTO } from "@repo/types";
import { z } from "zod";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { LayoutGrid, LoaderCircle, SlidersHorizontal, UtensilsCrossed, Wallet } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";

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

type FeatureToggleRowProps = {
    id: string;
    icon: typeof UtensilsCrossed;
    iconClassName: string;
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
};

const FeatureToggleRow = ({
    id,
    icon: Icon,
    iconClassName,
    label,
    description,
    checked,
    onCheckedChange,
}: FeatureToggleRowProps) => (
    <div
        className={cn(
            "rounded-xl border p-3.5 transition-colors",
            checked ? "border-primary/20 bg-primary/5" : "border-border/60 bg-muted/15",
        )}
    >
        <div className="flex items-start gap-3">
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={value => onCheckedChange(value === true)}
                aria-label={label}
                className="mt-1"
            />
            <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", iconClassName)}>
                    <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor={id} className="cursor-pointer text-sm font-medium text-foreground">
                        {label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
        </div>
    </div>
);

const StoreFeatureSettingsForm = ({ organizationId, store }: StoreFeatureSettingsFormProps) => {
    const queryClient = useQueryClient();
    const form = useForm<StoreFeatureSettingsFormValues>({
        resolver: zodResolver(StoreFeatureSettingsFormSchema),
        defaultValues: getDefaultValues(store),
    });
    const kotSystemEnabled = form.watch("kotSystemEnabled");
    const tableManagementEnabled = form.watch("tableManagementEnabled");
    const trackingEnabled = form.watch("moneyAccountTrackingEnabled");
    const enabledCount = [kotSystemEnabled, tableManagementEnabled, trackingEnabled].filter(Boolean).length;

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
        onSuccess: response => {
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

    const onSubmit: SubmitHandler<StoreFeatureSettingsFormValues> = values => {
        updateMutation.mutate(values);
    };

    return (
        <Card className="group overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-2xs transition-all duration-200 hover:border-primary/20 hover:shadow-md">
            <CardContent className="p-0">
                <div className="relative overflow-hidden border-b border-border/50 px-5 py-5 sm:px-6">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_55%)]" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                                <SlidersHorizontal className="size-5" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capabilities</p>
                                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                    Store features
                                </h3>
                            </div>
                        </div>
                        <Badge variant="outline" className="rounded-full shrink-0">
                            {enabledCount}/3 enabled
                        </Badge>
                    </div>
                </div>

                <form className="space-y-3 px-5 py-4 sm:px-6" onSubmit={form.handleSubmit(onSubmit)}>
                    <p className="text-sm text-muted-foreground">
                        Enable optional systems for this store. These settings are saved per store.
                    </p>

                    <Controller
                        control={form.control}
                        name="kotSystemEnabled"
                        render={({ field }) => (
                            <FeatureToggleRow
                                id="kot-system-enabled"
                                icon={UtensilsCrossed}
                                iconClassName="bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                label="KOT system"
                                description="Enable kitchen order ticket workflows for this store."
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="tableManagementEnabled"
                        render={({ field }) => (
                            <FeatureToggleRow
                                id="table-management-enabled"
                                icon={LayoutGrid}
                                iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                label="Table management"
                                description="Enable table service and floor management for this store."
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="moneyAccountTrackingEnabled"
                        render={({ field }) => (
                            <FeatureToggleRow
                                id="money-account-tracking-enabled"
                                icon={Wallet}
                                iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                label="Money Account Tracking"
                                description="Track Cash, UPI, and Card POS collections against configured Money Accounts."
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />

                    <div className="flex items-center justify-end border-t border-border/40 pt-3">
                        <Button
                            type="submit"
                            className="rounded-xl"
                            disabled={updateMutation.isPending || !form.formState.isDirty}
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <LoaderCircle className="size-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save settings"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default StoreFeatureSettingsForm;
