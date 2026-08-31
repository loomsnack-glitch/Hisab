import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import {
    SEEDED_EXPENSE_CATEGORIES,
    type CreateExpenseCategoryREPO,
    type ExpenseCategoryDTO,
    type UpdateExpenseCategoryREPO,
} from "@repo/types";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;

const mapExpenseCategory = (row: Record<string, unknown>): ExpenseCategoryDTO =>
    mapRow<ExpenseCategoryDTO>(row);

export const getExpenseCategoriesByOrganizationId = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<ExpenseCategoryDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM expense_categories
        WHERE organization_id = ${organizationId}
        ORDER BY CASE WHEN kind = 'predefined' THEN 0 ELSE 1 END, lower(name) ASC
    `;

    return results.map((result: Record<string, unknown>) => mapExpenseCategory(result));
};

export const getExpenseCategoryById = async (
    organizationId: string,
    expenseCategoryId: string,
    tx?: Bun.TransactionSQL,
): Promise<ExpenseCategoryDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM expense_categories
        WHERE id = ${expenseCategoryId}
          AND organization_id = ${organizationId}
    `;

    return result ? mapExpenseCategory(result) : null;
};

export const expenseCategoryNameExistsInOrganization = async (
    organizationId: string,
    name: string,
    excludeId?: string,
): Promise<boolean> => {
    const normalized = name;
    const results = excludeId
        ? await pg`
            SELECT 1
            FROM expense_categories
            WHERE organization_id = ${organizationId}
              AND id <> ${excludeId}
              AND lower(btrim(regexp_replace(name, '\\s+', ' ', 'g'))) = ${normalized}
            LIMIT 1
        `
        : await pg`
            SELECT 1
            FROM expense_categories
            WHERE organization_id = ${organizationId}
              AND lower(btrim(regexp_replace(name, '\\s+', ' ', 'g'))) = ${normalized}
            LIMIT 1
        `;

    return Boolean(results[0]);
};

export const createExpenseCategory = async (
    expenseCategoryData: CreateExpenseCategoryREPO,
    tx?: Bun.TransactionSQL,
): Promise<ExpenseCategoryDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO expense_categories ${camelToSnakeSql(expenseCategoryData)}
        RETURNING *
    `;

    return result ? mapExpenseCategory(result) : null;
};

export const updateExpenseCategory = async (
    expenseCategoryData: UpdateExpenseCategoryREPO,
): Promise<ExpenseCategoryDTO | null> => {
    const [result] = await pg`
        UPDATE expense_categories
        SET name = ${expenseCategoryData.name},
            status = ${expenseCategoryData.status},
            updated_by = ${expenseCategoryData.updatedBy},
            updated_at = NOW()
        WHERE id = ${expenseCategoryData.id}
          AND organization_id = ${expenseCategoryData.organizationId}
        RETURNING *
    `;

    return result ? mapExpenseCategory(result) : null;
};

export const seedDefaultExpenseCategories = async (
    organizationId: string,
    createdBy: string,
    tx?: Bun.TransactionSQL,
): Promise<ExpenseCategoryDTO[]> => {
    const existing = await getExpenseCategoriesByOrganizationId(organizationId, tx);
    const existingKeys = new Set(
        existing
            .filter((category) => category.predefinedKey)
            .map((category) => category.predefinedKey as string),
    );

    const seeded = existing.filter((category) => category.kind === "predefined");
    for (const definition of SEEDED_EXPENSE_CATEGORIES) {
        if (existingKeys.has(definition.key)) {
            continue;
        }

        const created = await createExpenseCategory(
            {
                id: crypto.randomUUID(),
                organizationId,
                name: definition.name,
                kind: "predefined",
                predefinedKey: definition.key,
                status: "active",
                createdBy,
            },
            tx,
        );
        if (!created) {
            throw new Error("Failed to seed Expense Categories");
        }
        seeded.push(created);
    }

    return seeded;
};
