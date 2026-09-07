import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    AddOnDTO,
    BundleProductComponentAddOnDTO,
    BundleProductComponentDTO,
    ComboChoiceGroupDTO,
    ComboChoiceOptionDTO,
    CreateComboChoiceGroupREPO,
    CreateComboChoiceOptionREPO,
    CategoryDTO,
    CreateAddOnREPO,
    CreateBundleProductComponentAddOnREPO,
    CreateBundleProductComponentREPO,
    CreateCategoryREPO,
    CreateLabelTemplateREPO,
    CreateProductAddOnAttachmentREPO,
    CreateProductREPO,
    CreateStoreProductOfferingREPO,
    CreateStoreCategoryPresentationREPO,
    CreateStoreAddOnOfferingREPO,
    LabelTemplateDTO,
    ProductLabelProfileDTO,
    ProductLabelProfileREPO,
    ProductAddOnAttachmentDTO,
    ProductAddOnAttachmentResponseDTO,
    ProductDTO,
    StoreProductOfferingDTO,
    StoreCategoryPresentationDTO,
    StoreAddOnOfferingDTO,
    UpdateAddOnREPO,
    UpdateCategoryREPO,
    UpdateLabelTemplateREPO,
    UpdateProductAddOnAttachmentREPO,
    UpdateProductREPO,
    UpdateStoreProductOfferingREPO,
    UpdateStoreCategoryPresentationREPO,
    UpdateStoreAddOnOfferingREPO,
    CatalogCommercialOperationAuditDTO,
    CatalogCommercialOperationChange,
    CatalogCommercialItemType,
    CatalogCommercialOperationType,
    CreateCatalogCommercialOperationAuditREPO,
} from "@repo/types";
import { SEEDED_LABEL_TEMPLATES } from "@repo/types";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;

// Product and Store creation both extend the same Product × Store matrix. Keep
// those writes serialized per Organization so concurrent creates cannot leave a
// missing Store Product Offering.
const STORE_PRODUCT_OFFERING_TOPOLOGY_LOCK_ID = 410041;
const STORE_CATEGORY_PRESENTATION_TOPOLOGY_LOCK_ID = 410042;
const STORE_ADD_ON_OFFERING_TOPOLOGY_LOCK_ID = 410043;

export const lockStoreAddOnOfferingTopology = async (
    organizationId: string,
    tx: Bun.TransactionSQL,
) => {
    await tx`
        SELECT pg_advisory_xact_lock(
            ${STORE_ADD_ON_OFFERING_TOPOLOGY_LOCK_ID},
            hashtext(${organizationId})
        )
    `;
};

export const lockStoreProductOfferingTopology = async (
    organizationId: string,
    tx: Bun.TransactionSQL,
) => {
    await tx`
        SELECT pg_advisory_xact_lock(
            ${STORE_PRODUCT_OFFERING_TOPOLOGY_LOCK_ID},
            hashtext(${organizationId})
        )
    `;
};

const mapProduct = (row: Record<string, unknown>): ProductDTO => {
    const mapped = mapRow<ProductDTO>(row);
    return {
        ...mapped,
        price: Number(mapped.price),
        discount: Number(mapped.discount),
        defaultSellingQuantity: Number(mapped.defaultSellingQuantity),
        allowCustomSellingQuantity: Boolean(mapped.allowCustomSellingQuantity),
        unitLabel:
            typeof mapped.unitLabel === "string" && mapped.unitLabel.length > 0
                ? mapped.unitLabel
                : "",
    };
};

const mapStoreProductOffering = (row: Record<string, unknown>): StoreProductOfferingDTO => {
    const mapped = mapRow<{
        id: string;
        organizationId: string;
        storeId: string;
        productId: string;
        priceOverride?: number | null;
        discountOverride?: number | null;
        status: StoreProductOfferingDTO["status"];
        createdBy: string;
        updatedBy?: string | null;
        createdAt: StoreProductOfferingDTO["createdAt"];
        updatedAt: StoreProductOfferingDTO["updatedAt"];
    }>(row);

    const rawPriceOverride = row.price_override ?? mapped.priceOverride;
    const rawDiscountOverride = row.discount_override ?? mapped.discountOverride;
    const priceOverride =
        rawPriceOverride === null || rawPriceOverride === undefined
            ? null
            : Number(rawPriceOverride);
    const discountOverride =
        rawDiscountOverride === null || rawDiscountOverride === undefined
            ? null
            : Number(rawDiscountOverride);
    const productPrice = Number(row.product_price);
    const productDiscount = Number(row.product_discount);
    const effectivePrice = priceOverride ?? productPrice;
    const effectiveDiscount = discountOverride ?? productDiscount;

    return {
        id: mapped.id,
        organizationId: mapped.organizationId,
        storeId: mapped.storeId,
        productId: mapped.productId,
        priceOverride,
        discountOverride,
        effectivePrice,
        effectiveDiscount,
        isPriceInherited: priceOverride === null,
        isDiscountInherited: discountOverride === null,
        status: mapped.status,
        createdBy: mapped.createdBy,
        updatedBy: mapped.updatedBy,
        createdAt: mapped.createdAt,
        updatedAt: mapped.updatedAt,
    };
};

const mapBundleComponent = (row: Record<string, unknown>): BundleProductComponentDTO => {
    const mapped = mapRow<BundleProductComponentDTO>(row);
    return {
        ...mapped,
        quantity: Number(mapped.quantity),
    };
};

const mapBundleComponentAddOn = (row: Record<string, unknown>): BundleProductComponentAddOnDTO => {
    const mapped = mapRow<BundleProductComponentAddOnDTO>(row);
    return {
        ...mapped,
        quantity: Number(mapped.quantity),
    };
};

const mapComboChoiceGroup = (row: Record<string, unknown>): ComboChoiceGroupDTO => {
    const mapped = mapRow<ComboChoiceGroupDTO>(row);
    return {
        ...mapped,
        minSelections: Number(mapped.minSelections),
        maxSelections: Number(mapped.maxSelections),
        sortOrder: Number(mapped.sortOrder),
    };
};

const mapComboChoiceOption = (row: Record<string, unknown>): ComboChoiceOptionDTO => {
    const mapped = mapRow<ComboChoiceOptionDTO>(row);
    return {
        ...mapped,
        maxQuantity: Number(mapped.maxQuantity),
        priceAdjustment: Number(mapped.priceAdjustment),
        sortOrder: Number(mapped.sortOrder),
    };
};

const mapAttachmentWithAddOn = (row: Record<string, unknown>): ProductAddOnAttachmentResponseDTO => {
    const mapped = snakeToCamel(row) as ProductAddOnAttachmentDTO & {
        addOnName: string;
        addOnPrice: number;
        addOnDiscount: number;
        addOnStatus: AddOnDTO["status"];
        addOnCreatedBy: string;
        addOnUpdatedBy?: string | null;
        addOnCreatedAt: AddOnDTO["createdAt"];
        addOnUpdatedAt: AddOnDTO["updatedAt"];
    };

    const offeringPrice =
        row.offering_price != null ? Number(row.offering_price) : Number(mapped.addOnPrice);
    const offeringDiscount =
        row.offering_discount != null
            ? Number(row.offering_discount)
            : Number(mapped.addOnDiscount);

    return {
        id: mapped.id,
        organizationId: mapped.organizationId,
        productId: mapped.productId,
        addOnId: mapped.addOnId,
        selectionCap: Number(mapped.selectionCap),
        status: mapped.status,
        createdBy: mapped.createdBy,
        updatedBy: mapped.updatedBy,
        createdAt: mapped.createdAt,
        updatedAt: mapped.updatedAt,
        addOn: {
            id: mapped.addOnId,
            organizationId: mapped.organizationId,
            name: mapped.addOnName,
            price: offeringPrice,
            discount: offeringDiscount,
            status: mapped.addOnStatus,
            createdBy: mapped.addOnCreatedBy,
            updatedBy: mapped.addOnUpdatedBy,
            createdAt: mapped.addOnCreatedAt,
            updatedAt: mapped.addOnUpdatedAt,
        },
    };
};

export const createCategory = async (
    categoryData: CreateCategoryREPO,
    tx?: Bun.TransactionSQL,
): Promise<CategoryDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO categories ${camelToSnakeSql(categoryData)}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const getNextCategorySortOrder = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<number> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT COALESCE(MAX(sort_order) + 1, 0)::int AS next_sort_order
        FROM categories
        WHERE organization_id = ${organizationId}
    `;

    return Number(result?.next_sort_order ?? 0);
};

export const getCategoriesByOrganizationId = async (organizationId: string): Promise<CategoryDTO[]> => {
    const results = await pg`
        SELECT *
        FROM categories
        WHERE organization_id = ${organizationId}
        ORDER BY sort_order ASC, created_at ASC, id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<CategoryDTO>(result));
};

