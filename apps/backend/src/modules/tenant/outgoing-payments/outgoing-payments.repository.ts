import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type { CreateOutgoingPaymentREPO, OutgoingPaymentDTO } from "@repo/types";

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
        ...(mapped as Omit<OutgoingPaymentDTO, "amount" | "moneyAccountId" | "moneyAccountName">),
        amount: toMoneyAmount(mapped.amount),
        moneyAccountId: typeof mapped.moneyAccountId === "string" ? mapped.moneyAccountId : null,
        moneyAccountName: typeof mapped.moneyAccountName === "string" ? mapped.moneyAccountName : null,
    };
};

const outgoingPaymentSelect = `
    outgoing_payments.id,
    outgoing_payments.organization_id,
    outgoing_payments.purchase_id,
    outgoing_payments.amount,
    outgoing_payments.payment_method,
    outgoing_payments.money_account_id,
    money_accounts.name AS money_account_name,
    outgoing_payments.reference,
    outgoing_payments.notes,
    outgoing_payments.paid_at,
    outgoing_payments.reversed_at,
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
