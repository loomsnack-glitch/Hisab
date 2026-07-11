import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createAddOn, updateAddOn } from "@repo/services";
import {
    AddOnStatusSchema,
    CreateAddOnSchema,
    type AddOnDTO,
    type AddOnStatus,
    type CreateAddOnJSON,
} from "@repo/types";
import { z } from "zod";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Pencil, Plus, Puzzle } from "lucide-react";
import { toast } from "sonner";

import { catalogKeys } from "@/lib/query-keys";

type UpsertAddOnDialogProps = {
    organizationId: string;
    addOn?: AddOnDTO;
    trigger?: React.ReactElement;
};

const decimalAmountPattern = /^\d+(\.\d*)?$/;

const sanitizeDecimalInput = (value: string) => {
    const digitsAndDot = value.replace(/[^\d.]/g, "");
    const dotIndex = digitsAndDot.indexOf(".");

    if (dotIndex === -1) {
        return digitsAndDot;
    }

    return digitsAndDot.slice(0, dotIndex + 1) + digitsAndDot.slice(dotIndex + 1).replace(/\./g, "");
};

const UpsertAddOnFormSchema = CreateAddOnSchema.extend({
    price: z
        .string()
        .refine((value) => value.length > 0, "Price is required")
        .refine((value) => decimalAmountPattern.test(value), "Enter a valid price")
        .transform((value) => Number(value))
        .pipe(z.number().min(0, "Price must be 0 or more")),
    discount: z
        .string()
        .refine(
            (value) => value === "" || decimalAmountPattern.test(value),
            "Enter a valid discount",
        )
        .transform((value) => (value === "" ? 0 : Number(value)))
        .pipe(z.number().min(0, "Discount must be 0 or more"))
        .optional(),
});

type UpsertAddOnFormInput = z.input<typeof UpsertAddOnFormSchema>;

const defaultValues: UpsertAddOnFormInput = {
    name: "",
    price: "",
    discount: "",
    status: "active",
};

const statusSelectOptions = AddOnStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const UpsertAddOnDialog = ({ organizationId, addOn, trigger }: UpsertAddOnDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(addOn);

    const form = useForm<UpsertAddOnFormInput, unknown, CreateAddOnJSON>({
        resolver: zodResolver(UpsertAddOnFormSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!open) {
            form.reset(
                addOn
                    ? {
                        name: addOn.name,
                        price: String(addOn.price),
                        discount: String(addOn.discount ?? 0),
                        status: addOn.status,
                    }
                    : defaultValues,
            );
        }
    }, [addOn, form, open]);

    const mutation = useMutation({
        mutationFn: (data: CreateAddOnJSON) =>
            addOn ? updateAddOn(organizationId, addOn.id, data) : createAddOn(organizationId, data),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: catalogKeys.addOns(organizationId) });
                setOpen(false);
                form.reset(defaultValues);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? `Failed to ${isEditMode ? "update" : "create"} add-on`);
        },
    });

    const onSubmit: SubmitHandler<CreateAddOnJSON> = (values) => {
        mutation.mutate({
            name: values.name.trim(),
            price: values.price,
            discount: values.discount ?? 0,
            status: (values.status ?? "active") as AddOnStatus,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full">
                            {isEditMode ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
                            {isEditMode ? "Edit add-on" : "Add add-on"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Puzzle className="size-5" />
                    </div>
                    <DialogTitle className="text-center text-lg font-semibold">
                        {isEditMode ? "Edit add-on" : "Create add-on"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {isEditMode
                            ? "Update pricing, discount, or status. Attachments keep their own selection caps."
                            : "Create a reusable extra such as Extra Cheese that can be attached to products."}
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Add-on name</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" placeholder="e.g. Extra Cheese" {...form.register("name")} />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field data-invalid={!!form.formState.errors.price}>
                            <FieldLabel required>Price</FieldLabel>
                            <FieldContent>
                                <Input
                                    className="h-11 rounded-xl"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={form.watch("price")}
                                    onChange={(event) => {
                                        form.setValue("price", sanitizeDecimalInput(event.target.value), {
                                            shouldValidate: true,
                                        });
                                    }}
                                />
                                <FieldError errors={[form.formState.errors.price]} />
                            </FieldContent>
                        </Field>

                        <Field data-invalid={!!form.formState.errors.discount}>
                            <FieldLabel>Discount</FieldLabel>
                            <FieldContent>
                                <Input
                                    className="h-11 rounded-xl"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={form.watch("discount") ?? ""}
                                    onChange={(event) => {
                                        form.setValue("discount", sanitizeDecimalInput(event.target.value), {
                                            shouldValidate: true,
                                        });
                                    }}
                                />
                                <FieldError errors={[form.formState.errors.discount]} />
                            </FieldContent>
                        </Field>
                    </div>

                    {isEditMode && (
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
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending
                                ? isEditMode ? "Saving..." : "Creating..."
                                : isEditMode ? "Save changes" : "Create add-on"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertAddOnDialog;