export const getCategoryById = async (organizationId: string, categoryId: string): Promise<CategoryDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM categories
        WHERE id = ${categoryId}
          AND organization_id = ${organizationId}
    `;

    return result ? snakeToCamel(result) : null;
};

export const categoryNameExistsInOrganization = async (
    organizationId: string,
    name: string,
    excludeId?: string,
): Promise<boolean> => {
    const results = excludeId
        ? await pg`
            SELECT 1
            FROM categories
            WHERE organization_id = ${organizationId}
              AND LOWER(name) = LOWER(${name})
              AND id <> ${excludeId}
            LIMIT 1
        `
        : await pg`
            SELECT 1
            FROM categories
            WHERE organization_id = ${organizationId}
              AND LOWER(name) = LOWER(${name})
            LIMIT 1
        `;

    return Boolean(results[0]);
};

export const updateCategory = async (categoryData: UpdateCategoryREPO): Promise<CategoryDTO | null> => {
    const [result] = await pg`
        UPDATE categories
        SET name = ${categoryData.name},
            status = ${categoryData.status},
            updated_by = ${categoryData.updatedBy},
            updated_at = NOW()
        WHERE id = ${categoryData.id}
          AND organization_id = ${categoryData.organizationId}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const countProductsByCategoryId = async (organizationId: string, categoryId: string): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM products
        WHERE organization_id = ${organizationId}
          AND category_id = ${categoryId}
    `;

    return Number(result?.total ?? 0);
};

export const deleteCategory = async (organizationId: string, categoryId: string): Promise<CategoryDTO | null> => {
    const [result] = await pg`
        DELETE FROM categories
        WHERE id = ${categoryId}
          AND organization_id = ${organizationId}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const createProduct = async (
    productData: CreateProductREPO,
    tx?: Bun.TransactionSQL,
): Promise<ProductDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO products ${camelToSnakeSql(productData)}
        RETURNING *
    `;

    return result ? mapProduct(result) : null;
};

export const getProductsByOrganizationId = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<ProductDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT p.*, u.label AS unit_label
        FROM products p
        INNER JOIN units u
            ON u.id = p.unit_id
           AND u.organization_id = p.organization_id
        INNER JOIN categories c
            ON c.id = p.category_id
           AND c.organization_id = p.organization_id
        WHERE p.organization_id = ${organizationId}
        ORDER BY c.sort_order ASC, p.sort_order ASC, p.created_at ASC, p.id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapProduct(result));
};

export const getActiveProductAddOnCountsByOrganizationId = async (
    organizationId: string,
): Promise<Map<string, number>> => {
    const results = await pg`
        SELECT
            a.product_id,
            COUNT(*)::int AS active_add_on_count
        FROM product_add_on_attachments a
        INNER JOIN add_ons ao
            ON ao.id = a.add_on_id
           AND ao.organization_id = a.organization_id
        WHERE a.organization_id = ${organizationId}
          AND a.status = 'active'
          AND ao.status = 'active'
        GROUP BY a.product_id
    `;

    return new Map(
        results.map((result: Record<string, unknown>) => [
            String(result.product_id),
            Number(result.active_add_on_count),
        ]),
    );
};

export const getProductsByIds = async (organizationId: string, productIds: string[]): Promise<ProductDTO[]> => {
    if (productIds.length === 0) return [];

    const results = await pg`
        SELECT p.*, u.label AS unit_label
        FROM products p
        INNER JOIN units u
            ON u.id = p.unit_id
           AND u.organization_id = p.organization_id
        WHERE p.organization_id = ${organizationId}
          AND p.id IN ${pg(productIds)}
    `;
    return results.map((result: Record<string, unknown>) => mapProduct(result));
};

export const getActiveProductsByOrganizationId = async (organizationId: string): Promise<ProductDTO[]> => {
    const results = await pg`
        SELECT p.*, u.label AS unit_label
        FROM products p
        INNER JOIN units u
            ON u.id = p.unit_id
           AND u.organization_id = p.organization_id
        INNER JOIN categories c
            ON c.id = p.category_id
           AND c.organization_id = p.organization_id
        WHERE p.organization_id = ${organizationId}
          AND p.status = 'active'
        ORDER BY c.sort_order ASC, p.sort_order ASC, p.created_at ASC, p.id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapProduct(result));
};

export const getProductsByCategoryId = async (organizationId: string, categoryId: string): Promise<ProductDTO[]> => {
    const results = await pg`
        SELECT p.*, u.label AS unit_label
        FROM products p
        INNER JOIN units u
            ON u.id = p.unit_id
           AND u.organization_id = p.organization_id
        WHERE p.organization_id = ${organizationId}
          AND p.category_id = ${categoryId}
        ORDER BY p.sort_order ASC, p.created_at ASC, p.id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapProduct(result));
};

export const getProductById = async (organizationId: string, productId: string): Promise<ProductDTO | null> => {
    const [result] = await pg`
        SELECT p.*, u.label AS unit_label
        FROM products p
        INNER JOIN units u
            ON u.id = p.unit_id
           AND u.organization_id = p.organization_id
        WHERE p.id = ${productId}
          AND p.organization_id = ${organizationId}
    `;

    return result ? mapProduct(result) : null;
};

export const getNextProductSortOrder = async (
    organizationId: string,
    categoryId: string,
    tx?: Bun.TransactionSQL,
): Promise<number> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT COALESCE(MAX(sort_order) + 1, 0)::int AS next_sort_order
        FROM products
        WHERE organization_id = ${organizationId}
          AND category_id = ${categoryId}
    `;

    return Number(result?.next_sort_order ?? 0);
};

export const reorderCategories = async (
    organizationId: string,
    categoryIds: string[],
    updatedBy: string,
    tx: Bun.TransactionSQL,
): Promise<void> => {
    for (const [sortOrder, categoryId] of categoryIds.entries()) {
        await tx`
            UPDATE categories
            SET sort_order = ${sortOrder},
                updated_by = ${updatedBy},
                updated_at = NOW()
            WHERE organization_id = ${organizationId}
              AND id = ${categoryId}
        `;
    }
};

export const reorderProducts = async (
    organizationId: string,
    categoryId: string,
    productIds: string[],
    updatedBy: string,
    tx: Bun.TransactionSQL,
): Promise<void> => {
    for (const [sortOrder, productId] of productIds.entries()) {
        await tx`
            UPDATE products
            SET sort_order = ${sortOrder},
                updated_by = ${updatedBy},
                updated_at = NOW()
            WHERE organization_id = ${organizationId}
              AND category_id = ${categoryId}
              AND id = ${productId}
        `;
    }
};

export const getProductByCode = async (
    organizationId: string,
    productCode: string,
    excludeId?: string,
    tx?: Bun.TransactionSQL,
): Promise<ProductDTO | null> => {
    const db = tx || pg;
    const [result] = excludeId
        ? await db`
            SELECT p.*, u.label AS unit_label
            FROM products p
            INNER JOIN units u
                ON u.id = p.unit_id
               AND u.organization_id = p.organization_id
            WHERE p.organization_id = ${organizationId}
              AND p.product_code = ${productCode}
              AND p.id <> ${excludeId}
            LIMIT 1
        `
        : await db`
            SELECT p.*, u.label AS unit_label
            FROM products p
            INNER JOIN units u
                ON u.id = p.unit_id
               AND u.organization_id = p.organization_id
            WHERE p.organization_id = ${organizationId}
              AND p.product_code = ${productCode}
            LIMIT 1
        `;

    return result ? mapProduct(result) : null;
};

export const allocateNextInternalProductCodeSequence = async (
    organizationId: string,
    tx: Bun.TransactionSQL,
): Promise<number | null> => {
    await tx`
        INSERT INTO internal_product_code_sequences (organization_id)
        VALUES (${organizationId})
        ON CONFLICT (organization_id) DO NOTHING
    `;

    const [result] = await tx`
        UPDATE internal_product_code_sequences
        SET next_sequence = next_sequence + 1
        WHERE organization_id = ${organizationId}
          AND next_sequence < 10000000000
        RETURNING next_sequence - 1 AS allocated_sequence
    `;

    return result ? Number(result.allocated_sequence) : null;
};

export const isReleasedInternalProductCode = async (organizationId: string, productCode: string): Promise<boolean> => {
    const [result] = await pg`
        SELECT 1
        FROM released_internal_product_codes
        WHERE organization_id = ${organizationId}
          AND product_code = ${productCode}
        LIMIT 1
    `;

    return Boolean(result);
};

export const releaseInternalProductCode = async (
    organizationId: string,
    productCode: string,
    tx: Bun.TransactionSQL,
): Promise<void> => {
    await tx`
        INSERT INTO released_internal_product_codes (organization_id, product_code)
        VALUES (${organizationId}, ${productCode})
        ON CONFLICT (organization_id, product_code) DO UPDATE
        SET released_at = NOW()
    `;
};

