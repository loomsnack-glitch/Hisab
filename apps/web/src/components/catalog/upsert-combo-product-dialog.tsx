import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createComboProduct, getComboProduct, updateComboProduct } from "@repo/services";
import { ProductStatusSchema, type CategoryDTO, type CreateComboProductJSON, type ProductResponseDTO } from "@repo/types";
import { z } from "zod";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Boxes, Pencil, Plus, PlusCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import ComboProductPickerDialog from "@/components/catalog/combo-product-picker-dialog";
import { catalogKeys } from "@/lib/query-keys";

type Props = {
    organizationId: string;
    categories: CategoryDTO[];
    products: ProductResponseDTO[];
    product?: ProductResponseDTO;
    defaultCategoryId?: string;
    trigger?: React.ReactElement;
};

const whole = z.coerce.number().int().min(0).max(100);
const positiveWhole = z.coerce.number().int().min(1).max(100);
const comboFormSchema = z.object({
    categoryId: z.uuid("Select a category"),
    name: z.string().trim().min(1, "Name is required"),
    price: z.coerce.number().min(0, "Price must be 0 or more"),
    discount: z.coerce.number().min(0).default(0),
    status: ProductStatusSchema,
    choiceGroups: z.array(z.object({
        name: z.string().trim().min(1, "Group name is required"),
        minSelections: whole,
        maxSelections: whole,
        options: z.array(z.object({
            productId: z.uuid("Select a product"),
            maxQuantity: positiveWhole,
            priceAdjustment: z.coerce.number().finite(),
        })).min(1, "Add at least one option"),
    })).min(1, "Add at least one choice group"),
}).superRefine((value, context) => {
    value.choiceGroups.forEach((group, index) => {
        if (group.minSelections > group.maxSelections) {
            context.addIssue({ code: "custom", path: ["choiceGroups", index, "maxSelections"], message: "Max must be at least min" });
        }
        const ids = group.options.map((option) => option.productId);
        if (new Set(ids).size !== ids.length) {
            context.addIssue({ code: "custom", path: ["choiceGroups", index, "options"], message: "Do not repeat a product in one group" });
        }
    });
});

type FormInput = z.input<typeof comboFormSchema>;
type GroupInput = FormInput["choiceGroups"][number];

const defaultValues: FormInput = {
    categoryId: "",
    name: "",
    price: 0,
    discount: 0,
    status: "active",
    choiceGroups: [{ name: "", minSelections: 1, maxSelections: 1, options: [] }],
};

