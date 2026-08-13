import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createLabelTemplate, updateLabelTemplate } from "@repo/services";
import {
    A4_SHEET_LABEL_TEMPLATE,
    LabelTemplateStatusSchema,
    THERMAL_ROLL_LABEL_TEMPLATE,
    type LabelTemplateDTO,
    type LabelTemplateStatus,
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
import { Pencil, Plus, Sticker } from "lucide-react";
import { toast } from "sonner";

import { catalogKeys } from "@/lib/query-keys";

type UpsertLabelTemplateDialogProps = {
    organizationId: string;
    labelTemplate?: LabelTemplateDTO;
    trigger?: React.ReactElement;
};

const nameSchema = z.string().trim().min(1, "Name is required").max(255);
const presetSchema = z.enum(["a4", "thermal"]);

const CreateLabelTemplateFormSchema = z.object({
    name: nameSchema,
    preset: presetSchema,
    status: LabelTemplateStatusSchema.optional(),
});

const UpdateLabelTemplateFormSchema = z.object({
    name: nameSchema,
    status: LabelTemplateStatusSchema,
});

type CreateFormValues = z.infer<typeof CreateLabelTemplateFormSchema>;
type UpdateFormValues = z.infer<typeof UpdateLabelTemplateFormSchema>;

const presetOptions = [
    { label: "A4 sheet (3 × 8 labels)", value: "a4" as const },
    { label: "Thermal label (58 × 40 mm)", value: "thermal" as const },
];

const statusSelectOptions = LabelTemplateStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const documentFromPreset = (preset: "a4" | "thermal") =>
    preset === "thermal" ? THERMAL_ROLL_LABEL_TEMPLATE : A4_SHEET_LABEL_TEMPLATE;

const UpsertLabelTemplateDialog = ({
    organizationId,
    labelTemplate,
    trigger,
}: UpsertLabelTemplateDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(labelTemplate);

    const createForm = useForm<CreateFormValues>({
        resolver: zodResolver(CreateLabelTemplateFormSchema),
        defaultValues: {
            name: "",
            preset: "a4",
            status: "active",
        },
    });

    const updateForm = useForm<UpdateFormValues>({
        resolver: zodResolver(UpdateLabelTemplateFormSchema),
        defaultValues: {
            name: "",
            status: "active",
        },
    });

    useEffect(() => {
        if (!open) {
            createForm.reset({ name: "", preset: "a4", status: "active" });
            updateForm.reset({
                name: labelTemplate?.name ?? "",
                status: labelTemplate?.status ?? "active",
            });
        }
    }, [createForm, labelTemplate, open, updateForm]);

    const mutation = useMutation({
        mutationFn: (payload: CreateFormValues | UpdateFormValues) => {
            if (labelTemplate) {
                const values = payload as UpdateFormValues;
                return updateLabelTemplate(organizationId, labelTemplate.id, {
                    name: values.name,
                    status: values.status,
                });
            }

            const values = payload as CreateFormValues;
            const document = documentFromPreset(values.preset);
            return createLabelTemplate(organizationId, {
                ...document,
                name: values.name,
                status: values.status ?? "active",
            });
        },
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({
                    queryKey: catalogKeys.labelTemplates(organizationId),
                });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(
                error.message ?? `Failed to ${isEditMode ? "update" : "create"} Label Template`,
            );
        },
    });

    const onCreateSubmit: SubmitHandler<CreateFormValues> = (values) => {
        mutation.mutate(values);
    };

    const onUpdateSubmit: SubmitHandler<UpdateFormValues> = (values) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full">
                            {isEditMode ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                            {isEditMode ? "Edit Label Template" : "Add Label Template"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader
                    icon={<Sticker className="size-5" />}
                    title={isEditMode ? "Edit Label Template" : "Create Label Template"}
                />

                {isEditMode ? (
                    <form className="space-y-5 pt-2" onSubmit={updateForm.handleSubmit(onUpdateSubmit)}>
                        <Field data-invalid={!!updateForm.formState.errors.name}>
                            <FieldLabel required>Template name</FieldLabel>
                            <FieldContent>
                                <Input
                                    className="h-11 rounded-xl"
                                    placeholder="e.g. Kirana A4 stickers"
                                    {...updateForm.register("name")}
                                />
                                <FieldError errors={[updateForm.formState.errors.name]} />
                            </FieldContent>
                        </Field>
                        <Controller
                            control={updateForm.control}
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
                                            onChange={(option) =>
                                                field.onChange((option?.value ?? "active") as LabelTemplateStatus)
                                            }
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
                                {mutation.isPending ? "Saving..." : "Save changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <form className="space-y-5 pt-2" onSubmit={createForm.handleSubmit(onCreateSubmit)}>
                        <Field data-invalid={!!createForm.formState.errors.name}>
                            <FieldLabel required>Template name</FieldLabel>
                            <FieldContent>
                                <Input
                                    className="h-11 rounded-xl"
                                    placeholder="e.g. Kirana A4 stickers"
                                    {...createForm.register("name")}
                                />
                                <FieldError errors={[createForm.formState.errors.name]} />
                            </FieldContent>
                        </Field>
                        <Controller
                            control={createForm.control}
                            name="preset"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Starting design</FieldLabel>
                                    <FieldContent>
                                        <ReactSelect
                                            options={presetOptions}
                                            value={
                                                presetOptions.find((option) => option.value === field.value) ??
                                                presetOptions[0]
                                            }
                                            onChange={(option) => field.onChange(option?.value ?? "a4")}
                                            classNames={{
                                                control: () => "!min-h-11 rounded-xl",
                                            }}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Uses the seeded A4 sheet or 58×40 mm thermal design. Custom stock comes later.
                                        </p>
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
                                {mutation.isPending ? "Creating..." : "Create Label Template"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default UpsertLabelTemplateDialog;
