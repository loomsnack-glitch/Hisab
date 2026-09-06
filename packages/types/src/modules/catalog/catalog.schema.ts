import { z } from "zod";
import { dtoDateSchema } from "../../common";
import { UnitStatusSchema } from "../units/units.schema";
import {
  keepOutFitsStock,
  millimetreBoxesIntersect,
} from "./label-template-geometry";
import { isPositiveDefaultSellingQuantity } from "./sold-product-name";

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

export const defaultSellingQuantitySchema = z
  .number({ error: "Default Selling Quantity is required" })
  .gt(0, "Default Selling Quantity must be greater than 0")
  .refine(isPositiveDefaultSellingQuantity, {
    message: "Default Selling Quantity must have at most two decimal places",
  });

export const canAssignUnitToCatalogProduct = (input: {
  unitStatus: z.infer<typeof UnitStatusSchema>;
  currentlyAssigned?: boolean;
}): boolean =>
  input.currentlyAssigned === true || input.unitStatus === "active";

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

export const NutritionRowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nutrition row name is required")
    .max(255, "Nutrition row name must be at most 255 characters"),
  quantity: z
    .string()
    .trim()
    .min(1, "Nutrition row quantity is required")
    .max(64, "Nutrition row quantity must be at most 64 characters"),
  unit: z
    .string()
    .trim()
    .min(1, "Nutrition row unit is required")
    .max(32, "Nutrition row unit must be at most 32 characters"),
});

export const ProductLabelProfileDTOSchema = z.object({
  ingredients: z.string().nullable().optional(),
  nutrition: z.array(NutritionRowSchema).nullable().optional(),
  netWeight: z.string().nullable().optional(),
  unitSellingPriceText: z.string().nullable().optional(),
  mrp: z.number().nullable().optional(),
  shelfLifeDays: z
    .number()
    .int("Shelf life must be a whole number of days")
    .min(1, "Shelf life must be at least 1 day")
    .nullable()
    .optional(),
});

const optionalLabelProfileTextSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(2000, "Text must be at most 2000 characters"),
  ])
  .nullable()
  .optional();

const optionalLabelProfileShortTextSchema = z
  .union([
    z.literal(""),
    z.string().trim().max(255, "Text must be at most 255 characters"),
  ])
  .nullable()
  .optional();

const optionalLabelProfileNetWeightSchema = z
  .union([
    z.literal(""),
    z.string().trim().max(128, "Net weight must be at most 128 characters"),
  ])
  .nullable()
  .optional();

const optionalLabelProfileMrpSchema = z
  .union([z.literal(""), z.coerce.number().min(0, "On-pack MRP must be 0 or more")])
  .nullable()
  .optional();

const optionalShelfLifeDaysSchema = z
  .union([
    z.literal(""),
    z.coerce
      .number()
      .int("Shelf life must be a whole number of days")
      .min(1, "Shelf life must be at least 1 day"),
  ])
  .nullable()
  .optional();

export const UpdateProductLabelProfileSchema = z
  .object({
    ingredients: optionalLabelProfileTextSchema,
    nutrition: z.array(NutritionRowSchema).nullable().optional(),
    netWeight: optionalLabelProfileNetWeightSchema,
    unitSellingPriceText: optionalLabelProfileShortTextSchema,
    mrp: optionalLabelProfileMrpSchema,
    shelfLifeDays: optionalShelfLifeDaysSchema,
  })
  .refine(
    (value) =>
      value.ingredients !== undefined ||
      value.nutrition !== undefined ||
      value.netWeight !== undefined ||
      value.unitSellingPriceText !== undefined ||
      value.mrp !== undefined ||
      value.shelfLifeDays !== undefined,
    { message: "At least one field is required" },
  );

