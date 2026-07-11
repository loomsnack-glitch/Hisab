import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    AddOnDTO,
    CategoryDTO,
    CreateAddOnREPO,
    CreateCategoryREPO,
    CreateProductAddOnAttachmentREPO,
    CreateProductREPO,
    ProductAddOnAttachmentDTO,
    ProductAddOnAttachmentResponseDTO,
    ProductDTO,
    UpdateAddOnREPO,
    UpdateCategoryREPO,
    UpdateProductAddOnAttachmentREPO,
    UpdateProductREPO,
} from "@repo/types";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;

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
            price: Number(mapped.addOnPrice),
            discount: Number(mapped.addOnDiscount),
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

export const getCategoriesByOrganizationId = async (organizationId: string): Promise<CategoryDTO[]> => {
    const results = await pg`
        SELECT *
        FROM categories
        WHERE organization_id = ${organizationId}
        ORDER BY created_at ASC
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

    return result ? snakeToCamel(result) : null;
};

export const getProductsByOrganizationId = async (organizationId: string): Promise<ProductDTO[]> => {
    const results = await pg`
        SELECT *
        FROM products
        WHERE organization_id = ${organizationId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<ProductDTO>(result));
};

export const getProductsByCategoryId = async (
    organizationId: string,
    categoryId: string,
): Promise<ProductDTO[]> => {
    const results = await pg`
        SELECT *
        FROM products
        WHERE organization_id = ${organizationId}
          AND category_id = ${categoryId}
        ORDER BY created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapRow<ProductDTO>(result));
};

export const getProductById = async (organizationId: string, productId: string): Promise<ProductDTO | null> => {
    const [result] = await pg`
        SELECT *
        FROM products
        WHERE id = ${productId}
          AND organization_id = ${organizationId}
    `;

    return result ? snakeToCamel(result) : null;
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

export const updateProduct = async (productData: UpdateProductREPO): Promise<ProductDTO | null> => {
    const [result] = await pg`
        UPDATE products
        SET category_id = ${productData.categoryId},
            name = ${productData.name},
            price = ${productData.price},
            discount = ${productData.discount},
            image_path = ${productData.imagePath ?? null},
            status = ${productData.status},
            updated_by = ${productData.updatedBy},
            updated_at = NOW()
        WHERE id = ${productData.id}
          AND organization_id = ${productData.organizationId}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const deleteProduct = async (organizationId: string, productId: string): Promise<ProductDTO | null> => {
    const [result] = await pg`
        DELETE FROM products
        WHERE id = ${productId}
          AND organization_id = ${organizationId}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const createAddOn = async (
    addOnData: CreateAddOnREPO,
    tx?: Bun.TransactionSQL,
): Promise<AddOnDTO | null> => {
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

export const getSelectableProductAddOnAttachmentsByOrganizationId = async (
    organizationId: string,
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
          AND a.status = 'active'
          AND ao.status = 'active'
        ORDER BY a.created_at ASC
    `;

    return results.map((result: Record<string, unknown>) => mapAttachmentWithAddOn(result));
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
