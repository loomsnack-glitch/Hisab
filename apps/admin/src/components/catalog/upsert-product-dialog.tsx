import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import {
  createProduct,
  generateInternalProductCode,
  getOrganizationCatalogSettings,
  getSignedURLForUpload,
  getUnits,
  updateProduct,
  updateProductLabelProfile,
  uploadFileToSignedURL,
  reuseInternalProductCode,
} from "@repo/services";
import {
  CreateProductObjectSchema,
  PIECE_PREDEFINED_UNIT_KEY,
  ProductStatusSchema,
  canAssignUnitToCatalogProduct,
  defaultSellingQuantitySchema,
  formatSoldAmount,
  normalizeProductCodeInput,
  type CategoryDTO,
  type CreateProductJSON,
  type NutritionRow,
  type ProductResponseDTO,
  type ProductStatus,
  type UnitDTO,
} from "@repo/types";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import {
  compressCatalogImage,
  formatCatalogImageSize,
} from "@repo/ui/lib/compress-catalog-image";
import { Plus, UploadCloud, Pencil, ImageOff, Package2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { catalogKeys, organizationKeys, unitKeys } from "@/lib/query-keys";
import { safeRandomUUID } from "@/lib/uuid";

type UpsertProductDialogProps = {
  organizationId: string;
  categories: CategoryDTO[];
  product?: ProductResponseDTO;
  defaultCategoryId?: string;
  trigger?: React.ReactElement;
};

const decimalAmountPattern = /^\d+(\.\d*)?$/;
const twoDecimalAmountPattern = /^\d+(\.\d{0,2})?$/;

const sanitizeDecimalInput = (value: string) => {
  const digitsAndDot = value.replace(/[^\d.]/g, "");
  const dotIndex = digitsAndDot.indexOf(".");

  if (dotIndex === -1) {
    return digitsAndDot;
  }

  return (
    digitsAndDot.slice(0, dotIndex + 1) +
    digitsAndDot.slice(dotIndex + 1).replace(/\./g, "")
  );
};

const sanitizeTwoDecimalInput = (value: string) => {
  const digitsAndDot = value.replace(/[^\d.]/g, "");
  const dotIndex = digitsAndDot.indexOf(".");

  if (dotIndex === -1) {
    return digitsAndDot;
  }

  return (
    digitsAndDot.slice(0, dotIndex + 1) +
    digitsAndDot.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2)
  );
};

const UpsertProductFormSchema = CreateProductObjectSchema.extend({
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
  unitId: z.uuid("Select a Unit"),
  defaultSellingQuantity: z
    .string()
    .refine((value) => value.length > 0, "Default Selling Quantity is required")
    .refine(
      (value) => twoDecimalAmountPattern.test(value),
      "Use at most two decimal places",
    )
    .transform((value) => Number(value))
    .pipe(defaultSellingQuantitySchema),
  productCode: z
    .preprocess(
      (value) =>
        typeof value === "string" ? normalizeProductCodeInput(value) : value,
      z.string().max(128, "Product code must be at most 128 characters"),
    )
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
  productCode: "",
  unitId: "",
  defaultSellingQuantity: "1",
};

const productFormValues = (product: ProductResponseDTO): UpsertProductFormInput => ({
  categoryId: product.categoryId,
  name: product.name,
  price: String(product.price),
  discount: product.discount ? String(product.discount) : "",
  imagePath: product.imagePath ?? "",
  status: product.status,
  productCode: product.productCode ?? "",
  unitId: product.unitId,
  defaultSellingQuantity: formatSoldAmount(Number(product.defaultSellingQuantity)),
});

const statusSelectOptions = ProductStatusSchema.options.map((status) => ({
  label: status.charAt(0).toUpperCase() + status.slice(1),
  value: status,
}));

const productCodeKindLabel = (kind: ProductResponseDTO["productCodeKind"]) => {
  if (kind === "manufacturer") {
    return "Manufacturer code";
  }
  if (kind === "internal_rcn") {
    return "Store-only code";
  }
  return null;
};

const getFileExtension = (fileName: string) => {
  const parts = fileName.split(".");
  return parts.length > 1 ? (parts.at(-1)?.toLowerCase() ?? "bin") : "bin";
};

const createProductImagePath = (organizationId: string, file: File) => {
  const extension = getFileExtension(file.name);
  return `organizations/${organizationId}/products/${safeRandomUUID()}.${extension}`;
};

const emptyLabelProfileForm = {
  ingredients: "",
  netWeight: "",
  unitSellingPriceText: "",
  mrp: "",
  shelfLifeDays: "",
  nutrition: [] as NutritionRow[],
};

const normalizeNutritionRows = (value: unknown): NutritionRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (row): row is NutritionRow =>
      row != null &&
      typeof row === "object" &&
      typeof row.name === "string" &&
      typeof row.quantity === "string" &&
      typeof row.unit === "string",
  );
};