export const CategoryDTOSchema = z.object({
  id: z.uuid("Invalid category id"),
  organizationId: z.uuid("Invalid organization id"),
  name: nameSchema,
  sortOrder: z.number().int().nonnegative(),
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
  sortOrder: z.number().int().nonnegative(),
  price: priceSchema,
  discount: discountSchema,
  imagePath: z.string().nullable().optional(),
  productType: ProductTypeSchema,
  productCode: productCodeValueSchema.nullable(),
  productCodeKind: ProductCodeKindSchema.nullable(),
  unitId: z.uuid("Invalid unit id"),
  defaultSellingQuantity: defaultSellingQuantitySchema,
  allowCustomSellingQuantity: z.boolean(),
  unitLabel: z.string().min(1).max(32),
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
  activeAddOnCount: z.number().int().nonnegative().optional(),
  labelProfile: ProductLabelProfileDTOSchema.nullable().optional(),
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
  unitId: z.uuid("Invalid unit id").optional(),
  defaultSellingQuantity: defaultSellingQuantitySchema.optional(),
  allowCustomSellingQuantity: z.boolean().optional(),
});

export const CreateProductSchema = CreateProductObjectSchema.refine(
  productCodeFieldsRefine,
  productCodeFieldsRefineMessage,
);

const productCommercialDefaultsRefine = <
  T extends { price?: number; discount?: number },
>(
  value: T,
) => {
  const price = value.price;
  const discount = value.discount;
  if (price === undefined || discount === undefined) {
    return true;
  }
  return discount <= price;
};

const productCommercialDefaultsRefineMessage = {
  message: "Discount cannot exceed price",
  path: ["discount"] as (string | number)[],
};

const UpdateProductObjectSchema = z
  .object({
    categoryId: z.uuid("Invalid category id").optional(),
    name: nameSchema.optional(),
    price: priceSchema.optional(),
    discount: discountSchema.optional(),
    status: ProductStatusSchema.optional(),
    imagePath: optionalImagePathSchema,
    productCode: optionalProductCodeSchema,
    productCodeKind: ProductCodeKindSchema.nullable().optional(),
    unitId: z.uuid("Invalid unit id").optional(),
    defaultSellingQuantity: defaultSellingQuantitySchema.optional(),
    allowCustomSellingQuantity: z.boolean().optional(),
  })
  .strict()
  .refine(productCommercialDefaultsRefine, productCommercialDefaultsRefineMessage);

export const UpdateProductSchema = UpdateProductObjectSchema.refine(
  (value) =>
    value.categoryId !== undefined ||
    value.name !== undefined ||
    value.price !== undefined ||
    value.discount !== undefined ||
    value.status !== undefined ||
    value.imagePath !== undefined ||
    value.productCode !== undefined ||
    value.productCodeKind !== undefined ||
    value.unitId !== undefined ||
    value.defaultSellingQuantity !== undefined ||
    value.allowCustomSellingQuantity !== undefined,
  {
    message: "At least one field is required",
  },
).refine(productCodeFieldsRefine, productCodeFieldsRefineMessage);

export const ReuseInternalProductCodeSchema = z.object({
  productCode: z
    .string()
    .regex(
      /^04\d{11}$/,
      "Internal Product Code must be a 13-digit code beginning with 04",
    ),
});

const orderedIdsSchema = z
  .array(z.uuid("Invalid id"))
  .min(1, "At least one item is required")
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Items cannot be repeated",
  });

export const ReorderCategoriesSchema = z.object({
  categoryIds: orderedIdsSchema,
});

export const ReorderProductsSchema = z.object({
  categoryId: z.uuid("Invalid category id"),
  productIds: orderedIdsSchema,
});

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
    status: ProductStatusSchema.optional(),
    imagePath: optionalImagePathSchema,
    components: z
      .array(BundleProductComponentInputSchema)
      .min(1, "A bundle must include at least one product component")
      .optional(),
  })
  .strict()
  .refine(productCommercialDefaultsRefine, productCommercialDefaultsRefineMessage)
  .refine(
    (value) =>
      value.categoryId !== undefined ||
      value.name !== undefined ||
      value.price !== undefined ||
      value.discount !== undefined ||
      value.status !== undefined ||
      value.imagePath !== undefined ||
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
    status: ProductStatusSchema.optional(),
    imagePath: optionalImagePathSchema,
    choiceGroups: z
      .array(ComboChoiceGroupInputSchema)
      .min(1, "A Combo needs at least one choice group")
      .optional(),
  })
  .strict()
  .refine(productCommercialDefaultsRefine, productCommercialDefaultsRefineMessage)
  .refine(
    (value) =>
      value.categoryId !== undefined ||
      value.name !== undefined ||
      value.price !== undefined ||
      value.discount !== undefined ||
      value.status !== undefined ||
      value.imagePath !== undefined ||
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

export const LabelTemplateStatusSchema = z.enum(["active", "inactive"]);
export const LabelStockMediaSchema = z.enum(["sheet", "roll"]);
export const LabelRotationDegSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);
export const LabelTextBindingSchema = z.enum([
  "product.name",
  "product.productCode",
  "product.price",
  "productLabel.mrp",
  "productLabel.ingredients",
  "productLabel.netWeight",
  "productLabel.unitSellingPriceText",
  "job.packedDate",
  "job.expiryDate",
  "job.batchNumber",
]);
export const LabelBarcodeSymbologySchema = z.enum(["ean13", "code128"]);

