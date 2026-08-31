import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreateMoneyAccountREPO,
    MoneyAccountDTO,
    UpdateMoneyAccountREPO,
} from "@repo/types";

const toMoneyAmount = (value: unknown): number => {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) {
        return 0;
    }
    return Math.round((amount + Number.EPSILON) * 100) / 100;
};

const mapMoneyAccount = (row: Record<string, unknown>): MoneyAccountDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    const openingBalance = toMoneyAmount(mapped.openingBalance);
    const movementTotal = toMoneyAmount(mapped.movementTotal);
    const hasMovements = Boolean(mapped.hasMovements) || movementTotal > 0;

    return {
        ...(mapped as Omit<MoneyAccountDTO, "openingBalance" | "balance" | "hasMovements">),
        openingBalance,
        hasMovements,
        balance: Math.round((openingBalance + movementTotal + Number.EPSILON) * 100) / 100,
    };
};

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
            opening_balance = ${moneyAccountData.openingBalance},
            updated_by = ${moneyAccountData.updatedBy},
            updated_at = NOW()
        WHERE id = ${moneyAccountData.id}
          AND organization_id = ${moneyAccountData.organizationId}
        RETURNING *
    `;

    return result ? mapMoneyAccount(result) : null;
};
