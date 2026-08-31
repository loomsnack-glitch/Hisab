import {
    STATUS_CODES,
    type CreateMoneyAccountSVC,
    type MoneyAccountDTO,
    type MoneyAccountHistoryEntry,
    type MoneyAccountHistoryResponse,
    type MoneyAccountPaymentRouteMethod,
    type MoneyAccountPaymentRouteResponse,
    type MoneyAccountPaymentRoutesResponse,
    type MoneyAccountResponse,
    type MoneyAccountScope,
    type MoneyAccountType,
    type MoneyAccountsListResponse,
    type ServiceResponse,
    type UpdateMoneyAccountSVC,
    type UpsertMoneyAccountPaymentRouteSVC,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as moneyAccountsRepository from "./money-accounts.repository";

const ACTIVE_CASH_UNIQUE_INDEX = "money_accounts_one_active_cash_per_store";

const getOrganizationForUser = async (organizationId: string, userId: string) =>
    organizationRepository.getOrganizationByIdForUser(organizationId, userId);

const organizationNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Organization not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const moneyAccountNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Money Account not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const invalidScopeStore = (message: string): ServiceResponse<null> => ({
    status: "error",
    message,
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const activeCashConflict = (): ServiceResponse<null> => ({
    status: "error",
    message: "This Store already has an active Cash Money Account",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const moneyAccountLockedAfterMovements = (): ServiceResponse<null> => ({
    status: "error",
    message:
        "Type, availability, Store assignment, and Opening Balance cannot be changed after this Money Account has Movements",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const errorChainText = (error: unknown, depth = 0): string => {
    if (depth > 5 || error == null) {
        return "";
    }
    if (typeof error === "string") {
        return error;
    }
    if (typeof error !== "object") {
        return String(error);
    }

    const record = error as Record<string, unknown>;
    const parts = [record.code, record.constraint, record.constraint_name, record.detail, record.message]
        .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
        .map(String);

    if ("cause" in record) {
        parts.push(errorChainText(record.cause, depth + 1));
    }

    return parts.join("\n");
};

const isActiveCashUniqueViolation = (error: unknown): boolean =>
    errorChainText(error).includes(ACTIVE_CASH_UNIQUE_INDEX);

const normalizeNotes = (notes: string | null | undefined): string | null => {
    if (notes === undefined || notes === null) {
        return null;
    }
    const trimmed = notes.trim();
    return trimmed.length === 0 ? null : trimmed;
};

const resolveMoneyAccountScopeAndStore = async (
    organizationId: string,
    data: { type?: MoneyAccountType; scope?: MoneyAccountScope; storeId?: string | null },
    existing?: Pick<MoneyAccountDTO, "type" | "scope" | "storeId">,
): Promise<
    | { ok: true; type: MoneyAccountType; scope: MoneyAccountScope; storeId: string | null }
    | { ok: false; response: ServiceResponse<null> }
> => {
    const type = data.type ?? existing?.type;
    const scope = data.scope ?? existing?.scope ?? "organization_wide";
    const storeId =
        scope === "organization_wide"
            ? null
            : data.storeId !== undefined
                ? data.storeId
                : (existing?.storeId ?? null);

    if (type === "cash" && scope !== "store_scoped") {
        return {
            ok: false,
            response: invalidScopeStore("A Cash Money Account must be Store-scoped"),
        };
    }

    if (scope === "organization_wide" && data.storeId) {
        return {
            ok: false,
            response: invalidScopeStore(
                "An Organization-wide Money Account cannot have a Store assignment",
            ),
        };
    }

    if (scope === "store_scoped" && !storeId) {
        return {
            ok: false,
            response: invalidScopeStore("Store is required for a Store-scoped Money Account"),
        };
    }

    if (storeId) {
        const store = await organizationRepository.getStoreById(organizationId, storeId);
        if (!store) {
            return {
                ok: false,
                response: invalidScopeStore("Store not found"),
            };
        }
    }

    if (!type) {
        return {
            ok: false,
            response: invalidScopeStore("Money Account type is required"),
        };
    }

    return { ok: true, type, scope, storeId };
};

const mapPersistenceError = (error: unknown): ServiceResponse<null> | null => {
    if (isActiveCashUniqueViolation(error)) {
        return activeCashConflict();
    }
    return null;
};

export const getMoneyAccounts = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<MoneyAccountsListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const moneyAccounts = await moneyAccountsRepository.getMoneyAccountsByOrganizationId(organizationId);
    return {
        status: "success",
        data: { moneyAccounts },
        message: "Money Accounts fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getMoneyAccountDetails = async (
    userId: string,
    organizationId: string,
    moneyAccountId: string,
): Promise<ServiceResponse<MoneyAccountResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const moneyAccount = await moneyAccountsRepository.getMoneyAccountById(organizationId, moneyAccountId);
    if (!moneyAccount) {
        return moneyAccountNotFound();
    }

    return {
        status: "success",
        data: { moneyAccount },
        message: "Money Account fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createMoneyAccount = async (
    userId: string,
    organizationId: string,
    moneyAccountData: CreateMoneyAccountSVC,
): Promise<ServiceResponse<MoneyAccountResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const resolved = await resolveMoneyAccountScopeAndStore(organizationId, moneyAccountData);
    if (!resolved.ok) {
        return resolved.response;
    }

    try {
        const moneyAccount = await moneyAccountsRepository.createMoneyAccount({
            id: crypto.randomUUID(),
            organizationId,
            name: moneyAccountData.name,
            type: resolved.type,
            scope: resolved.scope,
            storeId: resolved.storeId,
            notes: normalizeNotes(moneyAccountData.notes),
            status: moneyAccountData.status ?? "active",
            openingBalance: moneyAccountData.openingBalance ?? 0,
            createdBy: userId,
        });

        if (!moneyAccount) {
            return {
                status: "error",
                message: "Failed to create money account",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        return {
            status: "success",
            data: { moneyAccount },
            message: "Money Account created successfully",
            code: STATUS_CODES.CREATED,
        };
    } catch (error) {
        const persistenceError = mapPersistenceError(error);
        if (persistenceError) {
            return persistenceError;
        }
        throw error;
    }
};

export const updateMoneyAccount = async (
    userId: string,
    organizationId: string,
    moneyAccountId: string,
    moneyAccountData: UpdateMoneyAccountSVC,
): Promise<ServiceResponse<MoneyAccountResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await moneyAccountsRepository.getMoneyAccountById(organizationId, moneyAccountId);
    if (!existing) {
        return moneyAccountNotFound();
    }

    const resolved = await resolveMoneyAccountScopeAndStore(organizationId, moneyAccountData, existing);
    if (!resolved.ok) {
        return resolved.response;
    }

    const nextOpeningBalance = moneyAccountData.openingBalance ?? existing.openingBalance;
    if (
        existing.hasMovements &&
        (resolved.type !== existing.type ||
            resolved.scope !== existing.scope ||
            resolved.storeId !== existing.storeId ||
            nextOpeningBalance !== existing.openingBalance)
    ) {
        return moneyAccountLockedAfterMovements();
    }

    try {
        const moneyAccount = await moneyAccountsRepository.updateMoneyAccount({
            id: moneyAccountId,
            organizationId,
            name: moneyAccountData.name ?? existing.name,
            type: resolved.type,
            scope: resolved.scope,
            storeId: resolved.storeId,
            notes:
                moneyAccountData.notes === undefined
                    ? existing.notes
                    : normalizeNotes(moneyAccountData.notes),
            status: moneyAccountData.status ?? existing.status,
            openingBalance: nextOpeningBalance,
            updatedBy: userId,
        });

        if (!moneyAccount) {
            return {
                status: "error",
                message: "Failed to update money account",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        return {
            status: "success",
            data: { moneyAccount },
            message: "Money Account updated successfully",
            code: STATUS_CODES.SUCCESS,
        };
    } catch (error) {
        const persistenceError = mapPersistenceError(error);
        if (persistenceError) {
            return persistenceError;
        }
        throw error;
    }
};

const toMoneyAmount = (value: number): number =>
    Math.round((value + Number.EPSILON) * 100) / 100;

const isEligiblePaymentRouteDestination = (
    moneyAccount: MoneyAccountDTO,
    storeId: string,
): boolean => {
    if (moneyAccount.scope === "organization_wide") {
        return moneyAccount.storeId === null;
    }

    return moneyAccount.scope === "store_scoped" && moneyAccount.storeId === storeId;
};

const paymentRouteNotEligible = (message: string): ServiceResponse<null> => ({
    status: "error",
    message,
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const storeNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Store not found",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

export const getMoneyAccountPaymentRoutes = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<MoneyAccountPaymentRoutesResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const store = await organizationRepository.getStoreById(organizationId, storeId);
    if (!store) {
        return storeNotFound();
    }

    const routes = await moneyAccountsRepository.getPaymentRoutesByStoreId(organizationId, storeId);
    return {
        status: "success",
        data: { routes },
        message: "Payment Routing Rules fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const upsertMoneyAccountPaymentRoute = async (
    userId: string,
    organizationId: string,
    storeId: string,
    routeData: UpsertMoneyAccountPaymentRouteSVC,
): Promise<ServiceResponse<MoneyAccountPaymentRouteResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const store = await organizationRepository.getStoreById(organizationId, storeId);
    if (!store) {
        return storeNotFound();
    }

    const destination = await moneyAccountsRepository.getMoneyAccountById(
        organizationId,
        routeData.moneyAccountId,
    );
    if (!destination) {
        return moneyAccountNotFound();
    }

    if (destination.status !== "active") {
        return paymentRouteNotEligible("Select an active Money Account");
    }

    if (!isEligiblePaymentRouteDestination(destination, storeId)) {
        return paymentRouteNotEligible("This Money Account is not available to this Store");
    }

    const existing = await moneyAccountsRepository.getPaymentRouteByStoreAndMethod(
        organizationId,
        storeId,
        routeData.paymentMethod,
    );

    const route = await moneyAccountsRepository.upsertPaymentRoute({
        id: crypto.randomUUID(),
        organizationId,
        storeId,
        paymentMethod: routeData.paymentMethod,
        moneyAccountId: routeData.moneyAccountId,
        createdBy: existing?.createdBy ?? userId,
        updatedBy: userId,
    });

    if (!route) {
        return {
            status: "error",
            message: "Failed to save payment routing rule",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { route },
        message: existing
            ? "Payment Routing Rule updated successfully"
            : "Payment Routing Rule saved successfully",
        code: existing ? STATUS_CODES.SUCCESS : STATUS_CODES.CREATED,
    };
};

export const clearMoneyAccountPaymentRoute = async (
    userId: string,
    organizationId: string,
    storeId: string,
    paymentMethod: MoneyAccountPaymentRouteMethod,
): Promise<ServiceResponse<MoneyAccountPaymentRoutesResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const store = await organizationRepository.getStoreById(organizationId, storeId);
    if (!store) {
        return storeNotFound();
    }

    await moneyAccountsRepository.deletePaymentRoute(organizationId, storeId, paymentMethod);
    const routes = await moneyAccountsRepository.getPaymentRoutesByStoreId(organizationId, storeId);

    return {
        status: "success",
        data: { routes },
        message: "Payment Routing Rule cleared successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getMoneyAccountHistory = async (
    userId: string,
    organizationId: string,
    moneyAccountId: string,
): Promise<ServiceResponse<MoneyAccountHistoryResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const moneyAccount = await moneyAccountsRepository.getMoneyAccountById(
        organizationId,
        moneyAccountId,
    );
    if (!moneyAccount) {
        return moneyAccountNotFound();
    }

    const movements = await moneyAccountsRepository.getMovementsByMoneyAccountId(
        organizationId,
        moneyAccountId,
    );
    const movementTotal = movements.reduce((sum, movement) => sum + movement.amount, 0);
    const balance = toMoneyAmount(moneyAccount.openingBalance + movementTotal);
    const openingEntry: MoneyAccountHistoryEntry = {
        kind: "opening_balance",
        amount: moneyAccount.openingBalance,
        occurredAt: moneyAccount.createdAt,
    };
    const movementEntries: MoneyAccountHistoryEntry[] = movements.flatMap(
        (movement): MoneyAccountHistoryEntry[] => {
            if (movement.sourceKind === "sale_replacement_reversal") {
                if (!movement.reversedMovementId) {
                    return [];
                }
                return [
                    {
                        kind: "sale_replacement_reversal",
                        id: movement.id,
                        amount: movement.amount,
                        occurredAt: movement.occurredAt,
                        storeId: movement.storeId,
                        reversedMovementId: movement.reversedMovementId,
                        originalPaymentId: movement.originalPaymentId ?? movement.paymentId,
                        saleId: movement.saleId,
                        saleNumber: movement.saleNumber,
                        paymentMethod: movement.paymentMethod,
                    },
                ];
            }

            if (!movement.paymentId || !movement.saleId || !movement.paymentMethod) {
                return [];
            }

            return [
                {
                    kind: "pos_payment",
                    id: movement.id,
                    amount: movement.amount,
                    occurredAt: movement.occurredAt,
                    storeId: movement.storeId,
                    paymentId: movement.paymentId,
                    saleId: movement.saleId,
                    saleNumber: movement.saleNumber,
                    paymentMethod: movement.paymentMethod,
                },
            ];
        },
    );

    return {
        status: "success",
        data: {
            moneyAccount: {
                ...moneyAccount,
                balance,
                hasMovements: movements.length > 0,
            },
            openingBalance: moneyAccount.openingBalance,
            balance,
            entries: [openingEntry, ...movementEntries],
        },
        message: "Money Account history fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

