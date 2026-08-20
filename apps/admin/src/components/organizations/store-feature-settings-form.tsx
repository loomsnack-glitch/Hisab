import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { updateStore } from "@repo/services";
import { type StoreDTO } from "@repo/types";
import { z } from "zod";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldContent, FieldLabel } from "@repo/ui/components/field";
import { Label } from "@repo/ui/components/label";
import { LayoutGrid, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";

type StoreFeatureSettingsFormProps = {
    organizationId: string;
    store: StoreDTO;
};

const StoreFeatureSettingsFormSchema = z.object({
    kotSystemEnabled: z.boolean(),
    tableManagementEnabled: z.boolean(),
});

type StoreFeatureSettingsFormValues = z.infer<typeof StoreFeatureSettingsFormSchema>;

const getDefaultValues = (store: StoreDTO): StoreFeatureSettingsFormValues => ({
    kotSystemEnabled: store.kotSystemEnabled,
    tableManagementEnabled: store.tableManagementEnabled,
});

const StoreFeatureSettingsForm = ({ organizationId, store }: StoreFeatureSettingsFormProps) => {
    const queryClient = useQueryClient();
    const form = useForm<StoreFeatureSettingsFormValues>({
        resolver: zodResolver(StoreFeatureSettingsFormSchema),
        defaultValues: getDefaultValues(store),
    });

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