export const claimReleasedInternalProductCode = async (
    organizationId: string,
    productCode: string,
    tx: Bun.TransactionSQL,
): Promise<boolean> => {
    const [result] = await tx`
        DELETE FROM released_internal_product_codes
        WHERE organization_id = ${organizationId}
          AND product_code = ${productCode}
        RETURNING product_code
    `;

    return Boolean(result);
};

export const assignInternalProductCodeToUncodedProduct = async (
    organizationId: string,
    productId: string,
    productCode: string,
    updatedBy: string,
    tx: Bun.TransactionSQL,
): Promise<ProductDTO | null> => {
    const [result] = await tx`
        UPDATE products
        SET product_code = ${productCode},
            product_code_kind = 'internal_rcn',
            updated_by = ${updatedBy},
            updated_at = NOW()
        WHERE id = ${productId}
          AND organization_id = ${organizationId}
          AND product_code IS NULL
        RETURNING *
    `;

    return result ? mapProduct(result) : null;
};

export const productNameExistsInCategory = async (
    organizationId: string,
    categoryId: string,
    name: string,
    excludeId?: string,
): Promise<boolean> => {
    const results = excludeId
        ? await pg`
            SELECT 1
            FROM products
            WHERE organization_id = ${organizationId}
              AND category_id = ${categoryId}
              AND LOWER(name) = LOWER(${name})
              AND id <> ${excludeId}
            LIMIT 1
        `
        : await pg`
            SELECT 1
            FROM products
            WHERE organization_id = ${organizationId}
              AND category_id = ${categoryId}
              AND LOWER(name) = LOWER(${name})
            LIMIT 1
        `;

    return Boolean(results[0]);
};

export const updateProduct = async (
    productData: UpdateProductREPO,
    tx?: Bun.TransactionSQL,
): Promise<ProductDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE products
        SET category_id = ${productData.categoryId},
            sort_order = COALESCE(${productData.sortOrder ?? null}, sort_order),
            name = ${productData.name},
            price = ${productData.price},
            discount = ${productData.discount},
            image_path = ${productData.imagePath ?? null},
            product_code = ${productData.productCode},
            product_code_kind = ${productData.productCodeKind},
            unit_id = ${productData.unitId},
            default_selling_quantity = ${productData.defaultSellingQuantity},
            allow_custom_selling_quantity = ${productData.allowCustomSellingQuantity},
            status = ${productData.status},
            updated_by = ${productData.updatedBy},
            updated_at = NOW()
        WHERE id = ${productData.id}
          AND organization_id = ${productData.organizationId}
        RETURNING *
    `;

    return result ? mapProduct(result) : null;
};

export const deleteProduct = async (
    organizationId: string,
    productId: string,
    tx?: Bun.TransactionSQL,
): Promise<ProductDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        DELETE FROM products
        WHERE id = ${productId}
          AND organization_id = ${organizationId}
        RETURNING *
    `;

    return result ? mapProduct(result) : null;
};

export const createAddOn = async (addOnData: CreateAddOnREPO, tx?: Bun.TransactionSQL): Promise<AddOnDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO add_ons ${camelToSnakeSql(addOnData)}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const getAddOnsByOrganizationId = async (organizationId: string): Promise<AddOnDTO[]> => {
    const results = await pg`
        SELECT *
        FROM add_ons
        WHERE organization_id = ${organizationId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<AddOnDTO>(result));
};

export const getActiveAddOnsByOrganizationId = async (organizationId: string): Promise<AddOnDTO[]> => {
    const results = await pg`
        SELECT *
        FROM add_ons
        WHERE organization_id = ${organizationId}
          AND status = 'active'
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<AddOnDTO>(result));
};

export const getAddOnById = async (organizationId: string, addOnId: string): Promise<AddOnDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM add_ons
        WHERE id = ${addOnId}
          AND organization_id = ${organizationId}
    `;

    return result ? snakeToCamel(result) : null;
};

export const addOnNameExistsInOrganization = async (
    organizationId: string,
    name: string,
    excludeId?: string,
): Promise<boolean> => {
    const results = excludeId
        ? await pg`
            SELECT 1
            FROM add_ons
            WHERE organization_id = ${organizationId}
              AND LOWER(name) = LOWER(${name})
              AND id <> ${excludeId}
            LIMIT 1
        `
        : await pg`
            SELECT 1
            FROM add_ons
            WHERE organization_id = ${organizationId}
              AND LOWER(name) = LOWER(${name})
            LIMIT 1
        `;

    return Boolean(results[0]);
};

export const updateAddOn = async (addOnData: UpdateAddOnREPO): Promise<AddOnDTO | null> => {
    const [result] = await pg`
        UPDATE add_ons
        SET name = ${addOnData.name},
            price = ${addOnData.price},
            discount = ${addOnData.discount},
            status = ${addOnData.status},
            updated_by = ${addOnData.updatedBy},
            updated_at = NOW()
        WHERE id = ${addOnData.id}
          AND organization_id = ${addOnData.organizationId}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const countAttachmentsByAddOnId = async (organizationId: string, addOnId: string): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM product_add_on_attachments
        WHERE organization_id = ${organizationId}
          AND add_on_id = ${addOnId}
    `;

    return Number(result?.total ?? 0);
};

export const countSaleItemAddOnsByAddOnId = async (organizationId: string, addOnId: string): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM sale_item_add_ons
        WHERE organization_id = ${organizationId}
          AND add_on_id = ${addOnId}
    `;

    return Number(result?.total ?? 0);
};

export const countBundleProductComponentsByComponentProductId = async (
    organizationId: string,
    productId: string,
): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM bundle_product_components
        WHERE organization_id = ${organizationId}
          AND component_product_id = ${productId}
    `;

    return Number(result?.total ?? 0);
};

export const countSaleItemsByProductId = async (organizationId: string, productId: string): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM sale_items
        WHERE organization_id = ${organizationId}
          AND product_id = ${productId}
    `;

    return Number(result?.total ?? 0);
};

export const countSaleItemBundleComponentsByComponentProductId = async (
    organizationId: string,
    productId: string,
): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM sale_item_bundle_components
        WHERE organization_id = ${organizationId}
          AND component_product_id = ${productId}
    `;

    return Number(result?.total ?? 0);
};

export const countBundleProductComponentAddOnsByAddOnId = async (
    organizationId: string,
    addOnId: string,
): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM bundle_product_component_add_ons
        WHERE organization_id = ${organizationId}
          AND add_on_id = ${addOnId}
    `;

    return Number(result?.total ?? 0);
};