const isNutritionRowComplete = (row: NutritionRow) =>
  row.name.trim().length > 0 &&
  row.quantity.trim().length > 0 &&
  row.unit.trim().length > 0;

const UpsertProductDialog = ({
  organizationId,
  categories,
  product,
  defaultCategoryId,
  trigger,
}: UpsertProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const imageCompressionRequestRef = useRef(0);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const [codeChangeConfirmationOpen, setCodeChangeConfirmationOpen] =
    useState(false);
  const [pendingPayload, setPendingPayload] =
    useState<CreateProductJSON | null>(null);
  const [reuseCodeConfirmationOpen, setReuseCodeConfirmationOpen] =
    useState(false);
  const [releasedInternalCode, setReleasedInternalCode] = useState("");
  const [labelProfileForm, setLabelProfileForm] = useState(emptyLabelProfileForm);

  const queryClient = useQueryClient();
  const catalogSettingsQuery = useQuery({
    queryKey: organizationKeys.catalogSettings(organizationId),
    queryFn: () => getOrganizationCatalogSettings(organizationId),
    enabled: Boolean(organizationId),
  });
  const unitsQuery = useQuery({
    queryKey: unitKeys.list(organizationId),
    queryFn: () => getUnits(organizationId),
    enabled: Boolean(organizationId),
  });
  const units: UnitDTO[] = useMemo(
    () =>
      unitsQuery.data?.status === "success"
        ? (unitsQuery.data.data?.units ?? [])
        : [],
    [unitsQuery.data],
  );
  const pieceUnitId =
    units.find((unit) => unit.predefinedKey === PIECE_PREDEFINED_UNIT_KEY)?.id ??
    "";
  const isEditMode = Boolean(product);
  const barcodeScanningEnabled =
    catalogSettingsQuery.data?.status === "success" &&
    catalogSettingsQuery.data.data?.settings.barcodeScanningEnabled === true;

  const form = useForm<UpsertProductFormInput, unknown, CreateProductJSON>({
    resolver: zodResolver(UpsertProductFormSchema),
    defaultValues,
  });

  const watchedProductCode = String(form.watch("productCode") ?? "");
  const existingProductCode = product?.productCode ?? null;
  const codeKindLabel = productCodeKindLabel(product?.productCodeKind ?? null);

  const resolveDefaultCategoryId = () => {
    if (
      defaultCategoryId &&
      categories.some((category) => category.id === defaultCategoryId)
    ) {
      return defaultCategoryId;
    }

    return categories[0]?.id ?? "";
  };

  useEffect(() => {
    if (open) {
      if (product) {
        form.reset(productFormValues(product));
        setLabelProfileForm({
          ingredients: product.labelProfile?.ingredients ?? "",
          netWeight: product.labelProfile?.netWeight ?? "",
          unitSellingPriceText: product.labelProfile?.unitSellingPriceText ?? "",
          mrp:
            product.labelProfile?.mrp != null
              ? String(product.labelProfile.mrp)
              : "",
          shelfLifeDays:
            product.labelProfile?.shelfLifeDays != null
              ? String(product.labelProfile.shelfLifeDays)
              : "",
          nutrition: normalizeNutritionRows(product.labelProfile?.nutrition),
        });
      } else {
        form.reset({
          ...defaultValues,
          categoryId: resolveDefaultCategoryId(),
          unitId: pieceUnitId,
        });
        setLabelProfileForm(emptyLabelProfileForm);
      }
    } else {
      form.reset(
        product
          ? productFormValues(product)
          : {
              ...defaultValues,
              categoryId: resolveDefaultCategoryId(),
              unitId: pieceUnitId,
            },
      );
      setSelectedFile(null);
      setIsCompressingImage(false);
      imageCompressionRequestRef.current += 1;
      setRemoveCurrentImage(false);
      setPendingPayload(null);
      setCodeChangeConfirmationOpen(false);
      setReuseCodeConfirmationOpen(false);
      setReleasedInternalCode("");
      setLabelProfileForm(emptyLabelProfileForm);
    }
  }, [categories, defaultCategoryId, form, open, pieceUnitId, product]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.name,
        value: category.id,
      })),
    [categories],
  );

  const unitOptions = useMemo(
    () =>
      units
        .filter((unit) =>
          canAssignUnitToCatalogProduct({
            unitStatus: unit.status,
            currentlyAssigned: unit.id === product?.unitId,
          }),
        )
        .map((unit) => ({
          label:
            unit.status === "inactive"
              ? `${unit.name} (${unit.label}, inactive)`
              : `${unit.name} (${unit.label})`,
          value: unit.id,
        })),
    [product?.unitId, units],
  );

  const watchedUnitId = form.watch("unitId");
  const watchedDefaultSellingQuantity = form.watch("defaultSellingQuantity");
  const selectedUnitLabel = units.find((unit) => unit.id === watchedUnitId)
    ?.label;
  const sellingQuantityNumber = Number(watchedDefaultSellingQuantity);
  const priceFieldLabel =
    selectedUnitLabel &&
    Number.isFinite(sellingQuantityNumber) &&
    sellingQuantityNumber > 0
      ? `Price for ${formatSoldAmount(sellingQuantityNumber)}${selectedUnitLabel} (₹)`
      : "Price for this quantity (₹)";

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

  const buildLabelProfilePayload = () => {
    const nutrition = normalizeNutritionRows(labelProfileForm.nutrition)
      .map((row) => ({
        name: row.name.trim(),
        quantity: row.quantity.trim(),
        unit: row.unit.trim(),
      }))
      .filter(isNutritionRowComplete);

    return {
      ingredients: labelProfileForm.ingredients,
      netWeight: labelProfileForm.netWeight,
      unitSellingPriceText: labelProfileForm.unitSellingPriceText,
      mrp: labelProfileForm.mrp.trim() ? Number(labelProfileForm.mrp) : null,
      shelfLifeDays: labelProfileForm.shelfLifeDays.trim() ? Number(labelProfileForm.shelfLifeDays) : null,
      nutrition: nutrition.length > 0 ? nutrition : null,
    };
  };

  const validateLabelProfileForm = () => {
    const incompleteNutritionRow = normalizeNutritionRows(
      labelProfileForm.nutrition,
    ).some((row) => !isNutritionRowComplete(row));

    if (incompleteNutritionRow) {
      toast.error(
        "Each nutrition row needs a name, quantity, and unit before saving.",
      );
      return false;
    }

    return true;
  };

  const saveLabelProfileIfNeeded = async (productId: string) => {
    if (!barcodeScanningEnabled) {
      return;
    }

    const hasProfileInput =
      labelProfileForm.ingredients.trim().length > 0 ||
      labelProfileForm.netWeight.trim().length > 0 ||
      labelProfileForm.unitSellingPriceText.trim().length > 0 ||
      labelProfileForm.mrp.trim().length > 0 ||
      labelProfileForm.shelfLifeDays.trim().length > 0 ||
      normalizeNutritionRows(labelProfileForm.nutrition).some(
        isNutritionRowComplete,
      ) ||
      Boolean(product?.labelProfile);

    if (!hasProfileInput) {
      return;
    }

    const profileResponse = await updateProductLabelProfile(
      organizationId,
      productId,
      buildLabelProfilePayload(),
    );

    if (profileResponse.status !== "success") {
      throw new Error(
        profileResponse.message || "Failed to save Product Label Profile",
      );
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: CreateProductJSON) => {
      let nextImagePath = "";

      if (selectedFile) {
        nextImagePath = createProductImagePath(organizationId, selectedFile);
        const signedUploadResponse = await getSignedURLForUpload({
          path: nextImagePath,
        });

        if (
          signedUploadResponse.status !== "success" ||
          !signedUploadResponse.data
        ) {
          throw new Error(
            signedUploadResponse.message || "Failed to prepare image upload",
          );
        }

        await uploadFileToSignedURL(signedUploadResponse.data, selectedFile);
      } else if (product?.imagePath && !removeCurrentImage) {
        nextImagePath = product.imagePath;
      }

      const nextProductCode = barcodeScanningEnabled
        ? typeof data.productCode === "string" && data.productCode.length > 0
          ? data.productCode
          : null
        : (product?.productCode ?? null);

      const nextProductCodeKind = (() => {
        if (!nextProductCode) {
          return null;
        }
        if (
          product?.productCode === nextProductCode &&
          product.productCodeKind
        ) {
          return product.productCodeKind;
        }
        return "manufacturer" as const;
      })();

      const payload: CreateProductJSON = {
        categoryId: data.categoryId,
        name: data.name.trim(),
        price: Number(data.price),
        discount: Number(data.discount ?? 0),
        imagePath: nextImagePath,
        status: (data.status ?? "active") as ProductStatus,
        productCode: nextProductCode,
        productCodeKind: nextProductCodeKind,
        unitId: data.unitId,
        defaultSellingQuantity: Number(data.defaultSellingQuantity),
      };

      const response = product
        ? await updateProduct(organizationId, product.id, payload)
        : await createProduct(organizationId, payload);

      if (response.status !== "success" || !response.data?.product.id) {
        return response;
      }

      await saveLabelProfileIfNeeded(response.data.product.id);
      return response;
    },
    onSuccess: (response) => {
      if (response.status === "success") {
        toast.success(response.message);
        queryClient.invalidateQueries({
          queryKey: catalogKeys.categories(organizationId),
        });
        queryClient.invalidateQueries({
          queryKey: catalogKeys.products(organizationId),
        });
        setCodeChangeConfirmationOpen(false);
        setPendingPayload(null);
        setOpen(false);
        return;
      }

      toast.error(response.message);
    },
    onError: (error: { message?: string }) => {
      toast.error(
        error.message ??
          `Failed to ${isEditMode ? "update" : "create"} product`,
      );
    },
  });

  const internalCodeMutation = useMutation({
    mutationFn: async (
      action: { type: "generate" } | { type: "reuse"; productCode: string },
    ) => {
      if (!product) {
        throw new Error(
          "Save the product before managing an Internal Product Code",
        );
      }

      return action.type === "generate"
        ? generateInternalProductCode(organizationId, product.id)
        : reuseInternalProductCode(
            organizationId,
            product.id,
            action.productCode,
          );
    },
    onSuccess: (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);
      queryClient.invalidateQueries({
        queryKey: catalogKeys.products(organizationId),
      });
      setReuseCodeConfirmationOpen(false);
      setReleasedInternalCode("");
      setOpen(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to manage Internal Product Code");
    },
  });

  const requiresCodeChangeWarning = (nextCode: string | null | undefined) => {
    if (!existingProductCode) {
      return false;
    }

    const normalizedNext =
      nextCode && nextCode.length > 0
        ? normalizeProductCodeInput(nextCode)
        : null;
    return normalizedNext !== existingProductCode;
  };

  const onSubmit: SubmitHandler<CreateProductJSON> = (values) => {
    if (barcodeScanningEnabled && !validateLabelProfileForm()) {
      return;
    }

    const nextCode =
      typeof values.productCode === "string" && values.productCode.length > 0
        ? values.productCode
        : null;

    if (requiresCodeChangeWarning(nextCode)) {
      setPendingPayload(values);
      setCodeChangeConfirmationOpen(true);
      return;
    }

    mutation.mutate(values);
  };

  const confirmCodeChange = () => {
    if (!pendingPayload) {
      return;
    }

    mutation.mutate(pendingPayload);
  };

  const hasCategories = categories.length > 0;
  const imagePreview = removeCurrentImage
    ? null
    : (selectedFilePreview ?? product?.imageSignedUrl ?? null);
  const isClearingCode =
    Boolean(existingProductCode) && watchedProductCode.length === 0;
  const canManageInternalCode =
    isEditMode &&
    product?.productType === "single" &&
    !existingProductCode &&
    barcodeScanningEnabled;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
        <DialogTrigger
          render={
            trigger ?? (
              <Button
                variant={isEditMode ? "outline" : "default"}
                className="rounded-full"
                disabled={!hasCategories}
              >
                {isEditMode ? (
                  <Pencil className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {isEditMode ? "Edit product" : "Add product"}
              </Button>
            )
          }
        />
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader
            className="shrink-0 px-4 pt-4"
            icon={<Package2 className="size-5" />}
            title={isEditMode ? "Edit product" : "Create product"}
          />

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pt-2">
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel required>Category</FieldLabel>
                  <FieldContent>
                    <ReactSelect
                      options={categoryOptions}
                      value={
                        categoryOptions.find(
                          (option) => option.value === field.value,
                        ) ?? null
                      }
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
                <Input
                  className="h-11 rounded-xl"
                  placeholder=""
                  {...form.register("name")}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </FieldContent>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="unitId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel required>Unit</FieldLabel>
                    <FieldContent>
                      <ReactSelect
                        options={unitOptions}
                        placeholder="Select an active Unit"
                        value={
                          unitOptions.find(
                            (option) => option.value === field.value,
                          ) ?? null
                        }
                        onChange={(option) =>
                          field.onChange(option?.value ?? "")
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

              <Controller
                control={form.control}
                name="defaultSellingQuantity"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel required>Default selling quantity</FieldLabel>
                    <FieldContent>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-11 rounded-xl"
                        placeholder="1"
                        value={field.value}
                        onChange={(event) =>
                          field.onChange(
                            sanitizeTwoDecimalInput(event.target.value),
                          )
                        }
                        onBlur={field.onBlur}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </FieldContent>
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="price"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel required>{priceFieldLabel}</FieldLabel>
                    <FieldContent>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-11 rounded-xl"
                        placeholder=""
                        value={field.value}
                        onChange={(event) =>
                          field.onChange(
                            sanitizeDecimalInput(event.target.value),
                          )
                        }
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
                    <FieldLabel>
                      Discount (₹){" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-11 rounded-xl"
                        placeholder=""
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            sanitizeDecimalInput(event.target.value),
                          )
                        }
                        onBlur={field.onBlur}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </FieldContent>
                  </Field>
                )}
              />
            </div>

            {barcodeScanningEnabled ? (
              <Field data-invalid={!!form.formState.errors.productCode}>
                <FieldLabel>
                  Product code{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    className="h-11 rounded-xl font-mono"
                    placeholder="Scan or type manufacturer code"
                    autoComplete="off"
                    {...form.register("productCode")}
                  />
                  {codeKindLabel && existingProductCode ? (
                    <p className="text-xs text-muted-foreground">
                      {codeKindLabel}
                    </p>
                  ) : null}
                  <FieldError errors={[form.formState.errors.productCode]} />
                  {canManageInternalCode ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={internalCodeMutation.isPending}
                        onClick={() =>
                          internalCodeMutation.mutate({ type: "generate" })
                        }
                      >
                        Generate store-only code
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={internalCodeMutation.isPending}
                        onClick={() => setReuseCodeConfirmationOpen(true)}
                      >
                        Reuse released code
                      </Button>
                    </div>
                  ) : null}
                  {canManageInternalCode ? (
                    <p className="text-xs text-muted-foreground">
                      Store-only codes are not globally registered identifiers.
                    </p>
                  ) : null}
                </FieldContent>
              </Field>
            ) : null}

            {barcodeScanningEnabled ? (
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                <div>
                  <p className="text-sm font-medium">Product Label Profile</p>
                  <p className="text-xs text-muted-foreground">
                    Optional packaging facts for label templates. On-pack MRP is
                    not used in Billing or Sale Item snapshots.
                  </p>
                </div>
                <label className="block space-y-1.5 text-sm font-medium">
                  Ingredients
                  <textarea
                    className="min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    value={labelProfileForm.ingredients}
                    onChange={(event) =>
                      setLabelProfileForm((current) => ({
                        ...current,
                        ingredients: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm font-medium">
                    Net weight
                    <Input
                      value={labelProfileForm.netWeight}
                      onChange={(event) =>
                        setLabelProfileForm((current) => ({
                          ...current,
                          netWeight: event.target.value,
                        }))
                      }
                      placeholder="e.g. 200 g"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Unit selling price text
                    <Input
                      value={labelProfileForm.unitSellingPriceText}
                      onChange={(event) =>
                        setLabelProfileForm((current) => ({
                          ...current,
                          unitSellingPriceText: event.target.value,
                        }))
                      }
                      placeholder="e.g. ₹10 per piece"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    On-pack MRP
                    <Input
                      value={labelProfileForm.mrp}
                      onChange={(event) =>
                        setLabelProfileForm((current) => ({
                          ...current,
                          mrp: sanitizeDecimalInput(event.target.value),
                        }))
                      }
                      placeholder="Packaging MRP, not Billing price"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Shelf life (days)
                    <Input
                      type="number"
                      min={1}
                      value={labelProfileForm.shelfLifeDays}
                      onChange={(event) =>
                        setLabelProfileForm((current) => ({
                          ...current,
                          shelfLifeDays: event.target.value.replace(/\D/g, ""),
                        }))
                      }
                      placeholder="Whole days"
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Nutrition rows</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setLabelProfileForm((current) => ({
                          ...current,
                          nutrition: [
                            ...normalizeNutritionRows(current.nutrition),
                            { name: "", quantity: "", unit: "" },
                          ],
                        }))
                      }
                    >
                      Add row
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Each row needs name, quantity, and unit (for example Energy,
                    450, kcal).
                  </p>
                  {normalizeNutritionRows(labelProfileForm.nutrition).map((row, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-4">
                      <Input
                        placeholder="Name"
                        value={row.name}
                        onChange={(event) =>
                          setLabelProfileForm((current) => ({
                            ...current,
                            nutrition: normalizeNutritionRows(current.nutrition).map(
                              (entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, name: event.target.value }
                                : entry,
                            ),
                          }))
                        }
                      />
                      <Input
                        placeholder="Quantity"
                        value={row.quantity}
                        onChange={(event) =>
                          setLabelProfileForm((current) => ({
                            ...current,
                            nutrition: normalizeNutritionRows(current.nutrition).map(
                              (entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, quantity: event.target.value }
                                : entry,
                            ),
                          }))
                        }
                      />
                      <Input
                        placeholder="Unit"
                        value={row.unit}
                        onChange={(event) =>
                          setLabelProfileForm((current) => ({
                            ...current,
                            nutrition: normalizeNutritionRows(current.nutrition).map(
                              (entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, unit: event.target.value }
                                : entry,
                            ),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setLabelProfileForm((current) => ({
                            ...current,
                            nutrition: normalizeNutritionRows(current.nutrition).filter(
                              (_, entryIndex) => entryIndex !== index,
                            ),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

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
                            (option) =>
                              option.value === (field.value ?? "active"),
                          ) ?? null
                        }
                        onChange={(option) =>
                          field.onChange(option?.value ?? "active")
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
            )}

            <div className="space-y-2">
              <FieldLabel>Product image</FieldLabel>
              <div className="space-y-3">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/30 p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
                  {isCompressingImage ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <UploadCloud className="size-5 text-primary" />
                  )}
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {isCompressingImage
                      ? "Optimizing image..."
                      : selectedFile
                        ? selectedFile.name
                        : "Click to upload image"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedFile && !isCompressingImage
                      ? `Optimized to ${formatCatalogImageSize(selectedFile.size)} for faster loading`
                      : "JPG, PNG, WebP, or HEIC. We optimize images to 100 KB or less."}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={isCompressingImage}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = "";
                      if (!file) {
                        return;
                      }

                      const requestId = imageCompressionRequestRef.current + 1;
                      imageCompressionRequestRef.current = requestId;
                      setSelectedFile(null);
                      setIsCompressingImage(true);
                      void compressCatalogImage(file)
                        .then((compressed) => {
                          if (imageCompressionRequestRef.current !== requestId) {
                            return;
                          }
                          setSelectedFile(compressed);
                          setRemoveCurrentImage(false);
                        })
                        .catch((error: unknown) => {
                          if (imageCompressionRequestRef.current !== requestId) {
                            return;
                          }
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Could not optimize that image. Try a JPG, PNG, WebP, or HEIC file.",
                          );
                        })
                        .finally(() => {
                          if (imageCompressionRequestRef.current === requestId) {
                            setIsCompressingImage(false);
                          }
                        });
                    }}
                  />
                </label>

                {imagePreview ? (
                  <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80 relative group/preview">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="h-36 w-full object-cover"
                    />
                    {product?.imagePath && !selectedFile && (
                      <label className="absolute bottom-2 right-2 flex items-center gap-2 rounded-lg bg-background/95 backdrop-blur-sm border border-border/60 px-3 py-1.5 text-xs text-muted-foreground shadow-sm cursor-pointer hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={removeCurrentImage}
                          onChange={(event) =>
                            setRemoveCurrentImage(event.target.checked)
                          }
                          className="rounded border-border text-primary focus:ring-primary mr-1.5"
                        />
                        Remove current image
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                    <ImageOff className="size-4 shrink-0" />
                    No image selected
                  </div>
                )}
              </div>
            </div>
            </div>

            <DialogFooter className="mx-0 mb-0 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={
                  mutation.isPending || !hasCategories || isCompressingImage
                }
              >
                {mutation.isPending
                  ? isEditMode
                    ? "Saving..."
                    : "Creating..."
                  : isEditMode
                    ? "Save changes"
                    : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={codeChangeConfirmationOpen}
        onOpenChange={(nextOpen) => {
          setCodeChangeConfirmationOpen(nextOpen);
          if (!nextOpen) {
            setPendingPayload(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isClearingCode
                ? "Clear this Product Code?"
                : "Replace this Product Code?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Existing stock carrying the old Product Code will stop scanning.
              {isClearingCode
                ? " Clear the code anyway?"
                : " Replace the code anyway?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCodeChange}
              disabled={mutation.isPending}
            >
              {isClearingCode ? "Clear code" : "Replace code"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={reuseCodeConfirmationOpen}
        onOpenChange={setReuseCodeConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reuse a released store-only code?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Old labels carrying this code may now identify a different
              product. Enter a released 13-digit Internal Product Code to
              continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            className="font-mono"
            inputMode="numeric"
            maxLength={13}
            placeholder="04XXXXXXXXXXX"
            value={releasedInternalCode}
            onChange={(event) => setReleasedInternalCode(event.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                internalCodeMutation.isPending ||
                releasedInternalCode.length !== 13
              }
              onClick={() =>
                internalCodeMutation.mutate({
                  type: "reuse",
                  productCode: releasedInternalCode,
                })
              }
            >
              Reuse code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UpsertProductDialog;
