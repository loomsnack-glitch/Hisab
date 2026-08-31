import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreateMoneyAccountMovementREPO,
    CreateMoneyAccountREPO,
    MoneyAccountDTO,
    MoneyAccountHistoryMovementREPO,
    MoneyAccountMovementDTO,
    MoneyAccountPaymentRouteDTO,
    MoneyAccountPaymentRouteMethod,
    UpdateMoneyAccountREPO,
    UpsertMoneyAccountPaymentRouteREPO,
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
    const { movementTotal: _movementTotal, ...rest } = mapped;

    return {
        ...(rest as Omit<MoneyAccountDTO, "openingBalance" | "balance" | "hasMovements">),
        openingBalance,
        hasMovements,
        balance: Math.round((openingBalance + movementTotal + Number.EPSILON) * 100) / 100,
    };
};

const mapPaymentRoute = (row: Record<string, unknown>): MoneyAccountPaymentRouteDTO =>
    snakeToCamel(row) as MoneyAccountPaymentRouteDTO;

const mapMovement = (row: Record<string, unknown>): MoneyAccountMovementDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        ...(mapped as Omit<MoneyAccountMovementDTO, "amount">),
        amount: toMoneyAmount(mapped.amount),
    };
};

const mapHistoryMovement = (row: Record<string, unknown>): MoneyAccountHistoryMovementREPO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        ...(mapped as Omit<MoneyAccountHistoryMovementREPO, "amount">),
        amount: toMoneyAmount(mapped.amount),
    };
};

export const getMoneyAccountsByOrganizationId = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<MoneyAccountDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT
            money_accounts.*,
            COALESCE(movement_totals.movement_total, 0) AS movement_total,
            COALESCE(movement_totals.movement_count, 0) > 0 AS has_movements
        FROM money_accounts
        LEFT JOIN (
            SELECT
                money_account_id,
                SUM(amount) AS movement_total,
                COUNT(*)::int AS movement_count
            FROM money_account_movements
            GROUP BY money_account_id
        ) AS movement_totals
            ON movement_totals.money_account_id = money_accounts.id
        WHERE money_accounts.organization_id = ${organizationId}
        ORDER BY lower(money_accounts.name) ASC
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
        SELECT
            money_accounts.*,
            COALESCE(movement_totals.movement_total, 0) AS movement_total,
            COALESCE(movement_totals.movement_count, 0) > 0 AS has_movements
        FROM money_accounts
        LEFT JOIN (
            SELECT
                money_account_id,
                SUM(amount) AS movement_total,
                COUNT(*)::int AS movement_count
            FROM money_account_movements
            GROUP BY money_account_id
        ) AS movement_totals
            ON movement_totals.money_account_id = money_accounts.id
        WHERE money_accounts.id = ${moneyAccountId}
          AND money_accounts.organization_id = ${organizationId}
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

    if (!result) {
        return null;
    }

    return getMoneyAccountById(moneyAccountData.organizationId, moneyAccountData.id, tx);
};

export const updateMoneyAccount = async (
    moneyAccountData: UpdateMoneyAccountREPO,
    tx?: Bun.TransactionSQL,
): Promise<MoneyAccountDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
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

    if (!result) {
        return null;
    }

    return getMoneyAccountById(moneyAccountData.organizationId, moneyAccountData.id, tx);
};

export const getPaymentRoutesByStoreId = async (
    organizationId: string,
    storeId: string,
    tx?: Bun.TransactionSQL,
): Promise<MoneyAccountPaymentRouteDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM store_money_account_payment_routes
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
        ORDER BY payment_method ASC
    `;

    return results.map((result: Record<string, unknown>) => mapPaymentRoute(result));
};

export const getPaymentRouteByStoreAndMethod = async (
    organizationId: string,
    storeId: string,
    paymentMethod: MoneyAccountPaymentRouteMethod,
    tx?: Bun.TransactionSQL,
): Promise<MoneyAccountPaymentRouteDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM store_money_account_payment_routes
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND payment_method = ${paymentMethod}
    `;

    return result ? mapPaymentRoute(result) : null;
};

export const upsertPaymentRoute = async (
    routeData: UpsertMoneyAccountPaymentRouteREPO,
    tx?: Bun.TransactionSQL,
): Promise<MoneyAccountPaymentRouteDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO store_money_account_payment_routes ${camelToSnakeSql(routeData)}
        ON CONFLICT (organization_id, store_id, payment_method)
        DO UPDATE SET
            money_account_id = EXCLUDED.money_account_id,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        RETURNING *
    `;

    return result ? mapPaymentRoute(result) : null;
};

export const deletePaymentRoute = async (
    organizationId: string,
    storeId: string,
    paymentMethod: MoneyAccountPaymentRouteMethod,
    tx?: Bun.TransactionSQL,
): Promise<boolean> => {
    const db = tx || pg;
    const results = await db`
        DELETE FROM store_money_account_payment_routes
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND payment_method = ${paymentMethod}
        RETURNING id
    `;

    return results.length > 0;
};

export const getMovementsByMoneyAccountId = async (
    organizationId: string,
    moneyAccountId: string,
    tx?: Bun.TransactionSQL,
): Promise<MoneyAccountHistoryMovementREPO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT
            movements.id,
            movements.organization_id,
            movements.money_account_id,
            movements.store_id,
            movements.amount,
            movements.occurred_at,
            movements.source_kind,
            movements.payment_id,
            movements.created_at,
            payments.sale_id,
            payments.method AS payment_method,
            sales.sale_number
        FROM money_account_movements AS movements
        INNER JOIN payments
            ON payments.id = movements.payment_id
        INNER JOIN sales
            ON sales.id = payments.sale_id
        WHERE movements.organization_id = ${organizationId}
          AND movements.money_account_id = ${moneyAccountId}
        ORDER BY movements.occurred_at ASC, movements.id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapHistoryMovement(result));
};

export const createMoneyAccountMovement = async (
    movementData: CreateMoneyAccountMovementREPO,
    tx?: Bun.TransactionSQL,
): Promise<MoneyAccountMovementDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO money_account_movements ${camelToSnakeSql(movementData)}
        RETURNING *
    `;

    return result ? mapMovement(result) : null;
};
