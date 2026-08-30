import {
    STATUS_CODES,
    type CreateMoneyAccountSVC,
    type MoneyAccountResponse,
    type MoneyAccountsListResponse,
    type ServiceResponse,
    type UpdateMoneyAccountSVC,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as moneyAccountsRepository from "./money-accounts.repository";

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

const normalizeNotes = (notes: string | null | undefined): string | null => {
    if (notes === undefined || notes === null) {
        return null;
    }
    const trimmed = notes.trim();
    return trimmed.length === 0 ? null : trimmed;
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

    const moneyAccount = await moneyAccountsRepository.createMoneyAccount({
        id: crypto.randomUUID(),
        organizationId,
        name: moneyAccountData.name,
        type: moneyAccountData.type,
        scope: "organization_wide",
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

    const moneyAccount = await moneyAccountsRepository.updateMoneyAccount({
        id: moneyAccountId,
        organizationId,
        name: moneyAccountData.name ?? existing.name,
        type: moneyAccountData.type ?? existing.type,
        scope: "organization_wide",
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
};
