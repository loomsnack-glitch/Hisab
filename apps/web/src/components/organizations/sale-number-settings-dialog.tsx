import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { getSaleNumberSettings, updateSaleNumberSettings } from "@repo/services";
import {
    UpdateSaleNumberSettingsSchema,
    type SaleNumberResetPeriod,
    type StoreDTO,
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
    { value: "yearly", label: "Yearly", example: "2026-0001" },
];

const defaultValues: UpdateSaleNumberSettingsJSON = {
    resetPeriod: "never",
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

    const settingsQuery = useQuery({
        queryKey: billingKeys.saleNumberSettings(organizationId, store.id),
        queryFn: () => getSaleNumberSettings(organizationId, store.id),
        enabled: open,
    });

    useEffect(() => {
        const settings = settingsQuery.data?.status === "success" ? settingsQuery.data.data?.settings : null;
        if (open && settings) {
            form.reset({ resetPeriod: settings.resetPeriod });
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
                            <Settings2 className="mr-2 size-4" />
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
                                                <SelectValue placeholder="Choose reset period" />
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

                        <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-sm">
                            <p className="font-medium text-foreground">Next bill example</p>
                            <p className="mt-1 font-mono text-primary">{selectedOption.example}</p>
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
