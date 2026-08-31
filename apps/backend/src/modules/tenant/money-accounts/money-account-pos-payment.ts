import type {
    MoneyAccountDTO,
    MoneyAccountPaymentRouteMethod,
    PaymentDTO,
    PaymentMethod,
} from "@repo/types";
import { isMoneyAccountTrackingActive } from "./money-account-tracking";
import * as moneyAccountsRepository from "./money-accounts.repository";

const TRACKED_PAYMENT_METHODS = ["cash", "upi", "card"] as const;

type TrackedPaymentMethod = (typeof TRACKED_PAYMENT_METHODS)[number];

const TRACKED_PAYMENT_METHOD_LABELS: Record<TrackedPaymentMethod, string> = {
    cash: "Cash",
    upi: "UPI",
    card: "Card",
};

export class MoneyAccountTrackingSetupError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MoneyAccountTrackingSetupError";
    }
}

export const isMoneyAccountTrackingSetupError = (
    error: unknown,
): error is MoneyAccountTrackingSetupError =>
    error instanceof MoneyAccountTrackingSetupError ||
    (error instanceof Error && error.name === "MoneyAccountTrackingSetupError");

const isTrackedPaymentMethod = (method: PaymentMethod): method is TrackedPaymentMethod =>
    method === "cash" || method === "upi" || method === "card";

const isEligiblePaymentRouteDestination = (
    moneyAccount: Pick<MoneyAccountDTO, "scope" | "storeId">,
    storeId: string,
): boolean => {
    if (moneyAccount.scope === "organization_wide") {
        return moneyAccount.storeId === null;
    }

    return moneyAccount.scope === "store_scoped" && moneyAccount.storeId === storeId;
};

const missingCashAccountError = () =>
    new MoneyAccountTrackingSetupError(
        "Cash Payments cannot be collected until this Store has an active Cash Money Account. Ask an administrator to create one.",
    );

const missingRouteError = (method: MoneyAccountPaymentRouteMethod) => {
    const label = TRACKED_PAYMENT_METHOD_LABELS[method];
    return new MoneyAccountTrackingSetupError(
        `${label} Payments cannot be collected until this Store has a ${label} route. Ask an administrator to set one.`,
    );
};

const inactiveDestinationError = (method: MoneyAccountPaymentRouteMethod) => {
    const label = TRACKED_PAYMENT_METHOD_LABELS[method];
    return new MoneyAccountTrackingSetupError(
        `${label} Payments cannot be collected because the ${label} destination is inactive. Ask an administrator to choose an active ${label} account.`,
    );
};

const unavailableDestinationError = (method: MoneyAccountPaymentRouteMethod) => {
    const label = TRACKED_PAYMENT_METHOD_LABELS[method];
    return new MoneyAccountTrackingSetupError(
        `${label} Payments cannot be collected because the ${label} destination is not available to this Store. Ask an administrator to choose a ${label} account.`,
    );
};

const resolveRoutedDestination = async (
    tx: Bun.TransactionSQL,
    organizationId: string,
    storeId: string,
    method: MoneyAccountPaymentRouteMethod,
): Promise<MoneyAccountDTO> => {
    const route = await moneyAccountsRepository.lockPaymentRouteByStoreAndMethod(
        organizationId,
        storeId,
        method,
        tx,
    );
    if (!route) {
        throw missingRouteError(method);
    }

    const destination = await moneyAccountsRepository.lockMoneyAccountById(
        organizationId,
        route.moneyAccountId,
        tx,
    );
    if (!destination || destination.status !== "active") {
        throw inactiveDestinationError(method);
    }
    if (!isEligiblePaymentRouteDestination(destination, storeId)) {
        throw unavailableDestinationError(method);
    }

    return destination;
};

export const resolvePosPaymentMoneyAccount = async (
    tx: Bun.TransactionSQL,
    organizationId: string,
    storeId: string,
    method: PaymentMethod,
): Promise<MoneyAccountDTO | null> => {
    if (!isTrackedPaymentMethod(method)) {
        return null;
    }

    const trackingActive = await isMoneyAccountTrackingActive(organizationId, storeId);
    if (!trackingActive) {
        return null;
    }

    if (method === "cash") {
        const cashAccount = await moneyAccountsRepository.lockActiveStoreCashAccount(
            organizationId,
            storeId,
            tx,
        );
        if (!cashAccount) {
            throw missingCashAccountError();
        }
        return cashAccount;
    }

    return resolveRoutedDestination(tx, organizationId, storeId, method);
};

export const createPosPaymentMoneyAccountMovement = async (
    tx: Bun.TransactionSQL,
    params: {
        organizationId: string;
        storeId: string;
        destination: MoneyAccountDTO;
        payment: Pick<PaymentDTO, "id" | "amount" | "collectedAt">;
    },
): Promise<void> => {
    const movement = await moneyAccountsRepository.createMoneyAccountMovement(
        {
            id: crypto.randomUUID(),
            organizationId: params.organizationId,
            moneyAccountId: params.destination.id,
            storeId: params.storeId,
            amount: params.payment.amount,
            occurredAt: params.payment.collectedAt,
            sourceKind: "pos_payment",
            paymentId: params.payment.id,
        },
        tx,
    );

    if (!movement) {
        throw new Error("Failed to create money account movement");
    }
};
