import {
    STATUS_CODES,
    type CreateMoneyAccountSVC,
    type MoneyAccountDTO,
    type MoneyAccountResponse,
    type MoneyAccountScope,
    type MoneyAccountType,
    type MoneyAccountsListResponse,
    type ServiceResponse,
    type UpdateMoneyAccountSVC,
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

const isUniqueViolation = (error: unknown): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505";

const isActiveCashUniqueViolation = (error: unknown): boolean => {
    if (!isUniqueViolation(error)) {
        return false;
    }

    const constraint = (error as { constraint?: unknown }).constraint;
    const detail = (error as { detail?: unknown }).detail;
    const message = error instanceof Error ? error.message : "";
    return (
        constraint === ACTIVE_CASH_UNIQUE_INDEX ||
        (typeof detail === "string" && detail.includes(ACTIVE_CASH_UNIQUE_INDEX)) ||
        message.includes(ACTIVE_CASH_UNIQUE_INDEX)
    );
};

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
