import type z from "zod";
import type {
    AddOnDTOSchema,
    BundleProductComponentAddOnDTOSchema,
    BundleProductComponentDTOSchema,
    BundleProductComponentResponseDTOSchema,
    ComboChoiceGroupDTOSchema,
    ComboChoiceGroupInputSchema,
    ComboChoiceGroupResponseDTOSchema,
    ComboChoiceOptionDTOSchema,
    ComboChoiceOptionInputSchema,
    ComboChoiceOptionResponseDTOSchema,
    CategoryDTOSchema,
    CreateAddOnSchema,
    CreateBundleProductSchema,
    CreateComboProductSchema,
    CreateCategorySchema,
    CreateLabelTemplateSchema,
    CreateProductAddOnAttachmentSchema,
    CreateProductSchema,
    LabelTemplateDTOSchema,
    LabelTemplateDocumentSchema,
    NutritionRowSchema,
    ProductLabelProfileDTOSchema,
    ProductAddOnAttachmentDTOSchema,
    ProductAddOnAttachmentResponseDTOSchema,
    ProductDTOSchema,
    ProductResponseDTOSchema,
    ReuseInternalProductCodeSchema,
    ReorderCategoriesSchema,
    ReorderProductsSchema,
    UpdateAddOnSchema,
    UpdateBundleProductSchema,
    UpdateComboProductSchema,
    UpdateCategorySchema,
    UpdateLabelTemplateSchema,
    UpdateProductAddOnAttachmentSchema,
    UpdateProductLabelProfileSchema,
    UpdateProductSchema,
} from "./catalog.schema";

export type CategoryDTO = z.infer<typeof CategoryDTOSchema>;
export type ProductDTO = z.infer<typeof ProductDTOSchema>;
export type ProductResponseDTO = z.infer<typeof ProductResponseDTOSchema>;
export type BundleProductComponentDTO = z.infer<typeof BundleProductComponentDTOSchema>;
export type BundleProductComponentAddOnDTO = z.infer<typeof BundleProductComponentAddOnDTOSchema>;
export type BundleProductComponentResponseDTO = z.infer<typeof BundleProductComponentResponseDTOSchema>;
export type ComboChoiceGroupDTO = z.infer<typeof ComboChoiceGroupDTOSchema>;
export type ComboChoiceOptionDTO = z.infer<typeof ComboChoiceOptionDTOSchema>;
export type ComboChoiceGroupInput = z.infer<typeof ComboChoiceGroupInputSchema>;
export type ComboChoiceOptionInput = z.infer<typeof ComboChoiceOptionInputSchema>;
export type ComboChoiceGroupResponseDTO = z.infer<typeof ComboChoiceGroupResponseDTOSchema>;
export type ComboChoiceOptionResponseDTO = z.infer<typeof ComboChoiceOptionResponseDTOSchema>;
export type AddOnDTO = z.infer<typeof AddOnDTOSchema>;
export type LabelTemplateDocument = z.infer<typeof LabelTemplateDocumentSchema>;
export type LabelTemplateDTO = z.infer<typeof LabelTemplateDTOSchema>;
export type NutritionRow = z.infer<typeof NutritionRowSchema>;
export type ProductLabelProfileDTO = z.infer<typeof ProductLabelProfileDTOSchema>;
export type ProductAddOnAttachmentDTO = z.infer<typeof ProductAddOnAttachmentDTOSchema>;
export type ProductAddOnAttachmentResponseDTO = z.infer<typeof ProductAddOnAttachmentResponseDTOSchema>;
export type CategoryStatus = CategoryDTO["status"];
export type ProductStatus = ProductDTO["status"];
export type ProductType = ProductDTO["productType"];
export type ProductCodeKind = NonNullable<ProductDTO["productCodeKind"]>;
export type AddOnStatus = AddOnDTO["status"];
export type LabelTemplateStatus = LabelTemplateDTO["status"];
export type ProductAddOnAttachmentStatus = ProductAddOnAttachmentDTO["status"];

