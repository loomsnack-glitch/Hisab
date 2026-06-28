import {
    STATUS_CODES,
    type CategoriesListResponse,
    type CategoryResponse,
    type CreateCategorySVC,
    type CreateProductSVC,
    type DeviceSessionDTO,
    type ProductDTO,
    type ProductResponse,
    type ProductResponseDTO,
    type ProductsListResponse,
    type ServiceResponse,
    type UpdateCategorySVC,
    type UpdateProductSVC,
} from "@repo/types";
import { deleteObject, generateSignedUrl } from "@/services/storage";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as catalogRepository from "./catalog.repository";

const storageBucketName = (
    process.env.STORAGE_PROVIDER === "s3"
        ? process.env.AWS_BUCKET_NAME
        : process.env.MINIO_BUCKET_NAME
) || "";

const normalizeOptionalText = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const getOrganizationForUser = async (organizationId: string, userId: string) => {
    return organizationRepository.getOrganizationByIdForUser(organizationId, userId);
};

const getSignedUrlIfPossible = async (path?: string | null): Promise<string | null> => {
    if (!storageBucketName || !path || path.startsWith("icon:")) {
        return null;
    }

    try {
        return await generateSignedUrl(storageBucketName, path);
    } catch (error) {
        console.log("Error generating signed URL for product image:", error);
        return null;
    }
};

const deleteProductImageIfPossible = async (path?: string | null) => {
    if (!storageBucketName || !path) {
        return;
    }

    try {
        await deleteObject(storageBucketName, path);
    } catch (error) {
        console.log(`Failed to delete product image object: ${path}`, error);
    }
};

const resolveProduct = async (product: ProductDTO): Promise<ProductResponseDTO> => ({
    ...product,
    imageSignedUrl: await getSignedUrlIfPossible(product.imagePath),
});

const resolveProducts = async (products: ProductDTO[]): Promise<ProductResponseDTO[]> => {
    return Promise.all(products.map(resolveProduct));
};

const getCategoryForOrganization = async (organizationId: string, categoryId: string) => {
    return catalogRepository.getCategoryById(organizationId, categoryId);
};

const getProductForOrganization = async (organizationId: string, productId: string) => {
    return catalogRepository.getProductById(organizationId, productId);
};

