import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createProduct, getSignedURLForUpload, updateProduct, uploadFileToSignedURL } from "@repo/services";
import {
    CreateProductSchema,
    ProductStatusSchema,
    type CategoryDTO,
    type CreateProductJSON,
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
import { Plus, UploadCloud, Pencil, ImageOff, Package2 } from "lucide-react";
import { toast } from "sonner";

import { catalogKeys } from "@/lib/query-keys";
import { safeRandomUUID } from "@/lib/uuid";

type UpsertProductDialogProps = {
    organizationId: string;
    categories: CategoryDTO[];
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

const UpsertProductFormSchema = CreateProductSchema.extend({
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

type UpsertProductFormInput = z.input<typeof UpsertProductFormSchema>;

const defaultValues: UpsertProductFormInput = {
    categoryId: "",
    name: "",
    price: "",
    discount: "",
    imagePath: "",
    status: "active",
};

const PREDEFINED_ICONS = [
    "🍔", "🌭", "🥪", "🌯", "🌮", "🥞", "🍳", "🍗", "🥩", "🥓", "🍕", "🍟",
    "🍜", "🍣", "🥗", "🍲", "🍿", "🍩", "🍰", "🧁", "🍦", "🍪", "🍫", "🍬",
    "🥤", "🧋", "☕", "🍵", "🍺", "🍷", "🍹", "🍎", "🍌", "🍓", "🍉", "🍇",
    "🍍", "🍋", "🍊", "🥑", "🥦", "🥕", "🧀", "🥚", "🍞", "🥐", "🥨", "🧅",
    "🛍️", "📦", "🏷️", "🎟️", "💳", "📱", "💻", "🎮", "🔌", "🔋", "💡", "🔑"
];

const statusSelectOptions = ProductStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const getFileExtension = (fileName: string) => {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts.at(-1)?.toLowerCase() ?? "bin" : "bin";
};

const createProductImagePath = (organizationId: string, file: File) => {
    const extension = getFileExtension(file.name);
    return `organizations/${organizationId}/products/${safeRandomUUID()}.${extension}`;
};

const UpsertProductDialog = ({
    organizationId,
    categories,
    product,
    defaultCategoryId,
    trigger,
}: UpsertProductDialogProps) => {
    const [open, setOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
    const [imageType, setImageType] = useState<"icon" | "upload">("icon");
    const [selectedIcon, setSelectedIcon] = useState<string>("🍔");
    
    const queryClient = useQueryClient();
    const isEditMode = Boolean(product);

    const form = useForm<UpsertProductFormInput, unknown, CreateProductJSON>({
        resolver: zodResolver(UpsertProductFormSchema),
        defaultValues,
    });

    const resolveDefaultCategoryId = () => {
        if (defaultCategoryId && categories.some((category) => category.id === defaultCategoryId)) {
            return defaultCategoryId;
        }

        return categories[0]?.id ?? "";
    };

    useEffect(() => {
        if (open) {
            if (product) {
                const hasIcon = product.imagePath?.startsWith("icon:");
                setImageType(hasIcon ? "icon" : product.imagePath ? "upload" : "icon");
                setSelectedIcon(hasIcon ? product.imagePath.replace("icon:", "") : "🍔");
            } else {
                setImageType("icon");
                setSelectedIcon("🍔");
                form.reset({
                    ...defaultValues,
                    categoryId: resolveDefaultCategoryId(),
                });
            }
        } else {
            form.reset(
                product
                    ? {
                        categoryId: product.categoryId,
                        name: product.name,
                        price: String(product.price),
                        discount: product.discount ? String(product.discount) : "",
                        imagePath: product.imagePath ?? "",
                        status: product.status,
                    }
                    : {
                        ...defaultValues,
                        categoryId: resolveDefaultCategoryId(),
                    },
            );
            setSelectedFile(null);
            setRemoveCurrentImage(false);
        }
    }, [categories, defaultCategoryId, form, open, product]);

    const categoryOptions = useMemo(
        () => categories.map((category) => ({ label: category.name, value: category.id })),
        [categories],
    );

    const selectedFilePreview = useMemo(() => {
        if (!selectedFile) {
            return null;
        }

        return URL.createObjectURL(selectedFile);
    }, [selectedFile]);

    useEffect(() => {
        return () => {
            if (selectedFilePreview) {
                URL.revokeObjectURL(selectedFilePreview);
            }
        };
    }, [selectedFilePreview]);

    const mutation = useMutation({
        mutationFn: async (data: CreateProductJSON) => {
            let nextImagePath = "";

            if (imageType === "icon") {
                nextImagePath = `icon:${selectedIcon}`;
            } else if (imageType === "upload") {
                if (selectedFile) {
                    nextImagePath = createProductImagePath(organizationId, selectedFile);
                    const signedUploadResponse = await getSignedURLForUpload({ path: nextImagePath });

                    if (signedUploadResponse.status !== "success" || !signedUploadResponse.data) {
                        throw new Error(signedUploadResponse.message || "Failed to prepare image upload");
                    }

                    await uploadFileToSignedURL(signedUploadResponse.data, selectedFile);
                } else if (product?.imagePath && !product.imagePath.startsWith("icon:") && !removeCurrentImage) {
                    nextImagePath = product.imagePath;
                }
            }

            const payload: CreateProductJSON = {
                categoryId: data.categoryId,
                name: data.name.trim(),
                price: Number(data.price),
                discount: Number(data.discount ?? 0),
                imagePath: nextImagePath,
                status: (data.status ?? "active") as ProductStatus,
            };

            return product
                ? updateProduct(organizationId, product.id, payload)
                : createProduct(organizationId, payload);
        },
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: catalogKeys.categories(organizationId) });
                queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? `Failed to ${isEditMode ? "update" : "create"} product`);
        },
    });

    const onSubmit: SubmitHandler<CreateProductJSON> = (values) => {
        mutation.mutate(values);
    };

    const hasCategories = categories.length > 0;
    const imagePreview = removeCurrentImage ? null : selectedFilePreview ?? product?.imageSignedUrl ?? null;

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full" disabled={!hasCategories}>
                            {isEditMode ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
                            {isEditMode ? "Edit product" : "Add product"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Package2 className="size-5" />
                    </div>
                    <DialogTitle className="text-center text-lg font-semibold">
                        {isEditMode ? "Edit product" : "Create product"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {hasCategories
                            ? "Set the product details — name, category, pricing, and icon."
                            : "Create a category first so products have somewhere to live."}
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    {/* Row 1: Category + Name */}
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
                        <FieldLabel required>Product name</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" placeholder="" {...form.register("name")} />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    {/* Row 2: Price + Discount side by side */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={form.control}
                            name="price"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Price (₹)</FieldLabel>
                                    <FieldContent>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="h-11 rounded-xl"
                                            placeholder=""
                                            value={field.value}
                                            onChange={(event) => field.onChange(sanitizeDecimalInput(event.target.value))}
                                            onBlur={field.onBlur}
                                        />
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />

                        <Controller
                            control={form.control}
                            name="discount"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>Discount (₹) <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                                    <FieldContent>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="h-11 rounded-xl"
                                            placeholder=""
                                            value={field.value ?? ""}
                                            onChange={(event) => field.onChange(sanitizeDecimalInput(event.target.value))}
                                            onBlur={field.onBlur}
                                        />
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />
                    </div>

                    {/* Status — edit only; new items are always active */}
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

                    {/* Row 4: Visual representation selector (emoji grid or custom upload) */}
                    <div className="space-y-3.5">
                        <FieldLabel>Product visual representation</FieldLabel>
                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-1">
                            <button
                                type="button"
                                onClick={() => setImageType("icon")}
                                className={`rounded-lg py-1.5 text-sm font-semibold transition-all cursor-pointer ${
                                    imageType === "icon"
                                        ? "bg-card text-foreground shadow-sm font-bold"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Predefined Icon
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageType("upload")}
                                className={`rounded-lg py-1.5 text-sm font-semibold transition-all cursor-pointer ${
                                    imageType === "upload"
                                        ? "bg-card text-foreground shadow-sm font-bold"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Custom Photo
                            </button>
                        </div>

                        {imageType === "icon" ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-center p-4 bg-muted/20 border border-dashed border-border/60 rounded-xl">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-5xl select-none select-none-emoji shadow-inner">
                                        {selectedIcon || "🍔"}
                                    </div>
                                </div>
                                <div className="max-h-[140px] overflow-y-auto rounded-xl border border-border/50 bg-background/50 p-3">
                                    <div className="grid grid-cols-8 gap-2">
                                        {PREDEFINED_ICONS.map((icon) => (
                                            <button
                                                key={icon}
                                                type="button"
                                                onClick={() => setSelectedIcon(icon)}
                                                className={`flex h-9 w-9 items-center justify-center rounded-lg text-2xl transition-all cursor-pointer select-none-emoji select-none hover:bg-primary/10 ${
                                                    selectedIcon === icon
                                                        ? "bg-primary/20 ring-2 ring-primary ring-offset-1"
                                                        : "hover:scale-110"
                                                }`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/30 p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
                                    <UploadCloud className="size-5 text-primary" />
                                    <p className="mt-2 text-sm font-medium text-foreground">
                                        {selectedFile ? selectedFile.name : "Click to upload image"}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        JPG, PNG, or WebP
                                    </p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0] ?? null;
                                            setSelectedFile(file);
                                            if (file) {
                                                setRemoveCurrentImage(false);
                                            }
                                        }}
                                    />
                                </label>

                                {imagePreview ? (
                                    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80 relative group/preview">
                                        <img src={imagePreview} alt="Product preview" className="h-36 w-full object-cover" />
                                        {product?.imagePath && !product.imagePath.startsWith("icon:") && !selectedFile && (
                                            <label className="absolute bottom-2 right-2 flex items-center gap-2 rounded-lg bg-background/95 backdrop-blur-sm border border-border/60 px-3 py-1.5 text-xs text-muted-foreground shadow-sm cursor-pointer hover:text-foreground">
                                                <input
                                                    type="checkbox"
                                                    checked={removeCurrentImage}
                                                    onChange={(event) => setRemoveCurrentImage(event.target.checked)}
                                                    className="rounded border-border text-primary focus:ring-primary mr-1.5"
                                                />
                                                Remove current image
                                            </label>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                                        <ImageOff className="size-4 shrink-0" />
                                        No custom photo selected
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={mutation.isPending || !hasCategories}
                        >
                            {mutation.isPending
                                ? isEditMode ? "Saving..." : "Creating..."
                                : isEditMode ? "Save changes" : "Create product"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertProductDialog;