const UpsertComboProductDialog = ({ organizationId, categories, products, product, defaultCategoryId, trigger }: Props) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEdit = Boolean(product);
    const ActionIcon = isEdit ? Pencil : PlusCircle;
    const form = useForm<FormInput>({ resolver: zodResolver(comboFormSchema), defaultValues });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "choiceGroups" });
    const watchedGroups = form.watch("choiceGroups");
    const categoryOptions = useMemo(() => categories.map((item) => ({ label: item.name, value: item.id })), [categories]);
    const optionProducts = useMemo(() => products.filter((item) => item.productType === "single" && item.status === "active"), [products]);
    const statusOptions = ProductStatusSchema.options.map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value }));
    const detailsQuery = useQuery({
        queryKey: [...catalogKeys.products(organizationId), "combo", product?.id],
        queryFn: () => getComboProduct(organizationId, product!.id),
        enabled: open && isEdit,
    });
    const isLoadingDetails = isEdit && detailsQuery.isPending;
    const detailsLoadFailed = isEdit && (detailsQuery.isError || detailsQuery.data?.status === "error");

    useEffect(() => {
        if (!open) return;
        if (isEdit && detailsQuery.isPending) return;
        const categoryId = defaultCategoryId && categories.some((item) => item.id === defaultCategoryId)
            ? defaultCategoryId
            : categories[0]?.id ?? "";
        const details = detailsQuery.data?.status === "success" ? detailsQuery.data.data : null;
        if (!product) {
            form.reset({ ...defaultValues, categoryId, choiceGroups: [{ ...defaultValues.choiceGroups[0], options: [] }] });
            return;
        }
        form.reset({
            categoryId: product.categoryId,
            name: product.name,
            price: Number(product.price),
            discount: Number(product.discount),
            status: product.status,
            choiceGroups: details?.choiceGroups.map((group) => ({
                name: group.name,
                minSelections: group.minSelections,
                maxSelections: group.maxSelections,
                options: group.options.map((option) => ({ productId: option.optionProductId, maxQuantity: option.maxQuantity, priceAdjustment: Number(option.priceAdjustment) })),
            })) ?? defaultValues.choiceGroups,
        });
    }, [open, product, detailsQuery.data, detailsQuery.isPending, isEdit, categories, defaultCategoryId, optionProducts, form]);

    const mutation = useMutation({
        mutationFn: (data: CreateComboProductJSON) => product
            ? updateComboProduct(organizationId, product.id, data)
            : createComboProduct(organizationId, data),
        onSuccess: (response) => {
            if (response.status !== "success") { toast.error(response.message); return; }
            toast.success(response.message);
            queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
            setOpen(false);
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Unable to save Combo"),
    });

    const updateGroup = (index: number, patch: Partial<GroupInput>) => {
        const current = form.getValues(`choiceGroups.${index}`);
        form.setValue(`choiceGroups.${index}`, { ...current, ...patch }, { shouldDirty: true, shouldValidate: true });
    };
    const updateGroupProducts = (groupIndex: number, productIds: string[]) => {
        const currentOptions = form.getValues(`choiceGroups.${groupIndex}.options`) ?? [];
        const existingOptions = new Map(currentOptions.map((option) => [option.productId, option]));
        updateGroup(groupIndex, {
            options: productIds.map((productId) => existingOptions.get(productId) ?? ({
                productId,
                maxQuantity: 1,
                priceAdjustment: 0,
            })),
        });
    };
    const onSubmit: SubmitHandler<FormInput> = (values) => mutation.mutate({
        categoryId: values.categoryId,
        name: values.name.trim(),
        price: Number(values.price),
        discount: Number(values.discount ?? 0),
        status: values.status,
        choiceGroups: values.choiceGroups.map((group) => ({
            name: group.name.trim(),
            minSelections: Number(group.minSelections),
            maxSelections: Number(group.maxSelections),
            options: group.options.map((option) => ({ productId: option.productId, maxQuantity: Number(option.maxQuantity), priceAdjustment: Number(option.priceAdjustment) })),
        })),
    });

    return <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
        <DialogTrigger render={trigger ?? <Button variant={isEdit ? "outline" : "default"} className="rounded-full"><ActionIcon className="size-4" />{isEdit ? "Edit Combo" : "Add Combo"}</Button>} />
        <DialogContent className="w-[calc(100vw-2rem)] !max-w-[calc(100vw-2rem)] lg:!max-w-[50vw] max-h-[90dvh] overflow-x-hidden overflow-y-auto">
            <DialogHeader
                icon={<Boxes className="size-5" />}
                title={isEdit ? "Edit Combo" : "Create Combo"}
            />
            {isLoadingDetails ? (
                <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                    Loading Combo details...
                </div>
            ) : detailsLoadFailed ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm text-muted-foreground">Unable to load this Combo details.</p>
                    <Button type="button" variant="outline" onClick={() => detailsQuery.refetch()}>Try again</Button>
                </div>
            ) : <form className="min-w-0 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field className="min-w-0"><FieldLabel required>Category</FieldLabel><FieldContent><ReactSelect options={categoryOptions} value={categoryOptions.find((item) => item.value === form.watch("categoryId")) ?? null} onChange={(item) => form.setValue("categoryId", item?.value ?? "", { shouldValidate: true })} placeholder="Select category" /></FieldContent><FieldError errors={[form.formState.errors.categoryId]} /></Field>
                    <Field className="min-w-0"><FieldLabel required>Combo name</FieldLabel><FieldContent><Input {...form.register("name")} placeholder="Burger Combo" /><FieldError errors={[form.formState.errors.name]} /></FieldContent></Field>
                    <Field className="min-w-0"><FieldLabel required>Base price</FieldLabel><FieldContent><Input type="number" min="0" step="0.01" {...form.register("price")} /><FieldError errors={[form.formState.errors.price]} /></FieldContent></Field>
                    <Field className="min-w-0"><FieldLabel>Discount</FieldLabel><FieldContent><Input type="number" min="0" step="0.01" {...form.register("discount")} /><FieldError errors={[form.formState.errors.discount]} /></FieldContent></Field>
                </div>
                {isEdit && <Field className="min-w-0"><FieldLabel>Status</FieldLabel><FieldContent><ReactSelect options={statusOptions} value={statusOptions.find((item) => item.value === form.watch("status")) ?? null} onChange={(item) => form.setValue("status", item?.value ?? "active")} /></FieldContent></Field>}
                <div className="space-y-3">
                    <div className="flex items-center justify-between"><div><p className="font-medium">Choice groups</p><p className="text-xs text-muted-foreground">Example: Choose 1 burger, then choose up to 2 drinks.</p></div><Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", minSelections: 1, maxSelections: 1, options: [] })}><Plus className="size-3.5" />Add group</Button></div>
                    {fields.map((field, groupIndex) => {
                        const group = watchedGroups[groupIndex];
                        return <div key={field.id} className="min-w-0 space-y-3 rounded-xl border border-border/60 p-3">
                            <div className="grid min-w-0 grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] md:items-end">
                                <Field className="col-span-2 min-w-0 md:col-span-1"><FieldLabel>Group name</FieldLabel><FieldContent><Input {...form.register(`choiceGroups.${groupIndex}.name`)} placeholder="e.g. Drinks, sides, or toppings" /></FieldContent></Field>
                                <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 md:contents">
                                    <Field className="min-w-0"><FieldLabel>Minimum</FieldLabel><FieldContent><Input type="number" min="0" {...form.register(`choiceGroups.${groupIndex}.minSelections`)} /></FieldContent></Field>
                                    <Field className="min-w-0"><FieldLabel>Maximum</FieldLabel><FieldContent><Input type="number" min="0" {...form.register(`choiceGroups.${groupIndex}.maxSelections`)} /></FieldContent></Field>
                                    <Button type="button" variant="ghost" size="icon" className="self-end" disabled={fields.length === 1} onClick={() => remove(groupIndex)} aria-label="Remove group"><Trash2 className="size-4" /></Button>
                                </div>
                            </div>
                            <div className="min-w-0 space-y-3 pl-2">
                                <Field className="min-w-0">
                                    <FieldLabel className="w-full items-center justify-between">
                                        <span>Products</span>
                                        <span className="text-xs font-normal text-muted-foreground">{group?.options?.length ?? 0} selected</span>
                                    </FieldLabel>
                                    <FieldContent>
                                        <ComboProductPickerDialog
                                            categories={categories}
                                            products={optionProducts}
                                            values={(group?.options ?? []).map((option) => option.productId).filter(Boolean)}
                                            onChange={(productIds) => updateGroupProducts(groupIndex, productIds)}
                                        />
                                        <FieldError errors={[form.formState.errors.choiceGroups?.[groupIndex]?.options]} />
                                    </FieldContent>
                                </Field>
                                {(group?.options?.length ?? 0) === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                                        Select one or more products above to add them to this group.
                                    </div>
                                ) : (
                                    <div className="min-w-0 space-y-2">
                                        <div className="hidden min-w-0 grid-cols-[minmax(0,1fr)_7rem_8rem_auto] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                                            <span>Product</span>
                                            <span>Max qty</span>
                                            <span>Price +/-</span>
                                            <span className="sr-only">Remove</span>
                                        </div>
                                        {group?.options?.map((option, optionIndex) => {
                                        const selectedProduct = optionProducts.find((item) => item.id === option.productId);
                                        return <div key={`${field.id}-${option.productId}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 md:grid-cols-[minmax(0,1fr)_7rem_8rem_auto] md:items-end">
                                            <div className="col-span-3 min-w-0 space-y-1 md:col-span-1">
                                                <p className="text-sm font-medium leading-none md:sr-only">Product</p>
                                                <div className="flex h-9 min-w-0 items-center rounded-lg border border-border/60 bg-muted/20 px-3 text-sm">
                                                    <span className="truncate">{selectedProduct?.name ?? "Select a product"}</span>
                                                </div>
                                            </div>
                                            <Field className="min-w-0"><FieldLabel className="md:sr-only">Max qty</FieldLabel><FieldContent><Input type="number" min="1" {...form.register(`choiceGroups.${groupIndex}.options.${optionIndex}.maxQuantity`)} /></FieldContent></Field>
                                            <Field className="min-w-0"><FieldLabel className="md:sr-only">Price + / -</FieldLabel><FieldContent><Input type="number" step="0.01" {...form.register(`choiceGroups.${groupIndex}.options.${optionIndex}.priceAdjustment`)} /></FieldContent></Field>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="self-end md:mb-0"
                                                aria-label={`Remove ${selectedProduct?.name ?? "product"} from group`}
                                                onClick={() => updateGroupProducts(
                                                    groupIndex,
                                                    group.options
                                                        .filter((currentOption) => currentOption.productId !== option.productId)
                                                        .map((currentOption) => currentOption.productId),
                                                )}
                                            >
                                                <X className="size-4" />
                                            </Button>
                                        </div>;
                                        })}
                                    </div>
                                )}
                            </div>
                            <FieldError errors={[form.formState.errors.choiceGroups?.[groupIndex]?.options, form.formState.errors.choiceGroups?.[groupIndex]?.maxSelections]} />
                        </div>;
                    })}
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={mutation.isPending || optionProducts.length === 0}>{mutation.isPending ? "Saving..." : isEdit ? "Save Combo" : "Create Combo"}</Button></DialogFooter>
            </form>}
        </DialogContent>
    </Dialog>;
};

export default UpsertComboProductDialog;