export type UpdateProductLabelProfileJSON = z.infer<typeof UpdateProductLabelProfileSchema>;
export type UpdateProductLabelProfileSVC = UpdateProductLabelProfileJSON;

export type ProductLabelProfileREPO = {
    productId: string;
    organizationId: string;
    ingredients?: string | null;
    nutrition?: NutritionRow[] | null;
    netWeight?: string | null;
    unitSellingPriceText?: string | null;
    mrp?: number | null;
    shelfLifeDays?: number | null;
};

export type CreateCategoryJSON = z.infer<typeof CreateCategorySchema>;
export type CreateCategorySVC = CreateCategoryJSON;
export type CreateCategoryREPO = Pick<CategoryDTO, "id" | "organizationId" | "name" | "status" | "sortOrder" | "createdBy"> & {
    updatedBy?: string | null;
};

export type UpdateCategoryJSON = z.infer<typeof UpdateCategorySchema>;
export type UpdateCategorySVC = UpdateCategoryJSON;
export type UpdateCategoryREPO = Pick<CategoryDTO, "id" | "organizationId" | "name" | "status" | "updatedBy">;

export type CreateProductJSON = z.infer<typeof CreateProductSchema>;
export type CreateProductSVC = CreateProductJSON;
export type CreateProductREPO = Pick<
    ProductDTO,
    | "id"
    | "organizationId"
    | "categoryId"
    | "name"
    | "sortOrder"
    | "price"
    | "discount"
    | "productType"
    | "productCode"
    | "productCodeKind"
    | "status"
    | "createdBy"
> & {
    imagePath?: string | null;
    updatedBy?: string | null;
};

export type UpdateProductJSON = z.infer<typeof UpdateProductSchema>;
export type UpdateProductSVC = UpdateProductJSON;
export type ReuseInternalProductCodeJSON = z.infer<typeof ReuseInternalProductCodeSchema>;
export type UpdateProductREPO = Pick<
    ProductDTO,
    | "id"
    | "organizationId"
    | "categoryId"
    | "name"
    | "price"
    | "discount"
    | "productCode"
    | "productCodeKind"
    | "status"
    | "updatedBy"
> & {
    imagePath?: string | null;
    sortOrder?: number;
};

export type ReorderCategoriesJSON = z.infer<typeof ReorderCategoriesSchema>;
export type ReorderProductsJSON = z.infer<typeof ReorderProductsSchema>;

export type CreateBundleProductJSON = z.infer<typeof CreateBundleProductSchema>;
export type CreateBundleProductSVC = CreateBundleProductJSON;

export type UpdateBundleProductJSON = z.infer<typeof UpdateBundleProductSchema>;
export type UpdateBundleProductSVC = UpdateBundleProductJSON;

export type CreateComboProductJSON = z.infer<typeof CreateComboProductSchema>;
export type CreateComboProductSVC = CreateComboProductJSON;
export type UpdateComboProductJSON = z.infer<typeof UpdateComboProductSchema>;
export type UpdateComboProductSVC = UpdateComboProductJSON;

export type CreateBundleProductComponentREPO = Pick<
    BundleProductComponentDTO,
    "id" | "organizationId" | "bundleProductId" | "componentProductId" | "quantity" | "createdBy"
> & {
    updatedBy?: string | null;
};

export type CreateBundleProductComponentAddOnREPO = Pick<
    BundleProductComponentAddOnDTO,
    "id" | "organizationId" | "bundleProductComponentId" | "addOnId" | "quantity" | "createdBy"
> & {
    updatedBy?: string | null;
};

export type CreateComboChoiceGroupREPO = Pick<
    ComboChoiceGroupDTO,
    "id" | "organizationId" | "comboProductId" | "name" | "minSelections" | "maxSelections" | "sortOrder" | "createdBy"
>;

export type CreateComboChoiceOptionREPO = Pick<
    ComboChoiceOptionDTO,
    | "id"
    | "organizationId"
    | "choiceGroupId"
    | "optionProductId"
    | "maxQuantity"
    | "priceAdjustment"
    | "sortOrder"
    | "createdBy"
