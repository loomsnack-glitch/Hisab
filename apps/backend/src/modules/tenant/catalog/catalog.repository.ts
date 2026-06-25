import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CategoryDTO,
    CreateCategoryREPO,
    CreateProductREPO,
    ProductDTO,
    UpdateCategoryREPO,
    UpdateProductREPO,
} from "@repo/types";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;

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
