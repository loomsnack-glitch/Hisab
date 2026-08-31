import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreateOutgoingPaymentREPO,
    OutgoingPaymentDTO,
    ReverseOutgoingPaymentREPO,
} from "@repo/types";

const toMoneyAmount = (value: unknown): number => {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) {
        return 0;
    }
    return Math.round((amount + Number.EPSILON) * 100) / 100;
};

const mapOutgoingPayment = (row: Record<string, unknown>): OutgoingPaymentDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        ...(mapped as Omit<
            OutgoingPaymentDTO,
            "amount" | "moneyAccountId" | "moneyAccountName" | "purchaseId" | "expenseId"
        >),
        amount: toMoneyAmount(mapped.amount),
        purchaseId: typeof mapped.purchaseId === "string" ? mapped.purchaseId : null,
        expenseId: typeof mapped.expenseId === "string" ? mapped.expenseId : null,
        moneyAccountId: typeof mapped.moneyAccountId === "string" ? mapped.moneyAccountId : null,
        moneyAccountName: typeof mapped.moneyAccountName === "string" ? mapped.moneyAccountName : null,
        reversalReason: typeof mapped.reversalReason === "string" ? mapped.reversalReason : null,
        reversalKind:
            mapped.reversalKind === "payment_reversal" || mapped.reversalKind === "payable_void"
                ? mapped.reversalKind
                : null,
    };
};

const outgoingPaymentSelect = `
    outgoing_payments.id,
    outgoing_payments.organization_id,
    outgoing_payments.purchase_id,
    outgoing_payments.expense_id,
    outgoing_payments.amount,
    outgoing_payments.payment_method,
    outgoing_payments.money_account_id,
    money_accounts.name AS money_account_name,
    outgoing_payments.reference,
    outgoing_payments.notes,
    outgoing_payments.paid_at,
    outgoing_payments.reversed_at,
    outgoing_payments.reversal_reason,
    outgoing_payments.reversal_kind,
    outgoing_payments.created_by,
    outgoing_payments.created_at
`;

export const getOutgoingPaymentById = async (
    organizationId: string,
    paymentId: string,
    tx?: Bun.TransactionSQL,
): Promise<OutgoingPaymentDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT ${db.unsafe(outgoingPaymentSelect)}
        FROM outgoing_payments
        LEFT JOIN money_accounts
            ON money_accounts.id = outgoing_payments.money_account_id
           AND money_accounts.organization_id = outgoing_payments.organization_id
        WHERE outgoing_payments.id = ${paymentId}
          AND outgoing_payments.organization_id = ${organizationId}
    `;

    return result ? mapOutgoingPayment(result as Record<string, unknown>) : null;
};

export const getOutgoingPaymentsByPurchaseIds = async (
    organizationId: string,
    purchaseIds: string[],
    tx?: Bun.TransactionSQL,
): Promise<OutgoingPaymentDTO[]> => {
    if (purchaseIds.length === 0) {
        return [];
    }

    const db = tx || pg;
    const results = await db`
        SELECT ${db.unsafe(outgoingPaymentSelect)}
        FROM outgoing_payments
        LEFT JOIN money_accounts
            ON money_accounts.id = outgoing_payments.money_account_id
           AND money_accounts.organization_id = outgoing_payments.organization_id
        WHERE outgoing_payments.organization_id = ${organizationId}
          AND outgoing_payments.purchase_id IN ${db(purchaseIds)}
        ORDER BY outgoing_payments.paid_at ASC, outgoing_payments.id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapOutgoingPayment(result));
};

export const getOutgoingPaymentsByExpenseIds = async (
    organizationId: string,
    expenseIds: string[],
    tx?: Bun.TransactionSQL,
): Promise<OutgoingPaymentDTO[]> => {
    if (expenseIds.length === 0) {
        return [];
    }

    const db = tx || pg;
    const results = await db`
        SELECT ${db.unsafe(outgoingPaymentSelect)}
        FROM outgoing_payments
        LEFT JOIN money_accounts
            ON money_accounts.id = outgoing_payments.money_account_id
           AND money_accounts.organization_id = outgoing_payments.organization_id
        WHERE outgoing_payments.organization_id = ${organizationId}
          AND outgoing_payments.expense_id IN ${db(expenseIds)}
        ORDER BY outgoing_payments.paid_at ASC, outgoing_payments.id ASC
    `;

    return results.map((result: Record<string, unknown>) => mapOutgoingPayment(result));
};

export const createOutgoingPayment = async (
    paymentData: CreateOutgoingPaymentREPO,
    tx?: Bun.TransactionSQL,
): Promise<OutgoingPaymentDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO outgoing_payments ${camelToSnakeSql(paymentData)}
        RETURNING *
    `;

    if (!result) {
        return null;
    }

    return getOutgoingPaymentById(paymentData.organizationId, paymentData.id, tx);
};

export const reverseOutgoingPayment = async (
    paymentData: ReverseOutgoingPaymentREPO,
    tx?: Bun.TransactionSQL,
): Promise<OutgoingPaymentDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE outgoing_payments
        SET reversed_at = ${paymentData.reversedAt},
            reversal_reason = ${paymentData.reversalReason},
            reversal_kind = ${paymentData.reversalKind}
        WHERE id = ${paymentData.id}
          AND organization_id = ${paymentData.organizationId}
          AND reversed_at IS NULL
        RETURNING id
    `;

    if (!result) {
        return getOutgoingPaymentById(paymentData.organizationId, paymentData.id, tx);
    }

    return getOutgoingPaymentById(paymentData.organizationId, paymentData.id, tx);
};