const millimetreSizeSchema = z
  .number({ error: "Size in millimetres is required" })
  .finite("Size in millimetres must be a valid number")
  .positive("Size in millimetres must be greater than 0");
const millimetreGapSchema = z
  .number({ error: "Gap in millimetres is required" })
  .finite("Gap in millimetres must be a valid number")
  .min(0, "Gap in millimetres must be 0 or more");
const millimetrePositionSchema = z
  .number({ error: "Position in millimetres is required" })
  .finite("Position in millimetres must be a valid number");
const labelsPerRowSchema = z
  .number({ error: "Labels per row is required" })
  .int("Labels per row must be a whole number")
  .min(1, "Labels per row must be at least 1");
const sheetCountSchema = z
  .number({ error: "Sheet count is required" })
  .int("Sheet count must be a whole number")
  .min(1, "Sheet count must be at least 1");

export const LabelStockSheetSchema = z.object({
  pageWidthMm: millimetreSizeSchema,
  pageHeightMm: millimetreSizeSchema,
  columns: sheetCountSchema,
  rows: sheetCountSchema,
});

export const LabelStockSchema = z
  .object({
    widthMm: millimetreSizeSchema,
    heightMm: millimetreSizeSchema,
    labelsPerRow: labelsPerRowSchema,
    horizontalGapMm: millimetreGapSchema,
    verticalGapMm: millimetreGapSchema,
    media: LabelStockMediaSchema,
    sheet: LabelStockSheetSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.media === "sheet" && value.sheet === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Sheet Label Stock must define page size and row/column counts",
        path: ["sheet"],
      });
    }
    if (value.media === "roll" && value.sheet !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Roll Label Stock cannot define a sheet grid",
        path: ["sheet"],
      });
    }
  });

export const LabelKeepOutSchema = z.object({
  xMm: millimetrePositionSchema,
  yMm: millimetrePositionSchema,
  widthMm: millimetreSizeSchema,
  heightMm: millimetreSizeSchema,
});

const labelElementBoxSchema = z.object({
  id: z.string().trim().min(1, "Label Element id is required"),
  xMm: millimetrePositionSchema,
  yMm: millimetrePositionSchema,
  widthMm: millimetreSizeSchema,
  heightMm: millimetreSizeSchema,
  rotationDeg: LabelRotationDegSchema,
});

export const LabelTextElementSchema = labelElementBoxSchema.extend({
  type: z.literal("text"),
  text: z
    .object({
      source: z.enum(["static", "binding"]),
      staticValue: z.string().optional(),
      binding: LabelTextBindingSchema.optional(),
      fontSizeMm: millimetreSizeSchema,
      fontWeight: z.enum(["normal", "bold"]),
      align: z.enum(["left", "center", "right"]),
    })
    .superRefine((value, ctx) => {
      if (value.source === "binding" && value.binding === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Bound text must include a binding",
          path: ["binding"],
        });
      }
      if (value.source === "static" && (value.staticValue ?? "").length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Static text must include a value",
          path: ["staticValue"],
        });
      }
    }),
});

export const LabelBarcodeElementSchema = labelElementBoxSchema.extend({
  type: z.literal("barcode"),
  barcode: z.object({
    symbology: LabelBarcodeSymbologySchema,
    showHumanDigits: z.boolean(),
  }),
});

