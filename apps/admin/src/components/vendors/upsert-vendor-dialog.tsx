import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createVendor, updateVendor } from "@repo/services";
import {
    CreateVendorSchema,
    VendorStatusSchema,
    type CreateVendorJSON,
    type VendorDTO,
    type VendorStatus,
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
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Pencil, Plus, Truck } from "lucide-react";
import { toast } from "sonner";

import { vendorKeys } from "@/lib/query-keys";

type UpsertVendorDialogProps = {
    organizationId: string;
    vendor?: VendorDTO;
    trigger?: React.ReactElement;
};

const defaultValues: CreateVendorJSON = {
    name: "",
    description: "",
    status: "active",
};

const statusSelectOptions = VendorStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const UpsertVendorDialog = ({ organizationId, vendor, trigger }: UpsertVendorDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(vendor);

    const form = useForm<CreateVendorJSON>({
        resolver: zodResolver(CreateVendorSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!open) {
            form.reset(
                vendor
                    ? {
                        name: vendor.name,
                        description: vendor.description ?? "",
                        status: vendor.status,
                    }
                    : defaultValues,
            );
        }
    }, [form, open, vendor]);

    const mutation = useMutation({
        mutationFn: (data: CreateVendorJSON) =>
            vendor
                ? updateVendor(organizationId, vendor.id, {
                    name: data.name,
                    description: data.description,
                    status: data.status,
                })
                : createVendor(organizationId, {
                    name: data.name,
                    description: data.description,
                    status: data.status,
                }),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: vendorKeys.list(organizationId) });
                setOpen(false);
                form.reset(defaultValues);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? `Failed to ${isEditMode ? "update" : "create"} vendor`);
        },
    });

    const onSubmit: SubmitHandler<CreateVendorJSON> = (values) => {
        mutation.mutate({
            name: values.name.trim(),
            description: values.description ?? "",
            status: (values.status ?? "active") as VendorStatus,
        });
    };

    const title = isEditMode ? "Edit vendor" : "Add vendor";

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full">
                            {isEditMode ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                            {isEditMode ? "Edit" : "Add vendor"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader icon={<Truck className="size-5" />} title={title} />

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Vendor name</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                placeholder="e.g. Fresh Farms"
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.description}>
                        <FieldLabel>
                            Description <span className="font-normal text-muted-foreground">(optional)</span>
                        </FieldLabel>
                        <FieldContent>
                            <Textarea
                                className="min-h-24 rounded-xl"
                                placeholder="e.g. Daily produce supplier"
                                {...form.register("description")}
                            />
                            <FieldError errors={[form.formState.errors.description]} />
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
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending
                                ? isEditMode ? "Saving..." : "Creating..."
                                : isEditMode ? "Save changes" : "Add vendor"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertVendorDialog;
