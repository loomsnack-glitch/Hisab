import { z } from "zod";
import { dtoDateSchema } from "../../common";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(255, "Name must be at most 255 characters");

const priceSchema = z
  .number({ error: "Price is required" })
  .min(0, "Price must be 0 or more");

const discountSchema = z
  .number({ error: "Discount is required" })
  .min(0, "Discount must be 0 or more");

const optionalImagePathSchema = z
  .union([
    z.literal(""),
    z.string().trim().max(512, "Image path must be at most 512 characters"),
  ])
  .nullable()
  .optional();

export const CategoryStatusSchema = z.enum(["active", "inactive"]);
export const ProductStatusSchema = z.enum(["active", "inactive"]);
export const ProductTypeSchema = z.enum(["single", "bundle", "combo"]);
export const ProductCodeKindSchema = z.enum(["manufacturer", "internal_rcn"]);
export const AddOnStatusSchema = z.enum(["active", "inactive"]);
export const ProductAddOnAttachmentStatusSchema = z.enum([
  "active",
  "inactive",
]);

/** Remove only scanner transport terminators; Product Code text is otherwise opaque. */
export const normalizeProductCodeInput = (value: string): string =>
  value.replace(/[\r\n]+$/g, "");

/** Opaque Product Code text: no trim, no barcode-shape validation. Max length matches DB. */
const productCodeValueSchema = z.preprocess(
  (value) =>
    typeof value === "string" ? normalizeProductCodeInput(value) : value,
  z.string().max(128, "Product code must be at most 128 characters"),
);

const optionalProductCodeSchema = productCodeValueSchema.nullable().optional();

const productCodeFieldsRefine = <
  T extends {
    productCode?: string | null;
    productCodeKind?: z.infer<typeof ProductCodeKindSchema> | null;
  },
>(
  value: T,
) => {
  const codeProvided = value.productCode !== undefined;
  const kindProvided = value.productCodeKind !== undefined;

  if (!codeProvided && !kindProvided) {
    return true;
  }

  if (!codeProvided && kindProvided) {
    return false;
  }

  const hasCode =
    typeof value.productCode === "string" && value.productCode.length > 0;

  if (!hasCode) {
    return (
      value.productCodeKind === null || value.productCodeKind === undefined
    );
  }

  return true;
};

const productCodeFieldsRefineMessage = {
  message:
    "Product code kind cannot be set without a product code, and must be cleared when the code is cleared",
  path: ["productCodeKind"] as (string | number)[],
};

const selectionCapSchema = z
  .number({ error: "Selection cap is required" })
  .int("Selection cap must be a whole number")
  .min(1, "Selection cap must be at least 1");

const wholeCountQuantitySchema = z
  .number({ error: "Quantity is required" })
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1");

