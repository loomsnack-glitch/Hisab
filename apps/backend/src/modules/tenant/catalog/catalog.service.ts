import {
  STATUS_CODES,
  LabelTemplateDocumentSchema,
  UpdateProductLabelProfileSchema,
  type AddOnResponse,
  type AddOnsListResponse,
  type BundleProductResponse,
  type ComboProductResponse,
  type CategoriesListResponse,
  type ComboProductsListResponse,
  type CategoryResponse,
  type CreateAddOnSVC,
  type CreateBundleProductSVC,
  type CreateComboProductSVC,
  type CreateCategorySVC,
  type CreateLabelTemplateSVC,
  type CreateProductAddOnAttachmentSVC,
  type CreateProductSVC,
  type DeviceSessionDTO,
  type LabelTemplateResponse,
  type LabelTemplatesListResponse,
  type ProductAddOnAttachmentResponse,
  type ProductAddOnAttachmentResponseDTO,
  type ProductAddOnAttachmentsListResponse,
  type ProductCodeKind,
  type ProductDTO,
  type ProductResponse,
  type ProductResponseDTO,
  type ProductsListResponse,
  type ReorderCategoriesJSON,
  type ReorderProductsJSON,
  type ReuseInternalProductCodeJSON,
  type ServiceResponse,
  type UpdateAddOnSVC,
  type UpdateBundleProductSVC,
  type UpdateCategorySVC,
  type UpdateComboProductSVC,
  type UpdateLabelTemplateSVC,
  type UpdateProductAddOnAttachmentSVC,
  type UpdateProductLabelProfileSVC,
  type UpdateProductSVC,
  canAssignUnitToCatalogProduct,
  FIXED_BUNDLE_COMBO_DEFAULT_SELLING_QUANTITY,
  PIECE_PREDEFINED_UNIT_KEY,
  type UnitDTO,
  normalizeProductCodeInput,
} from "@repo/types";
import { pg } from "@/config/db";
import { deleteObject, generateSignedUrl } from "@/services/storage";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as unitsRepository from "@/modules/tenant/units/units.repository";
import * as catalogRepository from "./catalog.repository";

const storageBucketName =
  (process.env.STORAGE_PROVIDER === "s3"
    ? process.env.AWS_BUCKET_NAME
    : process.env.MINIO_BUCKET_NAME) || "";

const normalizeOptionalText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export { normalizeProductCodeInput } from "@repo/types";

const unitNotFound = (): ServiceResponse<null> => ({
  status: "error",
  message: "Unit not found",
  data: null,
  code: STATUS_CODES.NOT_FOUND,
});

const inactiveUnitCannotBeAssigned = (): ServiceResponse<null> => ({
  status: "error",
  message: "Inactive Units cannot be assigned",
  data: null,
  code: STATUS_CODES.BAD_REQUEST,
});

const withProductUnitLabel = (
  product: ProductDTO,
  unit: Pick<UnitDTO, "label">,
): ProductDTO => ({
  ...product,
  defaultSellingQuantity: Number(product.defaultSellingQuantity),
  allowCustomSellingQuantity: Boolean(product.allowCustomSellingQuantity),
  unitLabel: unit.label,
});

const resolvePieceUnit = async (
  organizationId: string,
  userId: string,
  tx?: Bun.TransactionSQL,
): Promise<
  | { error: ServiceResponse<null>; unit?: undefined }
  | { error?: undefined; unit: UnitDTO }
> => {
  let unit = await unitsRepository.getUnitByPredefinedKey(
    organizationId,
    PIECE_PREDEFINED_UNIT_KEY,
    tx,
  );
  if (!unit) {
    await unitsRepository.seedDefaultUnits(organizationId, userId, tx);
    unit = await unitsRepository.getUnitByPredefinedKey(
      organizationId,
      PIECE_PREDEFINED_UNIT_KEY,
      tx,
    );
  }
  if (!unit) {
    return {
      error: {
        status: "error",
        message: "Failed to resolve the Piece Unit",
        data: null,
        code: STATUS_CODES.INTERNAL_SERVER_ERROR,
      },
    };
  }
  return { unit };
};

const resolveAssignableProductUnit = async (
  organizationId: string,
  unitId: string,
  currentlyAssigned = false,
): Promise<
  | { error: ServiceResponse<null>; unit?: undefined }
  | { error?: undefined; unit: UnitDTO }
> => {
  const unit = await unitsRepository.getUnitById(organizationId, unitId);
  if (!unit) {
    return { error: unitNotFound() };
  }
  if (
    !canAssignUnitToCatalogProduct({
      unitStatus: unit.status,
      currentlyAssigned,
    })
  ) {
    return { error: inactiveUnitCannotBeAssigned() };
  }
  return { unit };
};

const resolveSingleProductSellingUnit = async (
  organizationId: string,
  userId: string,
  input: { unitId?: string; defaultSellingQuantity?: number },
  existing?: ProductDTO,
): Promise<
  | { error: ServiceResponse<null>; unit?: undefined; defaultSellingQuantity?: undefined }
  | { error?: undefined; unit: UnitDTO; defaultSellingQuantity: number }
