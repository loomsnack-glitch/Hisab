import {
    STATUS_CODES,
    isMoneyAccountAvailableToStore,
    isMoneyAccountEligibleForOutgoingMethod,
    isOutgoingPaymentMethodAllowed,
    roundOutgoingPaymentMoney,
    type CreateOutgoingPaymentSVC,
    type MoneyAccountDTO,
    type MoneyAccountMovementDTO,
    type OutgoingPaymentDTO,
    type StatusCode,
} from "@repo/types";
import { isMoneyAccountTrackingActive } from "@/modules/tenant/money-accounts/money-account-tracking";
import * as moneyAccountsRepository from "@/modules/tenant/money-accounts/money-accounts.repository";

export class OutgoingPaymentFundingError extends Error {
    code: StatusCode;

    constructor(message: string, code: StatusCode = STATUS_CODES.BAD_REQUEST) {
        super(message);
        this.name = "OutgoingPaymentFundingError";
        this.code = code;
    }
}

export const isOutgoingPaymentFundingError = (
    error: unknown,
): error is OutgoingPaymentFundingError =>
    error instanceof OutgoingPaymentFundingError ||
    (error instanceof Error && error.name === "OutgoingPaymentFundingError");

const insufficientBalance = () =>
    new OutgoingPaymentFundingError(
        "The selected Money Account does not have a sufficient balance for this Outgoing Payment",
    );

const ineligibleAccount = () =>
    new OutgoingPaymentFundingError(
        "The selected Money Account is not eligible for this Outgoing Payment",
    );

const unavailableAccount = () =>
    new OutgoingPaymentFundingError(
        "The selected Money Account is not available to this Store",
    );

const inactiveAccount = () =>
    new OutgoingPaymentFundingError("The selected Money Account is inactive");

const missingAccount = () =>
    new OutgoingPaymentFundingError(
        "Select an eligible Money Account for this Outgoing Payment",
    );

const untrackedMethod = (method: string) =>
    new OutgoingPaymentFundingError(
        method === "bank_transfer" || method === "other"
            ? "Bank Transfer and Other Outgoing Payments require Money Account Tracking"
            : "This Outgoing Payment method is not available without Money Account Tracking",
    );

const unexpectedAccount = () =>
    new OutgoingPaymentFundingError(
        "A Money Account cannot be selected when Money Account Tracking is not active",
    );

export const resolveOutgoingPaymentFunding = async (
    tx: Bun.TransactionSQL,
    params: {
        organizationId: string;
        storeId: string;
        payment: CreateOutgoingPaymentSVC;
    },
): Promise<{ trackingActive: boolean; moneyAccount: MoneyAccountDTO | null }> => {
    const trackingActive = await isMoneyAccountTrackingActive(
        params.organizationId,
        params.storeId,
    );
    const method = params.payment.paymentMethod;
    const moneyAccountId = params.payment.moneyAccountId ?? null;

    if (!isOutgoingPaymentMethodAllowed(method, trackingActive)) {
        throw untrackedMethod(method);
    }

    if (!trackingActive) {
        if (moneyAccountId) {
            throw unexpectedAccount();
        }
        return { trackingActive: false, moneyAccount: null };
    }

    if (!moneyAccountId) {
        throw missingAccount();
    }

    const moneyAccount = await moneyAccountsRepository.lockMoneyAccountById(
        params.organizationId,
        moneyAccountId,
        tx,
    );
    if (!moneyAccount) {
        throw new OutgoingPaymentFundingError("Money Account not found", STATUS_CODES.NOT_FOUND);
    }
    if (moneyAccount.status !== "active") {
        throw inactiveAccount();
    }
    if (!isMoneyAccountAvailableToStore(moneyAccount, params.storeId)) {
        throw unavailableAccount();
    }
    if (!isMoneyAccountEligibleForOutgoingMethod(moneyAccount, method)) {
        throw ineligibleAccount();
    }

    const nextBalance = roundOutgoingPaymentMoney(moneyAccount.balance - params.payment.amount);
    if (nextBalance < 0) {
        throw insufficientBalance();
    }

    return { trackingActive: true, moneyAccount };
};