export const CategoryDTOSchema = z.object({
  id: z.uuid("Invalid category id"),
  organizationId: z.uuid("Invalid organization id"),
  name: nameSchema,
  status: CategoryStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

const ProductDTOObjectSchema = z.object({
  id: z.uuid("Invalid product id"),
  organizationId: z.uuid("Invalid organization id"),
  categoryId: z.uuid("Invalid category id"),
  name: nameSchema,
  price: priceSchema,
  discount: discountSchema,
  imagePath: z.string().nullable().optional(),
  productType: ProductTypeSchema,
  productCode: productCodeValueSchema.nullable(),
  productCodeKind: ProductCodeKindSchema.nullable(),
  status: ProductStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

const productCodeAndKindConsistencyRefine = (
  value: z.infer<typeof ProductDTOObjectSchema>,
) =>
  (value.productCode === null && value.productCodeKind === null) ||
  (value.productCode !== null && value.productCodeKind !== null);

const productCodeAndKindConsistencyRefineOptions = {
  message:
    "Product code and product code kind must both be set or both be empty",
  path: ["productCodeKind"],
};

export const ProductDTOSchema = ProductDTOObjectSchema.refine(
  productCodeAndKindConsistencyRefine,
  productCodeAndKindConsistencyRefineOptions,
);

export const ProductResponseDTOSchema = ProductDTOObjectSchema.extend({
  imageSignedUrl: z.string().nullable(),
}).refine(
  productCodeAndKindConsistencyRefine,
  productCodeAndKindConsistencyRefineOptions,
);

export const BundleProductComponentDTOSchema = z.object({
  id: z.uuid("Invalid bundle component id"),
  organizationId: z.uuid("Invalid organization id"),
  bundleProductId: z.uuid("Invalid bundle product id"),
  componentProductId: z.uuid("Invalid component product id"),
  quantity: wholeCountQuantitySchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const BundleProductComponentAddOnDTOSchema = z.object({
  id: z.uuid("Invalid bundle component add-on id"),
  organizationId: z.uuid("Invalid organization id"),
  bundleProductComponentId: z.uuid("Invalid bundle component id"),
  addOnId: z.uuid("Invalid add-on id"),
  quantity: wholeCountQuantitySchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const BundleProductComponentAddOnInputSchema = z.object({
  addOnId: z.uuid("Invalid add-on id"),
  quantity: wholeCountQuantitySchema,
});

export const BundleProductComponentInputSchema = z.object({
  productId: z.uuid("Invalid product id"),
  quantity: wholeCountQuantitySchema,
  addOns: z.array(BundleProductComponentAddOnInputSchema).optional(),
});

export const BundleProductComponentResponseDTOSchema =
  BundleProductComponentDTOSchema.extend({
    addOns: z.array(BundleProductComponentAddOnDTOSchema),
  });

const comboSelectionLimitSchema = z
  .number({ error: "Selection limit is required" })
  .int("Selection limit must be a whole number")
  .min(0, "Selection limit must be 0 or more")
  .max(100, "Selection limit must be at most 100");

const comboOptionMaxQuantitySchema = z
  .number({ error: "Option maximum quantity is required" })
  .int("Option maximum quantity must be a whole number")
  .min(1, "Option maximum quantity must be at least 1")
  .max(100, "Option maximum quantity must be at most 100");

const comboPriceAdjustmentSchema = z
  .number({ error: "Price adjustment is required" })
  .finite("Price adjustment must be a valid number");

export const ComboChoiceOptionDTOSchema = z.object({
  id: z.uuid("Invalid combo option id"),
  organizationId: z.uuid("Invalid organization id"),
  choiceGroupId: z.uuid("Invalid choice group id"),
  optionProductId: z.uuid("Invalid option product id"),
  maxQuantity: comboOptionMaxQuantitySchema,
  priceAdjustment: comboPriceAdjustmentSchema,
  sortOrder: z.number().int().min(0),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const ComboChoiceGroupDTOSchema = z.object({
  id: z.uuid("Invalid combo choice group id"),
  organizationId: z.uuid("Invalid organization id"),
  comboProductId: z.uuid("Invalid combo product id"),
  name: nameSchema,
  minSelections: comboSelectionLimitSchema,
  maxSelections: comboSelectionLimitSchema,
  sortOrder: z.number().int().min(0),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const ComboChoiceOptionInputSchema = z.object({
  productId: z.uuid("Invalid option product id"),
  maxQuantity: comboOptionMaxQuantitySchema,
  priceAdjustment: comboPriceAdjustmentSchema,
});

export const ComboChoiceGroupInputSchema = z
  .object({
    name: nameSchema,
    minSelections: comboSelectionLimitSchema,
    maxSelections: comboSelectionLimitSchema,
    options: z
      .array(ComboChoiceOptionInputSchema)
      .min(1, "Each choice group needs at least one option"),
  })
  .refine((value) => value.minSelections <= value.maxSelections, {
    message: "Minimum selections cannot exceed maximum selections",
    path: ["maxSelections"],
  });

export const ComboChoiceOptionResponseDTOSchema =
  ComboChoiceOptionDTOSchema.extend({
    product: ProductResponseDTOSchema,
  });

export const ComboChoiceGroupResponseDTOSchema =
  ComboChoiceGroupDTOSchema.extend({
    options: z.array(ComboChoiceOptionResponseDTOSchema),
  });

export const AddOnDTOSchema = z.object({
  id: z.uuid("Invalid add-on id"),
  organizationId: z.uuid("Invalid organization id"),
  name: nameSchema,
  price: priceSchema,
  discount: discountSchema,
  status: AddOnStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const ProductAddOnAttachmentDTOSchema = z.object({
  id: z.uuid("Invalid attachment id"),
  organizationId: z.uuid("Invalid organization id"),
  productId: z.uuid("Invalid product id"),
  addOnId: z.uuid("Invalid add-on id"),
  selectionCap: selectionCapSchema,
  status: ProductAddOnAttachmentStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const ProductAddOnAttachmentResponseDTOSchema =
  ProductAddOnAttachmentDTOSchema.extend({
    addOn: AddOnDTOSchema,
  });

export const CreateCategorySchema = z.object({
  name: nameSchema,
  status: CategoryStatusSchema.optional(),
});

export const UpdateCategorySchema = z
  .object({
    name: nameSchema.optional(),
    status: CategoryStatusSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.status !== undefined, {
    message: "At least one field is required",
  });

export const CreateProductObjectSchema = z.object({
  categoryId: z.uuid("Invalid category id"),
  name: nameSchema,
  price: priceSchema,
  discount: discountSchema.optional(),
  imagePath: optionalImagePathSchema,
  status: ProductStatusSchema.optional(),
  productCode: optionalProductCodeSchema,
  productCodeKind: ProductCodeKindSchema.nullable().optional(),
});

export const CreateProductSchema = CreateProductObjectSchema.refine(
  productCodeFieldsRefine,
  productCodeFieldsRefineMessage,
);

const UpdateProductObjectSchema = z.object({
  categoryId: z.uuid("Invalid category id").optional(),
  name: nameSchema.optional(),
  price: priceSchema.optional(),
  discount: discountSchema.optional(),
  imagePath: optionalImagePathSchema,
  status: ProductStatusSchema.optional(),
  productCode: optionalProductCodeSchema,
  productCodeKind: ProductCodeKindSchema.nullable().optional(),
});

export const UpdateProductSchema = UpdateProductObjectSchema.refine(
  (value) =>
    value.categoryId !== undefined ||
    value.name !== undefined ||
    value.price !== undefined ||
    value.discount !== undefined ||
    value.imagePath !== undefined ||
    value.status !== undefined ||
    value.productCode !== undefined ||
    value.productCodeKind !== undefined,
  {
    message: "At least one field is required",
  },
).refine(productCodeFieldsRefine, productCodeFieldsRefineMessage);

export const CreateBundleProductSchema = z.object({
  categoryId: z.uuid("Invalid category id"),
  name: nameSchema,
  price: priceSchema,
  discount: discountSchema.optional(),
  imagePath: optionalImagePathSchema,
  status: ProductStatusSchema.optional(),
  components: z
    .array(BundleProductComponentInputSchema)
    .min(1, "A bundle must include at least one product component"),
});

export const UpdateBundleProductSchema = z
  .object({
    categoryId: z.uuid("Invalid category id").optional(),
    name: nameSchema.optional(),
    price: priceSchema.optional(),
    discount: discountSchema.optional(),
    imagePath: optionalImagePathSchema,
    status: ProductStatusSchema.optional(),
    components: z
      .array(BundleProductComponentInputSchema)
      .min(1, "A bundle must include at least one product component")
      .optional(),
  })
  .refine(
    (value) =>
      value.categoryId !== undefined ||
      value.name !== undefined ||
      value.price !== undefined ||
      value.discount !== undefined ||
      value.imagePath !== undefined ||
      value.status !== undefined ||
      value.components !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const CreateComboProductSchema = z.object({
  categoryId: z.uuid("Invalid category id"),
  name: nameSchema,
  price: priceSchema,
  discount: discountSchema.optional(),
  imagePath: optionalImagePathSchema,
  status: ProductStatusSchema.optional(),
  choiceGroups: z
    .array(ComboChoiceGroupInputSchema)
    .min(1, "A Combo needs at least one choice group"),
});

export const UpdateComboProductSchema = z
  .object({
    categoryId: z.uuid("Invalid category id").optional(),
    name: nameSchema.optional(),
    price: priceSchema.optional(),
    discount: discountSchema.optional(),
    imagePath: optionalImagePathSchema,
    status: ProductStatusSchema.optional(),
    choiceGroups: z
      .array(ComboChoiceGroupInputSchema)
      .min(1, "A Combo needs at least one choice group")
      .optional(),
  })
  .refine(
    (value) =>
      value.categoryId !== undefined ||
      value.name !== undefined ||
      value.price !== undefined ||
      value.discount !== undefined ||
      value.imagePath !== undefined ||
      value.status !== undefined ||
      value.choiceGroups !== undefined,
    { message: "At least one field is required" },
  );

export const CreateAddOnSchema = z
  .object({
    name: nameSchema,
    price: priceSchema,
    discount: discountSchema.optional(),
    status: AddOnStatusSchema.optional(),
  })
  .refine((value) => (value.discount ?? 0) <= value.price, {
    message: "Discount cannot exceed price",
    path: ["discount"],
  });

export const UpdateAddOnSchema = z
  .object({
    name: nameSchema.optional(),
    price: priceSchema.optional(),
    discount: discountSchema.optional(),
    status: AddOnStatusSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.price !== undefined ||
      value.discount !== undefined ||
      value.status !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const CreateProductAddOnAttachmentSchema = z.object({
  addOnId: z.uuid("Invalid add-on id"),
  selectionCap: selectionCapSchema.optional(),
  status: ProductAddOnAttachmentStatusSchema.optional(),
});

export const UpdateProductAddOnAttachmentSchema = z
  .object({
    selectionCap: selectionCapSchema.optional(),
    status: ProductAddOnAttachmentStatusSchema.optional(),
  })
  .refine(
    (value) => value.selectionCap !== undefined || value.status !== undefined,
    {
      message: "At least one field is required",
    },
  );