export const LabelTableElementSchema = labelElementBoxSchema.extend({
  type: z.literal("table"),
  table: z.object({
    binding: z.literal("productLabel.nutrition"),
  }),
});

export const LabelBoxElementSchema = labelElementBoxSchema.extend({
  type: z.literal("box"),
  box: z.object({
    strokeWidthMm: millimetreSizeSchema,
  }),
});

export const LabelElementSchema = z.discriminatedUnion("type", [
  LabelTextElementSchema,
  LabelBarcodeElementSchema,
  LabelTableElementSchema,
  LabelBoxElementSchema,
]);

export const LabelTemplateDocumentSchema = z
  .object({
    name: nameSchema,
    status: LabelTemplateStatusSchema,
    stock: LabelStockSchema,
    keepOuts: z.array(LabelKeepOutSchema),
    elements: z.array(LabelElementSchema),
  })
  .superRefine((value, ctx) => {
    value.keepOuts.forEach((keepOut, keepOutIndex) => {
      if (!keepOutFitsStock(keepOut, value.stock)) {
        ctx.addIssue({
          code: "custom",
          message: "Keep-Out must fit on the Label Stock",
          path: ["keepOuts", keepOutIndex],
        });
      }

      value.elements.forEach((element, elementIndex) => {
        if (millimetreBoxesIntersect(element, keepOut)) {
          ctx.addIssue({
            code: "custom",
            message: "Label Element intersects a Keep-Out",
            path: ["elements", elementIndex],
          });
        }
      });
    });
  });

