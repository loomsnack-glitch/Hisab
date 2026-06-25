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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Plus, UploadCloud, Pencil, ImageOff } from "lucide-react";
import { toast } from "sonner";

import { catalogKeys } from "@/lib/query-keys";

type UpsertProductDialogProps = {
    organizationId: string;
    categories: CategoryDTO[];
    product?: ProductResponseDTO;
    trigger?: React.ReactElement;
};

const defaultValues: CreateProductJSON = {
    categoryId: "",
    name: "",
    price: 0,
    discount: 0,
    imagePath: "",
    status: "active",
};

const statusOptions = ProductStatusSchema.options;

const getFileExtension = (fileName: string) => {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts.at(-1)?.toLowerCase() ?? "bin" : "bin";
};

const createProductImagePath = (organizationId: string, file: File) => {
    const extension = getFileExtension(file.name);
    return `organizations/${organizationId}/products/${crypto.randomUUID()}.${extension}`;
};

const UpsertProductDialog = ({ organizationId, categories, product, trigger }: UpsertProductDialogProps) => {
    const [open, setOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(product);

    const form = useForm<CreateProductJSON>({
        resolver: zodResolver(CreateProductSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!open) {
            form.reset(
                product
                    ? {
                        categoryId: product.categoryId,
                        name: product.name,
                        price: Number(product.price),
                        discount: Number(product.discount),
                        imagePath: product.imagePath ?? "",
                        status: product.status,
                    }
                    : {
                        ...defaultValues,
                        categoryId: categories[0]?.id ?? "",
                    },
            );
            setSelectedFile(null);
            setRemoveCurrentImage(false);
        }
    }, [categories, form, open, product]);

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
            let nextImagePath = product?.imagePath ?? "";

            if (selectedFile) {
                nextImagePath = createProductImagePath(organizationId, selectedFile);
                const signedUploadResponse = await getSignedURLForUpload({ path: nextImagePath });

                if (signedUploadResponse.status !== "success" || !signedUploadResponse.data) {
                    throw new Error(signedUploadResponse.message || "Failed to prepare image upload");
                }

                await uploadFileToSignedURL(signedUploadResponse.data, selectedFile);
            } else if (removeCurrentImage) {
                nextImagePath = "";
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
        <Dialog open={open} onOpenChange={setOpen}>
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
                    <DialogTitle className="text-base font-semibold">
                        {isEditMode ? "Edit product" : "Create product"}
                    </DialogTitle>
                    <DialogDescription>
                        {hasCategories
                            ? "Capture product pricing, category placement, status, and optional image."
                            : "Create a category first so products have somewhere to live."}
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <Controller
                        control={form.control}
                        name="categoryId"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Category</FieldLabel>
                                <FieldContent>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="h-11 w-full rounded-xl px-3">
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Product name</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" placeholder="Orange Juice 1L" {...form.register("name")} />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field data-invalid={!!form.formState.errors.price}>
                            <FieldLabel required>Price</FieldLabel>
                            <FieldContent>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="h-11 rounded-xl"
                                    placeholder="199.00"
                                    {...form.register("price", { valueAsNumber: true })}
                                />
                                <FieldError errors={[form.formState.errors.price]} />
                            </FieldContent>
                        </Field>

                        <Field data-invalid={!!form.formState.errors.discount}>
                            <FieldLabel>Discount</FieldLabel>
                            <FieldContent>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="h-11 rounded-xl"
                                    placeholder="0.00"
                                    {...form.register("discount", { valueAsNumber: true })}
                                />
                                <FieldError errors={[form.formState.errors.discount]} />
                            </FieldContent>
                        </Field>
                    </div>

                    <Controller
                        control={form.control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Status</FieldLabel>
                                <FieldContent>
                                    <Select value={field.value ?? "active"} onValueChange={field.onChange}>
                                        <SelectTrigger className="h-11 w-full rounded-xl px-3">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <Field>
                        <FieldLabel>Product image</FieldLabel>
                        <FieldContent>
                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/40 p-5 text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
                                <UploadCloud className="size-5 text-primary" />
                                <p className="mt-3 text-sm font-medium text-foreground">
                                    {selectedFile ? selectedFile.name : "Choose product image"}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    JPG, PNG, or WebP. Upload is handled directly with a signed URL.
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
                        </FieldContent>
                    </Field>

                    {imagePreview ? (
                        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
                            <img src={imagePreview} alt="Product preview" className="h-44 w-full object-cover" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                            <ImageOff className="size-4 text-muted-foreground" />
                            No image attached yet
                        </div>
                    )}

                    {product?.imagePath ? (
                        <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                            <input
                                type="checkbox"
                                checked={removeCurrentImage}
                                onChange={(event) => setRemoveCurrentImage(event.target.checked)}
                            />
                            Remove the current image when saving
                        </label>
                    ) : null}

                    <DialogFooter className="border-0 bg-transparent p-0 sm:flex-row">
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
