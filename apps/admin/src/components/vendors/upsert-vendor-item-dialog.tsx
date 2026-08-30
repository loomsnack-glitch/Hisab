import { useEffect, useMemo, useState, type ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createVendorItem, updateVendorItem } from "@repo/services";
import {
    canAssignUnitToVendorItem,
    VendorItemStatusSchema,
    type CreateVendorItemJSON,
    type UnitDTO,
    type VendorDTO,
    type VendorItemDTO,
    type VendorItemStatus,
} from "@repo/types";
import { z } from "zod";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Package, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { vendorKeys } from "@/lib/query-keys";

type UpsertVendorItemDialogProps = {
    organizationId: string;
    vendors: VendorDTO[];
    units: UnitDTO[];
    vendorItem?: VendorItemDTO;
    trigger?: ReactElement;
};

const decimalAmountPattern = /^\d+(\.\d{0,2})?$/;

const sanitizeTwoDecimalInput = (value: string) => {
    const digitsAndDot = value.replace(/[^\d.]/g, "");
    const dotIndex = digitsAndDot.indexOf(".");

    if (dotIndex === -1) {
        return digitsAndDot;
    }

    return digitsAndDot.slice(0, dotIndex + 1) + digitsAndDot.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
};

const UpsertVendorItemFormSchema = z.object({
    vendorId: z.uuid("Select a Vendor"),
    name: z.string().trim().min(1, "Name is required").max(255, "Name must be at most 255 characters"),
    unitId: z.uuid("Select a Unit"),
    defaultPurchasePrice: z
        .string()
        .refine((value) => value.length > 0, "Default purchase price is required")
        .refine((value) => decimalAmountPattern.test(value), "Use at most two decimal places")
        .transform((value) => Number(value))
        .pipe(z.number().min(0, "Default purchase price must be 0 or more")),
    status: VendorItemStatusSchema.optional(),
});

type UpsertVendorItemFormInput = z.input<typeof UpsertVendorItemFormSchema>;

const defaultValues: UpsertVendorItemFormInput = {
    vendorId: "",
    name: "",
    unitId: "",
    defaultPurchasePrice: "",
    status: "active",
};

const statusSelectOptions = VendorItemStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const UpsertVendorItemDialog = ({
    organizationId,
    vendors,
    units,
    vendorItem,
    trigger,
}: UpsertVendorItemDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(vendorItem);

    const form = useForm<UpsertVendorItemFormInput, unknown, z.output<typeof UpsertVendorItemFormSchema>>({
        resolver: zodResolver(UpsertVendorItemFormSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!open) {
            form.reset(
                vendorItem
                    ? {
                        vendorId: vendorItem.vendorId,
                        name: vendorItem.name,
                        unitId: vendorItem.unitId,
                        defaultPurchasePrice: String(vendorItem.defaultPurchasePrice),
                        status: vendorItem.status,
                    }
                    : defaultValues,
            );
        }
    }, [form, open, vendorItem]);

    const vendorOptions = useMemo(
        () =>
            vendors.map((vendor) => ({
                label: vendor.status === "inactive" ? `${vendor.name} (inactive)` : vendor.name,
                value: vendor.id,
            })),
        [vendors],
    );

    const unitOptions = useMemo(
        () =>
            units
                .filter((unit) =>
                    canAssignUnitToVendorItem({
                        unitStatus: unit.status,
                        currentlyAssigned: unit.id === vendorItem?.unitId,
                    }),
                )
                .map((unit) => ({
                    label: unit.status === "inactive"
                        ? `${unit.name} (${unit.label}, inactive)`
                        : `${unit.name} (${unit.label})`,
                    value: unit.id,
                })),
        [units, vendorItem?.unitId],
    );

    const mutation = useMutation({
        mutationFn: (data: CreateVendorItemJSON) =>
            vendorItem
                ? updateVendorItem(organizationId, vendorItem.id, {
                    name: data.name,
                    unitId: data.unitId,
                    defaultPurchasePrice: data.defaultPurchasePrice,
                    status: data.status,
                })
                : createVendorItem(organizationId, data),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: vendorKeys.items(organizationId) });
                setOpen(false);
                form.reset(defaultValues);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? `Failed to ${isEditMode ? "update" : "create"} vendor item`);
        },
    });

    const onSubmit: SubmitHandler<z.output<typeof UpsertVendorItemFormSchema>> = (values) => {
        mutation.mutate({
            vendorId: values.vendorId,
            name: values.name.trim(),
            unitId: values.unitId,
            defaultPurchasePrice: values.defaultPurchasePrice,
            status: (values.status ?? "active") as VendorItemStatus,
        });
    };

    const title = isEditMode ? "Edit item" : "Add item";

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full">
                            {isEditMode ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                            {isEditMode ? "Edit" : "Add item"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader icon={<Package className="size-5" />} title={title} />

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Controller
                        control={form.control}
                        name="vendorId"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Vendor</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={vendorOptions}
                                        isDisabled={isEditMode}
                                        placeholder="Select a Vendor"
                                        value={vendorOptions.find((option) => option.value === field.value) ?? null}
                                        onChange={(option) => field.onChange(option?.value ?? "")}
                                        classNames={{
                                            control: () => "!min-h-11 rounded-xl",
                                        }}
                                    />
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Item name</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                placeholder="e.g. Tomato"
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Controller
                        control={form.control}
                        name="unitId"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Unit</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={unitOptions}
                                        placeholder="Select an active Unit"
                                        value={unitOptions.find((option) => option.value === field.value) ?? null}
                                        onChange={(option) => field.onChange(option?.value ?? "")}
                                        classNames={{
                                            control: () => "!min-h-11 rounded-xl",
                                        }}
                                    />
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <Field data-invalid={!!form.formState.errors.defaultPurchasePrice}>
                        <FieldLabel required>Default purchase price</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={form.watch("defaultPurchasePrice")}
                                onChange={(event) => {
                                    form.setValue("defaultPurchasePrice", sanitizeTwoDecimalInput(event.target.value), {
                                        shouldValidate: true,
                                    });
                                }}
                            />
                            <FieldError errors={[form.formState.errors.defaultPurchasePrice]} />
                        </FieldContent>
                    </Field>

                    <Controller
                        control={form.control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Status</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={statusSelectOptions}
                                        value={
                                            statusSelectOptions.find(
                                                (option) => option.value === (field.value ?? "active"),
                                            ) ?? null
                                        }
                                        onChange={(option) => field.onChange(option?.value ?? "active")}
                                        classNames={{
                                            control: () => "!min-h-11 rounded-xl",
                                        }}
                                    />
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={mutation.isPending || (!isEditMode && vendors.length === 0)}
                        >
                            {mutation.isPending
                                ? isEditMode ? "Saving..." : "Creating..."
                                : isEditMode ? "Save changes" : "Add item"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertVendorItemDialog;