export const LabelTemplateDTOSchema = LabelTemplateDocumentSchema.extend({
  id: z.uuid("Invalid label template id"),
  organizationId: z.uuid("Invalid organization id"),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateLabelTemplateSchema = LabelTemplateDocumentSchema.safeExtend({
  // @ts-expect-error Zod 4 infers this overlapping optional status field as `never`.
  status: LabelTemplateStatusSchema.optional(),
});

export const UpdateLabelTemplateSchema = z
  .object({
    name: nameSchema.optional(),
    status: LabelTemplateStatusSchema.optional(),
    stock: LabelStockSchema.optional(),
    keepOuts: z.array(LabelKeepOutSchema).optional(),
    elements: z.array(LabelElementSchema).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.status !== undefined ||
      value.stock !== undefined ||
      value.keepOuts !== undefined ||
      value.elements !== undefined,
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

const storeProductOfferingOverrideSchema = priceSchema.nullable();

export const StoreProductOfferingDTOSchema = z.object({
  id: z.uuid("Invalid offering id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  productId: z.uuid("Invalid product id"),
  priceOverride: storeProductOfferingOverrideSchema,
  discountOverride: storeProductOfferingOverrideSchema,
  effectivePrice: priceSchema,
  effectiveDiscount: discountSchema,
  isPriceInherited: z.boolean(),
  isDiscountInherited: z.boolean(),
  status: ProductStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const StoreProductOfferingResponseDTOSchema =
  StoreProductOfferingDTOSchema.extend({
    product: ProductResponseDTOSchema,
  });

export const StoreProductOfferingOverrideConflictSchema = z.object({
  storeId: z.uuid("Invalid store id"),
  storeName: z.string().min(1),
  effectivePrice: priceSchema,
  effectiveDiscount: discountSchema,
});

export const StoreProductOfferingOverrideSummarySchema = z.object({
  totalOfferings: z.number().int().nonnegative(),
  fullyInherited: z.number().int().nonnegative(),
  priceOverridden: z.number().int().nonnegative(),
  discountOverridden: z.number().int().nonnegative(),
  bothOverridden: z.number().int().nonnegative(),
});

export const UpdateStoreProductOfferingSchema = z
  .object({
    priceOverride: storeProductOfferingOverrideSchema.optional(),
    discountOverride: storeProductOfferingOverrideSchema.optional(),
    clearPriceOverride: z.boolean().optional(),
    clearDiscountOverride: z.boolean().optional(),
    status: ProductStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.priceOverride !== undefined ||
      value.discountOverride !== undefined ||
      value.clearPriceOverride === true ||
      value.clearDiscountOverride === true ||
      value.status !== undefined,
    {
      message: "At least one field is required",
    },
  )
  .superRefine((value, context) => {
    if (value.priceOverride !== undefined && value.clearPriceOverride) {
      context.addIssue({
        code: "custom",
        path: ["clearPriceOverride"],
        message: "Choose either a price override or clear it, not both",
      });
    }
    if (value.discountOverride !== undefined && value.clearDiscountOverride) {
      context.addIssue({
        code: "custom",
        path: ["clearDiscountOverride"],
        message: "Choose either a discount override or clear it, not both",
      });
    }
  });

const storeAddOnOfferingOverrideSchema = priceSchema.nullable();

export const StoreAddOnOfferingDTOSchema = z.object({
  id: z.uuid("Invalid offering id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  addOnId: z.uuid("Invalid add-on id"),
  priceOverride: storeAddOnOfferingOverrideSchema,
  discountOverride: storeAddOnOfferingOverrideSchema,
  effectivePrice: priceSchema,
  effectiveDiscount: discountSchema,
  isPriceInherited: z.boolean(),
  isDiscountInherited: z.boolean(),
  status: AddOnStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const StoreAddOnOfferingResponseDTOSchema =
  StoreAddOnOfferingDTOSchema.extend({
    addOn: AddOnDTOSchema,
  });

export const StoreAddOnOfferingOverrideSummarySchema = z.object({
  totalOfferings: z.number().int().nonnegative(),
  fullyInherited: z.number().int().nonnegative(),
  priceOverridden: z.number().int().nonnegative(),
  discountOverridden: z.number().int().nonnegative(),
  bothOverridden: z.number().int().nonnegative(),
});

export const UpdateStoreAddOnOfferingSchema = z
  .object({
    priceOverride: storeAddOnOfferingOverrideSchema.optional(),
    discountOverride: storeAddOnOfferingOverrideSchema.optional(),
    clearPriceOverride: z.boolean().optional(),
    clearDiscountOverride: z.boolean().optional(),
    status: AddOnStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.priceOverride !== undefined ||
      value.discountOverride !== undefined ||
      value.clearPriceOverride === true ||
      value.clearDiscountOverride === true ||
      value.status !== undefined,
    {
      message: "At least one field is required",
    },
  )
  .superRefine((value, context) => {
    if (value.priceOverride !== undefined && value.clearPriceOverride) {
      context.addIssue({
        code: "custom",
        path: ["clearPriceOverride"],
        message: "Choose either a price override or clear it, not both",
      });
    }
    if (value.discountOverride !== undefined && value.clearDiscountOverride) {
      context.addIssue({
        code: "custom",
        path: ["clearDiscountOverride"],
        message: "Choose either a discount override or clear it, not both",
      });
    }
  });

export const StoreCategoryPresentationDTOSchema = z.object({
  id: z.uuid("Invalid presentation id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  categoryId: z.uuid("Invalid category id"),
  visible: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const StoreCategoryPresentationResponseDTOSchema =
  StoreCategoryPresentationDTOSchema.extend({
    category: CategoryDTOSchema,
  });

export const UpdateStoreCategoryPresentationSchema = z
  .object({
    visible: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine((value) => value.visible !== undefined || value.sortOrder !== undefined, {
    message: "At least one field is required",
  });

export const ReorderStoreCategoryPresentationsSchema = z.object({
  categoryIds: orderedIdsSchema,
});

export const CatalogCommercialItemTypeSchema = z.enum(["product", "add_on"]);

export const CatalogCommercialOperationTypeSchema = z.enum([
  "set_price_override",
  "set_discount_override",
  "clear_price_override",
  "clear_discount_override",
  "set_local_status",
]);

const catalogCommercialStoreIdsSchema = z
  .array(z.uuid("Invalid store id"))
  .min(1, "At least one Store is required");

const catalogCommercialItemIdsSchema = z
  .array(z.uuid("Invalid catalog item id"))
  .min(1, "At least one catalog item is required");

const catalogCommercialOfferingStateSchema = z.object({
  priceOverride: priceSchema.nullable(),
  discountOverride: discountSchema.nullable(),
  effectivePrice: priceSchema,
  effectiveDiscount: discountSchema,
  isPriceInherited: z.boolean(),
  isDiscountInherited: z.boolean(),
  status: z.union([ProductStatusSchema, AddOnStatusSchema]),
});

export const CatalogCommercialOperationChangeSchema = z.object({
  storeId: z.uuid("Invalid store id"),
  storeName: z.string().min(1),
  itemId: z.uuid("Invalid catalog item id"),
  itemName: z.string().min(1),
  offeringId: z.uuid("Invalid offering id"),
  before: catalogCommercialOfferingStateSchema,
  after: catalogCommercialOfferingStateSchema,
  affectsOverride: z.boolean(),
  hasChange: z.boolean(),
});

const catalogCommercialOperationBaseSchema = z.object({
  itemType: CatalogCommercialItemTypeSchema,
  operation: CatalogCommercialOperationTypeSchema,
  storeIds: catalogCommercialStoreIdsSchema,
  itemIds: catalogCommercialItemIdsSchema,
  value: z.union([priceSchema, discountSchema, ProductStatusSchema, AddOnStatusSchema]).optional(),
});

const validateCatalogCommercialOperationValue = (
  value: z.infer<typeof catalogCommercialOperationBaseSchema>,
  ctx: z.RefinementCtx,
) => {
  const { operation, value: operationValue } = value;

  if (
    operation === "set_price_override" &&
    (operationValue === undefined || typeof operationValue !== "number")
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Price is required for set price override operations",
      path: ["value"],
    });
  }

  if (
    operation === "set_discount_override" &&
    (operationValue === undefined || typeof operationValue !== "number")
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Discount is required for set discount override operations",
      path: ["value"],
    });
  }

  if (operation === "set_local_status") {
    if (operationValue === undefined || typeof operationValue !== "string") {
      ctx.addIssue({
        code: "custom",
        message: "Status is required for set local status operations",
        path: ["value"],
      });
      return;
    }

    const statusSchema =
      value.itemType === "product" ? ProductStatusSchema : AddOnStatusSchema;
    const parsed = statusSchema.safeParse(operationValue);
    if (!parsed.success) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid local status for the selected catalog item type",
        path: ["value"],
      });
    }
  }

  if (
    (operation === "clear_price_override" || operation === "clear_discount_override") &&
    operationValue !== undefined
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Clear override operations must not include a value",
      path: ["value"],
    });
  }
};

export const PreviewCatalogCommercialOperationSchema =
  catalogCommercialOperationBaseSchema.superRefine(validateCatalogCommercialOperationValue);

export const ApplyCatalogCommercialOperationSchema =
  catalogCommercialOperationBaseSchema
    .extend({
      confirmed: z.boolean(),
    })
    .superRefine(validateCatalogCommercialOperationValue);

export const CatalogCommercialOperationAuditDTOSchema = z.object({
  id: z.uuid("Invalid audit id"),
  organizationId: z.uuid("Invalid organization id"),
  itemType: CatalogCommercialItemTypeSchema,
  operation: CatalogCommercialOperationTypeSchema,
  storeIds: catalogCommercialStoreIdsSchema,
  itemIds: catalogCommercialItemIdsSchema,
  actorId: z.uuid("Invalid actor id"),
  createdAt: dtoDateSchema,
  changes: z.array(CatalogCommercialOperationChangeSchema),
});

export const CatalogCommercialOperationPreviewResponseSchema = z.object({
  itemType: CatalogCommercialItemTypeSchema,
  operation: CatalogCommercialOperationTypeSchema,
  storeIds: catalogCommercialStoreIdsSchema,
  itemIds: catalogCommercialItemIdsSchema,
  requiresConfirmation: z.boolean(),
  changes: z.array(CatalogCommercialOperationChangeSchema),
});

export const CatalogCommercialOperationApplyResponseSchema = z.object({
  audit: CatalogCommercialOperationAuditDTOSchema,
  appliedChangeCount: z.number().int().nonnegative(),
});

export const CatalogCommercialOperationAuditsListResponseSchema = z.object({
  audits: z.array(CatalogCommercialOperationAuditDTOSchema),
});
