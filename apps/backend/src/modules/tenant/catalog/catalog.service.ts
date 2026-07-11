import {
    STATUS_CODES,
    type AddOnResponse,
    type AddOnsListResponse,
    type BundleProductResponse,
    type CategoriesListResponse,
    type CategoryResponse,
    type CreateAddOnSVC,
    type CreateBundleProductSVC,
    type CreateCategorySVC,
    type CreateProductAddOnAttachmentSVC,
    type CreateProductSVC,
    type DeviceSessionDTO,
    type ProductAddOnAttachmentResponse,
    type ProductAddOnAttachmentResponseDTO,
    type ProductAddOnAttachmentsListResponse,
    type ProductDTO,
    type ProductResponse,
    type ProductResponseDTO,
    type ProductsListResponse,
    type ServiceResponse,
    type UpdateAddOnSVC,
    type UpdateBundleProductSVC,
    type UpdateCategorySVC,
    type UpdateProductAddOnAttachmentSVC,
    type UpdateProductSVC,
} from "@repo/types";
import { pg } from "@/config/db";
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
    const products = await catalogRepository.getActiveProductsByOrganizationId(session.organization.id);
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
        productType: "single",
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

    if (existingProduct.status === "active" && nextStatus === "inactive") {
        const activeBundleCount = await catalogRepository.countActiveBundlesByComponentProductId(
            organizationId,
            productId,
        );
        if (activeBundleCount > 0) {
            return {
                status: "error",
                message: "Product cannot be inactivated while it is used by an active bundle",
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

type BundleComponentAddOnInput = {
    addOnId: string;
    quantity: number;
};

type BundleComponentInput = {
    productId: string;
    quantity: number;
    addOns?: BundleComponentAddOnInput[];
};

type ValidatedBundleComponent = {
    productId: string;
    quantity: number;
    addOns: BundleComponentAddOnInput[];
};

const buildBundleComponentAddOnSignature = (addOns: BundleComponentAddOnInput[]) => {
    if (addOns.length === 0) {
        return "";
    }

    return [...addOns]
        .sort((left, right) => left.addOnId.localeCompare(right.addOnId))
        .map((addOn) => `${addOn.addOnId}:${addOn.quantity}`)
        .join("|");
};

const buildBundleComponentSignature = (component: ValidatedBundleComponent) =>
    `${component.productId}::${buildBundleComponentAddOnSignature(component.addOns)}`;

const normalizeBundleComponentAddOns = (
    addOns: BundleComponentAddOnInput[] | undefined,
):
    | { error: ServiceResponse<null>; addOns?: undefined }
    | { error?: undefined; addOns: BundleComponentAddOnInput[] } => {
    const selectedAddOns = (addOns ?? []).map((addOn) => ({
        addOnId: addOn.addOnId,
        quantity: Number(addOn.quantity),
    }));

    const seenAddOnIds = new Set<string>();
    for (const addOn of selectedAddOns) {
        if (!Number.isInteger(addOn.quantity) || addOn.quantity < 1) {
            return {
                error: {
                    status: "error",
                    message: "Bundle add-on quantity must be a whole number of at least 1",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        if (seenAddOnIds.has(addOn.addOnId)) {
            return {
                error: {
                    status: "error",
                    message: "Duplicate add-ons are not allowed on the same bundle product component",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        seenAddOnIds.add(addOn.addOnId);
    }

    return {
        addOns: [...selectedAddOns].sort((left, right) => left.addOnId.localeCompare(right.addOnId)),
    };
};

const mergeIdenticalBundleComponents = (
    components: ValidatedBundleComponent[],
): ValidatedBundleComponent[] => {
    const mergedBySignature = new Map<string, ValidatedBundleComponent>();

    for (const component of components) {
        const signature = buildBundleComponentSignature(component);
        const existing = mergedBySignature.get(signature);

        if (existing) {
            mergedBySignature.set(signature, {
                ...existing,
                quantity: existing.quantity + component.quantity,
            });
            continue;
        }

        mergedBySignature.set(signature, component);
    }

    return [...mergedBySignature.values()];
};

const validateBundleComponents = async (
    organizationId: string,
    components: BundleComponentInput[],
): Promise<ServiceResponse<null> | { status: "success"; components: ValidatedBundleComponent[] }> => {
    if (components.length === 0) {
        return {
            status: "error",
            message: "A bundle must include at least one product component",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const validatedComponents: ValidatedBundleComponent[] = [];

    for (const component of components) {
        const product = await getProductForOrganization(organizationId, component.productId);
        if (!product) {
            return {
                status: "error",
                message: "Bundle component product not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        if (product.productType === "bundle") {
            return {
                status: "error",
                message: "Bundles cannot contain other bundles",
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            };
        }

        if (product.status !== "active") {
            return {
                status: "error",
                message: "Bundle components must be active products",
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            };
        }

        const normalizedAddOns = normalizeBundleComponentAddOns(component.addOns);
        if (normalizedAddOns.error) {
            return normalizedAddOns.error;
        }

        for (const addOn of normalizedAddOns.addOns) {
            const attachment = await catalogRepository.getSelectableProductAddOnAttachmentByProductAndAddOn(
                organizationId,
                component.productId,
                addOn.addOnId,
            );

            if (!attachment) {
                return {
                    status: "error",
                    message: "Bundle add-ons must use an active product add-on attachment",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                };
            }

            if (addOn.quantity > attachment.selectionCap) {
                return {
                    status: "error",
                    message: "Bundle add-on quantity exceeds the add-on selection cap",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                };
            }
        }

        validatedComponents.push({
            productId: component.productId,
            quantity: Number(component.quantity),
            addOns: normalizedAddOns.addOns,
        });
    }

    return {
        status: "success",
        components: mergeIdenticalBundleComponents(validatedComponents),
    };
};

const loadBundleComponentsWithAddOns = async (
    organizationId: string,
    bundleProductId: string,
    tx?: Bun.TransactionSQL,
) => {
    const components = await catalogRepository.getBundleProductComponentsByBundleProductId(
        organizationId,
        bundleProductId,
        tx,
    );
    const addOns = await catalogRepository.getBundleProductComponentAddOnsByComponentIds(
        organizationId,
        components.map((component) => component.id),
        tx,
    );
    const addOnsByComponentId = new Map<string, typeof addOns>();

    for (const addOn of addOns) {
        const existing = addOnsByComponentId.get(addOn.bundleProductComponentId) ?? [];
        existing.push(addOn);
        addOnsByComponentId.set(addOn.bundleProductComponentId, existing);
    }

    return components.map((component) => ({
        ...component,
        addOns: addOnsByComponentId.get(component.id) ?? [],
    }));
};

const persistBundleComponents = async (
    organizationId: string,
    bundleProductId: string,
    userId: string,
    components: ValidatedBundleComponent[],
    tx: Bun.TransactionSQL,
) => {
    const createdComponents = [];

    for (const component of components) {
        const row = await catalogRepository.createBundleProductComponent(
            {
                id: crypto.randomUUID(),
                organizationId,
                bundleProductId,
                componentProductId: component.productId,
                quantity: component.quantity,
                createdBy: userId,
            },
            tx,
        );

        if (!row) {
            throw new Error("Failed to create bundle product component");
        }

        const createdAddOns = [];
        for (const addOn of component.addOns) {
            const addOnRow = await catalogRepository.createBundleProductComponentAddOn(
                {
                    id: crypto.randomUUID(),
                    organizationId,
                    bundleProductComponentId: row.id,
                    addOnId: addOn.addOnId,
                    quantity: addOn.quantity,
                    createdBy: userId,
                },
                tx,
            );

            if (!addOnRow) {
                throw new Error("Failed to create bundle product component add-on");
            }

            createdAddOns.push(addOnRow);
        }

        createdComponents.push({
            ...row,
            addOns: createdAddOns,
        });
    }

    return createdComponents;
};

export const createBundleProduct = async (
    userId: string,
    organizationId: string,
    bundleData: CreateBundleProductSVC,
): Promise<ServiceResponse<BundleProductResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const category = await getCategoryForOrganization(organizationId, bundleData.categoryId);
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
        bundleData.categoryId,
        bundleData.name,
    );
    if (alreadyExists) {
        return {
            status: "error",
            message: "Product with the same name already exists in this category",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const validatedComponents = await validateBundleComponents(organizationId, bundleData.components);
    if (validatedComponents.status === "error") {
        return validatedComponents;
    }

    const bundleProductId = crypto.randomUUID();
    let createdProduct: ProductDTO | null = null;
    let createdComponents: Awaited<ReturnType<typeof loadBundleComponentsWithAddOns>> = [];

    try {
        await pg.begin(async (tx) => {
            createdProduct = await catalogRepository.createProduct(
                {
                    id: bundleProductId,
                    organizationId,
                    categoryId: bundleData.categoryId,
                    name: bundleData.name,
                    price: bundleData.price,
                    discount: bundleData.discount ?? 0,
                    imagePath: normalizeOptionalText(bundleData.imagePath),
                    productType: "bundle",
                    status: bundleData.status ?? "active",
                    createdBy: userId,
                },
                tx,
            );

            if (!createdProduct) {
                throw new Error("Failed to create bundle product");
            }

            createdComponents = await persistBundleComponents(
                organizationId,
                bundleProductId,
                userId,
                validatedComponents.components,
                tx,
            );
        });
    } catch {
        return {
            status: "error",
            message: "Failed to create bundle product",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    if (!createdProduct) {
        return {
            status: "error",
            message: "Failed to create bundle product",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: {
            product: await resolveProduct(createdProduct),
            components: createdComponents,
        },
        message: "Bundle product created successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const getBundleProductDetails = async (
    userId: string,
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<BundleProductResponse | null>> => {
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
    if (!product || product.productType !== "bundle") {
        return {
            status: "error",
            message: "Bundle product not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const components = await loadBundleComponentsWithAddOns(organizationId, productId);

    return {
        status: "success",
        data: {
            product: await resolveProduct(product),
            components,
        },
        message: "Bundle product fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const updateBundleProduct = async (
    userId: string,
    organizationId: string,
    productId: string,
    bundleData: UpdateBundleProductSVC,
): Promise<ServiceResponse<BundleProductResponse | null>> => {
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
    if (!existingProduct || existingProduct.productType !== "bundle") {
        return {
            status: "error",
            message: "Bundle product not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const nextCategoryId = bundleData.categoryId ?? existingProduct.categoryId;
    const nextName = bundleData.name ?? existingProduct.name;
    const nextPrice = bundleData.price ?? existingProduct.price;
    const nextDiscount = bundleData.discount ?? existingProduct.discount;
    const nextStatus = bundleData.status ?? existingProduct.status;
    const nextImagePath = bundleData.imagePath === undefined
        ? existingProduct.imagePath ?? null
        : normalizeOptionalText(bundleData.imagePath);

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

    let nextComponents: ValidatedBundleComponent[] | null = null;
    if (bundleData.components !== undefined) {
        const validatedComponents = await validateBundleComponents(organizationId, bundleData.components);
        if (validatedComponents.status === "error") {
            return validatedComponents;
        }
        nextComponents = validatedComponents.components;
    }

    let updatedProduct: ProductDTO | null = null;
    let components = await loadBundleComponentsWithAddOns(organizationId, productId);

    try {
        await pg.begin(async (tx) => {
            updatedProduct = await catalogRepository.updateProduct(
                {
                    id: productId,
                    organizationId,
                    categoryId: nextCategoryId,
                    name: nextName,
                    price: nextPrice,
                    discount: nextDiscount,
                    imagePath: nextImagePath,
                    status: nextStatus,
                    updatedBy: userId,
                },
                tx,
            );

            if (!updatedProduct) {
                throw new Error("Failed to update bundle product");
            }

            if (nextComponents) {
                await catalogRepository.deleteBundleProductComponentsByBundleProductId(
                    organizationId,
                    productId,
                    tx,
                );
                components = await persistBundleComponents(
                    organizationId,
                    productId,
                    userId,
                    nextComponents,
                    tx,
                );
            }
        });
    } catch {
        return {
            status: "error",
            message: "Failed to update bundle product",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    if (!updatedProduct) {
        return {
            status: "error",
            message: "Failed to update bundle product",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    if (existingProduct.imagePath && existingProduct.imagePath !== updatedProduct.imagePath) {
        await deleteProductImageIfPossible(existingProduct.imagePath);
    }

    return {
        status: "success",
        data: {
            product: await resolveProduct(updatedProduct),
            components,
        },
        message: "Bundle product updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const getAddOnForOrganization = async (organizationId: string, addOnId: string) => {
    return catalogRepository.getAddOnById(organizationId, addOnId);
};

const resolveAttachmentResponse = async (
    organizationId: string,
    productId: string,
    attachmentId: string,
): Promise<ProductAddOnAttachmentResponseDTO | null> => {
    return catalogRepository.getProductAddOnAttachmentById(organizationId, productId, attachmentId);
};

export const getAddOns = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<AddOnsListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const addOns = await catalogRepository.getAddOnsByOrganizationId(organizationId);
    return {
        status: "success",
        data: { addOns },
        message: "Add-ons fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getAddOnsForDevice = async (
    session: DeviceSessionDTO,
): Promise<ServiceResponse<AddOnsListResponse | null>> => {
    const addOns = await catalogRepository.getActiveAddOnsByOrganizationId(session.organization.id);
    return {
        status: "success",
        data: { addOns },
        message: "Add-ons fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createAddOn = async (
    userId: string,
    organizationId: string,
    addOnData: CreateAddOnSVC,
): Promise<ServiceResponse<AddOnResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const alreadyExists = await catalogRepository.addOnNameExistsInOrganization(organizationId, addOnData.name);
    if (alreadyExists) {
        return {
            status: "error",
            message: "Add-on with the same name already exists in this organization",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const addOn = await catalogRepository.createAddOn({
        id: crypto.randomUUID(),
        organizationId,
        name: addOnData.name,
        price: addOnData.price,
        discount: addOnData.discount ?? 0,
        status: addOnData.status ?? "active",
        createdBy: userId,
    });

    if (!addOn) {
        return {
            status: "error",
            message: "Failed to create add-on",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { addOn },
        message: "Add-on created successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const getAddOnDetails = async (
    userId: string,
    organizationId: string,
    addOnId: string,
): Promise<ServiceResponse<AddOnResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const addOn = await getAddOnForOrganization(organizationId, addOnId);
    if (!addOn) {
        return {
            status: "error",
            message: "Add-on not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return {
        status: "success",
        data: { addOn },
        message: "Add-on fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const updateAddOn = async (
    userId: string,
    organizationId: string,
    addOnId: string,
    addOnData: UpdateAddOnSVC,
): Promise<ServiceResponse<AddOnResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const existingAddOn = await getAddOnForOrganization(organizationId, addOnId);
    if (!existingAddOn) {
        return {
            status: "error",
            message: "Add-on not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const nextName = addOnData.name ?? existingAddOn.name;
    const nextPrice = addOnData.price ?? existingAddOn.price;
    const nextDiscount = addOnData.discount ?? existingAddOn.discount;
    const nextStatus = addOnData.status ?? existingAddOn.status;

    if (nextName.toLowerCase() !== existingAddOn.name.toLowerCase()) {
        const alreadyExists = await catalogRepository.addOnNameExistsInOrganization(
            organizationId,
            nextName,
            addOnId,
        );
        if (alreadyExists) {
            return {
                status: "error",
                message: "Add-on with the same name already exists in this organization",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    if (existingAddOn.status === "active" && nextStatus === "inactive") {
        const activeBundleCount = await catalogRepository.countActiveBundlesByComponentAddOnId(
            organizationId,
            addOnId,
        );
        if (activeBundleCount > 0) {
            return {
                status: "error",
                message: "Add-on cannot be inactivated while it is used by an active bundle",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    const addOn = await catalogRepository.updateAddOn({
        id: addOnId,
        organizationId,
        name: nextName,
        price: nextPrice,
        discount: nextDiscount,
        status: nextStatus,
        updatedBy: userId,
    });

    if (!addOn) {
        return {
            status: "error",
            message: "Failed to update add-on",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { addOn },
        message: "Add-on updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const deleteAddOn = async (
    userId: string,
    organizationId: string,
    addOnId: string,
): Promise<ServiceResponse<AddOnResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const existingAddOn = await getAddOnForOrganization(organizationId, addOnId);
    if (!existingAddOn) {
        return {
            status: "error",
            message: "Add-on not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const attachmentCount = await catalogRepository.countAttachmentsByAddOnId(organizationId, addOnId);
    if (attachmentCount > 0) {
        return {
            status: "error",
            message: "Add-on cannot be deleted while it is still attached to products",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const saleItemAddOnCount = await catalogRepository.countSaleItemAddOnsByAddOnId(
        organizationId,
        addOnId,
    );
    if (saleItemAddOnCount > 0) {
        return {
            status: "error",
            message: "Add-on cannot be deleted because it has sales history. Set it to inactive instead.",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const addOn = await catalogRepository.deleteAddOn(organizationId, addOnId);
    if (!addOn) {
        return {
            status: "error",
            message: "Failed to delete add-on",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { addOn },
        message: "Add-on deleted successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getProductAddOnAttachments = async (
    userId: string,
    organizationId: string,
    productId: string,
): Promise<ServiceResponse<ProductAddOnAttachmentsListResponse | null>> => {
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

    const attachments = await catalogRepository.getProductAddOnAttachmentsByProductId(organizationId, productId);
    return {
        status: "success",
        data: { attachments },
        message: "Product add-on attachments fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getSelectableProductAddOnAttachmentsForDevice = async (
    session: DeviceSessionDTO,
): Promise<ServiceResponse<ProductAddOnAttachmentsListResponse | null>> => {
    const attachments = await catalogRepository.getSelectableProductAddOnAttachmentsByOrganizationId(
        session.organization.id,
    );
    return {
        status: "success",
        data: { attachments },
        message: "Product add-on attachments fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createProductAddOnAttachment = async (
    userId: string,
    organizationId: string,
    productId: string,
    attachmentData: CreateProductAddOnAttachmentSVC,
): Promise<ServiceResponse<ProductAddOnAttachmentResponse | null>> => {
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

    if (product.productType === "bundle") {
        return {
            status: "error",
            message: "Add-ons cannot be attached directly to bundle products",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const addOn = await getAddOnForOrganization(organizationId, attachmentData.addOnId);
    if (!addOn) {
        return {
            status: "error",
            message: "Add-on not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const alreadyExists = await catalogRepository.productAddOnAttachmentExists(
        organizationId,
        productId,
        attachmentData.addOnId,
    );
    if (alreadyExists) {
        return {
            status: "error",
            message: "This add-on is already attached to the product",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const created = await catalogRepository.createProductAddOnAttachment({
        id: crypto.randomUUID(),
        organizationId,
        productId,
        addOnId: attachmentData.addOnId,
        selectionCap: attachmentData.selectionCap ?? 1,
        status: attachmentData.status ?? "active",
        createdBy: userId,
    });

    if (!created) {
        return {
            status: "error",
            message: "Failed to create product add-on attachment",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    const attachment = await resolveAttachmentResponse(organizationId, productId, created.id);
    if (!attachment) {
        return {
            status: "error",
            message: "Failed to load product add-on attachment",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { attachment },
        message: "Product add-on attachment created successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const updateProductAddOnAttachment = async (
    userId: string,
    organizationId: string,
    productId: string,
    attachmentId: string,
    attachmentData: UpdateProductAddOnAttachmentSVC,
): Promise<ServiceResponse<ProductAddOnAttachmentResponse | null>> => {
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

    const existingAttachment = await catalogRepository.getProductAddOnAttachmentById(
        organizationId,
        productId,
        attachmentId,
    );
    if (!existingAttachment) {
        return {
            status: "error",
            message: "Product add-on attachment not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const nextSelectionCap = attachmentData.selectionCap ?? existingAttachment.selectionCap;
    const nextStatus = attachmentData.status ?? existingAttachment.status;

    if (existingAttachment.status === "active" && nextStatus === "inactive") {
        const activeBundleCount = await catalogRepository.countActiveBundlesByProductAddOnPair(
            organizationId,
            productId,
            existingAttachment.addOnId,
        );
        if (activeBundleCount > 0) {
            return {
                status: "error",
                message: "Product add-on attachment cannot be deactivated while it is used by an active bundle",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    if (existingAttachment.status === "active"
        && nextStatus === "active"
        && nextSelectionCap < existingAttachment.selectionCap) {
        const invalidatedBundleCount = await catalogRepository.countActiveBundlesByProductAddOnPairAboveQuantity(
            organizationId,
            productId,
            existingAttachment.addOnId,
            nextSelectionCap,
        );
        if (invalidatedBundleCount > 0) {
            return {
                status: "error",
                message: "Product add-on attachment selection cap cannot be reduced below quantities used by active bundles",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    const updated = await catalogRepository.updateProductAddOnAttachment({
        id: attachmentId,
        organizationId,
        productId,
        selectionCap: nextSelectionCap,
        status: nextStatus,
        updatedBy: userId,
    });

    if (!updated) {
        return {
            status: "error",
            message: "Failed to update product add-on attachment",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    const attachment = await resolveAttachmentResponse(organizationId, productId, attachmentId);
    if (!attachment) {
        return {
            status: "error",
            message: "Failed to load product add-on attachment",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { attachment },
        message: "Product add-on attachment updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const deleteProductAddOnAttachment = async (
    userId: string,
    organizationId: string,
    productId: string,
    attachmentId: string,
): Promise<ServiceResponse<ProductAddOnAttachmentResponse | null>> => {
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

    const existingAttachment = await catalogRepository.getProductAddOnAttachmentById(
        organizationId,
        productId,
        attachmentId,
    );
    if (!existingAttachment) {
        return {
            status: "error",
            message: "Product add-on attachment not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const activeBundleCount = await catalogRepository.countActiveBundlesByProductAddOnPair(
        organizationId,
        productId,
        existingAttachment.addOnId,
    );
    if (activeBundleCount > 0) {
        return {
            status: "error",
            message: "Product add-on attachment cannot be deleted while it is used by an active bundle",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const deleted = await catalogRepository.deleteProductAddOnAttachment(
        organizationId,
        productId,
        attachmentId,
    );
    if (!deleted) {
        return {
            status: "error",
            message: "Failed to delete product add-on attachment",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { attachment: existingAttachment },
        message: "Product add-on attachment deleted successfully",
        code: STATUS_CODES.SUCCESS,
    };
};
