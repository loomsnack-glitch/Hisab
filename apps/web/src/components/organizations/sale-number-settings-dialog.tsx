import { useEffect, useState } from "react";
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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { LoaderCircle, ReceiptText, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { billingKeys } from "@/lib/query-keys";

type SaleNumberSettingsDialogProps = {
    organizationId: string;
    store: StoreDTO;
    trigger?: React.ReactElement;
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

const defaultValues: UpdateSaleNumberSettingsJSON = {
    resetPeriod: "never",
    tokenNumberEnabled: false,
    tokenNumberResetPeriod: "daily",
};

const SaleNumberSettingsDialog = ({ organizationId, store, trigger }: SaleNumberSettingsDialogProps) => {
    const [open, setOpen] = useState(false);
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
        enabled: open,
    });

    useEffect(() => {
        const settings = settingsQuery.data?.status === "success" ? settingsQuery.data.data?.settings : null;
        if (open && settings) {
            form.reset({
                resetPeriod: settings.resetPeriod,
                tokenNumberEnabled: settings.tokenNumberEnabled,
                tokenNumberResetPeriod: settings.tokenNumberResetPeriod,
            });
        }
    }, [form, open, settingsQuery.data]);

    const updateMutation = useMutation({
        mutationFn: (values: UpdateSaleNumberSettingsJSON) =>
            updateSaleNumberSettings(organizationId, store.id, values),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: billingKeys.saleNumberSettings(organizationId, store.id) });
                setOpen(false);
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Failed to update Sale Number settings"),
    });

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (!nextOpen) {
            form.reset(defaultValues);
        }
    };

    const onSubmit: SubmitHandler<UpdateSaleNumberSettingsJSON> = (values) => {
        updateMutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" className="rounded-full">
                            <Settings2 className="size-4" />
                            Bill numbering
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader icon={<ReceiptText className="size-5" />} title="Bill numbering" />

                {settingsQuery.isPending ? (
                    <div className="flex min-h-32 items-center justify-center">
                        <LoaderCircle className="size-5 animate-spin text-primary" />
                    </div>
                ) : (
                    <form className="space-y-4 pt-3" onSubmit={form.handleSubmit(onSubmit)}>
                        <Field data-invalid={!!form.formState.errors.resetPeriod}>
                            <FieldLabel>Reset period</FieldLabel>
                            <FieldContent>
                                <Controller
                                    control={form.control}
                                    name="resetPeriod"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                                            <SelectTrigger className="h-11 w-full rounded-xl">
                                                <SelectValue>{selectedOption.label}</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {resetPeriodOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                        <Select
                                            value={field.value ? "enabled" : "disabled"}
                                            onValueChange={(value) => field.onChange(value === "enabled")}
                                        >
                                            <SelectTrigger className="h-11 w-full rounded-xl">
                                                <SelectValue>{field.value ? "Enabled" : "Disabled"}</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="disabled">Disabled</SelectItem>
                                                <SelectItem value="enabled">Enabled</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                            <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                                                <SelectTrigger className="h-11 w-full rounded-xl">
                                                    <SelectValue>{selectedTokenOption.label}</SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tokenResetPeriodOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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

                        <DialogFooter>
                            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="rounded-xl" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? "Saving..." : "Save settings"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SaleNumberSettingsDialog;