export const countSaleItemBundleComponentAddOnsByAddOnId = async (
    organizationId: string,
    addOnId: string,
): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM sale_item_bundle_component_add_ons
        WHERE organization_id = ${organizationId}
          AND add_on_id = ${addOnId}
    `;

    return Number(result?.total ?? 0);
};

export const deleteAddOn = async (organizationId: string, addOnId: string): Promise<AddOnDTO | null> => {
    const [result] = await pg`
        DELETE FROM add_ons
        WHERE id = ${addOnId}
          AND organization_id = ${organizationId}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const createProductAddOnAttachment = async (
    attachmentData: CreateProductAddOnAttachmentREPO,
    tx?: Bun.TransactionSQL,
): Promise<ProductAddOnAttachmentDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO product_add_on_attachments ${camelToSnakeSql(attachmentData)}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const getProductAddOnAttachmentsByProductId = async (
    organizationId: string,
    productId: string,
): Promise<ProductAddOnAttachmentResponseDTO[]> => {
    const results = await pg`
        SELECT
            a.id,
            a.organization_id,
            a.product_id,
            a.add_on_id,
            a.selection_cap,
            a.status,
            a.created_by,
            a.updated_by,
            a.created_at,
            a.updated_at,
            ao.name AS add_on_name,
            ao.price AS add_on_price,
            ao.discount AS add_on_discount,
            ao.status AS add_on_status,
            ao.created_by AS add_on_created_by,
            ao.updated_by AS add_on_updated_by,
            ao.created_at AS add_on_created_at,
            ao.updated_at AS add_on_updated_at
        FROM product_add_on_attachments a
        INNER JOIN add_ons ao
            ON ao.id = a.add_on_id
           AND ao.organization_id = a.organization_id
        WHERE a.organization_id = ${organizationId}
          AND a.product_id = ${productId}
        ORDER BY a.created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapAttachmentWithAddOn(result));
};

export const getActiveProductAddOnAttachmentByProductAndAddOn = async (
    organizationId: string,
    productId: string,
    addOnId: string,
): Promise<ProductAddOnAttachmentResponseDTO | null> => {
    const [result] = await pg`
        SELECT
            a.id,
            a.organization_id,
            a.product_id,
            a.add_on_id,
            a.selection_cap,
            a.status,
            a.created_by,
            a.updated_by,
            a.created_at,
            a.updated_at,
            ao.name AS add_on_name,
            ao.price AS add_on_price,
            ao.discount AS add_on_discount,
            ao.status AS add_on_status,
            ao.created_by AS add_on_created_by,
            ao.updated_by AS add_on_updated_by,
            ao.created_at AS add_on_created_at,
            ao.updated_at AS add_on_updated_at
        FROM product_add_on_attachments a
        INNER JOIN add_ons ao
            ON ao.id = a.add_on_id
           AND ao.organization_id = a.organization_id
        WHERE a.organization_id = ${organizationId}
          AND a.product_id = ${productId}
          AND a.add_on_id = ${addOnId}
          AND a.status = 'active'
          AND ao.status = 'active'
    `;

    return result ? mapAttachmentWithAddOn(result) : null;
};

export const getSelectableProductAddOnAttachmentsByStoreId = async (
    organizationId: string,
    storeId: string,
): Promise<ProductAddOnAttachmentResponseDTO[]> => {
    const results = await pg`
        SELECT
            a.id,
            a.organization_id,
            a.product_id,
            a.add_on_id,
            a.selection_cap,
            a.status,
            a.created_by,
            a.updated_by,
            a.created_at,
            a.updated_at,
            ao.name AS add_on_name,
            ao.price AS add_on_price,
            ao.discount AS add_on_discount,
            ao.status AS add_on_status,
            ao.created_by AS add_on_created_by,
            ao.updated_by AS add_on_updated_by,
            ao.created_at AS add_on_created_at,
            ao.updated_at AS add_on_updated_at,
            COALESCE(sao.price_override, ao.price) AS offering_price,
            COALESCE(sao.discount_override, ao.discount) AS offering_discount
        FROM product_add_on_attachments a
        INNER JOIN add_ons ao
            ON ao.id = a.add_on_id
           AND ao.organization_id = a.organization_id
        INNER JOIN store_add_on_offerings sao
            ON sao.add_on_id = ao.id
           AND sao.organization_id = ao.organization_id
           AND sao.store_id = ${storeId}
           AND sao.status = 'active'
        INNER JOIN store_product_offerings spo
            ON spo.product_id = a.product_id
           AND spo.organization_id = a.organization_id
           AND spo.store_id = ${storeId}
           AND spo.status = 'active'
        INNER JOIN products p
            ON p.id = a.product_id
           AND p.organization_id = a.organization_id
           AND p.status = 'active'
        WHERE a.organization_id = ${organizationId}
          AND a.status = 'active'
          AND ao.status = 'active'
        ORDER BY a.created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapAttachmentWithAddOn(result));
};

export const getSelectableProductAddOnAttachmentByProductAndAddOn = async (
    organizationId: string,
    storeId: string,
    productId: string,
    addOnId: string,
): Promise<ProductAddOnAttachmentResponseDTO | null> => {
    const [result] = await pg`
        SELECT
            a.id,
            a.organization_id,
            a.product_id,
            a.add_on_id,
            a.selection_cap,
            a.status,
            a.created_by,
            a.updated_by,
            a.created_at,
            a.updated_at,
            ao.name AS add_on_name,
            ao.price AS add_on_price,
            ao.discount AS add_on_discount,
            ao.status AS add_on_status,
            ao.created_by AS add_on_created_by,
            ao.updated_by AS add_on_updated_by,
            ao.created_at AS add_on_created_at,
            ao.updated_at AS add_on_updated_at,
            COALESCE(sao.price_override, ao.price) AS offering_price,
            COALESCE(sao.discount_override, ao.discount) AS offering_discount
        FROM product_add_on_attachments a
        INNER JOIN add_ons ao
            ON ao.id = a.add_on_id
           AND ao.organization_id = a.organization_id
        INNER JOIN store_add_on_offerings sao
            ON sao.add_on_id = ao.id
           AND sao.organization_id = ao.organization_id
           AND sao.store_id = ${storeId}
           AND sao.status = 'active'
        INNER JOIN store_product_offerings spo
            ON spo.product_id = a.product_id
           AND spo.organization_id = a.organization_id
           AND spo.store_id = ${storeId}
           AND spo.status = 'active'
        INNER JOIN products p
            ON p.id = a.product_id
           AND p.organization_id = a.organization_id
           AND p.status = 'active'
        WHERE a.organization_id = ${organizationId}
          AND a.product_id = ${productId}
          AND a.add_on_id = ${addOnId}
          AND a.status = 'active'
          AND ao.status = 'active'
    `;

    return result ? mapAttachmentWithAddOn(result) : null;
};

export const getProductAddOnAttachmentById = async (
    organizationId: string,
    productId: string,
    attachmentId: string,
): Promise<ProductAddOnAttachmentResponseDTO | null> => {
    const [result] = await pg`
        SELECT
            a.id,
            a.organization_id,
            a.product_id,
            a.add_on_id,
            a.selection_cap,
            a.status,
            a.created_by,
            a.updated_by,
            a.created_at,
            a.updated_at,
            ao.name AS add_on_name,
            ao.price AS add_on_price,
            ao.discount AS add_on_discount,
            ao.status AS add_on_status,
            ao.created_by AS add_on_created_by,
            ao.updated_by AS add_on_updated_by,
            ao.created_at AS add_on_created_at,
            ao.updated_at AS add_on_updated_at
        FROM product_add_on_attachments a
        INNER JOIN add_ons ao
            ON ao.id = a.add_on_id
           AND ao.organization_id = a.organization_id
        WHERE a.id = ${attachmentId}
          AND a.product_id = ${productId}
          AND a.organization_id = ${organizationId}
    `;

    return result ? mapAttachmentWithAddOn(result) : null;
};

export const productAddOnAttachmentExists = async (
    organizationId: string,
    productId: string,
    addOnId: string,
): Promise<boolean> => {
    const [result] = await pg`
        SELECT 1
        FROM product_add_on_attachments
        WHERE organization_id = ${organizationId}
          AND product_id = ${productId}
          AND add_on_id = ${addOnId}
        LIMIT 1
    `;

    return Boolean(result);
};

export const updateProductAddOnAttachment = async (
    attachmentData: UpdateProductAddOnAttachmentREPO,
): Promise<ProductAddOnAttachmentDTO | null> => {
    const [result] = await pg`
        UPDATE product_add_on_attachments
        SET selection_cap = ${attachmentData.selectionCap},
            status = ${attachmentData.status},
            updated_by = ${attachmentData.updatedBy},
            updated_at = NOW()
        WHERE id = ${attachmentData.id}
          AND product_id = ${attachmentData.productId}
          AND organization_id = ${attachmentData.organizationId}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const deleteProductAddOnAttachment = async (
    organizationId: string,
    productId: string,
    attachmentId: string,
): Promise<ProductAddOnAttachmentDTO | null> => {
    const [result] = await pg`
        DELETE FROM product_add_on_attachments
        WHERE id = ${attachmentId}
          AND product_id = ${productId}
          AND organization_id = ${organizationId}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const createBundleProductComponent = async (
    componentData: CreateBundleProductComponentREPO,
    tx?: Bun.TransactionSQL,
): Promise<BundleProductComponentDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO bundle_product_components ${camelToSnakeSql(componentData)}
        RETURNING *
    `;

    return result ? mapBundleComponent(result) : null;
};

export const getBundleProductComponentsByBundleProductId = async (
    organizationId: string,
    bundleProductId: string,
    tx?: Bun.TransactionSQL,
): Promise<BundleProductComponentDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM bundle_product_components
        WHERE organization_id = ${organizationId}
          AND bundle_product_id = ${bundleProductId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapBundleComponent(result));
};

export const deleteBundleProductComponentsByBundleProductId = async (
    organizationId: string,
    bundleProductId: string,
    tx?: Bun.TransactionSQL,
): Promise<void> => {
    const db = tx || pg;
    await db`
        DELETE FROM bundle_product_components
        WHERE organization_id = ${organizationId}
          AND bundle_product_id = ${bundleProductId}
    `;
};

export const createBundleProductComponentAddOn = async (
    addOnData: CreateBundleProductComponentAddOnREPO,
    tx?: Bun.TransactionSQL,
): Promise<BundleProductComponentAddOnDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO bundle_product_component_add_ons ${camelToSnakeSql(addOnData)}
        RETURNING *
    `;

    return result ? mapBundleComponentAddOn(result) : null;
};

export const getBundleProductComponentAddOnsByComponentIds = async (
    organizationId: string,
    componentIds: string[],
    tx?: Bun.TransactionSQL,
): Promise<BundleProductComponentAddOnDTO[]> => {
    if (componentIds.length === 0) {
        return [];
    }

    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM bundle_product_component_add_ons
        WHERE organization_id = ${organizationId}
          AND bundle_product_component_id IN ${db(componentIds)}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapBundleComponentAddOn(result));
};