export const createOutgoingPurchasePaymentMovement = async (
    tx: Bun.TransactionSQL,
    params: {
        organizationId: string;
        storeId: string;
        moneyAccount: MoneyAccountDTO;
        payment: Pick<OutgoingPaymentDTO, "id" | "amount" | "paidAt">;
    },
): Promise<void> => {
    await createOutgoingPaymentMovement(tx, {
        ...params,
        sourceKind: "outgoing_purchase_payment",
    });
};

export const createOutgoingExpensePaymentMovement = async (
    tx: Bun.TransactionSQL,
    params: {
        organizationId: string;
        storeId: string;
        moneyAccount: MoneyAccountDTO;
        payment: Pick<OutgoingPaymentDTO, "id" | "amount" | "paidAt">;
    },
): Promise<void> => {
    await createOutgoingPaymentMovement(tx, {
        ...params,
        sourceKind: "outgoing_expense_payment",
    });
};

const createOutgoingPaymentMovement = async (
    tx: Bun.TransactionSQL,
    params: {
        organizationId: string;
        storeId: string;
        moneyAccount: MoneyAccountDTO;
        payment: Pick<OutgoingPaymentDTO, "id" | "amount" | "paidAt">;
        sourceKind: "outgoing_purchase_payment" | "outgoing_expense_payment";
    },
): Promise<void> => {
    const nextBalance = roundOutgoingPaymentMoney(
        params.moneyAccount.balance - params.payment.amount,
    );
    if (nextBalance < 0) {
        throw insufficientBalance();
    }

    const movement = await moneyAccountsRepository.createMoneyAccountMovement(
        {
            id: crypto.randomUUID(),
            organizationId: params.organizationId,
            moneyAccountId: params.moneyAccount.id,
            storeId: params.storeId,
            amount: roundOutgoingPaymentMoney(-params.payment.amount),
            occurredAt: params.payment.paidAt,
            sourceKind: params.sourceKind,
            paymentId: null,
            outgoingPaymentId: params.payment.id,
            reversedMovementId: null,
        },
        tx,
    );

    if (!movement) {
        throw new Error("Failed to create money account movement");
    }
};

export const createOutgoingPurchasePaymentReversalMovement = async (
    tx: Bun.TransactionSQL,
    params: {
        organizationId: string;
        originalMovement: MoneyAccountMovementDTO;
        sourceKind: "outgoing_purchase_payment_reversal" | "outgoing_purchase_void_reversal";
        occurredAt: Date;
    },
): Promise<void> => {
    await createOutgoingPaymentReversalMovement(tx, params);
};

export const createOutgoingExpensePaymentReversalMovement = async (
    tx: Bun.TransactionSQL,
    params: {
        organizationId: string;
        originalMovement: MoneyAccountMovementDTO;
        sourceKind: "outgoing_expense_payment_reversal" | "outgoing_expense_void_reversal";
        occurredAt: Date;
    },
): Promise<void> => {
    await createOutgoingPaymentReversalMovement(tx, params);
};

const createOutgoingPaymentReversalMovement = async (
    tx: Bun.TransactionSQL,
    params: {
        organizationId: string;
        originalMovement: MoneyAccountMovementDTO;
        sourceKind:
            | "outgoing_purchase_payment_reversal"
            | "outgoing_purchase_void_reversal"
            | "outgoing_expense_payment_reversal"
            | "outgoing_expense_void_reversal";
        occurredAt: Date;
    },
): Promise<void> => {
    const movement = await moneyAccountsRepository.createMoneyAccountMovement(
        {
            id: crypto.randomUUID(),
            organizationId: params.organizationId,
            moneyAccountId: params.originalMovement.moneyAccountId,
            storeId: params.originalMovement.storeId,
            amount: roundOutgoingPaymentMoney(Math.abs(params.originalMovement.amount)),
            occurredAt: params.occurredAt,
            sourceKind: params.sourceKind,
            paymentId: null,
            outgoingPaymentId: null,
            reversedMovementId: params.originalMovement.id,
        },
        tx,
    );

    if (!movement) {
        throw new Error("Failed to create money account movement");
    }
};
