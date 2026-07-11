import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import {
    createBundleProduct,
    getBundleProduct,
    getProductAddOnAttachments,
    updateBundleProduct,
} from "@repo/services";
import {
    ProductStatusSchema,
    type CategoryDTO,
    type CreateBundleProductJSON,
    type ProductResponseDTO,
    type ProductStatus,
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
import { Spinner } from "@repo/ui/components/spinner";
import { Boxes, Minus, Pencil, Plus, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { catalogKeys } from "@/lib/query-keys";

type UpsertBundleProductDialogProps = {
    organizationId: string;
    categories: CategoryDTO[];
    products: ProductResponseDTO[];
    product?: ProductResponseDTO;
    defaultCategoryId?: string;
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

const wholeCountFieldSchema = z
    .string()
    .refine((value) => value.length > 0, "Quantity is required")
    .refine((value) => /^\d+$/.test(value), "Quantity must be a whole number")
    .transform((value) => Number(value))
    .pipe(z.number().int().min(1, "Quantity must be at least 1"));

const UpsertBundleProductFormSchema = z.object({
    categoryId: z.uuid("Invalid category id"),
    name: z
        .string()
        .trim()
        .min(1, "Name is required")
        .max(255, "Name must be at most 255 characters"),
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
    status: ProductStatusSchema.optional(),
    components: z
        .array(
            z.object({
                productId: z.uuid("Invalid product id"),
                quantity: wholeCountFieldSchema,
                addOns: z
                    .array(
                        z.object({
                            addOnId: z.uuid("Invalid add-on id"),
                            quantity: wholeCountFieldSchema,
                        }),
                    )
                    .optional()
                    .default([]),
            }),
        )
        .min(1, "A bundle must include at least one product component"),
});

type UpsertBundleProductFormInput = z.input<typeof UpsertBundleProductFormSchema>;
type BundleFormComponentInput = UpsertBundleProductFormInput["components"][number];
type BundleFormAddOnInput = NonNullable<BundleFormComponentInput["addOns"]>[number];

type BundleFormComponentSource = {
    productId: string;
    quantity: string | number;
    addOns?: Array<{
        addOnId: string;
        quantity: string | number;
    }>;
};

const defaultValues: UpsertBundleProductFormInput = {
    categoryId: "",
    name: "",
    price: "",
    discount: "",
    status: "active",
    components: [{ productId: "", quantity: "1", addOns: [] }],
};

const buildAddOnSignature = (addOns: Array<{ addOnId: string; quantity: string | number }>) => {
    return [...addOns]
        .filter((addOn) => addOn.addOnId)
        .sort((left, right) => left.addOnId.localeCompare(right.addOnId))
        .map((addOn) => `${addOn.addOnId}:${Number(addOn.quantity || "0")}`)
        .join("|");
};

const buildComponentSignature = (component: BundleFormComponentSource) =>
    `${component.productId}::${buildAddOnSignature(component.addOns ?? [])}`;

const mergeBundleFormComponents = (components: BundleFormComponentSource[]): BundleFormComponentInput[] => {
    const merged = new Map<string, BundleFormComponentInput>();
    const pending: BundleFormComponentInput[] = [];

    for (const component of components) {
        const addOns: BundleFormAddOnInput[] = (component.addOns ?? [])
            .filter((addOn) => addOn.addOnId)
            .map((addOn) => ({
                addOnId: addOn.addOnId,
                quantity: String(addOn.quantity),
            }));

        if (!component.productId) {
            pending.push({
                productId: component.productId,
                quantity: String(component.quantity),
                addOns,
            });
            continue;
        }

        const signature = buildComponentSignature({
            productId: component.productId,
            quantity: component.quantity,
            addOns,
        });
        const quantity = Number(component.quantity || "0");
        const existing = merged.get(signature);

        if (existing) {
            merged.set(signature, {
                ...existing,
                quantity: String(Number(existing.quantity) + quantity),
            });
            continue;
        }

        merged.set(signature, {
            productId: component.productId,
            quantity: String(quantity),
            addOns,
        });
    }

    return [...merged.values(), ...pending];
};

const statusSelectOptions = ProductStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const UpsertBundleProductDialog = ({
    organizationId,
    categories,
    products,
    product,
    defaultCategoryId,
    trigger,
}: UpsertBundleProductDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(product);

    const form = useForm<UpsertBundleProductFormInput, unknown, CreateBundleProductJSON>({
        resolver: zodResolver(UpsertBundleProductFormSchema),
        defaultValues,
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: "components",
    });

    const watchedComponents = form.watch("components");

    const resolveDefaultCategoryId = () => {
        if (defaultCategoryId && categories.some((category) => category.id === defaultCategoryId)) {
            return defaultCategoryId;
        }

        return categories[0]?.id ?? "";
    };

    const componentProductOptions = useMemo(
        () =>
            products
                .filter((item) => item.productType === "single" && item.status === "active")
                .map((item) => ({ label: item.name, value: item.id })),
        [products],
    );

    const categoryOptions = useMemo(
        () => categories.map((category) => ({ label: category.name, value: category.id })),
        [categories],
    );

    const selectedProductIds = useMemo(
        () =>
            [...new Set(
                (watchedComponents ?? [])
                    .map((component) => component.productId)
                    .filter(Boolean),
            )],
        [watchedComponents],
    );

    const attachmentQueries = useQueries({
        queries: selectedProductIds.map((productId) => ({
            queryKey: catalogKeys.productAttachments(organizationId, productId),
            queryFn: () => getProductAddOnAttachments(organizationId, productId),
            enabled: open && Boolean(organizationId) && Boolean(productId),
        })),
    });

    const attachmentsByProductId = useMemo(() => {
        const map = new Map<string, Array<{ label: string; value: string; selectionCap: number }>>();

        selectedProductIds.forEach((productId, index) => {
            const response = attachmentQueries[index]?.data;
            const attachments = response?.status === "success"
                ? response.data?.attachments ?? []
                : [];

            map.set(
                productId,
                attachments
                    .filter(
                        (attachment) =>
                            attachment.status === "active" && attachment.addOn.status === "active",
                    )
                    .map((attachment) => ({
                        label: attachment.addOn.name,
                        value: attachment.addOnId,
                        selectionCap: attachment.selectionCap,
                    })),
            );
        });

        return map;
    }, [attachmentQueries, selectedProductIds]);

    const bundleDetailsQuery = useQuery({
        queryKey: [...catalogKeys.products(organizationId), "bundle", product?.id],
        queryFn: () => getBundleProduct(organizationId, product!.id),
        enabled: open && Boolean(product?.id),
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        if (!product) {
            form.reset({
                ...defaultValues,
                categoryId: resolveDefaultCategoryId(),
                components: [{
                    productId: componentProductOptions[0]?.value ?? "",
                    quantity: "1",
                    addOns: [],
                }],
            });
            return;
        }

        const details = bundleDetailsQuery.data?.status === "success"
            ? bundleDetailsQuery.data.data
            : null;

        form.reset({
            categoryId: product.categoryId,
            name: product.name,
            price: String(product.price),
            discount: product.discount ? String(product.discount) : "",
            status: product.status,
            components: details?.components.length
                ? mergeBundleFormComponents(details.components.map((component) => ({
                    productId: component.componentProductId,
                    quantity: String(component.quantity),
                    addOns: component.addOns.map((addOn) => ({
                        addOnId: addOn.addOnId,
                        quantity: String(addOn.quantity),
                    })),
                })))
                : [{ productId: "", quantity: "1", addOns: [] }],
        });
    }, [
        bundleDetailsQuery.data,
        categories,
        componentProductOptions,
        defaultCategoryId,
        form,
        open,
        product,
    ]);

    const mutation = useMutation({
        mutationFn: (data: CreateBundleProductJSON) =>
            product
                ? updateBundleProduct(organizationId, product.id, data)
                : createBundleProduct(organizationId, data),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
                setOpen(false);
                form.reset(defaultValues);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? `Failed to ${isEditMode ? "update" : "create"} bundle`);
        },
    });

    const onSubmit: SubmitHandler<CreateBundleProductJSON> = (values) => {
        mutation.mutate({
            categoryId: values.categoryId,
            name: values.name.trim(),
            price: values.price,
            discount: values.discount ?? 0,
            status: (values.status ?? "active") as ProductStatus,
            components: mergeBundleFormComponents(values.components).map((component) => ({
                productId: component.productId,
                quantity: Number(component.quantity),
                addOns: (component.addOns ?? [])
                    .filter((addOn) => addOn.addOnId)
                    .map((addOn) => ({
                        addOnId: addOn.addOnId,
                        quantity: Number(addOn.quantity),
                    })),
            })),
        });
    };

    const hasCategories = categories.length > 0;
    const hasComponentProducts = componentProductOptions.length > 0;
    const isLoadingDetails = isEditMode && bundleDetailsQuery.isPending;

    const updateComponentQuantity = (index: number, delta: number) => {
        const current = Number(form.getValues(`components.${index}.quantity`) || "1");
        const next = Math.max(1, current + delta);

        form.setValue(`components.${index}.quantity`, String(next), {
            shouldDirty: true,
            shouldValidate: true,
        });
    };

    const updateAddOnQuantity = (componentIndex: number, addOnIndex: number, delta: number) => {
        const path = `components.${componentIndex}.addOns.${addOnIndex}.quantity` as const;
        const current = Number(form.getValues(path) || "1");
        const productId = form.getValues(`components.${componentIndex}.productId`);
        const addOnId = form.getValues(`components.${componentIndex}.addOns.${addOnIndex}.addOnId`);
        const selectionCap = attachmentsByProductId
            .get(productId)
            ?.find((option) => option.value === addOnId)
            ?.selectionCap ?? Number.POSITIVE_INFINITY;
        const next = Math.min(selectionCap, Math.max(1, current + delta));

        form.setValue(path, String(next), {
            shouldDirty: true,
            shouldValidate: true,
        });
    };

    const addNestedAddOn = (componentIndex: number) => {
        const current = form.getValues(`components.${componentIndex}`);
        const productId = current.productId;
        const options = attachmentsByProductId.get(productId) ?? [];
        const usedIds = new Set((current.addOns ?? []).map((addOn) => addOn.addOnId));
        const nextOption = options.find((option) => !usedIds.has(option.value));

        if (!nextOption) {
            return;
        }

        update(componentIndex, {
            ...current,
            addOns: [
                ...(current.addOns ?? []),
                { addOnId: nextOption.value, quantity: "1" },
            ],
        });
    };

    const removeNestedAddOn = (componentIndex: number, addOnIndex: number) => {
        const current = form.getValues(`components.${componentIndex}`);
        update(componentIndex, {
            ...current,
            addOns: (current.addOns ?? []).filter((_, index) => index !== addOnIndex),
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button
                            variant={isEditMode ? "outline" : "default"}
                            className="rounded-full"
                            disabled={!hasCategories || !hasComponentProducts}
                        >
                            {isEditMode ? <Pencil className="mr-2 size-4" /> : <PlusCircle className="mr-2 size-4" />}
                            {isEditMode ? "Edit bundle" : "Add bundle"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <Boxes className="size-5" />
                    </div>
                    <DialogTitle className="text-center text-lg font-semibold">
                        {isEditMode ? "Edit bundle" : "Create bundle"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {hasComponentProducts
                            ? "Compose a fixed combo from products and their attached add-ons."
                            : "Create at least one active product before composing a bundle."}
                    </DialogDescription>
                </DialogHeader>

                {isLoadingDetails ? (
                    <div className="flex min-h-40 items-center justify-center">
                        <Spinner className="size-6 text-primary" />
                    </div>
                ) : (
                    <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                        <Controller
                            control={form.control}
                            name="categoryId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Category</FieldLabel>
                                    <FieldContent>
                                        <ReactSelect
                                            options={categoryOptions}
                                            value={categoryOptions.find((option) => option.value === field.value) ?? null}
                                            onChange={(option) => field.onChange(option?.value ?? "")}
                                            placeholder="Select a category"
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
                            <FieldLabel required>Name</FieldLabel>
                            <FieldContent>
                                <Input
                                    {...form.register("name")}
                                    placeholder="Burger Combo"
                                    className="h-11 rounded-xl"
                                />
                                <FieldError errors={[form.formState.errors.name]} />
                            </FieldContent>
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field data-invalid={!!form.formState.errors.price}>
                                <FieldLabel required>Price</FieldLabel>
                                <FieldContent>
                                    <Input
                                        value={form.watch("price")}
                                        onChange={(event) =>
                                            form.setValue("price", sanitizeDecimalInput(event.target.value), {
                                                shouldValidate: true,
                                            })
                                        }
                                        inputMode="decimal"
                                        placeholder="99"
                                        className="h-11 rounded-xl"
                                    />
                                    <FieldError errors={[form.formState.errors.price]} />
                                </FieldContent>
                            </Field>

                            <Field data-invalid={!!form.formState.errors.discount}>
                                <FieldLabel>Discount</FieldLabel>
                                <FieldContent>
                                    <Input
                                        value={form.watch("discount") ?? ""}
                                        onChange={(event) =>
                                            form.setValue("discount", sanitizeDecimalInput(event.target.value), {
                                                shouldValidate: true,
                                            })
                                        }
                                        inputMode="decimal"
                                        placeholder="0"
                                        className="h-11 rounded-xl"
                                    />
                                    <FieldError errors={[form.formState.errors.discount]} />
                                </FieldContent>
                            </Field>
                        </div>

                        {isEditMode ? (
                            <Controller
                                control={form.control}
                                name="status"
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Status</FieldLabel>
                                        <FieldContent>
                                            <ReactSelect
                                                options={statusSelectOptions}
                                                value={
                                                    statusSelectOptions.find((option) => option.value === field.value)
                                                    ?? null
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
                        ) : null}

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <FieldLabel required>Components</FieldLabel>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() =>
                                        append({
                                            productId: componentProductOptions[0]?.value ?? "",
                                            quantity: "1",
                                            addOns: [],
                                        })
                                    }
                                    disabled={!hasComponentProducts}
                                >
                                    <Plus className="mr-1 size-3.5" />
                                    Add product
                                </Button>
                            </div>

                            {fields.map((field, index) => {
                                const productId = watchedComponents?.[index]?.productId ?? "";
                                const addOnOptions = attachmentsByProductId.get(productId) ?? [];
                                const selectedAddOns = watchedComponents?.[index]?.addOns ?? [];
                                const usedAddOnIds = new Set(selectedAddOns.map((addOn) => addOn.addOnId));
                                const availableAddOnOptions = addOnOptions.filter(
                                    (option) => !usedAddOnIds.has(option.value),
                                );

                                return (
                                    <div
                                        key={field.id}
                                        className="space-y-3 rounded-2xl border border-border/60 p-3"
                                    >
                                        <div className="flex items-start gap-2">
                                            <Controller
                                                control={form.control}
                                                name={`components.${index}.productId`}
                                                render={({ field: productField, fieldState }) => (
                                                    <Field className="min-w-0 flex-1" data-invalid={fieldState.invalid}>
                                                        <FieldContent>
                                                            <ReactSelect
                                                                options={componentProductOptions}
                                                                value={
                                                                    componentProductOptions.find(
                                                                        (option) => option.value === productField.value,
                                                                    ) ?? null
                                                                }
                                                                onChange={(option) => {
                                                                    productField.onChange(option?.value ?? "");
                                                                    update(index, {
                                                                        productId: option?.value ?? "",
                                                                        quantity: form.getValues(
                                                                            `components.${index}.quantity`,
                                                                        ) || "1",
                                                                        addOns: [],
                                                                    });
                                                                }}
                                                                placeholder="Select product"
                                                                classNames={{
                                                                    control: () => "!min-h-11 rounded-xl",
                                                                }}
                                                            />
                                                            <FieldError errors={[fieldState.error]} />
                                                        </FieldContent>
                                                    </Field>
                                                )}
                                            />

                                            <Field
                                                className="w-40"
                                                data-invalid={!!form.formState.errors.components?.[index]?.quantity}
                                            >
                                                <FieldContent>
                                                    <div className="flex h-11 items-center rounded-xl border border-input bg-background px-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg text-muted-foreground"
                                                            onClick={() => updateComponentQuantity(index, -1)}
                                                            aria-label="Decrease quantity"
                                                        >
                                                            <Minus className="size-4" />
                                                        </Button>
                                                        <Input
                                                            {...form.register(`components.${index}.quantity`)}
                                                            readOnly
                                                            className="h-9 border-0 bg-transparent px-0 text-center shadow-none focus-visible:ring-0"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg text-muted-foreground"
                                                            onClick={() => updateComponentQuantity(index, 1)}
                                                            aria-label="Increase quantity"
                                                        >
                                                            <Plus className="size-4" />
                                                        </Button>
                                                    </div>
                                                    <FieldError
                                                        errors={[form.formState.errors.components?.[index]?.quantity]}
                                                    />
                                                </FieldContent>
                                            </Field>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="mt-0.5 h-11 w-11 rounded-xl text-muted-foreground"
                                                onClick={() => remove(index)}
                                                disabled={fields.length <= 1}
                                                aria-label="Remove component"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2 pl-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-muted-foreground">Add-ons</p>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-full"
                                                    onClick={() => addNestedAddOn(index)}
                                                    disabled={!productId || availableAddOnOptions.length === 0}
                                                >
                                                    <Plus className="mr-1 size-3.5" />
                                                    Add add-on
                                                </Button>
                                            </div>

                                            {selectedAddOns.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">
                                                    {productId
                                                        ? addOnOptions.length === 0
                                                            ? "No active add-on attachments for this product."
                                                            : "Optional. Nested add-ons stay under this product."
                                                        : "Select a product to attach add-ons."}
                                                </p>
                                            ) : (
                                                selectedAddOns.map((addOn, addOnIndex) => {
                                                    const selectedOption = addOnOptions.find(
                                                        (option) => option.value === addOn.addOnId,
                                                    );
                                                    const optionsForRow = [
                                                        ...(selectedOption ? [selectedOption] : []),
                                                        ...availableAddOnOptions,
                                                    ];

                                                    return (
                                                        <div key={`${field.id}-addon-${addOnIndex}`} className="flex items-start gap-2">
                                                            <Controller
                                                                control={form.control}
                                                                name={`components.${index}.addOns.${addOnIndex}.addOnId`}
                                                                render={({ field: addOnField, fieldState }) => (
                                                                    <Field
                                                                        className="min-w-0 flex-1"
                                                                        data-invalid={fieldState.invalid}
                                                                    >
                                                                        <FieldContent>
                                                                            <ReactSelect
                                                                                options={optionsForRow}
                                                                                value={
                                                                                    optionsForRow.find(
                                                                                        (option) =>
                                                                                            option.value === addOnField.value,
                                                                                    ) ?? null
                                                                                }
                                                                                onChange={(option) => {
                                                                                    addOnField.onChange(option?.value ?? "");
                                                                                    form.setValue(
                                                                                        `components.${index}.addOns.${addOnIndex}.quantity`,
                                                                                        "1",
                                                                                        {
                                                                                            shouldDirty: true,
                                                                                            shouldValidate: true,
                                                                                        },
                                                                                    );
                                                                                }}
                                                                                placeholder="Select add-on"
                                                                                classNames={{
                                                                                    control: () => "!min-h-10 rounded-xl",
                                                                                }}
                                                                            />
                                                                            <FieldError errors={[fieldState.error]} />
                                                                        </FieldContent>
                                                                    </Field>
                                                                )}
                                                            />

                                                            <Field className="w-36">
                                                                <FieldContent>
                                                                    <div className="flex h-10 items-center rounded-xl border border-input bg-background px-1">
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 rounded-lg text-muted-foreground"
                                                                            onClick={() =>
                                                                                updateAddOnQuantity(index, addOnIndex, -1)
                                                                            }
                                                                            aria-label="Decrease add-on quantity"
                                                                        >
                                                                            <Minus className="size-3.5" />
                                                                        </Button>
                                                                        <Input
                                                                            {...form.register(
                                                                                `components.${index}.addOns.${addOnIndex}.quantity`,
                                                                            )}
                                                                            readOnly
                                                                            className="h-8 border-0 bg-transparent px-0 text-center shadow-none focus-visible:ring-0"
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 rounded-lg text-muted-foreground"
                                                                            onClick={() =>
                                                                                updateAddOnQuantity(index, addOnIndex, 1)
                                                                            }
                                                                            aria-label="Increase add-on quantity"
                                                                        >
                                                                            <Plus className="size-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </FieldContent>
                                                            </Field>

                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-10 w-10 rounded-xl text-muted-foreground"
                                                                onClick={() => removeNestedAddOn(index, addOnIndex)}
                                                                aria-label="Remove add-on"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {form.formState.errors.components?.root ? (
                                <FieldError errors={[form.formState.errors.components.root]} />
                            ) : form.formState.errors.components?.message ? (
                                <FieldError
                                    errors={[{ message: form.formState.errors.components.message }]}
                                />
                            ) : null}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="rounded-full"
                                disabled={mutation.isPending || !hasCategories || !hasComponentProducts}
                            >
                                {mutation.isPending
                                    ? isEditMode
                                        ? "Saving..."
                                        : "Creating..."
                                    : isEditMode
                                        ? "Save bundle"
                                        : "Create bundle"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default UpsertBundleProductDialog;