export const createComboChoiceGroup = async (
    groupData: CreateComboChoiceGroupREPO,
    tx?: Bun.TransactionSQL,
): Promise<ComboChoiceGroupDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO combo_choice_groups ${camelToSnakeSql(groupData)}
        RETURNING *
    `;
    return result ? mapComboChoiceGroup(result) : null;
};

export const createComboChoiceOption = async (
    optionData: CreateComboChoiceOptionREPO,
    tx?: Bun.TransactionSQL,
): Promise<ComboChoiceOptionDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO combo_choice_options ${camelToSnakeSql(optionData)}
        RETURNING *
    `;
    return result ? mapComboChoiceOption(result) : null;
};

export const getComboChoiceGroupsByProductId = async (
    organizationId: string,
    comboProductId: string,
    tx?: Bun.TransactionSQL,
): Promise<ComboChoiceGroupDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM combo_choice_groups
        WHERE organization_id = ${organizationId}
          AND combo_product_id = ${comboProductId}
        ORDER BY sort_order ASC, created_at ASC
    `;
    return results.map((result: Record<string, unknown>) => mapComboChoiceGroup(result));
};

export const getComboChoiceGroupsByProductIds = async (
    organizationId: string,
    comboProductIds: string[],
): Promise<ComboChoiceGroupDTO[]> => {
    if (comboProductIds.length === 0) return [];

    const results = await pg`
        SELECT *
        FROM combo_choice_groups
        WHERE organization_id = ${organizationId}
          AND combo_product_id IN ${pg(comboProductIds)}
        ORDER BY combo_product_id ASC, sort_order ASC, created_at ASC
    `;
    return results.map((result: Record<string, unknown>) => mapComboChoiceGroup(result));
};

export const getComboChoiceOptionsByGroupIds = async (
    organizationId: string,
    groupIds: string[],
    tx?: Bun.TransactionSQL,
): Promise<ComboChoiceOptionDTO[]> => {
    if (groupIds.length === 0) return [];

    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM combo_choice_options
        WHERE organization_id = ${organizationId}
          AND choice_group_id IN ${db(groupIds)}
        ORDER BY sort_order ASC, created_at ASC
    `;
    return results.map((result: Record<string, unknown>) => mapComboChoiceOption(result));
};

export const deleteComboChoiceGroupsByProductId = async (
    organizationId: string,
    comboProductId: string,
    tx?: Bun.TransactionSQL,
): Promise<void> => {
    const db = tx || pg;
    await db`
        DELETE FROM combo_choice_groups
        WHERE organization_id = ${organizationId}
          AND combo_product_id = ${comboProductId}
    `;
};

export const countActiveBundlesByComponentProductId = async (
    organizationId: string,
    componentProductId: string,
): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM bundle_product_components bpc
        INNER JOIN products bp
            ON bp.id = bpc.bundle_product_id
           AND bp.organization_id = bpc.organization_id
        WHERE bpc.organization_id = ${organizationId}
          AND bpc.component_product_id = ${componentProductId}
          AND bp.product_type = 'bundle'
          AND bp.status = 'active'
    `;

    return Number(result?.total ?? 0);
};

export const countActiveCombosByOptionProductId = async (
    organizationId: string,
    optionProductId: string,
): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM combo_choice_options cco
        INNER JOIN combo_choice_groups ccg
            ON ccg.id = cco.choice_group_id
           AND ccg.organization_id = cco.organization_id
        INNER JOIN products cp
            ON cp.id = ccg.combo_product_id
           AND cp.organization_id = ccg.organization_id
        WHERE cco.organization_id = ${organizationId}
          AND cco.option_product_id = ${optionProductId}
          AND cp.product_type = 'combo'
          AND cp.status = 'active'
    `;
    return Number(result?.total ?? 0);
};

export const countComboChoiceOptionsByProductId = async (
    organizationId: string,
    optionProductId: string,
): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM combo_choice_options
        WHERE organization_id = ${organizationId}
          AND option_product_id = ${optionProductId}
    `;
    return Number(result?.total ?? 0);
};

export const countActiveBundlesByComponentAddOnId = async (
    organizationId: string,
    addOnId: string,
): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM bundle_product_component_add_ons bca
        INNER JOIN bundle_product_components bpc
            ON bpc.id = bca.bundle_product_component_id
           AND bpc.organization_id = bca.organization_id
        INNER JOIN products bp
            ON bp.id = bpc.bundle_product_id
           AND bp.organization_id = bpc.organization_id
        WHERE bca.organization_id = ${organizationId}
          AND bca.add_on_id = ${addOnId}
          AND bp.product_type = 'bundle'
          AND bp.status = 'active'
    `;

    return Number(result?.total ?? 0);
};

export const countActiveBundlesByProductAddOnPair = async (
    organizationId: string,
    productId: string,
    addOnId: string,
): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM bundle_product_component_add_ons bca
        INNER JOIN bundle_product_components bpc
            ON bpc.id = bca.bundle_product_component_id
           AND bpc.organization_id = bca.organization_id
        INNER JOIN products bp
            ON bp.id = bpc.bundle_product_id
           AND bp.organization_id = bpc.organization_id
        WHERE bca.organization_id = ${organizationId}
          AND bpc.component_product_id = ${productId}
          AND bca.add_on_id = ${addOnId}
          AND bp.product_type = 'bundle'
          AND bp.status = 'active'
    `;

    return Number(result?.total ?? 0);
};

export const countActiveBundlesByProductAddOnPairAboveQuantity = async (
    organizationId: string,
    productId: string,
    addOnId: string,
    quantity: number,
): Promise<number> => {
    const [result] = await pg`
        SELECT COUNT(*)::int AS total
        FROM bundle_product_component_add_ons bca
        INNER JOIN bundle_product_components bpc
            ON bpc.id = bca.bundle_product_component_id
           AND bpc.organization_id = bca.organization_id
        INNER JOIN products bp
            ON bp.id = bpc.bundle_product_id
           AND bp.organization_id = bpc.organization_id
        WHERE bca.organization_id = ${organizationId}
          AND bpc.component_product_id = ${productId}
          AND bca.add_on_id = ${addOnId}
          AND bca.quantity > ${quantity}
          AND bp.product_type = 'bundle'
          AND bp.status = 'active'
    `;

    return Number(result?.total ?? 0);
};

const parseJsonColumn = <T>(value: T | string): T =>
    typeof value === "string" ? (JSON.parse(value) as T) : value;

const mapLabelTemplate = (row: Record<string, unknown>): LabelTemplateDTO => {
    const mapped = mapRow<LabelTemplateDTO>(row);
    return {
        ...mapped,
        stock: parseJsonColumn(mapped.stock),
        keepOuts: parseJsonColumn(mapped.keepOuts),
        elements: parseJsonColumn(mapped.elements),
    };
};

export const createLabelTemplate = async (
    labelTemplateData: CreateLabelTemplateREPO,
    tx?: Bun.TransactionSQL,
): Promise<LabelTemplateDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO label_templates (
            id,
            organization_id,
            name,
            status,
            stock,
            keep_outs,
            elements,
            created_by
        )
        VALUES (
            ${labelTemplateData.id},
            ${labelTemplateData.organizationId},
            ${labelTemplateData.name},
            ${labelTemplateData.status},
            ${JSON.stringify(labelTemplateData.stock)}::jsonb,
            ${JSON.stringify(labelTemplateData.keepOuts)}::jsonb,
            ${JSON.stringify(labelTemplateData.elements)}::jsonb,
            ${labelTemplateData.createdBy}
        )
        RETURNING *
    `;

    return result ? mapLabelTemplate(result) : null;
};

export const getLabelTemplatesByOrganizationId = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<LabelTemplateDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM label_templates
        WHERE organization_id = ${organizationId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapLabelTemplate(result));
};