export const getCategories = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<CategoriesListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const categories = await catalogRepository.getCategoriesByOrganizationId(organizationId);
    return {
        status: "success",
        data: { categories },
        message: "Categories fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createCategory = async (
    userId: string,
    organizationId: string,
    categoryData: CreateCategorySVC,
): Promise<ServiceResponse<CategoryResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const alreadyExists = await catalogRepository.categoryNameExistsInOrganization(organizationId, categoryData.name);
    if (alreadyExists) {
        return {
            status: "error",
            message: "Category with the same name already exists in this organization",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const category = await catalogRepository.createCategory({
        id: crypto.randomUUID(),
        organizationId,
        name: categoryData.name,
        status: categoryData.status ?? "active",
        createdBy: userId,
    });

    if (!category) {
        return {
            status: "error",
            message: "Failed to create category",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { category },
        message: "Category created successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const getCategoryDetails = async (
    userId: string,
    organizationId: string,
    categoryId: string,
): Promise<ServiceResponse<CategoryResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const category = await getCategoryForOrganization(organizationId, categoryId);
    if (!category) {
        return {
            status: "error",
            message: "Category not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return {
        status: "success",
        data: { category },
        message: "Category fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const updateCategory = async (
    userId: string,
    organizationId: string,
    categoryId: string,
    categoryData: UpdateCategorySVC,
): Promise<ServiceResponse<CategoryResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const existingCategory = await getCategoryForOrganization(organizationId, categoryId);
    if (!existingCategory) {
        return {
            status: "error",
            message: "Category not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const nextName = categoryData.name ?? existingCategory.name;
    const nextStatus = categoryData.status ?? existingCategory.status;

    if (nextName.toLowerCase() !== existingCategory.name.toLowerCase()) {
        const alreadyExists = await catalogRepository.categoryNameExistsInOrganization(
            organizationId,
            nextName,
            categoryId,
        );

        if (alreadyExists) {
            return {
                status: "error",
                message: "Category with the same name already exists in this organization",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    const category = await catalogRepository.updateCategory({
        id: categoryId,
        organizationId,
        name: nextName,
        status: nextStatus,
        updatedBy: userId,
    });

    if (!category) {
        return {
            status: "error",
            message: "Failed to update category",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { category },
        message: "Category updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const deleteCategory = async (
    userId: string,
    organizationId: string,
    categoryId: string,
): Promise<ServiceResponse<CategoryResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const existingCategory = await getCategoryForOrganization(organizationId, categoryId);
    if (!existingCategory) {
        return {
            status: "error",
            message: "Category not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const productCount = await catalogRepository.countProductsByCategoryId(organizationId, categoryId);
    if (productCount > 0) {
        return {
            status: "error",
            message: "Category cannot be deleted while it still has products",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const category = await catalogRepository.deleteCategory(organizationId, categoryId);
    if (!category) {
        return {
            status: "error",
            message: "Failed to delete category",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { category },
        message: "Category deleted successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getProducts = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<ProductsListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const products = await catalogRepository.getProductsByOrganizationId(organizationId);
    return {
        status: "success",
        data: { products: await resolveProducts(products) },
        message: "Products fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getCategoriesForDevice = async (
    session: DeviceSessionDTO,
): Promise<ServiceResponse<CategoriesListResponse | null>> => {
    const categories = await catalogRepository.getCategoriesByOrganizationId(session.organization.id);
    return {
        status: "success",
        data: { categories },
        message: "Categories fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getProductsForDevice = async (
    session: DeviceSessionDTO,
): Promise<ServiceResponse<ProductsListResponse | null>> => {
    const products = await catalogRepository.getProductsByOrganizationId(session.organization.id);
    return {
        status: "success",
        data: { products: await resolveProducts(products) },
        message: "Products fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getCategoryProducts = async (
    userId: string,
    organizationId: string,
    categoryId: string,
): Promise<ServiceResponse<ProductsListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const category = await getCategoryForOrganization(organizationId, categoryId);
    if (!category) {
        return {
            status: "error",
            message: "Category not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const products = await catalogRepository.getProductsByCategoryId(organizationId, categoryId);
    return {
        status: "success",
        data: { products: await resolveProducts(products) },
        message: "Products fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createProduct = async (
    userId: string,
    organizationId: string,
    productData: CreateProductSVC,
): Promise<ServiceResponse<ProductResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const category = await getCategoryForOrganization(organizationId, productData.categoryId);
    if (!category) {
        return {
            status: "error",
            message: "Category not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const alreadyExists = await catalogRepository.productNameExistsInCategory(
        organizationId,
        productData.categoryId,
        productData.name,
    );
    if (alreadyExists) {
        return {
            status: "error",
            message: "Product with the same name already exists in this category",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const product = await catalogRepository.createProduct({
        id: crypto.randomUUID(),
        organizationId,
        categoryId: productData.categoryId,
        name: productData.name,
        price: productData.price,
        discount: productData.discount ?? 0,
        imagePath: normalizeOptionalText(productData.imagePath),
        status: productData.status ?? "active",
        createdBy: userId,
    });

    if (!product) {
        return {
            status: "error",
            message: "Failed to create product",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { product: await resolveProduct(product) },
        message: "Product created successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const getProductDetails = async (
    userId: string,
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<ProductResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const product = await getProductForOrganization(organizationId, productId);
    if (!product) {
        return {
            status: "error",
            message: "Product not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return {
        status: "success",
        data: { product: await resolveProduct(product) },
        message: "Product fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const updateProduct = async (
    userId: string,
    organizationId: string,
    productId: string,
    productData: UpdateProductSVC,
): Promise<ServiceResponse<ProductResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const existingProduct = await getProductForOrganization(organizationId, productId);
    if (!existingProduct) {
        return {
            status: "error",
            message: "Product not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const nextCategoryId = productData.categoryId ?? existingProduct.categoryId;
    const nextName = productData.name ?? existingProduct.name;
    const nextPrice = productData.price ?? existingProduct.price;
    const nextDiscount = productData.discount ?? existingProduct.discount;
    const nextStatus = productData.status ?? existingProduct.status;
    const nextImagePath = productData.imagePath === undefined
        ? existingProduct.imagePath ?? null
        : normalizeOptionalText(productData.imagePath);

    const category = await getCategoryForOrganization(organizationId, nextCategoryId);
    if (!category) {
        return {
            status: "error",
            message: "Category not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const categoryChanged = nextCategoryId !== existingProduct.categoryId;
    const nameChanged = nextName.toLowerCase() !== existingProduct.name.toLowerCase();
    if (categoryChanged || nameChanged) {
        const alreadyExists = await catalogRepository.productNameExistsInCategory(
            organizationId,
            nextCategoryId,
            nextName,
            productId,
        );
        if (alreadyExists) {
            return {
                status: "error",
                message: "Product with the same name already exists in this category",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    const product = await catalogRepository.updateProduct({
        id: productId,
        organizationId,
        categoryId: nextCategoryId,
        name: nextName,
        price: nextPrice,
        discount: nextDiscount,
        imagePath: nextImagePath,
        status: nextStatus,
        updatedBy: userId,
    });

    if (!product) {
        return {
            status: "error",
            message: "Failed to update product",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    if (existingProduct.imagePath && existingProduct.imagePath !== product.imagePath) {
        await deleteProductImageIfPossible(existingProduct.imagePath);
    }

    return {
        status: "success",
        data: { product: await resolveProduct(product) },
        message: "Product updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const deleteProduct = async (
    userId: string,
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<ProductResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const existingProduct = await getProductForOrganization(organizationId, productId);
    if (!existingProduct) {
        return {
            status: "error",
            message: "Product not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const product = await catalogRepository.deleteProduct(organizationId, productId);
    if (!product) {
        return {
            status: "error",
            message: "Failed to delete product",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    await deleteProductImageIfPossible(existingProduct.imagePath);

    return {
        status: "success",
        data: {
            product: {
                ...product,
                imageSignedUrl: null,
            },
        },
        message: "Product deleted successfully",
        code: STATUS_CODES.SUCCESS,
    };
};
