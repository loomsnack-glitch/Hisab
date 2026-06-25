import type z from "zod";
import type {
    CategoryDTOSchema,
    CreateCategorySchema,
    CreateProductSchema,
    ProductDTOSchema,
    ProductResponseDTOSchema,
    UpdateCategorySchema,
    UpdateProductSchema,
} from "./catalog.schema";

export type CategoryDTO = z.infer<typeof CategoryDTOSchema>;
export type ProductDTO = z.infer<typeof ProductDTOSchema>;
export type ProductResponseDTO = z.infer<typeof ProductResponseDTOSchema>;
export type CategoryStatus = CategoryDTO["status"];
export type ProductStatus = ProductDTO["status"];

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
    "id" | "organizationId" | "categoryId" | "name" | "price" | "discount" | "status" | "createdBy"
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
