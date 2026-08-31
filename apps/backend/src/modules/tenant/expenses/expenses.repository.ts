import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type { CreateExpenseREPO, ExpenseDTO, OutgoingPaymentDTO, UpdateExpenseREPO } from "@repo/types";
import * as outgoingPaymentsRepository from "@/modules/tenant/outgoing-payments/outgoing-payments.repository";

const toMoneyAmount = (value: unknown): number => {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) {
        return 0;
    }
    return Math.round((amount + Number.EPSILON) * 100) / 100;
};

const toDateOnly = (value: unknown): string => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    return String(value ?? "");
};

const mapExpenseHeader = (row: Record<string, unknown>): Omit<ExpenseDTO, "outgoingPayments"> => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        ...(mapped as Omit<ExpenseDTO, "outgoingPayments" | "effectiveDate" | "total" | "paidTotal" | "dueAmount">),
        effectiveDate: toDateOnly(mapped.effectiveDate),
        total: toMoneyAmount(mapped.total),
        paidTotal: toMoneyAmount(mapped.paidTotal),
        dueAmount: mapped.dueAmount === null ? null : toMoneyAmount(mapped.dueAmount),
    };
};

const attachOutgoingPayments = (
    expenses: Array<Omit<ExpenseDTO, "outgoingPayments">>,
    outgoingPayments: OutgoingPaymentDTO[],
): ExpenseDTO[] => {
    const paymentsByExpenseId = new Map<string, OutgoingPaymentDTO[]>();
    for (const payment of outgoingPayments) {
        if (!payment.expenseId) {
            continue;
        }
        const current = paymentsByExpenseId.get(payment.expenseId) ?? [];
        current.push(payment);
        paymentsByExpenseId.set(payment.expenseId, current);
    }

    return expenses.map((expense) => ({
        ...expense,
        outgoingPayments: paymentsByExpenseId.get(expense.id) ?? [],
    }));
};

const expenseSelect = `
    expenses.id,
    expenses.organization_id,
    expenses.store_id,
    stores.name AS store_name,
    expenses.expense_category_id,
    expenses.expense_category_name,
    expenses.lifecycle,
    expenses.payable_status,
    to_char(expenses.effective_date, 'YYYY-MM-DD') AS effective_date,
    expenses.invoice_reference,
    expenses.notes,
    expenses.total,
    expenses.paid_total,
    expenses.due_amount,
    expenses.recorded_at,
    expenses.created_by,
    expenses.updated_by,
    expenses.created_at,
    expenses.updated_at
`;

const hydrateExpenses = async (
    organizationId: string,
    headers: Array<Omit<ExpenseDTO, "outgoingPayments">>,
    tx?: Bun.TransactionSQL,
): Promise<ExpenseDTO[]> => {
    const outgoingPayments = await outgoingPaymentsRepository.getOutgoingPaymentsByExpenseIds(
        organizationId,
        headers.map((expense) => expense.id),
        tx,
    );
    return attachOutgoingPayments(headers, outgoingPayments);
};

export const getExpensesByOrganizationId = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<ExpenseDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT ${db.unsafe(expenseSelect)}
        FROM expenses
        INNER JOIN stores
            ON stores.id = expenses.store_id
           AND stores.organization_id = expenses.organization_id
        WHERE expenses.organization_id = ${organizationId}
        ORDER BY expenses.effective_date DESC, expenses.created_at DESC
    `;

    const headers = results.map((result: Record<string, unknown>) => mapExpenseHeader(result));
    return hydrateExpenses(organizationId, headers, tx);
};

export const getExpenseById = async (
    organizationId: string,
    expenseId: string,
    tx?: Bun.TransactionSQL,
): Promise<ExpenseDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT ${db.unsafe(expenseSelect)}
        FROM expenses
        INNER JOIN stores
            ON stores.id = expenses.store_id
           AND stores.organization_id = expenses.organization_id
        WHERE expenses.id = ${expenseId}
          AND expenses.organization_id = ${organizationId}
    `;

    if (!result) {
        return null;
    }

    const [expense] = await hydrateExpenses(
        organizationId,
        [mapExpenseHeader(result as Record<string, unknown>)],
        tx,
    );
    return expense ?? null;
};

export const lockExpenseById = async (
    organizationId: string,
    expenseId: string,
    tx: Bun.TransactionSQL,
): Promise<ExpenseDTO | null> => {
    const [result] = await tx`
        SELECT ${tx.unsafe(expenseSelect)}
        FROM expenses
        INNER JOIN stores
            ON stores.id = expenses.store_id
           AND stores.organization_id = expenses.organization_id
        WHERE expenses.id = ${expenseId}
          AND expenses.organization_id = ${organizationId}
        FOR UPDATE OF expenses
    `;

    if (!result) {
        return null;
    }

    const [expense] = await hydrateExpenses(
        organizationId,
        [mapExpenseHeader(result as Record<string, unknown>)],
        tx,
    );
    return expense ?? null;
};

export const createExpense = async (
    expenseData: CreateExpenseREPO,
    tx?: Bun.TransactionSQL,
): Promise<ExpenseDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO expenses ${camelToSnakeSql(expenseData)}
        RETURNING *
    `;

    if (!result) {
        return null;
    }

    return getExpenseById(expenseData.organizationId, expenseData.id, tx);
};

export const updateExpense = async (
    expenseData: UpdateExpenseREPO,
    tx?: Bun.TransactionSQL,
): Promise<ExpenseDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE expenses
        SET store_id = ${expenseData.storeId},
            expense_category_id = ${expenseData.expenseCategoryId},
            expense_category_name = ${expenseData.expenseCategoryName},
            lifecycle = ${expenseData.lifecycle},
            payable_status = ${expenseData.payableStatus},
            effective_date = ${expenseData.effectiveDate},
            invoice_reference = ${expenseData.invoiceReference},
            notes = ${expenseData.notes},
            total = ${expenseData.total},
            paid_total = ${expenseData.paidTotal},
            due_amount = ${expenseData.dueAmount},
            recorded_at = ${expenseData.recordedAt},
            updated_by = ${expenseData.updatedBy},
            updated_at = NOW()
        WHERE id = ${expenseData.id}
          AND organization_id = ${expenseData.organizationId}
        RETURNING *
    `;

    if (!result) {
        return null;
    }

    return getExpenseById(expenseData.organizationId, expenseData.id, tx);
};

export const deleteExpense = async (
    organizationId: string,
    expenseId: string,
    tx?: Bun.TransactionSQL,
): Promise<boolean> => {
    const db = tx || pg;
    const result = await db`
        DELETE FROM expenses
        WHERE id = ${expenseId}
          AND organization_id = ${organizationId}
        RETURNING id
    `;

    return Boolean(result[0]);
};