>;

export type CreateLabelTemplateJSON = z.infer<typeof CreateLabelTemplateSchema>;
export type CreateLabelTemplateSVC = CreateLabelTemplateJSON;
export type CreateLabelTemplateREPO = Pick<
    LabelTemplateDTO,
    | "id"
    | "organizationId"
    | "name"
    | "status"
    | "stock"
    | "keepOuts"
    | "elements"
    | "createdBy"
> & {
    updatedBy?: string | null;
};

export type UpdateLabelTemplateJSON = z.infer<typeof UpdateLabelTemplateSchema>;
export type UpdateLabelTemplateSVC = UpdateLabelTemplateJSON;
export type UpdateLabelTemplateREPO = Pick<
    LabelTemplateDTO,
    | "id"
    | "organizationId"
    | "name"
    | "status"
    | "stock"
    | "keepOuts"
    | "elements"
    | "updatedBy"
>;

export type CreateAddOnJSON = z.infer<typeof CreateAddOnSchema>;
export type CreateAddOnSVC = CreateAddOnJSON;
export type CreateAddOnREPO = Pick<
    AddOnDTO,
    "id" | "organizationId" | "name" | "price" | "discount" | "status" | "createdBy"
> & {
    updatedBy?: string | null;
};

export type UpdateAddOnJSON = z.infer<typeof UpdateAddOnSchema>;
export type UpdateAddOnSVC = UpdateAddOnJSON;
export type UpdateAddOnREPO = Pick<
    AddOnDTO,
    "id" | "organizationId" | "name" | "price" | "discount" | "status" | "updatedBy"
>;

export type CreateProductAddOnAttachmentJSON = z.infer<typeof CreateProductAddOnAttachmentSchema>;
export type CreateProductAddOnAttachmentSVC = CreateProductAddOnAttachmentJSON;
export type CreateProductAddOnAttachmentREPO = Pick<
    ProductAddOnAttachmentDTO,
    "id" | "organizationId" | "productId" | "addOnId" | "selectionCap" | "status" | "createdBy"
> & {
    updatedBy?: string | null;
};

export type UpdateProductAddOnAttachmentJSON = z.infer<typeof UpdateProductAddOnAttachmentSchema>;
export type UpdateProductAddOnAttachmentSVC = UpdateProductAddOnAttachmentJSON;
export type UpdateProductAddOnAttachmentREPO = Pick<
    ProductAddOnAttachmentDTO,
    "id" | "organizationId" | "productId" | "selectionCap" | "status" | "updatedBy"
>;

export type CategoriesListResponse = {
    categories: CategoryDTO[];
};

export type InactiveProductCode = {
    productCode: string;
    productName: string;
};

export type CategoryResponse = {
    category: CategoryDTO;
};

export type ProductsListResponse = {
    products: ProductResponseDTO[];
    inactiveProductCodes?: InactiveProductCode[];
};

export type ProductResponse = {
    product: ProductResponseDTO;
};

export type BundleProductResponse = {
    product: ProductResponseDTO;
    components: BundleProductComponentResponseDTO[];
};

export type ComboProductResponse = {
    product: ProductResponseDTO;
    choiceGroups: ComboChoiceGroupResponseDTO[];
};

export type ComboProductsListResponse = {
    combos: ComboProductResponse[];
};

export type AddOnsListResponse = {
    addOns: AddOnDTO[];
};

export type AddOnResponse = {
    addOn: AddOnDTO;
};

export type LabelTemplatesListResponse = {
    labelTemplates: LabelTemplateDTO[];
};

export type LabelTemplateResponse = {
    labelTemplate: LabelTemplateDTO;
};

export type ProductAddOnAttachmentsListResponse = {
    attachments: ProductAddOnAttachmentResponseDTO[];
};

export type ProductAddOnAttachmentResponse = {
    attachment: ProductAddOnAttachmentResponseDTO;
};