> => {
  if (input.unitId) {
    const assigned = await resolveAssignableProductUnit(
      organizationId,
      input.unitId,
      existing ? input.unitId === existing.unitId : false,
    );
    if (assigned.error || !assigned.unit) {
      return { error: assigned.error ?? unitNotFound() };
    }
    return {
      unit: assigned.unit,
      defaultSellingQuantity:
        input.defaultSellingQuantity ??
        Number(existing?.defaultSellingQuantity ?? 1),
    };
  }

  if (existing) {
    const unit = await unitsRepository.getUnitById(
      organizationId,
      existing.unitId,
    );
    if (!unit) {
      return { error: unitNotFound() };
    }
    return {
      unit,
      defaultSellingQuantity:
        input.defaultSellingQuantity ?? Number(existing.defaultSellingQuantity),
    };
  }

  const piece = await resolvePieceUnit(organizationId, userId);
  if (piece.error || !piece.unit) {
    return { error: piece.error ?? unitNotFound() };
  }
  return {
    unit: piece.unit,
    defaultSellingQuantity: input.defaultSellingQuantity ?? 1,
  };
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "23505";

const uniqueViolationMatches = (
  error: unknown,
  constraint: string,
  detailColumns: string,
): boolean => {
  if (
    !isUniqueViolation(error) ||
    typeof error !== "object" ||
    error === null
  ) {
    return false;
  }

  const databaseError = error as {
    constraint?: unknown;
    message?: unknown;
    detail?: unknown;
  };
  return (
    databaseError.constraint === constraint ||
    (typeof databaseError.message === "string" &&
      databaseError.message.includes(constraint)) ||
    (typeof databaseError.detail === "string" &&
      databaseError.detail.includes(detailColumns))
  );
};

const isProductCodeUniqueViolation = (error: unknown): boolean =>
  uniqueViolationMatches(
    error,
    "products_organization_id_product_code_key",
    "(organization_id, product_code)",
  );

const isProductNameUniqueViolation = (error: unknown): boolean =>
  uniqueViolationMatches(
    error,
    "products_organization_id_category_id_name_key",
    "(organization_id, category_id, name)",
  );

const productNameConflictResponse = (): ServiceResponse<null> => ({
  status: "error",
  message: "Product with the same name already exists in this category",
  data: null,
  code: STATUS_CODES.CONFLICT,
});

type ResolvedProductCode = {
  productCode: string | null;
  productCodeKind: ProductCodeKind | null;
};

const duplicateProductCodeMessage = (
  productCode: string,
  productName: string,
) => `Product code ${productCode} is already assigned to "${productName}".`;

const INTERNAL_PRODUCT_CODE_SEQUENCE_LIMIT = 10_000_000_000;

const calculateEan13CheckDigit = (body: string): string => {
  const weightedSum = [...body]
    .reverse()
    .reduce(
      (sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 3 : 1),
      0,
    );
  return String((10 - (weightedSum % 10)) % 10);
};

const buildInternalProductCode = (sequence: number): string => {
  const body = `04${sequence.toString().padStart(10, "0")}`;
  return `${body}${calculateEan13CheckDigit(body)}`;
};

const isValidInternalProductCode = (productCode: string): boolean =>
  /^04\d{11}$/.test(productCode) &&
  calculateEan13CheckDigit(productCode.slice(0, -1)) === productCode.at(-1);

const releasedInternalProductCodeMessage = (productCode: string) =>
  `Internal Product Code ${productCode} was released and must be reused through the dedicated administrator action.`;

const isProductCodeAssignmentError = (
  value: ResolvedProductCode | ServiceResponse<null>,
): value is ServiceResponse<null> => "status" in value;

const resolveManufacturerProductCodeAssignment = (input: {
  productCode?: string | null;
  productCodeKind?: ProductCodeKind | null;
}): ResolvedProductCode | ServiceResponse<null> => {
  const normalized =
    input.productCode === null || input.productCode === undefined
      ? ""
      : normalizeProductCodeInput(input.productCode);

  if (!normalized) {
    return { productCode: null, productCodeKind: null };
  }

  if (normalized.length > 128) {
    return {
      status: "error",
      message: "Product code must be at most 128 characters",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  const requestedKind = input.productCodeKind ?? "manufacturer";
  if (requestedKind === "internal_rcn") {
    return {
      status: "error",
      message: "Internal Product Codes must be generated by Hisab",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  return {
    productCode: normalized,
    productCodeKind: "manufacturer",
  };
};

const ensureProductCodeAvailable = async (
  organizationId: string,
  productCode: string | null,
  excludeProductId?: string,
): Promise<ServiceResponse<null> | null> => {
  if (!productCode) {
    return null;
  }

  const conflicting = await catalogRepository.getProductByCode(
    organizationId,
    productCode,
    excludeProductId,
  );
  if (!conflicting) {
    return null;
  }

  return {
    status: "error",
    message: duplicateProductCodeMessage(productCode, conflicting.name),
    data: null,
    code: STATUS_CODES.CONFLICT,
  };
};

const mapProductCodeUniqueViolation = async (
  organizationId: string,
  productCode: string | null,
  excludeProductId?: string,
): Promise<ServiceResponse<null>> => {
  if (!productCode) {
    return {
      status: "error",
      message: "Failed to save product code",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  const conflicting = await catalogRepository.getProductByCode(
    organizationId,
    productCode,
    excludeProductId,
  );
  return {
    status: "error",
    message: conflicting
      ? duplicateProductCodeMessage(productCode, conflicting.name)
      : `Product code ${productCode} is already assigned to another product.`,
    data: null,
    code: STATUS_CODES.CONFLICT,
  };
};

const ensureNotReleasedInternalProductCode = async (
  organizationId: string,
  productCode: string | null,
): Promise<ServiceResponse<null> | null> => {
  if (!productCode) {
    return null;
  }

  const isReleased = await catalogRepository.isReleasedInternalProductCode(
    organizationId,
    productCode,
  );
  if (!isReleased) {
    return null;
  }

  return {
    status: "error",
    message: releasedInternalProductCodeMessage(productCode),
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
  };
};

const getOrganizationForUser = async (
  organizationId: string,
  userId: string,
) => {
  return organizationRepository.getOrganizationByIdForUser(
    organizationId,
    userId,
  );
};

const getSignedUrlIfPossible = async (
  path?: string | null,
): Promise<string | null> => {
  if (!storageBucketName || !path) {
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

const resolveProduct = async (
  product: ProductDTO,
): Promise<ProductResponseDTO> => {
  const labelProfile =
    await catalogRepository.getProductLabelProfileByProductId(
      product.organizationId,
      product.id,
    );
  const unit =
    product.unitLabel && product.unitLabel.length > 0
      ? { label: product.unitLabel }
      : await unitsRepository.getUnitById(product.organizationId, product.unitId);

  return {
    ...withProductUnitLabel(product, { label: unit?.label ?? "pc" }),
    imageSignedUrl: await getSignedUrlIfPossible(product.imagePath),
    labelProfile,
  };
};

const resolveProducts = async (
  products: ProductDTO[],
): Promise<ProductResponseDTO[]> => {
  if (products.length === 0) {
    return [];
  }

  const firstProduct = products[0];
  if (!firstProduct) {
    return [];
  }

  const [labelProfiles, units] = await Promise.all([
    catalogRepository.getProductLabelProfilesByProductIds(
      firstProduct.organizationId,
      products.map((product) => product.id),
    ),
    unitsRepository.getUnitsByOrganizationId(firstProduct.organizationId),
  ]);
  const unitLabelById = new Map(units.map((unit) => [unit.id, unit.label]));

  return Promise.all(
    products.map(async (product) => ({
      ...withProductUnitLabel(product, {
        label:
          product.unitLabel ||
          unitLabelById.get(product.unitId) ||
          "pc",
      }),
      imageSignedUrl: await getSignedUrlIfPossible(product.imagePath),
      labelProfile: labelProfiles.get(product.id) ?? null,
    })),
  );
};

const getCategoryForOrganization = async (
  organizationId: string,
  categoryId: string,
) => {
  return catalogRepository.getCategoryById(organizationId, categoryId);
};

const getProductForOrganization = async (
  organizationId: string,
  productId: string,
) => {
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

  const categories =
    await catalogRepository.getCategoriesByOrganizationId(organizationId);
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

  const alreadyExists =
    await catalogRepository.categoryNameExistsInOrganization(
      organizationId,
      categoryData.name,
    );
  if (alreadyExists) {
    return {
      status: "error",
      message:
        "Category with the same name already exists in this organization",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  let category: Awaited<ReturnType<typeof catalogRepository.createCategory>> = null;
  await pg.begin(async (tx) => {
    const sortOrder = await catalogRepository.getNextCategorySortOrder(organizationId, tx);
    category = await catalogRepository.createCategory({
      id: crypto.randomUUID(),
      organizationId,
      name: categoryData.name,
      status: categoryData.status ?? "active",
      sortOrder,
      createdBy: userId,
    }, tx);
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

export const reorderCategories = async (
  userId: string,
  organizationId: string,
  orderData: ReorderCategoriesJSON,
): Promise<ServiceResponse<null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }

  const categories = await catalogRepository.getCategoriesByOrganizationId(organizationId);
  const requestedIds = new Set(orderData.categoryIds);
  const categoryIds = new Set(categories.map((category) => category.id));
  if (requestedIds.size !== categoryIds.size || orderData.categoryIds.some((id) => !categoryIds.has(id))) {
    return { status: "error", message: "The category order must include every category exactly once", data: null, code: STATUS_CODES.BAD_REQUEST };
  }

  await pg.begin((tx) => catalogRepository.reorderCategories(organizationId, orderData.categoryIds, userId, tx));
  return { status: "success", message: "Category order updated successfully", data: null, code: STATUS_CODES.SUCCESS };
};

export const reorderProducts = async (
  userId: string,
  organizationId: string,
  orderData: ReorderProductsJSON,
): Promise<ServiceResponse<null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
  }

  const products = await catalogRepository.getProductsByCategoryId(organizationId, orderData.categoryId);
  const requestedIds = new Set(orderData.productIds);
  const productIds = new Set(products.map((product) => product.id));
  if (requestedIds.size !== productIds.size || orderData.productIds.some((id) => !productIds.has(id))) {
    return { status: "error", message: "The product order must include every product in the category exactly once", data: null, code: STATUS_CODES.BAD_REQUEST };
  }

  await pg.begin((tx) => catalogRepository.reorderProducts(organizationId, orderData.categoryId, orderData.productIds, userId, tx));
  return { status: "success", message: "Product order updated successfully", data: null, code: STATUS_CODES.SUCCESS };
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

  const existingCategory = await getCategoryForOrganization(
    organizationId,
    categoryId,
  );
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
    const alreadyExists =
      await catalogRepository.categoryNameExistsInOrganization(
        organizationId,
        nextName,
        categoryId,
      );

    if (alreadyExists) {
      return {
        status: "error",
        message:
          "Category with the same name already exists in this organization",
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

  const existingCategory = await getCategoryForOrganization(
    organizationId,
    categoryId,
  );
  if (!existingCategory) {
    return {
      status: "error",
      message: "Category not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const productCount = await catalogRepository.countProductsByCategoryId(
    organizationId,
    categoryId,
  );
  if (productCount > 0) {
    return {
      status: "error",
      message: "Category cannot be deleted while it still has products",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const category = await catalogRepository.deleteCategory(
    organizationId,
    categoryId,
  );
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

  const [products, activeAddOnCounts] = await Promise.all([
    catalogRepository.getProductsByOrganizationId(organizationId),
    catalogRepository.getActiveProductAddOnCountsByOrganizationId(
      organizationId,
    ),
  ]);
  return {
    status: "success",
    data: {
      products: (await resolveProducts(products)).map((product) => ({
        ...product,
        activeAddOnCount: activeAddOnCounts.get(product.id) ?? 0,
      })),
    },
    message: "Products fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const getCategoriesForDevice = async (
  session: DeviceSessionDTO,
): Promise<ServiceResponse<CategoriesListResponse | null>> => {
  const categories = await catalogRepository.getCategoriesByOrganizationId(
    session.organization.id,
  );
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
  const [products, productsForInactiveCodeLookup] = await Promise.all([
    catalogRepository.getActiveProductsByOrganizationId(
      session.organization.id,
    ),
    catalogRepository.getProductsByOrganizationId(session.organization.id),
  ]);
  const inactiveProductCodes = productsForInactiveCodeLookup.flatMap(
    (product) =>
      product.status === "inactive" && product.productCode
        ? [{ productCode: product.productCode, productName: product.name }]
        : [],
  );
  return {
    status: "success",
    data: {
      products: await resolveProducts(products),
      inactiveProductCodes,
    },
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

  const products = await catalogRepository.getProductsByCategoryId(
    organizationId,
    categoryId,
  );
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

  const category = await getCategoryForOrganization(
    organizationId,
    productData.categoryId,
  );
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

  const codeAssignment =
    productData.productCode === undefined &&
    productData.productCodeKind === undefined
      ? { productCode: null, productCodeKind: null }
      : resolveManufacturerProductCodeAssignment({
          productCode: productData.productCode,
          productCodeKind: productData.productCodeKind,
        });
  if (isProductCodeAssignmentError(codeAssignment)) {
    return codeAssignment;
  }

  const duplicateCodeError = await ensureProductCodeAvailable(
    organizationId,
    codeAssignment.productCode,
  );
  if (duplicateCodeError) {
    return duplicateCodeError;
  }

  const releasedInternalCodeError = await ensureNotReleasedInternalProductCode(
    organizationId,
    codeAssignment.productCode,
  );
  if (releasedInternalCodeError) {
    return releasedInternalCodeError;
  }

  const sellingUnit = await resolveSingleProductSellingUnit(
    organizationId,
    userId,
    {
      unitId: productData.unitId,
      defaultSellingQuantity: productData.defaultSellingQuantity,
    },
  );
  if (sellingUnit.error || !sellingUnit.unit) {
    return sellingUnit.error ?? unitNotFound();
  }

  let product: ProductDTO | null = null;
  try {
    const sortOrder = await catalogRepository.getNextProductSortOrder(
      organizationId,
      productData.categoryId,
    );
    product = await catalogRepository.createProduct({
      id: crypto.randomUUID(),
      organizationId,
      categoryId: productData.categoryId,
      name: productData.name,
      price: productData.price,
      discount: productData.discount ?? 0,
      imagePath: normalizeOptionalText(productData.imagePath),
      productType: "single",
      productCode: codeAssignment.productCode,
      productCodeKind: codeAssignment.productCodeKind,
      unitId: sellingUnit.unit.id,
      defaultSellingQuantity: sellingUnit.defaultSellingQuantity,
      allowCustomSellingQuantity: productData.allowCustomSellingQuantity === true,
      status: productData.status ?? "active",
      sortOrder,
      createdBy: userId,
    });
    if (product) {
      product = withProductUnitLabel(product, sellingUnit.unit);
    }
  } catch (error) {
    if (isProductCodeUniqueViolation(error)) {
      return mapProductCodeUniqueViolation(
        organizationId,
        codeAssignment.productCode,
      );
    }
    if (isProductNameUniqueViolation(error)) {
      return productNameConflictResponse();
    }
    throw error;
  }

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

  const existingProduct = await getProductForOrganization(
    organizationId,
    productId,
  );
  if (!existingProduct) {
    return {
      status: "error",
      message: "Product not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  if (
    existingProduct.productType === "bundle" ||
    existingProduct.productType === "combo"
  ) {
    return {
      status: "error",
      message:
        "Bundle products must use the bundle update workflow; Combo products must use the Combo update workflow",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  const nextCategoryId = productData.categoryId ?? existingProduct.categoryId;
  const nextName = productData.name ?? existingProduct.name;
  const nextPrice = productData.price ?? existingProduct.price;
  const nextDiscount = productData.discount ?? existingProduct.discount;
  const nextStatus = productData.status ?? existingProduct.status;
  const nextImagePath =
    productData.imagePath === undefined
      ? (existingProduct.imagePath ?? null)
      : normalizeOptionalText(productData.imagePath);

  const sellingUnit = await resolveSingleProductSellingUnit(
    organizationId,
    userId,
    {
      unitId: productData.unitId,
      defaultSellingQuantity: productData.defaultSellingQuantity,
    },
    existingProduct,
  );
  if (sellingUnit.error || !sellingUnit.unit) {
    return sellingUnit.error ?? unitNotFound();
  }

  let nextProductCode = existingProduct.productCode;
  let nextProductCodeKind = existingProduct.productCodeKind;
  if (productData.productCode !== undefined) {
    const normalizedIncoming =
      productData.productCode === null || productData.productCode === undefined
        ? ""
        : normalizeProductCodeInput(productData.productCode);

    if (!normalizedIncoming) {
      nextProductCode = null;
      nextProductCodeKind = null;
    } else if (normalizedIncoming === existingProduct.productCode) {
      nextProductCode = existingProduct.productCode;
      nextProductCodeKind = existingProduct.productCodeKind;
    } else {
      const codeAssignment = resolveManufacturerProductCodeAssignment({
        productCode: productData.productCode,
        productCodeKind: productData.productCodeKind,
      });
      if (isProductCodeAssignmentError(codeAssignment)) {
        return codeAssignment;
      }
      nextProductCode = codeAssignment.productCode;
      nextProductCodeKind = codeAssignment.productCodeKind;
    }
  }

  const category = await getCategoryForOrganization(
    organizationId,
    nextCategoryId,
  );
  if (!category) {
    return {
      status: "error",
      message: "Category not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const categoryChanged = nextCategoryId !== existingProduct.categoryId;
  const nextSortOrder = categoryChanged
    ? await catalogRepository.getNextProductSortOrder(organizationId, nextCategoryId)
    : existingProduct.sortOrder;
  const nameChanged =
    nextName.toLowerCase() !== existingProduct.name.toLowerCase();
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

  if (nextProductCode !== existingProduct.productCode) {
    const duplicateCodeError = await ensureProductCodeAvailable(
      organizationId,
      nextProductCode,
      productId,
    );
    if (duplicateCodeError) {
      return duplicateCodeError;
    }

    const releasedInternalCodeError =
      await ensureNotReleasedInternalProductCode(
        organizationId,
        nextProductCode,
      );
    if (releasedInternalCodeError) {
      return releasedInternalCodeError;
    }
  }

  if (existingProduct.status === "active" && nextStatus === "inactive") {
    const [activeBundleCount, activeComboCount] = await Promise.all([
      catalogRepository.countActiveBundlesByComponentProductId(
        organizationId,
        productId,
      ),
      catalogRepository.countActiveCombosByOptionProductId(
        organizationId,
        productId,
      ),
    ]);
    if (activeBundleCount > 0 || activeComboCount > 0) {
      return {
        status: "error",
        message:
          "Product cannot be inactivated while it is used by an active bundle or Combo",
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
  }

  let product: ProductDTO | null = null;
  try {
    const updateData = {
      id: productId,
      organizationId,
      categoryId: nextCategoryId,
      name: nextName,
      price: nextPrice,
      discount: nextDiscount,
      imagePath: nextImagePath,
      productCode: nextProductCode,
      productCodeKind: nextProductCodeKind,
      unitId: sellingUnit.unit.id,
      defaultSellingQuantity: sellingUnit.defaultSellingQuantity,
      allowCustomSellingQuantity:
        productData.allowCustomSellingQuantity ??
        Boolean(existingProduct.allowCustomSellingQuantity),
      status: nextStatus,
      sortOrder: nextSortOrder,
      updatedBy: userId,
    };
    if (
      existingProduct.productCodeKind === "internal_rcn" &&
      existingProduct.productCode &&
      nextProductCode !== existingProduct.productCode
    ) {
      await pg.begin(async (tx) => {
        product = await catalogRepository.updateProduct(updateData, tx);
        if (!product) {
          throw new Error("Failed to update product");
        }
        await catalogRepository.releaseInternalProductCode(
          organizationId,
          existingProduct.productCode!,
          tx,
        );
      });
    } else {
      product = await catalogRepository.updateProduct(updateData);
    }
  } catch (error) {
    if (isProductCodeUniqueViolation(error)) {
      return mapProductCodeUniqueViolation(
        organizationId,
        nextProductCode,
        productId,
      );
    }
    if (isProductNameUniqueViolation(error)) {
      return productNameConflictResponse();
    }
    throw error;
  }

  if (!product) {
    return {
      status: "error",
      message: "Failed to update product",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  product = withProductUnitLabel(product, sellingUnit.unit);

  if (
    existingProduct.imagePath &&
    existingProduct.imagePath !== product.imagePath
  ) {
    await deleteProductImageIfPossible(existingProduct.imagePath);
  }

  return {
    status: "success",
    data: { product: await resolveProduct(product) },
    message: "Product updated successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const generateInternalProductCode = async (
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

  const existingProduct = await getProductForOrganization(
    organizationId,
    productId,
  );
  if (!existingProduct) {
    return {
      status: "error",
      message: "Product not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  if (existingProduct.productType !== "single") {
    return {
      status: "error",
      message:
        "Internal Product Codes are available only for fixed-count products",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  if (existingProduct.productCode) {
    return {
      status: "error",
      message: "Product already has a Product Code",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  let generatedProduct: ProductDTO | null = null;
  let generatedCode: string | null = null;
  try {
    await pg.begin(async (tx) => {
      const sequence =
        await catalogRepository.allocateNextInternalProductCodeSequence(
          organizationId,
          tx,
        );
      if (
        sequence === null ||
        sequence >= INTERNAL_PRODUCT_CODE_SEQUENCE_LIMIT
      ) {
        throw new Error("Internal Product Code sequence exhausted");
      }

      generatedCode = buildInternalProductCode(sequence);
      generatedProduct =
        await catalogRepository.assignInternalProductCodeToUncodedProduct(
          organizationId,
          existingProduct.id,
          generatedCode,
          userId,
          tx,
        );
      if (!generatedProduct) {
        throw new Error("Product already has a Product Code");
      }
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Internal Product Code sequence exhausted"
    ) {
      return {
        status: "error",
        message:
          "Internal Product Code sequence is exhausted and cannot be restarted automatically",
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
    if (
      error instanceof Error &&
      error.message === "Product already has a Product Code"
    ) {
      return {
        status: "error",
        message: error.message,
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
    if (isProductCodeUniqueViolation(error)) {
      return mapProductCodeUniqueViolation(organizationId, generatedCode);
    }
    throw error;
  }

  if (!generatedProduct || !generatedCode) {
    return {
      status: "error",
      message: "Failed to generate Internal Product Code",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    status: "success",
    data: { product: await resolveProduct(generatedProduct) },
    message: `Store-only Internal Product Code ${generatedCode} generated. It is not a globally registered identifier.`,
    code: STATUS_CODES.SUCCESS,
  };
};

export const reuseInternalProductCode = async (
  userId: string,
  organizationId: string,
  productId: string,
  input: ReuseInternalProductCodeJSON,
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

  const existingProduct = await getProductForOrganization(
    organizationId,
    productId,
  );
  if (!existingProduct) {
    return {
      status: "error",
      message: "Product not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  if (existingProduct.productType !== "single") {
    return {
      status: "error",
      message:
        "Internal Product Codes are available only for fixed-count products",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  if (existingProduct.productCode) {
    return {
      status: "error",
      message: "Product already has a Product Code",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  if (!isValidInternalProductCode(input.productCode)) {
    return {
      status: "error",
      message: "Internal Product Code has an invalid check digit",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  let reusedProduct: ProductDTO | null = null;
  try {
    await pg.begin(async (tx) => {
      const claimed = await catalogRepository.claimReleasedInternalProductCode(
        organizationId,
        input.productCode,
        tx,
      );
      if (!claimed) {
        throw new Error("Internal Product Code is not available for reuse");
      }

      reusedProduct =
        await catalogRepository.assignInternalProductCodeToUncodedProduct(
          organizationId,
          existingProduct.id,
          input.productCode,
          userId,
          tx,
        );
      if (!reusedProduct) {
        throw new Error("Product already has a Product Code");
      }
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Internal Product Code is not available for reuse"
    ) {
      return {
        status: "error",
        message:
          "Internal Product Code is not a released value available for reuse",
        data: null,
        code: STATUS_CODES.BAD_REQUEST,
      };
    }
    if (
      error instanceof Error &&
      error.message === "Product already has a Product Code"
    ) {
      return {
        status: "error",
        message: error.message,
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
    if (isProductCodeUniqueViolation(error)) {
      return mapProductCodeUniqueViolation(organizationId, input.productCode);
    }
    throw error;
  }

  if (!reusedProduct) {
    return {
      status: "error",
      message: "Failed to reuse Internal Product Code",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    status: "success",
    data: { product: await resolveProduct(reusedProduct) },
    message: `Released store-only Internal Product Code ${input.productCode} reused. Old labels may now identify a different product.`,
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

  const existingProduct = await getProductForOrganization(
    organizationId,
    productId,
  );
  if (!existingProduct) {
    return {
      status: "error",
      message: "Product not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  if (existingProduct.productType === "bundle") {
    return {
      status: "error",
      message:
        "Bundle products cannot be deleted. Set them to inactive instead.",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const [
    bundleComponentCount,
    comboOptionCount,
    saleItemCount,
    bundleSaleComponentCount,
  ] = await Promise.all([
    catalogRepository.countBundleProductComponentsByComponentProductId(
      organizationId,
      productId,
    ),
    catalogRepository.countComboChoiceOptionsByProductId(
      organizationId,
      productId,
    ),
    catalogRepository.countSaleItemsByProductId(organizationId, productId),
    catalogRepository.countSaleItemBundleComponentsByComponentProductId(
      organizationId,
      productId,
    ),
  ]);
  if (bundleComponentCount > 0 || comboOptionCount > 0) {
    return {
      status: "error",
      message:
        "Product cannot be deleted while it is used by a bundle or Combo. Set it to inactive instead.",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  if (saleItemCount > 0 || bundleSaleComponentCount > 0) {
    return {
      status: "error",
      message:
        "Product cannot be deleted because it has sales history. Set it to inactive instead.",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  let product: ProductDTO | null = null;
  if (
    existingProduct.productCodeKind === "internal_rcn" &&
    existingProduct.productCode
  ) {
    await pg.begin(async (tx) => {
      product = await catalogRepository.deleteProduct(
        organizationId,
        productId,
        tx,
      );
      if (!product) {
        throw new Error("Failed to delete product");
      }
      await catalogRepository.releaseInternalProductCode(
        organizationId,
        existingProduct.productCode!,
        tx,
      );
    });
  } else {
    product = await catalogRepository.deleteProduct(organizationId, productId);
  }
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

const buildBundleComponentAddOnSignature = (
  addOns: BundleComponentAddOnInput[],
) => {
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
          message:
            "Bundle add-on quantity must be a whole number of at least 1",
          data: null,
          code: STATUS_CODES.BAD_REQUEST,
        },
      };
    }

    if (seenAddOnIds.has(addOn.addOnId)) {
      return {
        error: {
          status: "error",
          message:
            "Duplicate add-ons are not allowed on the same bundle product component",
          data: null,
          code: STATUS_CODES.BAD_REQUEST,
        },
      };
    }

    seenAddOnIds.add(addOn.addOnId);
  }

  return {
    addOns: [...selectedAddOns].sort((left, right) =>
      left.addOnId.localeCompare(right.addOnId),
    ),
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
): Promise<
  | ServiceResponse<null>
  | { status: "success"; components: ValidatedBundleComponent[] }
> => {
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
    const product = await getProductForOrganization(
      organizationId,
      component.productId,
    );
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
      const attachment =
        await catalogRepository.getSelectableProductAddOnAttachmentByProductAndAddOn(
          organizationId,
          component.productId,
          addOn.addOnId,
        );

      if (!attachment) {
        return {
          status: "error",
          message:
            "Bundle add-ons must use an active product add-on attachment",
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
  const components =
    await catalogRepository.getBundleProductComponentsByBundleProductId(
      organizationId,
      bundleProductId,
      tx,
    );
  const addOns =
    await catalogRepository.getBundleProductComponentAddOnsByComponentIds(
      organizationId,
      components.map((component) => component.id),
      tx,
    );
  const addOnsByComponentId = new Map<string, typeof addOns>();

  for (const addOn of addOns) {
    const existing =
      addOnsByComponentId.get(addOn.bundleProductComponentId) ?? [];
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
      const addOnRow =
        await catalogRepository.createBundleProductComponentAddOn(
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

const loadComboChoiceGroups = async (
  organizationId: string,
  comboProductId: string,
) => {
  const groups = await catalogRepository.getComboChoiceGroupsByProductId(
    organizationId,
    comboProductId,
  );
  if (groups.length === 0) return [];
  const options = await catalogRepository.getComboChoiceOptionsByGroupIds(
    organizationId,
    groups.map((group) => group.id),
  );
  const products = await Promise.all(
    [...new Set(options.map((option) => option.optionProductId))].map(
      (productId) => getProductForOrganization(organizationId, productId),
    ),
  );
  const productsById = new Map(
    products.filter(Boolean).map((product) => [product!.id, product!]),
  );
  const optionsByGroupId = new Map<string, typeof options>();

  for (const option of options) {
    const existing = optionsByGroupId.get(option.choiceGroupId) ?? [];
    existing.push(option);
    optionsByGroupId.set(option.choiceGroupId, existing);
  }

  return Promise.all(
    groups.map(async (group) => ({
      ...group,
      options: await Promise.all(
        (optionsByGroupId.get(group.id) ?? []).map(async (option) => ({
          ...option,
          product: await resolveProduct(
            productsById.get(option.optionProductId)! as ProductDTO,
          ),
        })),
      ),
    })),
  );
};

const loadComboChoiceGroupsForProducts = async (
  organizationId: string,
  comboProducts: ProductDTO[],
): Promise<Map<string, ComboProductResponse["choiceGroups"]>> => {
  const comboProductIds = comboProducts.map((product) => product.id);
  const groups = await catalogRepository.getComboChoiceGroupsByProductIds(
    organizationId,
    comboProductIds,
  );
  const options = await catalogRepository.getComboChoiceOptionsByGroupIds(
    organizationId,
    groups.map((group) => group.id),
  );
  const products = await catalogRepository.getProductsByIds(organizationId, [
    ...new Set(options.map((option) => option.optionProductId)),
  ]);
  const resolvedProducts = await resolveProducts(products);
  const productsById = new Map(
    resolvedProducts.map((product) => [product.id, product]),
  );
  const optionsByGroupId = new Map<string, typeof options>();
  const groupsByComboProductId = new Map<string, typeof groups>();

  for (const option of options) {
    const groupOptions = optionsByGroupId.get(option.choiceGroupId) ?? [];
    groupOptions.push(option);
    optionsByGroupId.set(option.choiceGroupId, groupOptions);
  }
  for (const group of groups) {
    const comboGroups = groupsByComboProductId.get(group.comboProductId) ?? [];
    comboGroups.push(group);
    groupsByComboProductId.set(group.comboProductId, comboGroups);
  }

  const entries: Array<[string, ComboProductResponse["choiceGroups"]]> = await Promise.all(
      comboProducts.map(async (combo) => [
        combo.id,
        await Promise.all(
          (groupsByComboProductId.get(combo.id) ?? []).map(async (group) => ({
            ...group,
            options: (optionsByGroupId.get(group.id) ?? [])
              .map((option) => {
                const product = productsById.get(option.optionProductId);
                return product ? { ...option, product } : null;
              })
              .filter(
                (option): option is NonNullable<typeof option> =>
                  option !== null,
              ),
          })),
        ),
      ] as [string, ComboProductResponse["choiceGroups"]]),
  );
  return new Map(entries);
};

const validateComboChoiceGroups = async (
  organizationId: string,
  comboProductId: string,
  choiceGroups: CreateComboProductSVC["choiceGroups"],
): Promise<
  | ServiceResponse<null>
  | { status: "success"; choiceGroups: CreateComboProductSVC["choiceGroups"] }
> => {
  if (choiceGroups.length === 0) {
    return {
      status: "error",
      message: "A Combo needs at least one choice group",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  const groupNames = new Set<string>();
  for (const group of choiceGroups) {
    const normalizedName = group.name.trim().toLowerCase();
    if (groupNames.has(normalizedName)) {
      return {
        status: "error",
        message: "Combo choice group names must be unique",
        data: null,
        code: STATUS_CODES.BAD_REQUEST,
      };
    }
    groupNames.add(normalizedName);

    if (group.minSelections > group.maxSelections) {
      return {
        status: "error",
        message: `Choice group "${group.name}" has an invalid selection range`,
        data: null,
        code: STATUS_CODES.BAD_REQUEST,
      };
    }

    const optionIds = new Set<string>();
    for (const option of group.options) {
      if (optionIds.has(option.productId)) {
        return {
          status: "error",
          message: `Choice group "${group.name}" cannot repeat the same product option`,
          data: null,
          code: STATUS_CODES.BAD_REQUEST,
        };
      }
      optionIds.add(option.productId);

      if (!Number.isFinite(option.priceAdjustment)) {
        return {
          status: "error",
          message: `Combo option price adjustment for "${group.name}" is invalid`,
          data: null,
          code: STATUS_CODES.BAD_REQUEST,
        };
      }

      const product = await getProductForOrganization(
        organizationId,
        option.productId,
      );
      if (!product || product.id === comboProductId) {
        return {
          status: "error",
          message: `Combo option product was not found for choice group "${group.name}"`,
          data: null,
          code: STATUS_CODES.NOT_FOUND,
        };
      }

      if (product.productType !== "single") {
        return {
          status: "error",
          message: `Combo options must be regular products. "${product.name}" cannot be used here`,
          data: null,
          code: STATUS_CODES.BAD_REQUEST,
        };
      }

      if (product.status !== "active") {
        return {
          status: "error",
          message: `Combo option product "${product.name}" must be active`,
          data: null,
          code: STATUS_CODES.BAD_REQUEST,
        };
      }
    }
  }

  return { status: "success", choiceGroups };
};

const persistComboChoiceGroups = async (
  organizationId: string,
  comboProductId: string,
  userId: string,
  choiceGroups: CreateComboProductSVC["choiceGroups"],
  tx: Bun.TransactionSQL,
) => {
  const createdGroups = [];

  for (const [groupIndex, group] of choiceGroups.entries()) {
    const createdGroup = await catalogRepository.createComboChoiceGroup(
      {
        id: crypto.randomUUID(),
        organizationId,
        comboProductId,
        name: group.name.trim(),
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        sortOrder: groupIndex,
        createdBy: userId,
      },
      tx,
    );

    if (!createdGroup) throw new Error("Failed to create Combo choice group");

    const createdOptions = [];
    for (const [optionIndex, option] of group.options.entries()) {
      const createdOption = await catalogRepository.createComboChoiceOption(
        {
          id: crypto.randomUUID(),
          organizationId,
          choiceGroupId: createdGroup.id,
          optionProductId: option.productId,
          maxQuantity: option.maxQuantity,
          priceAdjustment: option.priceAdjustment,
          sortOrder: optionIndex,
          createdBy: userId,
        },
        tx,
      );

      if (!createdOption)
        throw new Error("Failed to create Combo choice option");
      createdOptions.push(createdOption);
    }

    createdGroups.push({ ...createdGroup, options: createdOptions });
  }

  return createdGroups;
};

export const createComboProduct = async (
  userId: string,
  organizationId: string,
  comboData: CreateComboProductSVC,
): Promise<ServiceResponse<ComboProductResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization)
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };

  const category = await getCategoryForOrganization(
    organizationId,
    comboData.categoryId,
  );
  if (!category)
    return {
      status: "error",
      message: "Category not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };

  const alreadyExists = await catalogRepository.productNameExistsInCategory(
    organizationId,
    comboData.categoryId,
    comboData.name,
  );
  if (alreadyExists)
    return {
      status: "error",
      message: "Product with the same name already exists in this category",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };

  const comboProductId = crypto.randomUUID();
  const validated = await validateComboChoiceGroups(
    organizationId,
    comboProductId,
    comboData.choiceGroups,
  );
  if (!("choiceGroups" in validated)) return validated;

  const piece = await resolvePieceUnit(organizationId, userId);
  if (piece.error || !piece.unit) {
    return piece.error ?? unitNotFound();
  }

  let createdProduct: ProductDTO | null = null;
  try {
    await pg.begin(async (tx) => {
      createdProduct = await catalogRepository.createProduct(
        {
          id: comboProductId,
          organizationId,
          categoryId: comboData.categoryId,
          name: comboData.name,
          price: comboData.price,
          discount: comboData.discount ?? 0,
          imagePath: normalizeOptionalText(comboData.imagePath),
          productType: "combo",
          productCode: null,
          productCodeKind: null,
          unitId: piece.unit.id,
          defaultSellingQuantity: FIXED_BUNDLE_COMBO_DEFAULT_SELLING_QUANTITY,
          allowCustomSellingQuantity: false,
          status: comboData.status ?? "active",
          sortOrder: await catalogRepository.getNextProductSortOrder(organizationId, comboData.categoryId, tx),
          createdBy: userId,
        },
        tx,
      );
      if (!createdProduct) throw new Error("Failed to create Combo product");
      await persistComboChoiceGroups(
        organizationId,
        comboProductId,
        userId,
        validated.choiceGroups,
        tx,
      );
    });
  } catch {
    return {
      status: "error",
      message: "Failed to create Combo product",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  const finalCreatedProduct = createdProduct;
  if (!finalCreatedProduct)
    return {
      status: "error",
      message: "Failed to create Combo product",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  const details = await loadComboChoiceGroups(organizationId, comboProductId);
  return {
    status: "success",
    data: {
      product: await resolveProduct(finalCreatedProduct),
      choiceGroups: details,
    },
    message: "Combo created successfully",
    code: STATUS_CODES.CREATED,
  };
};

export const getComboProductDetails = async (
  userId: string,
  organizationId: string,
  productId: string,
): Promise<ServiceResponse<ComboProductResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization)
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  const product = await getProductForOrganization(organizationId, productId);
  if (!product || product.productType !== "combo")
    return {
      status: "error",
      message: "Combo not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  return {
    status: "success",
    data: {
      product: await resolveProduct(product),
      choiceGroups: await loadComboChoiceGroups(organizationId, productId),
    },
    message: "Combo fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const getComboProductDetailsForOrganization = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<ComboProductsListResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization)
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };

  const comboProducts = (
    await catalogRepository.getProductsByOrganizationId(organizationId)
  ).filter(
    (product) => product.productType === "combo" && product.status === "active",
  );
  const choiceGroupsByProductId = await loadComboChoiceGroupsForProducts(
    organizationId,
    comboProducts,
  );
  const resolvedProducts = await resolveProducts(comboProducts);

  return {
    status: "success",
    data: {
      combos: resolvedProducts.map((product) => ({
        product,
        choiceGroups: choiceGroupsByProductId.get(product.id) ?? [],
      })),
    },
    message: "Combos fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const getComboProductDetailsForDevice = async (
  session: DeviceSessionDTO,
  productId: string,
): Promise<ServiceResponse<ComboProductResponse | null>> => {
  const product = await getProductForOrganization(
    session.organization.id,
    productId,
  );
  if (
    !product ||
    product.productType !== "combo" ||
    product.status !== "active"
  ) {
    return {
      status: "error",
      message: "Combo not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  return {
    status: "success",
    data: {
      product: await resolveProduct(product),
      choiceGroups: await loadComboChoiceGroups(
        session.organization.id,
        productId,
      ),
    },
    message: "Combo fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const getComboProductDetailsForDeviceBulk = async (
  session: DeviceSessionDTO,
): Promise<ServiceResponse<ComboProductsListResponse | null>> => {
  const comboProducts = (
    await catalogRepository.getActiveProductsByOrganizationId(
      session.organization.id,
    )
  ).filter((product) => product.productType === "combo");
  const choiceGroupsByProductId = await loadComboChoiceGroupsForProducts(
    session.organization.id,
    comboProducts,
  );
  const resolvedProducts = await resolveProducts(comboProducts);

  return {
    status: "success",
    data: {
      combos: resolvedProducts.map((product) => ({
        product,
        choiceGroups: choiceGroupsByProductId.get(product.id) ?? [],
      })),
    },
    message: "Combos fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const updateComboProduct = async (
  userId: string,
  organizationId: string,
  productId: string,
  comboData: UpdateComboProductSVC,
): Promise<ServiceResponse<ComboProductResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization)
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  const existingProduct = await getProductForOrganization(
    organizationId,
    productId,
  );
  if (!existingProduct || existingProduct.productType !== "combo")
    return {
      status: "error",
      message: "Combo not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };

  const piece = await resolvePieceUnit(organizationId, userId);
  if (piece.error || !piece.unit) {
    return piece.error ?? unitNotFound();
  }

  const nextCategoryId = comboData.categoryId ?? existingProduct.categoryId;
  const nextName = comboData.name ?? existingProduct.name;
  const category = await getCategoryForOrganization(
    organizationId,
    nextCategoryId,
  );
  if (!category)
    return {
      status: "error",
      message: "Category not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  if (
    nextCategoryId !== existingProduct.categoryId ||
    nextName.toLowerCase() !== existingProduct.name.toLowerCase()
  ) {
    if (
      await catalogRepository.productNameExistsInCategory(
        organizationId,
        nextCategoryId,
        nextName,
        productId,
      )
    ) {
      return {
        status: "error",
        message: "Product with the same name already exists in this category",
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
  }

  const currentGroups = await loadComboChoiceGroups(organizationId, productId);
  const nextGroups = comboData.choiceGroups;
  if (nextGroups) {
    const validated = await validateComboChoiceGroups(
      organizationId,
      productId,
      nextGroups,
    );
    if (!("choiceGroups" in validated)) return validated;
  } else if (
    existingProduct.status === "inactive" &&
    comboData.status === "active"
  ) {
    const validationInput = currentGroups.map((group) => ({
      name: group.name,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      options: group.options.map((option) => ({
        productId: option.optionProductId,
        maxQuantity: option.maxQuantity,
        priceAdjustment: option.priceAdjustment,
      })),
    }));
    const validated = await validateComboChoiceGroups(
      organizationId,
      productId,
      validationInput,
    );
    if (!("choiceGroups" in validated)) return validated;
  }

  let updatedProduct: ProductDTO | null = null;
  try {
    await pg.begin(async (tx) => {
      updatedProduct = await catalogRepository.updateProduct(
        {
          id: productId,
          organizationId,
          categoryId: nextCategoryId,
          name: nextName,
          price: comboData.price ?? existingProduct.price,
          discount: comboData.discount ?? existingProduct.discount,
          imagePath:
            comboData.imagePath === undefined
              ? existingProduct.imagePath
              : normalizeOptionalText(comboData.imagePath),
          productCode: existingProduct.productCode,
          productCodeKind: existingProduct.productCodeKind,
          unitId: piece.unit.id,
          defaultSellingQuantity: FIXED_BUNDLE_COMBO_DEFAULT_SELLING_QUANTITY,
          allowCustomSellingQuantity: false,
          status: comboData.status ?? existingProduct.status,
          sortOrder:
            nextCategoryId === existingProduct.categoryId
              ? existingProduct.sortOrder
              : await catalogRepository.getNextProductSortOrder(organizationId, nextCategoryId, tx),
          updatedBy: userId,
        },
        tx,
      );
      if (!updatedProduct) throw new Error("Failed to update Combo product");
      if (nextGroups) {
        await catalogRepository.deleteComboChoiceGroupsByProductId(
          organizationId,
          productId,
          tx,
        );
        await persistComboChoiceGroups(
          organizationId,
          productId,
          userId,
          nextGroups,
          tx,
        );
      }
    });
  } catch {
    return {
      status: "error",
      message: "Failed to update Combo product",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  const previousImagePath = existingProduct.imagePath;
  const finalUpdatedProduct = updatedProduct as ProductDTO | null;
  if (!finalUpdatedProduct)
    return {
      status: "error",
      message: "Failed to update Combo product",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  if (previousImagePath && previousImagePath !== finalUpdatedProduct.imagePath)
    await deleteProductImageIfPossible(previousImagePath);
  const choiceGroups = nextGroups
    ? await loadComboChoiceGroups(organizationId, productId)
    : currentGroups;
  return {
    status: "success",
    data: { product: await resolveProduct(finalUpdatedProduct), choiceGroups },
    message: "Combo updated successfully",
    code: STATUS_CODES.SUCCESS,
  };
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

  const category = await getCategoryForOrganization(
    organizationId,
    bundleData.categoryId,
  );
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

  const validatedComponents = await validateBundleComponents(
    organizationId,
    bundleData.components,
  );
  if (validatedComponents.status === "error") {
    return validatedComponents;
  }

  const piece = await resolvePieceUnit(organizationId, userId);
  if (piece.error || !piece.unit) {
    return piece.error ?? unitNotFound();
  }

  const bundleProductId = crypto.randomUUID();
  let createdProduct: ProductDTO | null = null;
  let createdComponents: Awaited<
    ReturnType<typeof loadBundleComponentsWithAddOns>
  > = [];

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
          productCode: null,
          productCodeKind: null,
          unitId: piece.unit.id,
          defaultSellingQuantity: FIXED_BUNDLE_COMBO_DEFAULT_SELLING_QUANTITY,
          allowCustomSellingQuantity: false,
          status: bundleData.status ?? "active",
          sortOrder: await catalogRepository.getNextProductSortOrder(organizationId, bundleData.categoryId, tx),
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
        "components" in validatedComponents
          ? validatedComponents.components
          : [],
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

  const components = await loadBundleComponentsWithAddOns(
    organizationId,
    productId,
  );

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

  const existingProduct = await getProductForOrganization(
    organizationId,
    productId,
  );
  if (!existingProduct || existingProduct.productType !== "bundle") {
    return {
      status: "error",
      message: "Bundle product not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const piece = await resolvePieceUnit(organizationId, userId);
  if (piece.error || !piece.unit) {
    return piece.error ?? unitNotFound();
  }

  const nextCategoryId = bundleData.categoryId ?? existingProduct.categoryId;
  const nextName = bundleData.name ?? existingProduct.name;
  const nextPrice = bundleData.price ?? existingProduct.price;
  const nextDiscount = bundleData.discount ?? existingProduct.discount;
  const nextStatus = bundleData.status ?? existingProduct.status;
  const nextImagePath =
    bundleData.imagePath === undefined
      ? (existingProduct.imagePath ?? null)
      : normalizeOptionalText(bundleData.imagePath);

  const category = await getCategoryForOrganization(
    organizationId,
    nextCategoryId,
  );
  if (!category) {
    return {
      status: "error",
      message: "Category not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const categoryChanged = nextCategoryId !== existingProduct.categoryId;
  const nameChanged =
    nextName.toLowerCase() !== existingProduct.name.toLowerCase();
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

  let components = await loadBundleComponentsWithAddOns(
    organizationId,
    productId,
  );
  let nextComponents: ValidatedBundleComponent[] | null = null;
  if (bundleData.components !== undefined) {
    const validatedComponents = await validateBundleComponents(
      organizationId,
      bundleData.components,
    );
    if ("components" in validatedComponents === false) {
      return validatedComponents;
    }
    nextComponents = validatedComponents.components;
  } else if (existingProduct.status === "inactive" && nextStatus === "active") {
    const validatedComponents = await validateBundleComponents(
      organizationId,
      components.map((component) => ({
        productId: component.componentProductId,
        quantity: component.quantity,
        addOns: component.addOns.map((addOn) => ({
          addOnId: addOn.addOnId,
          quantity: addOn.quantity,
        })),
      })),
    );
    if (validatedComponents.status === "error") {
      return validatedComponents;
    }
  }

  let updatedProduct: ProductDTO | null = null;

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
          productCode: existingProduct.productCode,
          productCodeKind: existingProduct.productCodeKind,
          unitId: piece.unit.id,
          defaultSellingQuantity: FIXED_BUNDLE_COMBO_DEFAULT_SELLING_QUANTITY,
          allowCustomSellingQuantity: false,
          status: nextStatus,
          sortOrder:
            nextCategoryId === existingProduct.categoryId
              ? existingProduct.sortOrder
              : await catalogRepository.getNextProductSortOrder(organizationId, nextCategoryId, tx),
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

  const previousImagePath = existingProduct.imagePath;
  const updatedImagePath = (updatedProduct as ProductDTO).imagePath;
  if (previousImagePath && previousImagePath !== updatedImagePath) {
    await deleteProductImageIfPossible(previousImagePath);
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

const getAddOnForOrganization = async (
  organizationId: string,
  addOnId: string,
) => {
  return catalogRepository.getAddOnById(organizationId, addOnId);
};

const resolveAttachmentResponse = async (
  organizationId: string,
  productId: string,
  attachmentId: string,
): Promise<ProductAddOnAttachmentResponseDTO | null> => {
  return catalogRepository.getProductAddOnAttachmentById(
    organizationId,
    productId,
    attachmentId,
  );
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

  const addOns =
    await catalogRepository.getAddOnsByOrganizationId(organizationId);
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
  const addOns = await catalogRepository.getActiveAddOnsByOrganizationId(
    session.organization.id,
  );
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

  const alreadyExists = await catalogRepository.addOnNameExistsInOrganization(
    organizationId,
    addOnData.name,
  );
  if (alreadyExists) {
    return {
      status: "error",
      message: "Add-on with the same name already exists in this organization",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  if ((addOnData.discount ?? 0) > addOnData.price) {
    return {
      status: "error",
      message: "Discount cannot exceed price",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
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

  if (nextDiscount > nextPrice) {
    return {
      status: "error",
      message: "Discount cannot exceed price",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  if (nextName.toLowerCase() !== existingAddOn.name.toLowerCase()) {
    const alreadyExists = await catalogRepository.addOnNameExistsInOrganization(
      organizationId,
      nextName,
      addOnId,
    );
    if (alreadyExists) {
      return {
        status: "error",
        message:
          "Add-on with the same name already exists in this organization",
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
  }

  if (existingAddOn.status === "active" && nextStatus === "inactive") {
    const activeBundleCount =
      await catalogRepository.countActiveBundlesByComponentAddOnId(
        organizationId,
        addOnId,
      );
    if (activeBundleCount > 0) {
      return {
        status: "error",
        message:
          "Add-on cannot be inactivated while it is used by an active bundle",
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

  const attachmentCount = await catalogRepository.countAttachmentsByAddOnId(
    organizationId,
    addOnId,
  );
  if (attachmentCount > 0) {
    return {
      status: "error",
      message:
        "Add-on cannot be deleted while it is still attached to products",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const saleItemAddOnCount =
    await catalogRepository.countSaleItemAddOnsByAddOnId(
      organizationId,
      addOnId,
    );
  if (saleItemAddOnCount > 0) {
    return {
      status: "error",
      message:
        "Add-on cannot be deleted because it has sales history. Set it to inactive instead.",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const [bundleComponentAddOnCount, bundleSaleComponentAddOnCount] =
    await Promise.all([
      catalogRepository.countBundleProductComponentAddOnsByAddOnId(
        organizationId,
        addOnId,
      ),
      catalogRepository.countSaleItemBundleComponentAddOnsByAddOnId(
        organizationId,
        addOnId,
      ),
    ]);
  if (bundleComponentAddOnCount > 0) {
    return {
      status: "error",
      message:
        "Add-on cannot be deleted while it is used by a bundle. Set it to inactive instead.",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  if (bundleSaleComponentAddOnCount > 0) {
    return {
      status: "error",
      message:
        "Add-on cannot be deleted because it has sales history. Set it to inactive instead.",
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

  const attachments =
    await catalogRepository.getProductAddOnAttachmentsByProductId(
      organizationId,
      productId,
    );
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
  const attachments =
    await catalogRepository.getSelectableProductAddOnAttachmentsByOrganizationId(
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

  if (product.productType === "bundle" || product.productType === "combo") {
    return {
      status: "error",
      message:
        "Add-ons cannot be attached directly to Bundle or Combo products",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  const addOn = await getAddOnForOrganization(
    organizationId,
    attachmentData.addOnId,
  );
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

  const attachment = await resolveAttachmentResponse(
    organizationId,
    productId,
    created.id,
  );
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

  const existingAttachment =
    await catalogRepository.getProductAddOnAttachmentById(
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

  const nextSelectionCap =
    attachmentData.selectionCap ?? existingAttachment.selectionCap;
  const nextStatus = attachmentData.status ?? existingAttachment.status;

  if (existingAttachment.status === "active" && nextStatus === "inactive") {
    const activeBundleCount =
      await catalogRepository.countActiveBundlesByProductAddOnPair(
        organizationId,
        productId,
        existingAttachment.addOnId,
      );
    if (activeBundleCount > 0) {
      return {
        status: "error",
        message:
          "Product add-on attachment cannot be deactivated while it is used by an active bundle",
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
  }

  if (
    existingAttachment.status === "active" &&
    nextStatus === "active" &&
    nextSelectionCap < existingAttachment.selectionCap
  ) {
    const invalidatedBundleCount =
      await catalogRepository.countActiveBundlesByProductAddOnPairAboveQuantity(
        organizationId,
        productId,
        existingAttachment.addOnId,
        nextSelectionCap,
      );
    if (invalidatedBundleCount > 0) {
      return {
        status: "error",
        message:
          "Product add-on attachment selection cap cannot be reduced below quantities used by active bundles",
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

  const attachment = await resolveAttachmentResponse(
    organizationId,
    productId,
    attachmentId,
  );
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

  const existingAttachment =
    await catalogRepository.getProductAddOnAttachmentById(
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

  const activeBundleCount =
    await catalogRepository.countActiveBundlesByProductAddOnPair(
      organizationId,
      productId,
      existingAttachment.addOnId,
    );
  if (activeBundleCount > 0) {
    return {
      status: "error",
      message:
        "Product add-on attachment cannot be deleted while it is used by an active bundle",
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

const getLabelTemplateForOrganization = async (
  organizationId: string,
  labelTemplateId: string,
) => {
  return catalogRepository.getLabelTemplateById(organizationId, labelTemplateId);
};

const rejectInvalidLabelTemplateDocument = (document: {
  name: string;
  status: "active" | "inactive";
  stock: CreateLabelTemplateSVC["stock"];
  keepOuts: CreateLabelTemplateSVC["keepOuts"];
  elements: CreateLabelTemplateSVC["elements"];
}): ServiceResponse<null> | null => {
  const parsed = LabelTemplateDocumentSchema.safeParse(document);
  if (parsed.success) {
    return null;
  }

  return {
    status: "error",
    message: parsed.error.issues[0]?.message ?? "Invalid Label Template",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
  };
};

export const getLabelTemplates = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<LabelTemplatesListResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const labelTemplates =
    await catalogRepository.getLabelTemplatesByOrganizationId(organizationId);
  return {
    status: "success",
    data: { labelTemplates },
    message: "Label Templates fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const createLabelTemplate = async (
  userId: string,
  organizationId: string,
  labelTemplateData: CreateLabelTemplateSVC,
): Promise<ServiceResponse<LabelTemplateResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const alreadyExists =
    await catalogRepository.labelTemplateNameExistsInOrganization(
      organizationId,
      labelTemplateData.name,
    );
  if (alreadyExists) {
    return {
      status: "error",
      message:
        "Label Template with the same name already exists in this organization",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const document = {
    name: labelTemplateData.name,
    status: labelTemplateData.status ?? "active",
    stock: labelTemplateData.stock,
    keepOuts: labelTemplateData.keepOuts,
    elements: labelTemplateData.elements,
  };
  const invalidDocument = rejectInvalidLabelTemplateDocument(document);
  if (invalidDocument) {
    return invalidDocument;
  }

  const labelTemplate = await catalogRepository.createLabelTemplate({
    id: crypto.randomUUID(),
    organizationId,
    name: labelTemplateData.name,
    status: labelTemplateData.status ?? "active",
    stock: labelTemplateData.stock,
    keepOuts: labelTemplateData.keepOuts,
    elements: labelTemplateData.elements,
    createdBy: userId,
  });

  if (!labelTemplate) {
    return {
      status: "error",
      message: "Failed to create Label Template",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    status: "success",
    data: { labelTemplate },
    message: "Label Template created successfully",
    code: STATUS_CODES.CREATED,
  };
};

export const getLabelTemplateDetails = async (
  userId: string,
  organizationId: string,
  labelTemplateId: string,
): Promise<ServiceResponse<LabelTemplateResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const labelTemplate = await getLabelTemplateForOrganization(
    organizationId,
    labelTemplateId,
  );
  if (!labelTemplate) {
    return {
      status: "error",
      message: "Label Template not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  return {
    status: "success",
    data: { labelTemplate },
    message: "Label Template fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const updateLabelTemplate = async (
  userId: string,
  organizationId: string,
  labelTemplateId: string,
  labelTemplateData: UpdateLabelTemplateSVC,
): Promise<ServiceResponse<LabelTemplateResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const existing = await getLabelTemplateForOrganization(
    organizationId,
    labelTemplateId,
  );
  if (!existing) {
    return {
      status: "error",
      message: "Label Template not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const nextName = labelTemplateData.name ?? existing.name;
  if (nextName.toLowerCase() !== existing.name.toLowerCase()) {
    const alreadyExists =
      await catalogRepository.labelTemplateNameExistsInOrganization(
        organizationId,
        nextName,
        labelTemplateId,
      );
    if (alreadyExists) {
      return {
        status: "error",
        message:
          "Label Template with the same name already exists in this organization",
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
  }

  const document = {
    name: nextName,
    status: labelTemplateData.status ?? existing.status,
    stock: labelTemplateData.stock ?? existing.stock,
    keepOuts: labelTemplateData.keepOuts ?? existing.keepOuts,
    elements: labelTemplateData.elements ?? existing.elements,
  };
  const invalidDocument = rejectInvalidLabelTemplateDocument(document);
  if (invalidDocument) {
    return invalidDocument;
  }

  const labelTemplate = await catalogRepository.updateLabelTemplate({
    id: labelTemplateId,
    organizationId,
    name: nextName,
    status: labelTemplateData.status ?? existing.status,
    stock: labelTemplateData.stock ?? existing.stock,
    keepOuts: labelTemplateData.keepOuts ?? existing.keepOuts,
    elements: labelTemplateData.elements ?? existing.elements,
    updatedBy: userId,
  });

  if (!labelTemplate) {
    return {
      status: "error",
      message: "Failed to update Label Template",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    status: "success",
    data: { labelTemplate },
    message: "Label Template updated successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const deleteLabelTemplate = async (
  userId: string,
  organizationId: string,
  labelTemplateId: string,
): Promise<ServiceResponse<LabelTemplateResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const existing = await getLabelTemplateForOrganization(
    organizationId,
    labelTemplateId,
  );
  if (!existing) {
    return {
      status: "error",
      message: "Label Template not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const deleted = await catalogRepository.deleteLabelTemplate(
    organizationId,
    labelTemplateId,
  );
  if (!deleted) {
    return {
      status: "error",
      message: "Failed to delete Label Template",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    status: "success",
    data: { labelTemplate: deleted },
    message: "Label Template deleted successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const seedDefaultLabelTemplates = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<LabelTemplatesListResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const labelTemplates = await catalogRepository.seedDefaultLabelTemplates(
    organizationId,
    userId,
  );

  return {
    status: "success",
    data: { labelTemplates },
    message: "Label Templates seeded successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

const normalizeOptionalLabelProfileText = (value?: string | null) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeLabelProfileInput = (
  data: UpdateProductLabelProfileSVC,
): {
  ingredients?: string | null;
  nutrition?: UpdateProductLabelProfileSVC["nutrition"];
  netWeight?: string | null;
  unitSellingPriceText?: string | null;
  mrp?: number | null;
  shelfLifeDays?: number | null;
} => ({
  ...(data.ingredients !== undefined
    ? { ingredients: normalizeOptionalLabelProfileText(data.ingredients) }
    : {}),
  ...(data.nutrition !== undefined
    ? {
        nutrition:
          data.nutrition === null || data.nutrition.length === 0
            ? null
            : data.nutrition,
      }
    : {}),
  ...(data.netWeight !== undefined
    ? { netWeight: normalizeOptionalLabelProfileText(data.netWeight) }
    : {}),
  ...(data.unitSellingPriceText !== undefined
    ? {
        unitSellingPriceText: normalizeOptionalLabelProfileText(
          data.unitSellingPriceText,
        ),
      }
    : {}),
  ...(data.mrp !== undefined
    ? { mrp: data.mrp === "" || data.mrp === null ? null : data.mrp }
    : {}),
  ...(data.shelfLifeDays !== undefined
    ? {
        shelfLifeDays:
          data.shelfLifeDays === "" || data.shelfLifeDays === null
            ? null
            : data.shelfLifeDays,
      }
    : {}),
});

export const updateProductLabelProfile = async (
  userId: string,
  organizationId: string,
  productId: string,
  profileData: UpdateProductLabelProfileSVC,
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

  const parsed = UpdateProductLabelProfileSchema.safeParse(profileData);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid Product Label Profile",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  const existingProduct = await getProductForOrganization(
    organizationId,
    productId,
  );
  if (!existingProduct) {
    return {
      status: "error",
      message: "Product not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const existingProfile =
    await catalogRepository.getProductLabelProfileByProductId(
      organizationId,
      productId,
    );
  const normalized = normalizeLabelProfileInput(parsed.data);
  const nextProfile = {
    ingredients:
      normalized.ingredients !== undefined
        ? normalized.ingredients
        : (existingProfile?.ingredients ?? null),
    nutrition:
      normalized.nutrition !== undefined
        ? normalized.nutrition
        : (existingProfile?.nutrition ?? null),
    netWeight:
      normalized.netWeight !== undefined
        ? normalized.netWeight
        : (existingProfile?.netWeight ?? null),
    unitSellingPriceText:
      normalized.unitSellingPriceText !== undefined
        ? normalized.unitSellingPriceText
        : (existingProfile?.unitSellingPriceText ?? null),
    mrp:
      normalized.mrp !== undefined
        ? normalized.mrp
        : (existingProfile?.mrp ?? null),
    shelfLifeDays:
      normalized.shelfLifeDays !== undefined
        ? normalized.shelfLifeDays
        : (existingProfile?.shelfLifeDays ?? null),
  };

  const labelProfile = await catalogRepository.upsertProductLabelProfile({
    productId,
    organizationId,
    ...nextProfile,
  });

  if (!labelProfile) {
    return {
      status: "error",
      message: "Failed to update Product Label Profile",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    status: "success",
    data: {
      product: {
        ...(await resolveProduct(existingProduct)),
        labelProfile,
      },
    },
    message: "Product Label Profile updated successfully",
    code: STATUS_CODES.SUCCESS,
  };
};