export const getLabelTemplateById = async (
    organizationId: string,
    labelTemplateId: string,
): Promise<LabelTemplateDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM label_templates
        WHERE id = ${labelTemplateId}
          AND organization_id = ${organizationId}
    `;

    return result ? mapLabelTemplate(result) : null;
};

export const labelTemplateNameExistsInOrganization = async (
    organizationId: string,
    name: string,
    excludeId?: string,
): Promise<boolean> => {
    const results = excludeId
        ? await pg`
            SELECT 1
            FROM label_templates
            WHERE organization_id = ${organizationId}
              AND LOWER(name) = LOWER(${name})
              AND id <> ${excludeId}
            LIMIT 1
        `
        : await pg`
            SELECT 1
            FROM label_templates
            WHERE organization_id = ${organizationId}
              AND LOWER(name) = LOWER(${name})
            LIMIT 1
        `;

    return Boolean(results[0]);
};

export const updateLabelTemplate = async (
    labelTemplateData: UpdateLabelTemplateREPO,
): Promise<LabelTemplateDTO | null> => {
    const [result] = await pg`
        UPDATE label_templates
        SET name = ${labelTemplateData.name},
            status = ${labelTemplateData.status},
            stock = ${JSON.stringify(labelTemplateData.stock)}::jsonb,
            keep_outs = ${JSON.stringify(labelTemplateData.keepOuts)}::jsonb,
            elements = ${JSON.stringify(labelTemplateData.elements)}::jsonb,
            updated_by = ${labelTemplateData.updatedBy},
            updated_at = NOW()
        WHERE id = ${labelTemplateData.id}
          AND organization_id = ${labelTemplateData.organizationId}
        RETURNING *
    `;

    return result ? mapLabelTemplate(result) : null;
};

export const deleteLabelTemplate = async (
    organizationId: string,
    labelTemplateId: string,
): Promise<LabelTemplateDTO | null> => {
    const [result] = await pg`
        DELETE FROM label_templates
        WHERE id = ${labelTemplateId}
          AND organization_id = ${organizationId}
        RETURNING *
    `;

    return result ? mapLabelTemplate(result) : null;
};

export const seedDefaultLabelTemplates = async (
    organizationId: string,
    createdBy: string,
    tx?: Bun.TransactionSQL,
): Promise<LabelTemplateDTO[]> => {
    const existing = await getLabelTemplatesByOrganizationId(organizationId, tx);
    if (existing.length > 0) {
        return existing;
    }

    const seeded: LabelTemplateDTO[] = [];
    for (const template of SEEDED_LABEL_TEMPLATES) {
        const created = await createLabelTemplate(
            {
                id: crypto.randomUUID(),
                organizationId,
                name: template.name,
                status: template.status,
                stock: template.stock,
                keepOuts: template.keepOuts,
                elements: template.elements,
                createdBy,
            },
            tx,
        );
        if (!created) {
            throw new Error("Failed to seed Label Templates");
        }
        seeded.push(created);
    }

    return seeded;
};

const mapProductLabelProfile = (
    row: Record<string, unknown>,
): ProductLabelProfileDTO => {
    let nutrition: ProductLabelProfileDTO["nutrition"] = null;
    if (row.nutrition != null) {
        const parsed = parseJsonColumn<unknown>(row.nutrition as string | unknown);
        if (Array.isArray(parsed) && parsed.length > 0) {
            nutrition = parsed as ProductLabelProfileDTO["nutrition"];
        }
    }

    return {
        ingredients: row.ingredients ? String(row.ingredients) : null,
        nutrition,
        netWeight: row.net_weight ? String(row.net_weight) : null,
        unitSellingPriceText: row.unit_selling_price_text
            ? String(row.unit_selling_price_text)
            : null,
        mrp: row.mrp != null ? Number(row.mrp) : null,
        shelfLifeDays:
            row.shelf_life_days != null ? Number(row.shelf_life_days) : null,
    };
};

export const getProductLabelProfileByProductId = async (
    organizationId: string,
    productId: string,
): Promise<ProductLabelProfileDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM product_label_profiles
        WHERE organization_id = ${organizationId}
          AND product_id = ${productId}
    `;

    return result ? mapProductLabelProfile(result) : null;
};

export const getProductLabelProfilesByProductIds = async (
    organizationId: string,
    productIds: string[],
): Promise<Map<string, ProductLabelProfileDTO>> => {
    if (productIds.length === 0) {
        return new Map();
    }

    const results = await pg`
        SELECT *
        FROM product_label_profiles
        WHERE organization_id = ${organizationId}
          AND product_id IN ${pg(productIds)}
    `;

    return new Map(
        results.map((result: Record<string, unknown>) => [
            String(result.product_id),
            mapProductLabelProfile(result),
        ]),
    );
};

export const upsertProductLabelProfile = async (
    profileData: ProductLabelProfileREPO,
): Promise<ProductLabelProfileDTO | null> => {
    const [result] = await pg`
        INSERT INTO product_label_profiles (
            product_id,
            organization_id,
            ingredients,
            nutrition,
            net_weight,
            unit_selling_price_text,
            mrp,
            shelf_life_days
        )
        VALUES (
            ${profileData.productId},
            ${profileData.organizationId},
            ${profileData.ingredients ?? null},
            ${profileData.nutrition ? JSON.stringify(profileData.nutrition) : null}::jsonb,
            ${profileData.netWeight ?? null},
            ${profileData.unitSellingPriceText ?? null},
            ${profileData.mrp ?? null},
            ${profileData.shelfLifeDays ?? null}
        )
        ON CONFLICT (product_id) DO UPDATE SET
            ingredients = EXCLUDED.ingredients,
            nutrition = EXCLUDED.nutrition,
            net_weight = EXCLUDED.net_weight,
            unit_selling_price_text = EXCLUDED.unit_selling_price_text,
            mrp = EXCLUDED.mrp,
            shelf_life_days = EXCLUDED.shelf_life_days,
            updated_at = NOW()
        RETURNING *
    `;

    return result ? mapProductLabelProfile(result) : null;
};

export const createStoreProductOffering = async (
    offeringData: CreateStoreProductOfferingREPO,
    tx?: Bun.TransactionSQL,
): Promise<{ id: string } | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO store_product_offerings ${camelToSnakeSql(offeringData)}
        RETURNING *
    `;

    return result ? { id: String(result.id) } : null;
};

export const getStoreProductOfferingsByStoreId = async (
    organizationId: string,
    storeId: string,
): Promise<StoreProductOfferingDTO[]> => {
    const results = await pg`
        SELECT o.*, p.price AS product_price, p.discount AS product_discount
        FROM store_product_offerings o
        INNER JOIN products p
            ON p.id = o.product_id
           AND p.organization_id = o.organization_id
        INNER JOIN categories c
            ON c.id = p.category_id
           AND c.organization_id = p.organization_id
        WHERE o.organization_id = ${organizationId}
          AND o.store_id = ${storeId}
        ORDER BY c.sort_order ASC, p.sort_order ASC, p.created_at ASC, p.id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapStoreProductOffering(result));
};

export const getStoreProductOfferingById = async (
    organizationId: string,
    storeId: string,
    offeringId: string,
): Promise<StoreProductOfferingDTO | null> => {
    const [result] = await pg`
        SELECT o.*, p.price AS product_price, p.discount AS product_discount
        FROM store_product_offerings o
        INNER JOIN products p
            ON p.id = o.product_id
           AND p.organization_id = o.organization_id
        WHERE o.id = ${offeringId}
          AND o.organization_id = ${organizationId}
          AND o.store_id = ${storeId}
    `;

    return result ? mapStoreProductOffering(result) : null;
};

export const getStoreProductOfferingByProductAndStore = async (
    organizationId: string,
    storeId: string,
    productId: string,
): Promise<StoreProductOfferingDTO | null> => {
    const [result] = await pg`
        SELECT o.*, p.price AS product_price, p.discount AS product_discount
        FROM store_product_offerings o
        INNER JOIN products p
            ON p.id = o.product_id
           AND p.organization_id = o.organization_id
        WHERE o.organization_id = ${organizationId}
          AND o.store_id = ${storeId}
          AND o.product_id = ${productId}
    `;

    return result ? mapStoreProductOffering(result) : null;
};

export const getStoreProductOfferingsByProductId = async (
    organizationId: string,
    productId: string,
    tx?: Bun.TransactionSQL,
): Promise<StoreProductOfferingDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT o.*, p.price AS product_price, p.discount AS product_discount
        FROM store_product_offerings o
        INNER JOIN products p
            ON p.id = o.product_id
           AND p.organization_id = o.organization_id
        WHERE o.organization_id = ${organizationId}
          AND o.product_id = ${productId}
        ORDER BY o.store_id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapStoreProductOffering(result));
};

export const getStoreProductOfferingOverrideSummary = async (
    organizationId: string,
): Promise<{
    totalOfferings: number;
    fullyInherited: number;
    priceOverridden: number;
    discountOverridden: number;
    bothOverridden: number;
}> => {
    const [result] = await pg`
        SELECT
            COUNT(*)::int AS total_offerings,
            COUNT(*) FILTER (
                WHERE price_override IS NULL AND discount_override IS NULL
            )::int AS fully_inherited,
            COUNT(*) FILTER (
                WHERE price_override IS NOT NULL AND discount_override IS NULL
            )::int AS price_overridden,
            COUNT(*) FILTER (
                WHERE price_override IS NULL AND discount_override IS NOT NULL
            )::int AS discount_overridden,
            COUNT(*) FILTER (
                WHERE price_override IS NOT NULL AND discount_override IS NOT NULL
            )::int AS both_overridden
        FROM store_product_offerings
        WHERE organization_id = ${organizationId}
    `;

    return {
        totalOfferings: Number(result?.total_offerings ?? 0),
        fullyInherited: Number(result?.fully_inherited ?? 0),
        priceOverridden: Number(result?.price_overridden ?? 0),
        discountOverridden: Number(result?.discount_overridden ?? 0),
        bothOverridden: Number(result?.both_overridden ?? 0),
    };
};

