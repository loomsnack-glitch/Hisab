import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { getSaleNumberSettings, updateSaleNumberSettings } from "@repo/services";
import {
    UpdateSaleNumberSettingsSchema,
    type SaleNumberResetPeriod,
    type StoreDTO,
    type TokenNumberResetPeriod,
    type UpdateSaleNumberSettingsJSON,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { LoaderCircle, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { billingKeys } from "@/lib/query-keys";

type SaleNumberSettingsFormProps = {
    organizationId: string;
    store: StoreDTO;
};

const resetPeriodOptions: Array<{ value: SaleNumberResetPeriod; label: string; example: string }> = [
    { value: "never", label: "Never", example: "123" },
    { value: "daily", label: "Daily", example: "20260807-0001" },
    { value: "weekly", label: "Weekly", example: "2026-W32-0001" },
    { value: "monthly", label: "Monthly", example: "2026-08-0001" },
    { value: "quarterly", label: "Quarterly", example: "2026-Q3-0001" },
    { value: "half_yearly", label: "Half-yearly", example: "2026-H2-0001" },
    { value: "yearly", label: "Calendar year", example: "2026-0001" },
    { value: "financial_yearly", label: "Financial year", example: "FY26-27-0001" },
];

const tokenResetPeriodOptions: Array<{ value: TokenNumberResetPeriod; label: string; example: string }> =
    resetPeriodOptions.map(({ value, label }) => ({ value, label, example: "001" }));

const resetPeriodSelectOptions = resetPeriodOptions.map(({ value, label }) => ({ value, label }));
const tokenResetPeriodSelectOptions = tokenResetPeriodOptions.map(({ value, label }) => ({ value, label }));
const tokenNumberEnabledOptions = [
    { value: false, label: "Disabled" },
    { value: true, label: "Enabled" },
] as const;

const selectControlClassNames = {
    control: () => "!min-h-11 rounded-xl",
};

const defaultValues: UpdateSaleNumberSettingsJSON = {
    resetPeriod: "never",
    tokenNumberEnabled: false,
    tokenNumberResetPeriod: "daily",
};

const SaleNumberSettingsForm = ({ organizationId, store }: SaleNumberSettingsFormProps) => {
    const queryClient = useQueryClient();
    const form = useForm<UpdateSaleNumberSettingsJSON>({
        resolver: zodResolver(UpdateSaleNumberSettingsSchema),
        defaultValues,
    });
    const resetPeriod = form.watch("resetPeriod");
    const selectedOption = resetPeriodOptions.find((option) => option.value === resetPeriod) ?? resetPeriodOptions[0];
    const tokenNumberEnabled = form.watch("tokenNumberEnabled");
    const tokenNumberResetPeriod = form.watch("tokenNumberResetPeriod");
    const selectedTokenOption =
        tokenResetPeriodOptions.find((option) => option.value === tokenNumberResetPeriod) ?? tokenResetPeriodOptions[0];

    const settingsQuery = useQuery({
        queryKey: billingKeys.saleNumberSettings(organizationId, store.id),
        queryFn: () => getSaleNumberSettings(organizationId, store.id),
    });

    useEffect(() => {
        const settings = settingsQuery.data?.status === "success" ? settingsQuery.data.data?.settings : null;
        if (settings) {
            form.reset({
                resetPeriod: settings.resetPeriod,
                tokenNumberEnabled: settings.tokenNumberEnabled,
                tokenNumberResetPeriod: settings.tokenNumberResetPeriod,
            });
        }
    }, [form, settingsQuery.data]);

    const updateMutation = useMutation({
        mutationFn: (values: UpdateSaleNumberSettingsJSON) =>
            updateSaleNumberSettings(organizationId, store.id, values),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: billingKeys.saleNumberSettings(organizationId, store.id) });
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Failed to update Sale Number settings"),
    });

    const onSubmit: SubmitHandler<UpdateSaleNumberSettingsJSON> = (values) => {
        updateMutation.mutate(values);
    };

    return (
        <Card className="max-w-xl border-border/60 bg-card/80 shadow-sm sm:shadow-md">
            <CardHeader>
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ReceiptText className="size-4" />
                    </div>
                    <div>
                        <CardTitle className="font-display text-xl">Bill numbering</CardTitle>
                        <CardDescription>
                            Choose how Sale Numbers and token numbers reset for this store.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {settingsQuery.isPending ? (
                    <div className="flex min-h-32 items-center justify-center">
                        <LoaderCircle className="size-5 animate-spin text-primary" />
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <Field data-invalid={!!form.formState.errors.resetPeriod}>
                            <FieldLabel>Reset period</FieldLabel>
                            <FieldContent>
                                <Controller
                                    control={form.control}
                                    name="resetPeriod"
                                    render={({ field }) => (
                                        <ReactSelect
                                            options={resetPeriodSelectOptions}
                                            value={
                                                resetPeriodSelectOptions.find((option) => option.value === field.value) ??
                                                null
                                            }
                                            onChange={(option) => field.onChange(option?.value ?? "never")}
                                            placeholder="Select reset period"
                                            classNames={selectControlClassNames}
                                        />
                                    )}
                                />
                                <FieldError errors={[form.formState.errors.resetPeriod]} />
                            </FieldContent>
                        </Field>

                        <Field data-invalid={!!form.formState.errors.tokenNumberEnabled}>
                            <FieldLabel>Token numbering</FieldLabel>
                            <FieldContent>
                                <Controller
                                    control={form.control}
                                    name="tokenNumberEnabled"
                                    render={({ field }) => (
                                        <ReactSelect
                                            options={[...tokenNumberEnabledOptions]}
                                            value={
                                                tokenNumberEnabledOptions.find((option) => option.value === field.value) ??
                                                null
                                            }
                                            onChange={(option) => field.onChange(option?.value ?? false)}
                                            placeholder="Select token numbering"
                                            classNames={selectControlClassNames}
                                        />
                                    )}
                                />
                                <FieldError errors={[form.formState.errors.tokenNumberEnabled]} />
                            </FieldContent>
                        </Field>

                        {tokenNumberEnabled ? (
                            <Field data-invalid={!!form.formState.errors.tokenNumberResetPeriod}>
                                <FieldLabel>Reset token number</FieldLabel>
                                <FieldContent>
                                    <Controller
                                        control={form.control}
                                        name="tokenNumberResetPeriod"
                                        render={({ field }) => (
                                            <ReactSelect
                                                options={tokenResetPeriodSelectOptions}
                                                value={
                                                    tokenResetPeriodSelectOptions.find(
                                                        (option) => option.value === field.value,
                                                    ) ?? null
                                                }
                                                onChange={(option) => field.onChange(option?.value ?? "daily")}
                                                placeholder="Select token reset period"
                                                classNames={selectControlClassNames}
                                            />
                                        )}
                                    />
                                    <FieldError errors={[form.formState.errors.tokenNumberResetPeriod]} />
                                </FieldContent>
                            </Field>
                        ) : null}

                        <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-sm">
                            <p className="font-medium text-foreground">Next bill example</p>
                            <p className="mt-1 font-mono text-primary">{selectedOption.example}</p>
                            {tokenNumberEnabled ? (
                                <>
                                    <p className="mt-3 font-medium text-foreground">Next token example</p>
                                    <p className="mt-1 font-mono text-primary">{selectedTokenOption.example}</p>
                                </>
                            ) : null}
                            <p className="mt-1 text-xs text-muted-foreground">
                                This applies to the next committed Sale. Existing bills keep their numbers.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" className="rounded-xl" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? "Saving..." : "Save settings"}
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
};

export default SaleNumberSettingsForm;
