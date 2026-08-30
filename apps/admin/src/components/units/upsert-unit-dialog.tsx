import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createUnit, updateUnit } from "@repo/services";
import {
    CreateUnitSchema,
    UnitStatusSchema,
    type CreateUnitJSON,
    type UnitDTO,
    type UnitStatus,
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
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Pencil, Plus, Ruler } from "lucide-react";
import { toast } from "sonner";

import { unitKeys } from "@/lib/query-keys";

type UpsertUnitDialogProps = {
    organizationId: string;
    unit?: UnitDTO;
    trigger?: React.ReactElement;
};

const defaultValues: CreateUnitJSON = {
    name: "",
    label: "",
    status: "active",
};

const statusSelectOptions = UnitStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const UpsertUnitDialog = ({ organizationId, unit, trigger }: UpsertUnitDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(unit);
    const isPredefined = unit?.kind === "predefined";

    const form = useForm<CreateUnitJSON>({
        resolver: zodResolver(CreateUnitSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!open) {
            form.reset(
                unit
                    ? { name: unit.name, label: unit.label, status: unit.status }
                    : defaultValues,
            );
        }
    }, [form, open, unit]);

    const mutation = useMutation({
        mutationFn: (data: CreateUnitJSON) =>
            unit
                ? updateUnit(
                    organizationId,
                    unit.id,
                    isPredefined
                        ? { status: data.status }
                        : { name: data.name, label: data.label, status: data.status },
                )
                : createUnit(organizationId, {
                    name: data.name,
                    label: data.label,
                    status: data.status,
                }),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: unitKeys.list(organizationId) });
                setOpen(false);
                form.reset(defaultValues);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? `Failed to ${isEditMode ? "update" : "create"} unit`);
        },
    });

    const onSubmit: SubmitHandler<CreateUnitJSON> = (values) => {
        mutation.mutate({
            name: values.name.trim(),
            label: values.label.trim(),
            status: (values.status ?? "active") as UnitStatus,
        });
    };

    const title = isEditMode
        ? isPredefined
            ? "Edit standard unit"
            : "Edit custom unit"
        : "Create custom unit";

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full">
                            {isEditMode ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                            {isEditMode ? "Edit" : "Add unit"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader icon={<Ruler className="size-5" />} title={title} />

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Unit name</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                placeholder="e.g. Crate"
                                readOnly={isPredefined}
                                disabled={isPredefined}
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.label}>
                        <FieldLabel required>Short label</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                placeholder="e.g. crt"
                                readOnly={isPredefined}
                                disabled={isPredefined}
                                {...form.register("label")}
                            />
                            <FieldError errors={[form.formState.errors.label]} />
                            {isPredefined ? (
                                <p className="text-xs text-muted-foreground">
                                    Standard Units supplied by Hisab cannot be renamed.
                                </p>
                            ) : null}
                        </FieldContent>
                    </Field>

                    {isEditMode && (
                        <Controller
                            control={form.control}
                            name="status"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Availability</FieldLabel>
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
                                : isEditMode ? "Save changes" : "Create unit"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertUnitDialog;