export const updateStoreProductOffering = async (
    offeringData: UpdateStoreProductOfferingREPO,
    tx?: Bun.TransactionSQL,
): Promise<{ id: string } | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE store_product_offerings
        SET price_override = ${offeringData.priceOverride},
            discount_override = ${offeringData.discountOverride},
            status = ${offeringData.status},
            updated_by = ${offeringData.updatedBy},
            updated_at = NOW()
        WHERE id = ${offeringData.id}
          AND organization_id = ${offeringData.organizationId}
          AND store_id = ${offeringData.storeId}
        RETURNING *
    `;

    return result ? { id: String(result.id) } : null;
};

export const lockStoreCategoryPresentationTopology = async (
    organizationId: string,
    tx: Bun.TransactionSQL,
) => {
    await tx`
        SELECT pg_advisory_xact_lock(
            ${STORE_CATEGORY_PRESENTATION_TOPOLOGY_LOCK_ID},
            hashtext(${organizationId})
        )
    `;
};

const mapStoreCategoryPresentation = (
    row: Record<string, unknown>,
): StoreCategoryPresentationDTO => snakeToCamel(row) as StoreCategoryPresentationDTO;

const mapCategory = (row: Record<string, unknown>): CategoryDTO =>
    mapRow<CategoryDTO>(row);

export const createStoreCategoryPresentation = async (
    presentationData: CreateStoreCategoryPresentationREPO,
    tx?: Bun.TransactionSQL,
): Promise<StoreCategoryPresentationDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO store_category_presentations ${camelToSnakeSql(presentationData)}
        RETURNING *
    `;

    return result ? mapStoreCategoryPresentation(result) : null;
};

export const getNextStoreCategoryPresentationSortOrder = async (
    organizationId: string,
    storeId: string,
    tx?: Bun.TransactionSQL,
): Promise<number> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT COALESCE(MAX(sort_order) + 1, 0)::int AS next_sort_order
        FROM store_category_presentations
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;

    return Number(result?.next_sort_order ?? 0);
};

export const getStoreCategoryPresentationsByStoreId = async (
    organizationId: string,
    storeId: string,
): Promise<Array<StoreCategoryPresentationDTO & { category: CategoryDTO }>> => {
    const results = await pg`
        SELECT
            p.*,
            c.id AS category_row_id,
            c.organization_id AS category_organization_id,
            c.name AS category_name,
            c.sort_order AS category_sort_order,
            c.status AS category_status,
            c.created_by AS category_created_by,
            c.updated_by AS category_updated_by,
            c.created_at AS category_created_at,
            c.updated_at AS category_updated_at
        FROM store_category_presentations p
        INNER JOIN categories c
            ON c.id = p.category_id
           AND c.organization_id = p.organization_id
        WHERE p.organization_id = ${organizationId}
          AND p.store_id = ${storeId}
        ORDER BY p.sort_order ASC, c.created_at ASC, c.id ASC
    `;

    return results.map((result: Record<string, unknown>) => ({
        ...mapStoreCategoryPresentation(result),
        category: mapCategory({
            id: result.category_row_id,
            organization_id: result.category_organization_id,
            name: result.category_name,
            sort_order: result.category_sort_order,
            status: result.category_status,
            created_by: result.category_created_by,
            updated_by: result.category_updated_by,
            created_at: result.category_created_at,
            updated_at: result.category_updated_at,
        }),
    }));
};

export const getStoreCategoryPresentationById = async (
    organizationId: string,
    storeId: string,
    presentationId: string,
): Promise<StoreCategoryPresentationDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM store_category_presentations
        WHERE id = ${presentationId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;

    return result ? mapStoreCategoryPresentation(result) : null;
};

export const getVisibleCategoriesForStore = async (
    organizationId: string,
    storeId: string,
): Promise<CategoryDTO[]> => {
    const results = await pg`
        SELECT
            c.id,
            c.organization_id,
            c.name,
            p.sort_order,
            c.status,
            c.created_by,
            c.updated_by,
            c.created_at,
            c.updated_at
        FROM store_category_presentations p
        INNER JOIN categories c
            ON c.id = p.category_id
           AND c.organization_id = p.organization_id
        WHERE p.organization_id = ${organizationId}
          AND p.store_id = ${storeId}
          AND p.visible = TRUE
          AND c.status = 'active'
        ORDER BY p.sort_order ASC, c.created_at ASC, c.id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapCategory(result));
};

export const updateStoreCategoryPresentation = async (
    presentationData: UpdateStoreCategoryPresentationREPO,
): Promise<StoreCategoryPresentationDTO | null> => {
    const [result] = await pg`
        UPDATE store_category_presentations
        SET visible = ${presentationData.visible},
            sort_order = ${presentationData.sortOrder},
            updated_by = ${presentationData.updatedBy},
            updated_at = NOW()
        WHERE id = ${presentationData.id}
          AND organization_id = ${presentationData.organizationId}
          AND store_id = ${presentationData.storeId}
        RETURNING *
    `;

    return result ? mapStoreCategoryPresentation(result) : null;
};

export const reorderStoreCategoryPresentations = async (
    organizationId: string,
    storeId: string,
    categoryIds: string[],
    userId: string,
    tx?: Bun.TransactionSQL,
): Promise<void> => {
    const db = tx || pg;
    for (const [sortOrder, categoryId] of categoryIds.entries()) {
        await db`
            UPDATE store_category_presentations
            SET sort_order = ${sortOrder},
                updated_by = ${userId},
                updated_at = NOW()
            WHERE organization_id = ${organizationId}
              AND store_id = ${storeId}
              AND category_id = ${categoryId}
        `;
    }
};

export const getActiveStoreCatalogProducts = async (
    organizationId: string,
    storeId: string,
): Promise<ProductDTO[]> => {
    const results = await pg`
        SELECT
            p.*,
            u.label AS unit_label,
            COALESCE(o.price_override, p.price) AS offering_price,
            COALESCE(o.discount_override, p.discount) AS offering_discount
        FROM store_product_offerings o
        INNER JOIN products p
            ON p.id = o.product_id
           AND p.organization_id = o.organization_id
        INNER JOIN units u
            ON u.id = p.unit_id
           AND u.organization_id = p.organization_id
        INNER JOIN categories c
            ON c.id = p.category_id
           AND c.organization_id = p.organization_id
        WHERE o.organization_id = ${organizationId}
          AND o.store_id = ${storeId}
          AND o.status = 'active'
          AND p.status = 'active'
        ORDER BY c.sort_order ASC, p.sort_order ASC, p.created_at ASC, p.id ASC
    `;

    return results.map((result: Record<string, unknown>) => {
        const product = mapProduct(result);
        return {
            ...product,
            price: Number(result.offering_price),
            discount: Number(result.offering_discount),
            status: "active" as const,
        };
    });
};

const mapStoreAddOnOffering = (row: Record<string, unknown>): StoreAddOnOfferingDTO => {
    const mapped = mapRow<{
        id: string;
        organizationId: string;
        storeId: string;
        addOnId: string;
        priceOverride?: number | null;
        discountOverride?: number | null;
        status: StoreAddOnOfferingDTO["status"];
        createdBy: string;
        updatedBy?: string | null;
        createdAt: StoreAddOnOfferingDTO["createdAt"];
        updatedAt: StoreAddOnOfferingDTO["updatedAt"];
    }>(row);

    const rawPriceOverride = row.price_override ?? mapped.priceOverride;
    const rawDiscountOverride = row.discount_override ?? mapped.discountOverride;
    const priceOverride =
        rawPriceOverride === null || rawPriceOverride === undefined
            ? null
            : Number(rawPriceOverride);
    const discountOverride =
        rawDiscountOverride === null || rawDiscountOverride === undefined
            ? null
            : Number(rawDiscountOverride);
    const addOnPrice = Number(row.add_on_price);
    const addOnDiscount = Number(row.add_on_discount);
    const effectivePrice = priceOverride ?? addOnPrice;
    const effectiveDiscount = discountOverride ?? addOnDiscount;

    return {
        id: mapped.id,
        organizationId: mapped.organizationId,
        storeId: mapped.storeId,
        addOnId: mapped.addOnId,
        priceOverride,
        discountOverride,
        effectivePrice,
        effectiveDiscount,
        isPriceInherited: priceOverride === null,
        isDiscountInherited: discountOverride === null,
        status: mapped.status,
        createdBy: mapped.createdBy,
        updatedBy: mapped.updatedBy,
        createdAt: mapped.createdAt,
        updatedAt: mapped.updatedAt,
    };
};

export const createStoreAddOnOffering = async (
    offeringData: CreateStoreAddOnOfferingREPO,
    tx?: Bun.TransactionSQL,
): Promise<{ id: string } | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO store_add_on_offerings ${camelToSnakeSql(offeringData)}
        RETURNING *
    `;

    return result ? { id: String(result.id) } : null;
};

