import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { createLabelTemplate, updateLabelTemplate } from "@repo/services";
import {
    A4_SHEET_LABEL_TEMPLATE,
    CreateLabelTemplateSchema,
    LabelStockMediaSchema,
    LabelTemplateStatusSchema,
    THERMAL_ROLL_LABEL_TEMPLATE,
    keepOutsFromContentInset,
    type LabelTemplateDTO,
    type LabelTemplateDocument,
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
import { Pencil, Plus, Sticker, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { buildInternalLabelPreview } from "@/lib/internal-label-printing";
import { catalogKeys } from "@/lib/query-keys";

type UpsertLabelTemplateDialogProps = {
    organizationId: string;
    labelTemplate?: LabelTemplateDTO;
    trigger?: React.ReactElement;
};

const nameSchema = z.string().trim().min(1, "Name is required").max(255);
const presetSchema = z.enum(["a4", "thermal"]);
const millimetreSizeFormSchema = z.coerce
    .number({ error: "Size in millimetres is required" })
    .finite("Size in millimetres must be a valid number")
    .positive("Size in millimetres must be greater than 0");
const millimetreGapFormSchema = z.coerce
    .number({ error: "Gap in millimetres is required" })
    .finite("Gap in millimetres must be a valid number")
    .min(0, "Gap in millimetres must be 0 or more");
const millimetrePositionFormSchema = z.coerce
    .number({ error: "Position in millimetres is required" })
    .finite("Position in millimetres must be a valid number");

const LabelTemplateFormSchema = z.object({
    name: nameSchema,
    preset: presetSchema,
    status: LabelTemplateStatusSchema,
    stock: z.object({
        widthMm: millimetreSizeFormSchema,
        heightMm: millimetreSizeFormSchema,
        labelsPerRow: z.coerce
            .number({ error: "Labels per row is required" })
            .int("Labels per row must be a whole number")
            .min(1, "Labels per row must be at least 1"),
        horizontalGapMm: millimetreGapFormSchema,
        verticalGapMm: millimetreGapFormSchema,
        media: LabelStockMediaSchema,
        sheet: z
            .object({
                pageWidthMm: millimetreSizeFormSchema,
                pageHeightMm: millimetreSizeFormSchema,
                columns: z.coerce.number().int().min(1),
                rows: z.coerce.number().int().min(1),
            })
            .optional(),
    }),
    keepOuts: z.array(
        z.object({
            xMm: millimetrePositionFormSchema,
            yMm: millimetrePositionFormSchema,
            widthMm: millimetreSizeFormSchema,
            heightMm: millimetreSizeFormSchema,
        }),
    ),
});

type FormValues = z.infer<typeof LabelTemplateFormSchema>;

const presetOptions = [
    { label: "A4 sheet (3 × 8 labels)", value: "a4" as const },
    { label: "Thermal label (58 × 40 mm)", value: "thermal" as const },
];
const mediaOptions = [
    { label: "Sheet", value: "sheet" as const },
    { label: "Roll", value: "roll" as const },
];
const statusSelectOptions = LabelTemplateStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const documentFromPreset = (preset: "a4" | "thermal") =>
    preset === "thermal" ? THERMAL_ROLL_LABEL_TEMPLATE : A4_SHEET_LABEL_TEMPLATE;

const defaultSheet = {
    pageWidthMm: 210,
    pageHeightMm: 297,
    columns: 3,
    rows: 8,
};

const valuesFromDocument = (
    document: LabelTemplateDocument,
    preset: "a4" | "thermal",
): FormValues => ({
    name: document.name,
    preset,
    status: document.status,
    stock: {
        ...document.stock,
        sheet: document.stock.sheet ?? defaultSheet,
    },
    keepOuts: document.keepOuts,
});

const emptyInset = { topMm: "0", rightMm: "0", bottomMm: "0", leftMm: "0" };

const MillimetreInput = ({
    label,
    error,
    ...inputProps
}: {
    label: string;
    error?: { message?: string };
} & ComponentProps<typeof Input>) => (
    <Field data-invalid={!!error} className="min-w-0">
        <FieldLabel>{label}</FieldLabel>
        <FieldContent>
            <Input className="h-10 rounded-xl" type="number" step="0.1" {...inputProps} />
            <FieldError errors={[error]} />
        </FieldContent>
    </Field>
);

const SAMPLE_LABEL_PRODUCT = {
    productCode: "0400000000008",
    name: "Sample Product",
    price: 125,
};

const UpsertLabelTemplateDialog = ({
    organizationId,
    labelTemplate,
    trigger,
}: UpsertLabelTemplateDialogProps) => {
    const [open, setOpen] = useState(false);
    const [inset, setInset] = useState(emptyInset);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(labelTemplate);

    const form = useForm<FormValues>({
        resolver: zodResolver(LabelTemplateFormSchema),
        defaultValues: valuesFromDocument(A4_SHEET_LABEL_TEMPLATE, "a4"),
    });
    const keepOuts = useFieldArray({ control: form.control, name: "keepOuts" });
    const watchedStock = useWatch({ control: form.control, name: "stock" });
    const watchedKeepOuts = useWatch({ control: form.control, name: "keepOuts" });
    const watchedPreset = useWatch({ control: form.control, name: "preset" });
    const media = watchedStock?.media ?? "sheet";

    useEffect(() => {
        if (!open) {
            const source = labelTemplate ?? A4_SHEET_LABEL_TEMPLATE;
            form.reset({
                ...valuesFromDocument(source, "a4"),
                name: labelTemplate?.name ?? "",
            });
            setInset(emptyInset);
        }
    }, [form, labelTemplate, open]);

    const mutation = useMutation({
        mutationFn: (payload: LabelTemplateDocument) => {
            if (labelTemplate) {
                return updateLabelTemplate(organizationId, labelTemplate.id, {
                    name: payload.name,
                    status: payload.status,
                    stock: payload.stock,
                    keepOuts: payload.keepOuts,
                    elements: payload.elements,
                });
            }

            return createLabelTemplate(organizationId, payload);
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

    const preview = useMemo(() => {
        const stock = watchedStock;
        if (!stock?.widthMm || !stock.heightMm) {
            return null;
        }

        const source = isEditMode && labelTemplate
            ? labelTemplate
            : documentFromPreset(watchedPreset ?? "a4");
        const nextStock =
            stock.media === "roll"
                ? { ...stock, sheet: undefined }
                : { ...stock, sheet: stock.sheet ?? defaultSheet };

        try {
            return buildInternalLabelPreview({
                template: {
                    name: source.name,
                    status: source.status,
                    stock: nextStock,
                    keepOuts: watchedKeepOuts ?? [],
                    elements: source.elements,
                },
                product: SAMPLE_LABEL_PRODUCT,
            });
        } catch (error) {
            return {
                error:
                    error instanceof Error
                        ? error.message
                        : "This Label Template cannot be previewed.",
            };
        }
    }, [isEditMode, labelTemplate, watchedKeepOuts, watchedPreset, watchedStock]);

    const documentForSubmit = (values: FormValues): LabelTemplateDocument | null => {
        const source = isEditMode && labelTemplate
            ? labelTemplate
            : documentFromPreset(values.preset);
        const stock =
            values.stock.media === "roll"
                ? {
                      widthMm: values.stock.widthMm,
                      heightMm: values.stock.heightMm,
                      labelsPerRow: values.stock.labelsPerRow,
                      horizontalGapMm: values.stock.horizontalGapMm,
                      verticalGapMm: values.stock.verticalGapMm,
                      media: "roll" as const,
                  }
                : {
                      ...values.stock,
                      media: "sheet" as const,
                      sheet: values.stock.sheet ?? defaultSheet,
                  };
        const parsed = CreateLabelTemplateSchema.safeParse({
            name: values.name,
            status: values.status,
            stock,
            keepOuts: values.keepOuts,
            elements: source.elements,
        });
        if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message ?? "Invalid Label Template");
            return null;
        }

        return {
            ...parsed.data,
            status: parsed.data.status ?? "active",
        };
    };

    const onSubmit: SubmitHandler<FormValues> = (values) => {
        const payload = documentForSubmit(values);
        if (!payload) {
            return;
        }

        mutation.mutate(payload);
    };

    const applyContentInset = () => {
        const stock = form.getValues("stock");
        form.setValue(
            "keepOuts",
            keepOutsFromContentInset(
                { widthMm: Number(stock.widthMm), heightMm: Number(stock.heightMm) },
                {
                    topMm: Number(inset.topMm) || 0,
                    rightMm: Number(inset.rightMm) || 0,
                    bottomMm: Number(inset.bottomMm) || 0,
                    leftMm: Number(inset.leftMm) || 0,
                },
            ),
        );
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
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader
                    icon={<Sticker className="size-5" />}
                    title={isEditMode ? "Edit Label Template" : "Create Label Template"}
                    subtitle="Set Label Stock in millimetres and Keep-Outs for pre-printed branding."
                />

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field data-invalid={!!form.formState.errors.name}>
                            <FieldLabel required>Template name</FieldLabel>
                            <FieldContent>
                                <Input
                                    className="h-11 rounded-xl"
                                    placeholder="e.g. Packaging roll"
                                    {...form.register("name")}
                                />
                                <FieldError errors={[form.formState.errors.name]} />
                            </FieldContent>
                        </Field>
                        {isEditMode ? (
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
                                                onChange={(option) =>
                                                    field.onChange(
                                                        (option?.value ?? "active") as LabelTemplateStatus,
                                                    )
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
                        ) : (
                            <Controller
                                control={form.control}
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
                                                onChange={(option) => {
                                                    const preset = option?.value ?? "a4";
                                                    field.onChange(preset);
                                                    const document = documentFromPreset(preset);
                                                    form.setValue("stock", {
                                                        ...document.stock,
                                                        sheet: document.stock.sheet ?? defaultSheet,
                                                    });
                                                    form.setValue("keepOuts", document.keepOuts);
                                                }}
                                                classNames={{
                                                    control: () => "!min-h-11 rounded-xl",
                                                }}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Copies the seeded A4 or thermal Label Elements. Change Label Stock and
                                                Keep-Outs below.
                                            </p>
                                            <FieldError errors={[fieldState.error]} />
                                        </FieldContent>
                                    </Field>
                                )}
                            />
                        )}
                    </div>

                    <div className="space-y-3 rounded-xl border border-border/60 p-3">
                        <p className="text-sm font-medium">Label Stock</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <MillimetreInput
                                label="Width (mm)"
                                error={form.formState.errors.stock?.widthMm}
                                {...form.register("stock.widthMm", { valueAsNumber: true })}
                            />
                            <MillimetreInput
                                label="Height (mm)"
                                error={form.formState.errors.stock?.heightMm}
                                {...form.register("stock.heightMm", { valueAsNumber: true })}
                            />
                            <MillimetreInput
                                label="Labels per row"
                                error={form.formState.errors.stock?.labelsPerRow}
                                step="1"
                                min={1}
                                {...form.register("stock.labelsPerRow", { valueAsNumber: true })}
                            />
                            <MillimetreInput
                                label="Horizontal gap (mm)"
                                error={form.formState.errors.stock?.horizontalGapMm}
                                {...form.register("stock.horizontalGapMm", { valueAsNumber: true })}
                            />
                            <MillimetreInput
                                label="Feed-direction gap (mm)"
                                error={form.formState.errors.stock?.verticalGapMm}
                                {...form.register("stock.verticalGapMm", { valueAsNumber: true })}
                            />
                            <Controller
                                control={form.control}
                                name="stock.media"
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} className="min-w-0">
                                        <FieldLabel>Media</FieldLabel>
                                        <FieldContent>
                                            <ReactSelect
                                                options={mediaOptions}
                                                value={
                                                    mediaOptions.find((option) => option.value === field.value) ??
                                                    mediaOptions[0]
                                                }
                                                onChange={(option) => {
                                                    const nextMedia = option?.value ?? "sheet";
                                                    field.onChange(nextMedia);
                                                    if (nextMedia === "sheet" && !form.getValues("stock.sheet")) {
                                                        form.setValue("stock.sheet", {
                                                            ...defaultSheet,
                                                            columns: form.getValues("stock.labelsPerRow") || 1,
                                                        });
                                                    }
                                                }}
                                                classNames={{
                                                    control: () => "!min-h-10 rounded-xl",
                                                }}
                                            />
                                            <FieldError errors={[fieldState.error]} />
                                        </FieldContent>
                                    </Field>
                                )}
                            />
                        </div>
                        {media === "sheet" ? (
                            <div className="grid gap-3 sm:grid-cols-4">
                                <MillimetreInput
                                    label="Page width (mm)"
                                    error={form.formState.errors.stock?.sheet?.pageWidthMm}
                                    {...form.register("stock.sheet.pageWidthMm", { valueAsNumber: true })}
                                />
                                <MillimetreInput
                                    label="Page height (mm)"
                                    error={form.formState.errors.stock?.sheet?.pageHeightMm}
                                    {...form.register("stock.sheet.pageHeightMm", { valueAsNumber: true })}
                                />
                                <MillimetreInput
                                    label="Columns"
                                    error={form.formState.errors.stock?.sheet?.columns}
                                    step="1"
                                    min={1}
                                    {...form.register("stock.sheet.columns", { valueAsNumber: true })}
                                />
                                <MillimetreInput
                                    label="Rows"
                                    error={form.formState.errors.stock?.sheet?.rows}
                                    step="1"
                                    min={1}
                                    {...form.register("stock.sheet.rows", { valueAsNumber: true })}
                                />
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-3 rounded-xl border border-border/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">Keep-Outs</p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() =>
                                    keepOuts.append({ xMm: 0, yMm: 0, widthMm: 5, heightMm: 5 })
                                }
                            >
                                <Plus className="size-3.5" />
                                Add Keep-Out
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Rectangles Hisab must not print, such as a pre-printed brand column. A Label
                            Element that intersects a Keep-Out is rejected.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-4">
                            <MillimetreInput
                                label="Inset top (mm)"
                                value={inset.topMm}
                                onChange={(event) => setInset((current) => ({ ...current, topMm: event.target.value }))}
                            />
                            <MillimetreInput
                                label="Inset right (mm)"
                                value={inset.rightMm}
                                onChange={(event) =>
                                    setInset((current) => ({ ...current, rightMm: event.target.value }))
                                }
                            />
                            <MillimetreInput
                                label="Inset bottom (mm)"
                                value={inset.bottomMm}
                                onChange={(event) =>
                                    setInset((current) => ({ ...current, bottomMm: event.target.value }))
                                }
                            />
                            <MillimetreInput
                                label="Inset left (mm)"
                                value={inset.leftMm}
                                onChange={(event) =>
                                    setInset((current) => ({ ...current, leftMm: event.target.value }))
                                }
                            />
                        </div>
                        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={applyContentInset}>
                            Apply content inset
                        </Button>
                        {keepOuts.fields.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No Keep-Outs. Seeded A4 and thermal designs start empty.</p>
                        ) : (
                            keepOuts.fields.map((field, index) => (
                                <div key={field.id} className="grid gap-3 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
                                    <MillimetreInput
                                        label="X (mm)"
                                        error={form.formState.errors.keepOuts?.[index]?.xMm}
                                        {...form.register(`keepOuts.${index}.xMm`, { valueAsNumber: true })}
                                    />
                                    <MillimetreInput
                                        label="Y (mm)"
                                        error={form.formState.errors.keepOuts?.[index]?.yMm}
                                        {...form.register(`keepOuts.${index}.yMm`, { valueAsNumber: true })}
                                    />
                                    <MillimetreInput
                                        label="Width (mm)"
                                        error={form.formState.errors.keepOuts?.[index]?.widthMm}
                                        {...form.register(`keepOuts.${index}.widthMm`, { valueAsNumber: true })}
                                    />
                                    <MillimetreInput
                                        label="Height (mm)"
                                        error={form.formState.errors.keepOuts?.[index]?.heightMm}
                                        {...form.register(`keepOuts.${index}.heightMm`, { valueAsNumber: true })}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="mt-6 self-start"
                                        onClick={() => keepOuts.remove(index)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-medium">Preview</p>
                        {preview && "svg" in preview ? (
                            <div
                                className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
                                dangerouslySetInnerHTML={{ __html: preview.svg }}
                            />
                        ) : (
                            <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
                                {preview && "error" in preview
                                    ? preview.error
                                    : "Set Label Stock to preview Keep-Outs on the leftover printable area."}
                            </p>
                        )}
                    </div>

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
                                ? isEditMode
                                    ? "Saving..."
                                    : "Creating..."
                                : isEditMode
                                  ? "Save changes"
                                  : "Create Label Template"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertLabelTemplateDialog;
