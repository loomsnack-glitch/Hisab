import { useEffect, useMemo, useState, type ComponentProps, type MouseEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, useWatch, type Resolver, type SubmitHandler } from "react-hook-form";
import { createLabelTemplate, updateLabelTemplate } from "@repo/services";
import {
    CreateLabelTemplateSchema,
    LabelStockMediaSchema,
    LabelTemplateStatusSchema,
    THERMAL_ROLL_LABEL_TEMPLATE,
    keepOutsFromContentInset,
    labelTemplateKeepOutsOverlapPrintedContent,
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
import { safeRandomUUID } from "@/lib/uuid";

type UpsertLabelTemplateDialogProps = {
    organizationId: string;
    labelTemplate?: LabelTemplateDTO;
    trigger?: React.ReactElement;
};

const nameSchema = z.string().trim().min(1, "Name is required").max(255);
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
    sizePresetId: z.string(),
    status: LabelTemplateStatusSchema,
    stock: z.object({
        widthMm: millimetreSizeFormSchema,
        heightMm: millimetreSizeFormSchema,
        labelsPerRow: z.coerce
            .number({ error: "Labels per row is required" })
            .int("Labels per row must be a whole number")
            .min(1, "Labels per row must be at least 1")
            .max(12, "Labels per row must be at most 12"),
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

const defaultSheet = {
    pageWidthMm: 210,
    pageHeightMm: 297,
    columns: 3,
    rows: 8,
};

type SizePreset = {
    id: string;
    label: string;
    stock: FormValues["stock"];
};

const SIZE_PRESETS: SizePreset[] = [
    {
        id: "roll-58x40-1",
        label: "Label printer · 1 label (58×40 mm)",
        stock: {
            widthMm: 58,
            heightMm: 40,
            labelsPerRow: 1,
            horizontalGapMm: 0,
            verticalGapMm: 0,
            media: "roll",
            sheet: defaultSheet,
        },
    },
    {
        id: "roll-50x25-1",
        label: "Label printer · 1 label (50×25 mm)",
        stock: {
            widthMm: 50,
            heightMm: 25,
            labelsPerRow: 1,
            horizontalGapMm: 0,
            verticalGapMm: 0,
            media: "roll",
            sheet: defaultSheet,
        },
    },
    {
        id: "roll-50x25-2",
        label: "Label printer · 2 labels (50×25 mm)",
        stock: {
            widthMm: 50,
            heightMm: 25,
            labelsPerRow: 2,
            horizontalGapMm: 2,
            verticalGapMm: 0,
            media: "roll",
            sheet: defaultSheet,
        },
    },
    {
        id: "roll-100x50-1",
        label: "Label printer · 1 label (100×50 mm)",
        stock: {
            widthMm: 100,
            heightMm: 50,
            labelsPerRow: 1,
            horizontalGapMm: 0,
            verticalGapMm: 0,
            media: "roll",
            sheet: defaultSheet,
        },
    },
    {
        id: "roll-38x25-2",
        label: "Label printer · 2 labels (38×25 mm)",
        stock: {
            widthMm: 38,
            heightMm: 25,
            labelsPerRow: 2,
            horizontalGapMm: 2,
            verticalGapMm: 0,
            media: "roll",
            sheet: defaultSheet,
        },
    },
    {
        id: "roll-38x50-2",
        label: "Label printer · 2 labels (38×50 mm)",
        stock: {
            widthMm: 38,
            heightMm: 50,
            labelsPerRow: 2,
            horizontalGapMm: 2,
            verticalGapMm: 2,
            media: "roll",
            sheet: defaultSheet,
        },
    },
    {
        id: "sheet-a4-70x35",
        label: "Regular printer · A4 24 labels (70×35 mm)",
        stock: {
            widthMm: 70,
            heightMm: 35,
            labelsPerRow: 3,
            horizontalGapMm: 0,
            verticalGapMm: 0,
            media: "sheet",
            sheet: { pageWidthMm: 210, pageHeightMm: 297, columns: 3, rows: 8 },
        },
    },
    {
        id: "sheet-a4-38x21",
        label: "Regular printer · A4 65 labels (38×21 mm)",
        stock: {
            widthMm: 38,
            heightMm: 21,
            labelsPerRow: 5,
            horizontalGapMm: 2,
            verticalGapMm: 2,
            media: "sheet",
            sheet: { pageWidthMm: 210, pageHeightMm: 297, columns: 5, rows: 13 },
        },
    },
    {
        id: "sheet-a4-48x24",
        label: "Regular printer · A4 48 labels (48×24 mm)",
        stock: {
            widthMm: 48,
            heightMm: 24,
            labelsPerRow: 4,
            horizontalGapMm: 2,
            verticalGapMm: 2,
            media: "sheet",
            sheet: { pageWidthMm: 210, pageHeightMm: 297, columns: 4, rows: 12 },
        },
    },
    {
        id: "sheet-a4-64x34",
        label: "Regular printer · A4 24 labels (64×34 mm)",
        stock: {
            widthMm: 64,
            heightMm: 34,
            labelsPerRow: 3,
            horizontalGapMm: 2,
            verticalGapMm: 2,
            media: "sheet",
            sheet: { pageWidthMm: 210, pageHeightMm: 297, columns: 3, rows: 8 },
        },
    },
    {
        id: "sheet-a4-100x44",
        label: "Regular printer · A4 12 labels (100×44 mm)",
        stock: {
            widthMm: 100,
            heightMm: 44,
            labelsPerRow: 2,
            horizontalGapMm: 2,
            verticalGapMm: 2,
            media: "sheet",
            sheet: { pageWidthMm: 210, pageHeightMm: 297, columns: 2, rows: 6 },
        },
    },
    {
        id: "custom",
        label: "Custom size (type millimetres below)",
        stock: {
            widthMm: 58,
            heightMm: 40,
            labelsPerRow: 1,
            horizontalGapMm: 0,
            verticalGapMm: 0,
            media: "roll",
            sheet: defaultSheet,
        },
    },
];

const sizePresetOptions = SIZE_PRESETS.map((preset) => ({
    label: preset.label,
    value: preset.id,
}));
const mediaOptions = [
    { label: "Sheet", value: "sheet" as const },
    { label: "Roll", value: "roll" as const },
];
const statusSelectOptions = LabelTemplateStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const clampPreviewLabelsPerRow = (labelsPerRow: number) =>
    Math.min(2, Math.max(1, Number.isFinite(labelsPerRow) ? Math.trunc(labelsPerRow) : 1));

const matchSizePresetId = (stock: FormValues["stock"]) => {
    const labelsPerRow = Number.isFinite(stock.labelsPerRow)
        ? Math.trunc(stock.labelsPerRow)
        : 1;
    const match = SIZE_PRESETS.find(
        (preset) =>
            preset.id !== "custom" &&
            preset.stock.widthMm === stock.widthMm &&
            preset.stock.heightMm === stock.heightMm &&
            preset.stock.labelsPerRow === labelsPerRow &&
            preset.stock.media === stock.media,
    );
    return match?.id ?? "custom";
};

const valuesFromDocument = (document: LabelTemplateDocument): FormValues => {
    const stock = {
        ...document.stock,
        sheet: document.stock.sheet ?? defaultSheet,
    };
    return {
        name: document.name,
        sizePresetId: matchSizePresetId(stock),
        status: document.status,
        keepOuts: document.keepOuts,
        stock,
    };
};

const emptyInset = {
    topMm: "",
    rightMm: "",
    bottomMm: "",
    leftMm: "",
};

type LabelElement = LabelTemplateDocument["elements"][number];
type ComposerKind =
    | "product.name"
    | "product.price"
    | "productLabel.mrp"
    | "productLabel.ingredients"
    | "productLabel.netWeight"
    | "productLabel.unitSellingPriceText"
    | "productLabel.nutrition"
    | "job.packedDate"
    | "job.expiryDate"
    | "job.batchNumber"
    | "barcode"
    | "static"
    | "box";
type LabelRotation = 0 | 90 | 180 | 270;

const rotationOptions = [
    { label: "0°", value: 0 },
    { label: "90°", value: 90 },
    { label: "180°", value: 180 },
    { label: "270°", value: 270 },
];
const symbologyOptions = [
    { label: "EAN-13", value: "ean13" as const },
    { label: "Code 128", value: "code128" as const },
];
const fontWeightOptions = [
    { label: "Normal", value: "normal" as const },
    { label: "Bold", value: "bold" as const },
];
const alignOptions = [
    { label: "Left", value: "left" as const },
    { label: "Center", value: "center" as const },
    { label: "Right", value: "right" as const },
];

const clampElementToStock = (
    element: LabelElement,
    stock: { widthMm: number; heightMm: number },
): LabelElement => {
    const widthMm = Math.min(element.widthMm, stock.widthMm);
    const heightMm = Math.min(element.heightMm, stock.heightMm);
    return {
        ...element,
        widthMm,
        heightMm,
        xMm: Math.min(Math.max(0, element.xMm), Math.max(0, stock.widthMm - widthMm)),
        yMm: Math.min(Math.max(0, element.yMm), Math.max(0, stock.heightMm - heightMm)),
    };
};

const createComposerElement = (
    kind: ComposerKind,
    xMm: number,
    yMm: number,
    stock: { widthMm: number; heightMm: number },
): LabelElement => {
    const id = safeRandomUUID();
    if (kind === "barcode") {
        return clampElementToStock(
            {
                id,
                type: "barcode",
                xMm,
                yMm,
                widthMm: Math.min(54, Math.max(12, stock.widthMm - 4)),
                heightMm: 18,
                rotationDeg: 0,
                barcode: { symbology: "ean13", showHumanDigits: true },
            },
            stock,
        );
    }
    if (kind === "box") {
        return clampElementToStock(
            {
                id,
                type: "box",
                xMm,
                yMm,
                widthMm: 24,
                heightMm: 12,
                rotationDeg: 0,
                box: { strokeWidthMm: 0.4 },
            },
            stock,
        );
    }
    if (kind === "productLabel.nutrition") {
        return clampElementToStock(
            {
                id,
                type: "table",
                xMm,
                yMm,
                widthMm: Math.min(54, Math.max(20, stock.widthMm - 4)),
                heightMm: 14,
                rotationDeg: 0,
                table: { binding: "productLabel.nutrition" },
            },
            stock,
        );
    }
    if (kind === "static") {
        return clampElementToStock(
            {
                id,
                type: "text",
                xMm,
                yMm,
                widthMm: Math.min(50, Math.max(12, stock.widthMm - 4)),
                heightMm: 6,
                rotationDeg: 0,
                text: {
                    source: "static",
                    staticValue: "Inc. of all Taxes",
                    fontSizeMm: 2.5,
                    fontWeight: "normal",
                    align: "left",
                },
            },
            stock,
        );
    }
    const bindingMap: Record<string, string> = {
        "product.name": "product.name",
        "product.price": "product.price",
        "productLabel.mrp": "productLabel.mrp",
        "productLabel.ingredients": "productLabel.ingredients",
        "productLabel.netWeight": "productLabel.netWeight",
        "productLabel.unitSellingPriceText": "productLabel.unitSellingPriceText",
        "job.packedDate": "job.packedDate",
        "job.expiryDate": "job.expiryDate",
        "job.batchNumber": "job.batchNumber",
    };
    const binding = bindingMap[kind];
    if (!binding) {
        throw new Error(`Unsupported composer kind: ${kind}`);
    }
    return clampElementToStock(
        {
            id,
            type: "text",
            xMm,
            yMm,
            widthMm: Math.min(50, Math.max(12, stock.widthMm - 4)),
            heightMm: 6,
            rotationDeg: 0,
            text: {
                source: "binding",
                binding: binding as Extract<
                    LabelElement,
                    { type: "text" }
                >["text"]["binding"],
                fontSizeMm: 2.5,
                fontWeight:
                    kind === "product.price" || kind === "productLabel.mrp"
                        ? "bold"
                        : "normal",
                align: "left",
            },
        },
        stock,
    );
};

const elementContainsPoint = (element: LabelElement, xMm: number, yMm: number) =>
    xMm >= element.xMm &&
    xMm <= element.xMm + element.widthMm &&
    yMm >= element.yMm &&
    yMm <= element.yMm + element.heightMm;

const MillimetreInput = ({
    label,
    hint,
    error,
    ...inputProps
}: {
    label: string;
    hint?: string;
    error?: { message?: string };
} & ComponentProps<typeof Input>) => (
    <Field data-invalid={!!error} className="min-w-0">
        <FieldLabel>{label}</FieldLabel>
        <FieldContent>
            <Input className="h-10 rounded-xl" type="number" step="0.1" {...inputProps} />
            {hint ? <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
            <FieldError errors={[error]} />
        </FieldContent>
    </Field>
);

const SAMPLE_LABEL_PRODUCT = {
    productCode: "0400000000008",
    name: "Sample product name",
    price: 125,
    labelProfile: {
        ingredients: "Wheat flour, jeera, salt",
        nutrition: [
            { name: "Energy", quantity: "450", unit: "kcal" },
            { name: "Protein", quantity: "12", unit: "g" },
        ],
        netWeight: "200 g",
        unitSellingPriceText: "₹10 per piece",
        mrp: 149,
        shelfLifeDays: 90,
    },
};

const SAMPLE_LABEL_JOB = {
    packedDate: "2026-08-14",
    expiryDate: "2026-11-12",
    batchNumber: "BATCH-42",
};

const UpsertLabelTemplateDialog = ({
    organizationId,
    labelTemplate,
    trigger,
}: UpsertLabelTemplateDialogProps) => {
    const [open, setOpen] = useState(false);
    const [inset, setInset] = useState(emptyInset);
    const [elements, setElements] = useState<LabelElement[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [pendingKind, setPendingKind] = useState<ComposerKind | null>(null);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(labelTemplate);

    const form = useForm<FormValues>({
        resolver: zodResolver(LabelTemplateFormSchema) as unknown as Resolver<FormValues>,
        defaultValues: valuesFromDocument(THERMAL_ROLL_LABEL_TEMPLATE),
    });
    const keepOuts = useFieldArray({ control: form.control, name: "keepOuts" });
    const watchedStock = useWatch({ control: form.control, name: "stock" });
    const watchedKeepOuts = useWatch({ control: form.control, name: "keepOuts" });
    const media = watchedStock?.media ?? "sheet";
    const labelsInRow = clampPreviewLabelsPerRow(Number(watchedStock?.labelsPerRow) || 1);
    const horizontalGapMm = Math.max(0, Number(watchedStock?.horizontalGapMm) || 0);
    const widthMm = Number(watchedStock?.widthMm) || 1;
    const heightMm = Number(watchedStock?.heightMm) || 1;

    useEffect(() => {
        if (!open) {
            const source = labelTemplate ?? THERMAL_ROLL_LABEL_TEMPLATE;
            form.reset({
                ...valuesFromDocument(source),
                name: labelTemplate?.name ?? "",
            });
            setElements(labelTemplate?.elements ?? []);
            setSelectedElementId(null);
            setPendingKind(null);
            setInset(emptyInset);
        }
    }, [form, labelTemplate, open]);

    useEffect(() => {
        if (!watchedStock) {
            return;
        }
        const nextId = matchSizePresetId(watchedStock);
        if (form.getValues("sizePresetId") !== nextId) {
            form.setValue("sizePresetId", nextId);
        }
    }, [form, watchedStock]);

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

        const nextStock =
            stock.media === "roll"
                ? { ...stock, sheet: undefined }
                : {
                      ...stock,
                      sheet: stock.sheet ?? defaultSheet,
                  };

        try {
            return buildInternalLabelPreview({
                template: {
                    name: "Preview",
                    status: "active",
                    stock: nextStock,
                    keepOuts: watchedKeepOuts ?? [],
                    elements,
                },
                product: SAMPLE_LABEL_PRODUCT,
                job: SAMPLE_LABEL_JOB,
            });
        } catch (error) {
            return {
                error:
                    error instanceof Error
                        ? error.message
                        : "This Label Template cannot be previewed.",
            };
        }
    }, [elements, watchedKeepOuts, watchedStock]);

    const keepOutsCoverPrintedContent = useMemo(() => {
        return labelTemplateKeepOutsOverlapPrintedContent({
            keepOuts: watchedKeepOuts ?? [],
            elements,
        });
    }, [elements, watchedKeepOuts]);

    const documentForSubmit = (values: FormValues): LabelTemplateDocument | null => {
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
            elements,
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

    const selectedElement = elements.find((element) => element.id === selectedElementId) ?? null;
    const hasSellingPriceBinding = elements.some(
        (element) =>
            element.type === "text" &&
            element.text.source === "binding" &&
            element.text.binding === "product.price",
    );
    const hasMrpBinding = elements.some(
        (element) =>
            element.type === "text" &&
            element.text.source === "binding" &&
            element.text.binding === "productLabel.mrp",
    );

    const replaceSelectedElement = (next: LabelElement) => {
        const clamped = clampElementToStock(next, { widthMm, heightMm });
        setElements((current) =>
            current.map((element) => (element.id === next.id ? clamped : element)),
        );
    };

    const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) {
            return;
        }
        const xMm = ((event.clientX - bounds.left) / bounds.width) * widthMm;
        const yMm = ((event.clientY - bounds.top) / bounds.height) * heightMm;
        if (pendingKind) {
            const next = createComposerElement(pendingKind, xMm, yMm, { widthMm, heightMm });
            setElements((current) => [...current, next]);
            setSelectedElementId(next.id);
            setPendingKind(null);
            return;
        }
        const hit = [...elements]
            .reverse()
            .find((element) => elementContainsPoint(element, xMm, yMm));
        setSelectedElementId(hit?.id ?? null);
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
            <DialogContent className="flex h-[min(90vh,56rem)] max-h-[90vh] w-full flex-col overflow-hidden sm:max-w-7xl">
                <DialogHeader
                    icon={<Sticker className="size-5" />}
                    title={isEditMode ? "Edit Label Template" : "Create Label Template"}
                    subtitle="Compose Label Stock, Keep-Outs, and Label Elements in millimetres. No Element is mandatory."
                />

                <form className="flex min-h-0 flex-1 flex-col gap-4 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid min-h-0 flex-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)]">
                        <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
                    <div className="grid gap-4 sm:grid-cols-2">
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
                        <Controller
                            control={form.control}
                            name="sizePresetId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Label size</FieldLabel>
                                    <FieldContent>
                                        <ReactSelect
                                            options={sizePresetOptions}
                                            value={
                                                sizePresetOptions.find((option) => option.value === field.value) ??
                                                sizePresetOptions[0]
                                            }
                                            onChange={(option) => {
                                                const sizePresetId = option?.value ?? "custom";
                                                field.onChange(sizePresetId);
                                                const preset = SIZE_PRESETS.find((entry) => entry.id === sizePresetId);
                                                if (preset) {
                                                    form.setValue("stock", preset.stock);
                                                }
                                            }}
                                            classNames={{
                                                control: () => "!min-h-11 rounded-xl",
                                            }}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Pick a common roll or A4 sheet size, then change millimetres below if your sticker is different.
                                        </p>
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />
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
                        ) : null}
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
                                max={12}
                                {...form.register("stock.labelsPerRow", { valueAsNumber: true })}
                            />
                            <MillimetreInput
                                label="Gap beside labels (mm)"
                                hint="Empty space between two stickers sitting in the same row. 0 means they touch."
                                error={form.formState.errors.stock?.horizontalGapMm}
                                {...form.register("stock.horizontalGapMm", { valueAsNumber: true })}
                            />
                            <MillimetreInput
                                label="Gap below labels (mm)"
                                hint="Empty space before the next sticker as the roll or sheet moves forward. This is not the label height."
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
                        <p className="text-xs text-muted-foreground">
                            Labels per row is how many stickers sit side by side on the roll or sheet. The preview
                            shows up to two of them, including the gap beside labels.
                        </p>
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
                                    keepOuts.append({
                                        xMm: 0,
                                        yMm: 0,
                                        widthMm: 2,
                                        heightMm: Number(form.getValues("stock.heightMm")) || 5,
                                    })
                                }
                            >
                                <Plus className="size-3.5" />
                                Add Keep-Out
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            A Keep-Out is a patch already printed on the sticker (logo, hologram, brand strip).
                            Hisab leaves that patch blank. Grey shading in the preview is that reserved area —
                            not extra ink.
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
                        <p className="text-[11px] leading-snug text-muted-foreground">
                            Example: a 12 mm top inset on a 40 mm tall roll reserves the branded header. The barcode
                            sits in leftover space below the grey patch.
                        </p>
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

                    <div className="space-y-3 rounded-xl border border-border/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">Label Elements</p>
                            <p className="text-xs text-muted-foreground">
                                {pendingKind
                                    ? "Click the leftover area to place this Element."
                                    : "Choose a type, then click the preview to place it."}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    ["product.name", "Product name"],
                                    ["product.price", "Selling price"],
                                    ["productLabel.mrp", "On-pack MRP"],
                                    ["productLabel.ingredients", "Ingredients"],
                                    ["productLabel.netWeight", "Net weight"],
                                    [
                                        "productLabel.unitSellingPriceText",
                                        "Unit selling price text",
                                    ],
                                    ["productLabel.nutrition", "Nutrition table"],
                                    ["job.packedDate", "Packed date"],
                                    ["job.expiryDate", "Expiry date"],
                                    ["job.batchNumber", "Batch number"],
                                    ["barcode", "Product Code barcode"],
                                    ["static", "Static text"],
                                    ["box", "Box"],
                                ] as const
                            ).map(([kind, label]) => (
                                <Button
                                    key={kind}
                                    type="button"
                                    variant={pendingKind === kind ? "default" : "outline"}
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() =>
                                        setPendingKind((current) => (current === kind ? null : kind))
                                    }
                                >
                                    <Plus className="size-3.5" />
                                    {label}
                                </Button>
                            ))}
                        </div>
                        {hasSellingPriceBinding ? (
                            <p className="rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300">
                                Selling price is printed on this label. Reprint labels after any price change.
                            </p>
                        ) : null}
                        {hasMrpBinding ? (
                            <p className="rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300">
                                On-pack MRP is printed on this label. Reprint labels after any MRP change.
                            </p>
                        ) : null}
                        {elements.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No Label Elements. A leftover area can stay empty — nothing is mandatory.
                            </p>
                        ) : selectedElement ? (
                            <div className="space-y-3 rounded-lg border border-border/50 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium">Millimetre inspector</p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setElements((current) =>
                                                current.filter((element) => element.id !== selectedElement.id),
                                            );
                                            setSelectedElementId(null);
                                        }}
                                    >
                                        <Trash2 className="size-4" />
                                        Delete
                                    </Button>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-4">
                                    <MillimetreInput
                                        label="X (mm)"
                                        value={selectedElement.xMm}
                                        onChange={(event) =>
                                            replaceSelectedElement({
                                                ...selectedElement,
                                                xMm: Number(event.target.value),
                                            })
                                        }
                                    />
                                    <MillimetreInput
                                        label="Y (mm)"
                                        value={selectedElement.yMm}
                                        onChange={(event) =>
                                            replaceSelectedElement({
                                                ...selectedElement,
                                                yMm: Number(event.target.value),
                                            })
                                        }
                                    />
                                    <MillimetreInput
                                        label="Width (mm)"
                                        value={selectedElement.widthMm}
                                        onChange={(event) =>
                                            replaceSelectedElement({
                                                ...selectedElement,
                                                widthMm: Number(event.target.value) || selectedElement.widthMm,
                                            })
                                        }
                                    />
                                    <MillimetreInput
                                        label="Height (mm)"
                                        value={selectedElement.heightMm}
                                        onChange={(event) =>
                                            replaceSelectedElement({
                                                ...selectedElement,
                                                heightMm: Number(event.target.value) || selectedElement.heightMm,
                                            })
                                        }
                                    />
                                </div>
                                <Field className="min-w-0">
                                    <FieldLabel>Rotation</FieldLabel>
                                    <FieldContent>
                                        <ReactSelect
                                            options={rotationOptions}
                                            value={
                                                rotationOptions.find(
                                                    (option) => option.value === selectedElement.rotationDeg,
                                                ) ?? rotationOptions[0]
                                            }
                                            onChange={(option) =>
                                                replaceSelectedElement({
                                                    ...selectedElement,
                                                    rotationDeg: (option?.value ?? 0) as LabelRotation,
                                                })
                                            }
                                            classNames={{
                                                control: () => "!min-h-10 rounded-xl",
                                            }}
                                        />
                                    </FieldContent>
                                </Field>
                                {selectedElement.type === "text" ? (
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <MillimetreInput
                                            label="Font size (mm)"
                                            value={selectedElement.text.fontSizeMm}
                                            onChange={(event) =>
                                                replaceSelectedElement({
                                                    ...selectedElement,
                                                    text: {
                                                        ...selectedElement.text,
                                                        fontSizeMm:
                                                            Number(event.target.value) ||
                                                            selectedElement.text.fontSizeMm,
                                                    },
                                                })
                                            }
                                        />
                                        <Field className="min-w-0">
                                            <FieldLabel>Weight</FieldLabel>
                                            <FieldContent>
                                                <ReactSelect
                                                    options={fontWeightOptions}
                                                    value={
                                                        fontWeightOptions.find(
                                                            (option) =>
                                                                option.value === selectedElement.text.fontWeight,
                                                        ) ?? fontWeightOptions[0]
                                                    }
                                                    onChange={(option) =>
                                                        replaceSelectedElement({
                                                            ...selectedElement,
                                                            text: {
                                                                ...selectedElement.text,
                                                                fontWeight: option?.value ?? "normal",
                                                            },
                                                        })
                                                    }
                                                    classNames={{
                                                        control: () => "!min-h-10 rounded-xl",
                                                    }}
                                                />
                                            </FieldContent>
                                        </Field>
                                        <Field className="min-w-0">
                                            <FieldLabel>Align</FieldLabel>
                                            <FieldContent>
                                                <ReactSelect
                                                    options={alignOptions}
                                                    value={
                                                        alignOptions.find(
                                                            (option) => option.value === selectedElement.text.align,
                                                        ) ?? alignOptions[0]
                                                    }
                                                    onChange={(option) =>
                                                        replaceSelectedElement({
                                                            ...selectedElement,
                                                            text: {
                                                                ...selectedElement.text,
                                                                align: option?.value ?? "left",
                                                            },
                                                        })
                                                    }
                                                    classNames={{
                                                        control: () => "!min-h-10 rounded-xl",
                                                    }}
                                                />
                                            </FieldContent>
                                        </Field>
                                        {selectedElement.text.source === "static" ? (
                                            <Field className="sm:col-span-3">
                                                <FieldLabel>Static text</FieldLabel>
                                                <FieldContent>
                                                    <Input
                                                        className="h-10 rounded-xl"
                                                        value={selectedElement.text.staticValue ?? ""}
                                                        onChange={(event) =>
                                                            replaceSelectedElement({
                                                                ...selectedElement,
                                                                text: {
                                                                    ...selectedElement.text,
                                                                    staticValue: event.target.value,
                                                                },
                                                            })
                                                        }
                                                    />
                                                </FieldContent>
                                            </Field>
                                        ) : null}
                                    </div>
                                ) : null}
                                {selectedElement.type === "barcode" ? (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field className="min-w-0">
                                            <FieldLabel>Symbology</FieldLabel>
                                            <FieldContent>
                                                <ReactSelect
                                                    options={symbologyOptions}
                                                    value={
                                                        symbologyOptions.find(
                                                            (option) =>
                                                                option.value === selectedElement.barcode.symbology,
                                                        ) ?? symbologyOptions[0]
                                                    }
                                                    onChange={(option) =>
                                                        replaceSelectedElement({
                                                            ...selectedElement,
                                                            barcode: {
                                                                ...selectedElement.barcode,
                                                                symbology: option?.value ?? "ean13",
                                                            },
                                                        })
                                                    }
                                                    classNames={{
                                                        control: () => "!min-h-10 rounded-xl",
                                                    }}
                                                />
                                            </FieldContent>
                                        </Field>
                                        <label className="flex items-center gap-2 self-end pb-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedElement.barcode.showHumanDigits}
                                                onChange={(event) =>
                                                    replaceSelectedElement({
                                                        ...selectedElement,
                                                        barcode: {
                                                            ...selectedElement.barcode,
                                                            showHumanDigits: event.target.checked,
                                                        },
                                                    })
                                                }
                                            />
                                            Show human-readable digits
                                        </label>
                                    </div>
                                ) : null}
                                {selectedElement.type === "box" ? (
                                    <MillimetreInput
                                        label="Stroke (mm)"
                                        value={selectedElement.box.strokeWidthMm}
                                        onChange={(event) =>
                                            replaceSelectedElement({
                                                ...selectedElement,
                                                box: {
                                                    strokeWidthMm:
                                                        Number(event.target.value) ||
                                                        selectedElement.box.strokeWidthMm,
                                                },
                                            })
                                        }
                                    />
                                ) : null}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Click an Element on the preview to inspect millimetres, rotation, and style.
                            </p>
                        )}
                    </div>
                        </div>

                        <aside className="flex min-h-0 flex-col gap-2 md:overflow-y-auto">
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="text-sm font-medium">Preview</p>
                                {preview && "svg" in preview ? (
                                    <p className="text-xs text-muted-foreground">
                                        {Math.round(widthMm)} × {Math.round(heightMm)} mm · {labelsInRow}-across
                                        {horizontalGapMm > 0 ? ` · ${horizontalGapMm} mm side gap` : ""}
                                    </p>
                                ) : null}
                            </div>
                            {keepOutsCoverPrintedContent ? (
                                <p className="rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300">
                                    A Label Element intersects a Keep-Out. Move it into leftover space before saving.
                                </p>
                            ) : null}
                            {preview && "svg" in preview ? (
                                <div className="overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-3">
                                    <div
                                        className="flex w-fit items-start"
                                        style={{
                                            gap: `${horizontalGapMm}mm`,
                                        }}
                                    >
                                        {Array.from({ length: labelsInRow }, (_, index) => (
                                            <div
                                                key={index}
                                                className="relative shrink-0 overflow-hidden rounded-lg border border-border/40 bg-white shadow-sm"
                                                style={{
                                                    width: `${widthMm}mm`,
                                                    height: `${heightMm}mm`,
                                                    cursor: pendingKind ? "crosshair" : "default",
                                                }}
                                                onClick={index === 0 ? handleCanvasClick : undefined}
                                            >
                                                <div
                                                    className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                                                    dangerouslySetInnerHTML={{ __html: preview.svg }}
                                                />
                                                {index === 0 && selectedElement ? (
                                                    <div
                                                        className="pointer-events-none absolute border border-dashed border-primary"
                                                        style={{
                                                            left: `${(selectedElement.xMm / widthMm) * 100}%`,
                                                            top: `${(selectedElement.yMm / heightMm) * 100}%`,
                                                            width: `${(selectedElement.widthMm / widthMm) * 100}%`,
                                                            height: `${(selectedElement.heightMm / heightMm) * 100}%`,
                                                        }}
                                                    />
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
                                    {preview && "error" in preview
                                        ? preview.error
                                        : "Set Label Stock, then click-to-place Label Elements in the leftover area."}
                                </p>
                            )}
                        </aside>
                    </div>

                    <DialogFooter className="shrink-0">
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={mutation.isPending || keepOutsCoverPrintedContent}
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
