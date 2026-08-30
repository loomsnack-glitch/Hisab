import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreateMoneyAccountREPO,
    MoneyAccountDTO,
    UpdateMoneyAccountREPO,
} from "@repo/types";

const mapMoneyAccount = (row: Record<string, unknown>): MoneyAccountDTO =>
    snakeToCamel(row) as MoneyAccountDTO;

export const getMoneyAccountsByOrganizationId = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<MoneyAccountDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM money_accounts
        WHERE organization_id = ${organizationId}
        ORDER BY lower(name) ASC
    `;

    return results.map((result: Record<string, unknown>) => mapMoneyAccount(result));
};

export const getMoneyAccountById = async (
    organizationId: string,
    moneyAccountId: string,
    tx?: Bun.TransactionSQL,
): Promise<MoneyAccountDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM money_accounts
        WHERE id = ${moneyAccountId}
          AND organization_id = ${organizationId}
    `;

    return result ? mapMoneyAccount(result) : null;
};

export const createMoneyAccount = async (
    moneyAccountData: CreateMoneyAccountREPO,
    tx?: Bun.TransactionSQL,
): Promise<MoneyAccountDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO money_accounts ${camelToSnakeSql(moneyAccountData)}
        RETURNING *
    `;

    return result ? mapMoneyAccount(result) : null;
};

export const updateMoneyAccount = async (
    moneyAccountData: UpdateMoneyAccountREPO,
): Promise<MoneyAccountDTO | null> => {
    const [result] = await pg`
        UPDATE money_accounts
        SET name = ${moneyAccountData.name},
            type = ${moneyAccountData.type},
            scope = ${moneyAccountData.scope},
            store_id = ${moneyAccountData.storeId},
            notes = ${moneyAccountData.notes},
            status = ${moneyAccountData.status},
            updated_by = ${moneyAccountData.updatedBy},
            updated_at = NOW()
        WHERE id = ${moneyAccountData.id}
          AND organization_id = ${moneyAccountData.organizationId}
        RETURNING *
    `;

    return result ? mapMoneyAccount(result) : null;
};
