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
export const AddOnStatusSchema = z.enum(["active", "inactive"]);
export const ProductAddOnAttachmentStatusSchema = z.enum(["active", "inactive"]);

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

export const ProductDTOSchema = z.object({
    id: z.uuid("Invalid product id"),
    organizationId: z.uuid("Invalid organization id"),
    categoryId: z.uuid("Invalid category id"),
    name: nameSchema,
    price: priceSchema,
    discount: discountSchema,
    imagePath: z.string().nullable().optional(),
    productType: ProductTypeSchema,
    status: ProductStatusSchema,
    createdBy: z.uuid("Invalid creator id"),
    updatedBy: z.uuid("Invalid updater id").nullable().optional(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const ProductResponseDTOSchema = ProductDTOSchema.extend({
    imageSignedUrl: z.string().nullable(),
});

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

export const BundleProductComponentResponseDTOSchema = BundleProductComponentDTOSchema.extend({
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
        options: z.array(ComboChoiceOptionInputSchema).min(1, "Each choice group needs at least one option"),
    })
    .refine((value) => value.minSelections <= value.maxSelections, {
        message: "Minimum selections cannot exceed maximum selections",
        path: ["maxSelections"],
    });

export const ComboChoiceOptionResponseDTOSchema = ComboChoiceOptionDTOSchema.extend({
    product: ProductResponseDTOSchema,
});

export const ComboChoiceGroupResponseDTOSchema = ComboChoiceGroupDTOSchema.extend({
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

export const ProductAddOnAttachmentResponseDTOSchema = ProductAddOnAttachmentDTOSchema.extend({
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

export const CreateProductSchema = z.object({
    categoryId: z.uuid("Invalid category id"),
    name: nameSchema,
    price: priceSchema,
    discount: discountSchema.optional(),
    imagePath: optionalImagePathSchema,
    status: ProductStatusSchema.optional(),
});

export const UpdateProductSchema = z
    .object({
        categoryId: z.uuid("Invalid category id").optional(),
        name: nameSchema.optional(),
        price: priceSchema.optional(),
        discount: discountSchema.optional(),
        imagePath: optionalImagePathSchema,
        status: ProductStatusSchema.optional(),
    })
    .refine(
        (value) =>
            value.categoryId !== undefined
            || value.name !== undefined
            || value.price !== undefined
            || value.discount !== undefined
            || value.imagePath !== undefined
            || value.status !== undefined,
        {
            message: "At least one field is required",
        },
    );

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
            value.categoryId !== undefined
            || value.name !== undefined
            || value.price !== undefined
            || value.discount !== undefined
            || value.imagePath !== undefined
            || value.status !== undefined
            || value.components !== undefined,
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
    choiceGroups: z.array(ComboChoiceGroupInputSchema).min(1, "A Combo needs at least one choice group"),
});

export const UpdateComboProductSchema = z
    .object({
        categoryId: z.uuid("Invalid category id").optional(),
        name: nameSchema.optional(),
        price: priceSchema.optional(),
        discount: discountSchema.optional(),
        imagePath: optionalImagePathSchema,
        status: ProductStatusSchema.optional(),
        choiceGroups: z.array(ComboChoiceGroupInputSchema).min(1, "A Combo needs at least one choice group").optional(),
    })
    .refine(
        (value) =>
            value.categoryId !== undefined
            || value.name !== undefined
            || value.price !== undefined
            || value.discount !== undefined
            || value.imagePath !== undefined
            || value.status !== undefined
            || value.choiceGroups !== undefined,
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
            value.name !== undefined
            || value.price !== undefined
            || value.discount !== undefined
            || value.status !== undefined,
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