export const getStoreAddOnOfferingsByStoreId = async (
    organizationId: string,
    storeId: string,
): Promise<StoreAddOnOfferingDTO[]> => {
    const results = await pg`
        SELECT o.*, ao.price AS add_on_price, ao.discount AS add_on_discount
        FROM store_add_on_offerings o
        INNER JOIN add_ons ao
            ON ao.id = o.add_on_id
           AND ao.organization_id = o.organization_id
        WHERE o.organization_id = ${organizationId}
          AND o.store_id = ${storeId}
        ORDER BY ao.created_at ASC, ao.id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapStoreAddOnOffering(result));
};

export const getStoreAddOnOfferingById = async (
    organizationId: string,
    storeId: string,
    offeringId: string,
): Promise<StoreAddOnOfferingDTO | null> => {
    const [result] = await pg`
        SELECT o.*, ao.price AS add_on_price, ao.discount AS add_on_discount
        FROM store_add_on_offerings o
        INNER JOIN add_ons ao
            ON ao.id = o.add_on_id
           AND ao.organization_id = o.organization_id
        WHERE o.id = ${offeringId}
          AND o.organization_id = ${organizationId}
          AND o.store_id = ${storeId}
    `;

    return result ? mapStoreAddOnOffering(result) : null;
};

export const getStoreAddOnOfferingByAddOnAndStore = async (
    organizationId: string,
    storeId: string,
    addOnId: string,
): Promise<StoreAddOnOfferingDTO | null> => {
    const [result] = await pg`
        SELECT o.*, ao.price AS add_on_price, ao.discount AS add_on_discount
        FROM store_add_on_offerings o
        INNER JOIN add_ons ao
            ON ao.id = o.add_on_id
           AND ao.organization_id = o.organization_id
        WHERE o.organization_id = ${organizationId}
          AND o.store_id = ${storeId}
          AND o.add_on_id = ${addOnId}
    `;

    return result ? mapStoreAddOnOffering(result) : null;
};

export const getStoreAddOnOfferingsByAddOnId = async (
    organizationId: string,
    addOnId: string,
    tx?: Bun.TransactionSQL,
): Promise<StoreAddOnOfferingDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT o.*, ao.price AS add_on_price, ao.discount AS add_on_discount
        FROM store_add_on_offerings o
        INNER JOIN add_ons ao
            ON ao.id = o.add_on_id
           AND ao.organization_id = o.organization_id
        WHERE o.organization_id = ${organizationId}
          AND o.add_on_id = ${addOnId}
        ORDER BY o.store_id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapStoreAddOnOffering(result));
};

export const getStoreAddOnOfferingOverrideSummary = async (
    organizationId: string,
): Promise<{
    totalOfferings: number;
    fullyInherited: number;
    priceOverridden: number;
    discountOverridden: number;
    bothOverridden: number;
}> => {
    const [result] = await pg`
        SELECT
            COUNT(*)::int AS total_offerings,
            COUNT(*) FILTER (
                WHERE price_override IS NULL AND discount_override IS NULL
            )::int AS fully_inherited,
            COUNT(*) FILTER (
                WHERE price_override IS NOT NULL AND discount_override IS NULL
            )::int AS price_overridden,
            COUNT(*) FILTER (
                WHERE price_override IS NULL AND discount_override IS NOT NULL
            )::int AS discount_overridden,
            COUNT(*) FILTER (
                WHERE price_override IS NOT NULL AND discount_override IS NOT NULL
            )::int AS both_overridden
        FROM store_add_on_offerings
        WHERE organization_id = ${organizationId}
    `;

    return {
        totalOfferings: Number(result?.total_offerings ?? 0),
        fullyInherited: Number(result?.fully_inherited ?? 0),
        priceOverridden: Number(result?.price_overridden ?? 0),
        discountOverridden: Number(result?.discount_overridden ?? 0),
        bothOverridden: Number(result?.both_overridden ?? 0),
    };
};

export const updateStoreAddOnOffering = async (
    offeringData: UpdateStoreAddOnOfferingREPO,
    tx?: Bun.TransactionSQL,
): Promise<{ id: string } | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE store_add_on_offerings
        SET price_override = ${offeringData.priceOverride},
            discount_override = ${offeringData.discountOverride},
            status = ${offeringData.status},
            updated_by = ${offeringData.updatedBy},
            updated_at = NOW()
        WHERE id = ${offeringData.id}
          AND organization_id = ${offeringData.organizationId}
          AND store_id = ${offeringData.storeId}
        RETURNING *
    `;

    return result ? { id: String(result.id) } : null;
};

export const getAddOnsByIds = async (
    organizationId: string,
    addOnIds: string[],
): Promise<AddOnDTO[]> => {
    if (addOnIds.length === 0) return [];

    const results = await pg`
        SELECT *
        FROM add_ons
        WHERE organization_id = ${organizationId}
          AND id IN ${pg(addOnIds)}
    `;

    return results.map((result: Record<string, unknown>) => mapRow<AddOnDTO>(result));
};

export const getStoreProductOfferingsForStoresAndProducts = async (
    organizationId: string,
    storeIds: string[],
    productIds: string[],
): Promise<Array<StoreProductOfferingDTO & { productName: string }>> => {
    if (storeIds.length === 0 || productIds.length === 0) return [];

    const results = await pg`
        SELECT o.*, p.price AS product_price, p.discount AS product_discount, p.name AS product_name
        FROM store_product_offerings o
        INNER JOIN products p
            ON p.id = o.product_id
           AND p.organization_id = o.organization_id
        WHERE o.organization_id = ${organizationId}
          AND o.store_id IN ${pg(storeIds)}
          AND o.product_id IN ${pg(productIds)}
        ORDER BY o.store_id ASC, p.name ASC
    `;

    return results.map((result: Record<string, unknown>) => ({
        ...mapStoreProductOffering(result),
        productName: String(result.product_name),
    }));
};

export const getStoreAddOnOfferingsForStoresAndAddOns = async (
    organizationId: string,
    storeIds: string[],
    addOnIds: string[],
): Promise<Array<StoreAddOnOfferingDTO & { addOnName: string }>> => {
    if (storeIds.length === 0 || addOnIds.length === 0) return [];

    const results = await pg`
        SELECT o.*, ao.price AS add_on_price, ao.discount AS add_on_discount, ao.name AS add_on_name
        FROM store_add_on_offerings o
        INNER JOIN add_ons ao
            ON ao.id = o.add_on_id
           AND ao.organization_id = o.organization_id
        WHERE o.organization_id = ${organizationId}
          AND o.store_id IN ${pg(storeIds)}
          AND o.add_on_id IN ${pg(addOnIds)}
        ORDER BY o.store_id ASC, ao.name ASC
    `;

    return results.map((result: Record<string, unknown>) => ({
        ...mapStoreAddOnOffering(result),
        addOnName: String(result.add_on_name),
    }));
};

const mapCatalogCommercialOperationAudit = (
    row: Record<string, unknown>,
): CatalogCommercialOperationAuditDTO => {
    const mapped = snakeToCamel(row) as {
        id: string;
        organizationId: string;
        itemType: CatalogCommercialItemType;
        operation: CatalogCommercialOperationType;
        storeIds: string[];
        itemIds: string[];
        actorId: string;
        createdAt: CatalogCommercialOperationAuditDTO["createdAt"];
        details: { changes?: CatalogCommercialOperationChange[] };
    };

    return {
        id: mapped.id,
        organizationId: mapped.organizationId,
        itemType: mapped.itemType,
        operation: mapped.operation,
        storeIds: mapped.storeIds,
        itemIds: mapped.itemIds,
        actorId: mapped.actorId,
        createdAt: mapped.createdAt,
        changes: Array.isArray(mapped.details?.changes) ? mapped.details.changes : [],
    };
};

export const createCatalogCommercialOperationAudit = async (
    auditData: CreateCatalogCommercialOperationAuditREPO,
    tx?: Bun.TransactionSQL,
): Promise<CatalogCommercialOperationAuditDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO catalog_commercial_operation_audits (
            id,
            organization_id,
            item_type,
            operation,
            store_ids,
            item_ids,
            actor_id,
            details
        ) VALUES (
            ${auditData.id},
            ${auditData.organizationId},
            ${auditData.itemType},
            ${auditData.operation},
            ${auditData.storeIds},
            ${auditData.itemIds},
            ${auditData.actorId},
            ${JSON.stringify(auditData.details)}::jsonb
        )
        RETURNING *
    `;

    return result ? mapCatalogCommercialOperationAudit(result) : null;
};

export const getCatalogCommercialOperationAudits = async (
    organizationId: string,
): Promise<CatalogCommercialOperationAuditDTO[]> => {
    const results = await pg`
        SELECT *
        FROM catalog_commercial_operation_audits
        WHERE organization_id = ${organizationId}
        ORDER BY created_at DESC
    `;

    return results.map((result: Record<string, unknown>) =>
        mapCatalogCommercialOperationAudit(result),
    );
};
