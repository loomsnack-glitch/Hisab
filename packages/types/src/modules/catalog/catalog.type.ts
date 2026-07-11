import type z from "zod";
import type {
    AddOnDTOSchema,
    BundleProductComponentDTOSchema,
    CategoryDTOSchema,
    CreateAddOnSchema,
    CreateBundleProductSchema,
    CreateCategorySchema,
    CreateProductAddOnAttachmentSchema,
    CreateProductSchema,
    ProductAddOnAttachmentDTOSchema,
    ProductAddOnAttachmentResponseDTOSchema,
    ProductDTOSchema,
    ProductResponseDTOSchema,
    UpdateAddOnSchema,
    UpdateBundleProductSchema,
    UpdateCategorySchema,
    UpdateProductAddOnAttachmentSchema,
    UpdateProductSchema,
} from "./catalog.schema";

export type CategoryDTO = z.infer<typeof CategoryDTOSchema>;
export type ProductDTO = z.infer<typeof ProductDTOSchema>;
export type ProductResponseDTO = z.infer<typeof ProductResponseDTOSchema>;
export type BundleProductComponentDTO = z.infer<typeof BundleProductComponentDTOSchema>;
export type AddOnDTO = z.infer<typeof AddOnDTOSchema>;
export type ProductAddOnAttachmentDTO = z.infer<typeof ProductAddOnAttachmentDTOSchema>;
export type ProductAddOnAttachmentResponseDTO = z.infer<typeof ProductAddOnAttachmentResponseDTOSchema>;
export type CategoryStatus = CategoryDTO["status"];
export type ProductStatus = ProductDTO["status"];
export type ProductType = ProductDTO["productType"];
export type AddOnStatus = AddOnDTO["status"];
export type ProductAddOnAttachmentStatus = ProductAddOnAttachmentDTO["status"];

export type CreateCategoryJSON = z.infer<typeof CreateCategorySchema>;
export type CreateCategorySVC = CreateCategoryJSON;
export type CreateCategoryREPO = Pick<CategoryDTO, "id" | "organizationId" | "name" | "status" | "createdBy"> & {
    updatedBy?: string | null;
};

export type UpdateCategoryJSON = z.infer<typeof UpdateCategorySchema>;
export type UpdateCategorySVC = UpdateCategoryJSON;
export type UpdateCategoryREPO = Pick<
    CategoryDTO,
    "id" | "organizationId" | "name" | "status" | "updatedBy"
>;

export type CreateProductJSON = z.infer<typeof CreateProductSchema>;
export type CreateProductSVC = CreateProductJSON;
export type CreateProductREPO = Pick<
    ProductDTO,
    "id" | "organizationId" | "categoryId" | "name" | "price" | "discount" | "productType" | "status" | "createdBy"
> & {
    imagePath?: string | null;
    updatedBy?: string | null;
};

export type UpdateProductJSON = z.infer<typeof UpdateProductSchema>;
export type UpdateProductSVC = UpdateProductJSON;
export type UpdateProductREPO = Pick<
    ProductDTO,
    "id" | "organizationId" | "categoryId" | "name" | "price" | "discount" | "status" | "updatedBy"
> & {
    imagePath?: string | null;
};

export type CreateBundleProductJSON = z.infer<typeof CreateBundleProductSchema>;
export type CreateBundleProductSVC = CreateBundleProductJSON;

export type UpdateBundleProductJSON = z.infer<typeof UpdateBundleProductSchema>;
export type UpdateBundleProductSVC = UpdateBundleProductJSON;

export type CreateBundleProductComponentREPO = Pick<
    BundleProductComponentDTO,
    "id" | "organizationId" | "bundleProductId" | "componentProductId" | "quantity" | "createdBy"
> & {
    updatedBy?: string | null;
};

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

export type CategoryResponse = {
    category: CategoryDTO;
};

export type ProductsListResponse = {
    products: ProductResponseDTO[];
};

export type ProductResponse = {
    product: ProductResponseDTO;
};

export type BundleProductResponse = {
    product: ProductResponseDTO;
    components: BundleProductComponentDTO[];
};

export type AddOnsListResponse = {
    addOns: AddOnDTO[];
};

export type AddOnResponse = {
    addOn: AddOnDTO;
};

export type ProductAddOnAttachmentsListResponse = {
    attachments: ProductAddOnAttachmentResponseDTO[];
};

export type ProductAddOnAttachmentResponse = {
    attachment: ProductAddOnAttachmentResponseDTO;
};
