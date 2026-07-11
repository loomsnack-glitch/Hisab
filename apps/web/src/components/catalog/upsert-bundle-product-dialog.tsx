import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import {
    createBundleProduct,
    getBundleProduct,
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
                quantity: z
                    .string()
                    .refine((value) => value.length > 0, "Quantity is required")
                    .refine((value) => /^\d+$/.test(value), "Quantity must be a whole number")
                    .transform((value) => Number(value))
                    .pipe(z.number().int().min(1, "Quantity must be at least 1")),
            }),
        )
        .min(1, "A bundle must include at least one product component"),
});

type UpsertBundleProductFormInput = z.input<typeof UpsertBundleProductFormSchema>;

type BundleFormComponentSource = {
    productId: string;
    quantity: string | number;
};

type BundleFormComponentInput = UpsertBundleProductFormInput["components"][number];

const defaultValues: UpsertBundleProductFormInput = {
    categoryId: "",
    name: "",
    price: "",
    discount: "",
    status: "active",
    components: [{ productId: "", quantity: "1" }],
};

const mergeBundleFormComponents = (components: BundleFormComponentSource[]): BundleFormComponentInput[] => {
    const merged = new Map<string, number>();
    const pending: BundleFormComponentInput[] = [];

    for (const component of components) {
        if (!component.productId) {
            pending.push({
                productId: component.productId,
                quantity: String(component.quantity),
            });
            continue;
        }

        const quantity = Number(component.quantity || "0");
        const current = merged.get(component.productId) ?? 0;
        merged.set(component.productId, current + quantity);
    }

    return [
        ...[...merged.entries()].map(([productId, quantity]) => ({
            productId,
            quantity: String(quantity),
        })),
        ...pending,
    ];
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

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "components",
    });

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
                components: [{ productId: componentProductOptions[0]?.value ?? "", quantity: "1" }],
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
                })))
                : [{ productId: "", quantity: "1" }],
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
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <Boxes className="size-5" />
                    </div>
                    <DialogTitle className="text-center text-lg font-semibold">
                        {isEditMode ? "Edit bundle" : "Create bundle"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {hasComponentProducts
                            ? "Create a fixed combo offer from existing products with its own price."
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
                                        })
                                    }
                                    disabled={!hasComponentProducts}
                                >
                                    <Plus className="mr-1 size-3.5" />
                                    Add product
                                </Button>
                            </div>

                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-start gap-2">
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
                                                        onChange={(option) =>
                                                            productField.onChange(option?.value ?? "")
                                                        }
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

                                    <Field className="w-40" data-invalid={!!form.formState.errors.components?.[index]?.quantity}>
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
                            ))}

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
