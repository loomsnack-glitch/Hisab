import {
    STATUS_CODES,
    normalizePhoneNumber,
    type ServiceResponse,
    type WhatsAppAccountDTO,
    type WhatsAppAccountStatusResponseDTO,
    type WhatsAppChangeAccountNumberJSON,
    type WhatsAppCreateAccountJSON,
    type WhatsAppReminderQueueResponseDTO,
    type WhatsAppWorkerStatusUpdateJSON,
    type DeviceSessionDTO,
} from "@repo/types";
import { redis } from "@/config/redis";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as billingRepository from "@/modules/tenant/billing/billing.repository";
import * as repository from "./whatsapp.repository";
import * as workerClient from "./whatsapp.worker-client";
import * as invoiceService from "./invoice";
import * as conversationService from "./conversation";
import { formatDueReminderText } from "./due-reminder";
import * as promotionService from "./promotion";
import * as messageTemplate from "./message-template";

const QR_KEY_PREFIX = "whatsapp:account:qr:";
const QR_TTL_SECONDS = 120;
type StoreScope =
    | { error: string; code: 404 }
    | { organization: Awaited<ReturnType<typeof organizationRepository.getOrganizationByIdForUser>>; store: Awaited<ReturnType<typeof organizationRepository.getStoreById>> };

const accountResponse = (
    account: WhatsAppAccountDTO,
    qrImageDataUrl: string | null,
): WhatsAppAccountStatusResponseDTO => ({
    account,
    qrImageDataUrl,
});

const scopeStore = async (userId: string, organizationId: string, storeId: string): Promise<StoreScope> => {
    const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
    if (!organization) return { error: "Organization not found", code: STATUS_CODES.NOT_FOUND };

    const store = await organizationRepository.getStoreById(organizationId, storeId);
    if (!store) return { error: "Store not found", code: STATUS_CODES.NOT_FOUND };
    return { organization, store };
};

const saveWorkerStatus = async (accountId: string, update: WhatsAppWorkerStatusUpdateJSON) => {
    const account = await repository.updateAccountStatus(accountId, update);
    if (update.qrImageDataUrl) {
        await redis.set(QR_KEY_PREFIX + accountId, update.qrImageDataUrl);
        await redis.expire(QR_KEY_PREFIX + accountId, QR_TTL_SECONDS);
    } else {
        await redis.del(QR_KEY_PREFIX + accountId);
    }
    return account;
};

const saveWorkerSnapshot = async (snapshot: workerClient.WorkerAccountStatus) => {
    const account = await saveWorkerStatus(snapshot.accountId, {
        status: snapshot.status,
        qrImageDataUrl: snapshot.qrImageDataUrl,
        lastErrorCode: snapshot.lastErrorCode,
    });
    return account ? accountResponse(account, snapshot.qrImageDataUrl) : null;
};

const postgresCode = (error: unknown): string | undefined => {
    if (typeof error !== "object" || error === null) return undefined;
    if ("code" in error && typeof error.code === "string") return error.code;
    if ("cause" in error) return postgresCode(error.cause);
    return undefined;
};

const postgresConstraint = (error: unknown): string | undefined => {
    if (typeof error !== "object" || error === null) return undefined;
    if ("constraint" in error && typeof error.constraint === "string") return error.constraint;
    if ("constraint_name" in error && typeof error.constraint_name === "string") return error.constraint_name;
    if ("message" in error && typeof error.message === "string") {
        return error.message.match(/constraint "([^"]+)"/)?.[1];
    }
    if ("cause" in error) return postgresConstraint(error.cause);
    return undefined;
};

const workerUnavailable = (account: WhatsAppAccountDTO): ServiceResponse<WhatsAppAccountStatusResponseDTO> => ({
    status: "error",
    message: "WhatsApp worker is unavailable. The account was saved; retry linking when the worker is healthy.",
    data: accountResponse(account, null),
    code: 503,
});

const markAccountWorkerUnavailable = async (accountId: string) => {
    try {
        await saveWorkerStatus(accountId, {
            status: "failed",
            qrImageDataUrl: null,
            lastErrorCode: "worker_unavailable",
        });
    } catch (error) {
        console.error("[whatsapp] failed to persist worker_unavailable status", error instanceof Error ? error.message : error);
    }
};

export const getAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };

    const account = await repository.getAccount(organizationId, storeId);
    if (!account) {
        return {
            status: "success",
            message: "WhatsApp account not linked",
            data: null,
            code: STATUS_CODES.SUCCESS,
        };
    }

    try {
        const snapshot = await workerClient.getAccountStatus(account.id);
        const response = await saveWorkerSnapshot(snapshot);
        return {
            status: "success",
            message: "WhatsApp account status fetched successfully",
            data: response,
            code: STATUS_CODES.SUCCESS,
        };
    } catch {
        return workerUnavailable(account);
    }
};

export const listAccounts = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<{ accounts: WhatsAppAccountDTO[] } | null>> => {
    const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
    if (!organization) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };
    return {
        status: "success",
        message: "WhatsApp accounts loaded",
        data: { accounts: await repository.getAccountsForOrganization(organizationId) },
        code: STATUS_CODES.SUCCESS,
    };
};

export const getOrganizationAccountStatus = async (
    userId: string,
    organizationId: string,
    accountId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scoped = await getOrganizationAccount(userId, organizationId, accountId);
    if ("error" in scoped) return { status: "error", message: scoped.error, data: null, code: scoped.code };
    try {
        const snapshot = await workerClient.getAccountStatus(scoped.account.id);
        const response = await saveWorkerSnapshot(snapshot);
        return response
            ? { status: "success", message: "WhatsApp account status fetched successfully", data: response, code: STATUS_CODES.SUCCESS }
            : workerUnavailable(scoped.account);
    } catch {
        return workerUnavailable(scoped.account);
    }
};

export const createOrganizationAccount = async (
    userId: string,
    organizationId: string,
    data: WhatsAppCreateAccountJSON,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
    if (!organization) return { status: "error", message: "Organization not found", data: null, code: STATUS_CODES.NOT_FOUND };

    const phoneNumber = normalizePhoneNumber(data.phoneNumber);
    if (!phoneNumber) {
        return { status: "error", message: "Enter a valid phone number with country code", data: null, code: STATUS_CODES.BAD_REQUEST };
    }
    if (await repository.getAccountByPhoneNumber(phoneNumber)) {
        return {
            status: "error",
            message: "This WhatsApp number is already linked to another account",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    let account: WhatsAppAccountDTO;
    try {
        account = await repository.createOrganizationAccount(organizationId, phoneNumber, userId);
    } catch (error) {
        if (postgresCode(error) === "23505") {
            return {
                status: "error",
                message: "This WhatsApp number is already linked to another account",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        console.error("[whatsapp] createOrganizationAccount failed", error instanceof Error ? error.message : error);
        return { status: "error", message: "WhatsApp operation failed", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
    }

    try {
        const snapshot = await workerClient.connectAccount(account.id, account.phoneNumber);
        const response = await saveWorkerSnapshot(snapshot);
        return { status: "success", message: "WhatsApp account linking started", data: response, code: STATUS_CODES.CREATED };
    } catch {
        await markAccountWorkerUnavailable(account.id);
        return workerUnavailable(account);
    }
};

const getOrganizationAccount = async (userId: string, organizationId: string, accountId: string) => {
    const organization = await organizationRepository.getOrganizationByIdForUser(organizationId, userId);
    if (!organization) return { error: "Organization not found" as const, code: STATUS_CODES.NOT_FOUND };
    const account = await repository.getAccountById(accountId);
    if (!account || account.organizationId !== organizationId) {
        return { error: "WhatsApp account not found" as const, code: STATUS_CODES.NOT_FOUND };
    }
    return { account };
};

export const connectOrganizationAccount = async (
    userId: string,
    organizationId: string,
    accountId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scoped = await getOrganizationAccount(userId, organizationId, accountId);
    if ("error" in scoped) return { status: "error", message: scoped.error, data: null, code: scoped.code };
    try {
        const snapshot = await workerClient.connectAccount(scoped.account.id, scoped.account.phoneNumber);
        const response = await saveWorkerSnapshot(snapshot);
        return { status: "success", message: "WhatsApp account linking started", data: response, code: STATUS_CODES.SUCCESS };
    } catch {
        return workerUnavailable(scoped.account);
    }
};

export const disconnectOrganizationAccount = async (
    userId: string,
    organizationId: string,
    accountId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scoped = await getOrganizationAccount(userId, organizationId, accountId);
    if ("error" in scoped) return { status: "error", message: scoped.error, data: null, code: scoped.code };
    try {
        const snapshot = await workerClient.disconnectAccount(scoped.account.id);
        const response = await saveWorkerSnapshot(snapshot);
        return { status: "success", message: "WhatsApp account disconnected", data: response, code: STATUS_CODES.SUCCESS };
    } catch {
        return workerUnavailable(scoped.account);
    }
};

export const changeOrganizationAccountNumber = async (
    userId: string,
    organizationId: string,
    accountId: string,
    data: WhatsAppChangeAccountNumberJSON,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scoped = await getOrganizationAccount(userId, organizationId, accountId);
    if ("error" in scoped) return { status: "error", message: scoped.error, data: null, code: scoped.code };

    const phoneNumber = normalizePhoneNumber(data.phoneNumber);
    if (!phoneNumber) return { status: "error", message: "Enter a valid phone number with country code", data: null, code: STATUS_CODES.BAD_REQUEST };
    if (phoneNumber === scoped.account.phoneNumber) return { status: "error", message: "Enter a different phone number", data: null, code: STATUS_CODES.BAD_REQUEST };
    if (await repository.getAccountByPhoneNumber(phoneNumber)) {
        return { status: "error", message: "This WhatsApp number is already linked to another account", data: null, code: STATUS_CODES.CONFLICT };
    }

    let updatedAccount: WhatsAppAccountDTO | null = null;
    try {
        const disconnected = await workerClient.disconnectAccount(scoped.account.id);
        await saveWorkerSnapshot(disconnected);
        updatedAccount = await repository.updateAccountPhoneNumber(scoped.account.id, phoneNumber, userId);
        if (!updatedAccount) return { status: "error", message: "WhatsApp account could not be updated", data: null, code: STATUS_CODES.NOT_FOUND };
        const snapshot = await workerClient.connectAccount(updatedAccount.id, updatedAccount.phoneNumber);
        const response = await saveWorkerSnapshot(snapshot);
        return { status: "success", message: "WhatsApp number changed. Scan the new QR code.", data: response, code: STATUS_CODES.SUCCESS };
    } catch (error) {
        if (postgresCode(error) === "23505") {
            return { status: "error", message: "This WhatsApp number is already linked to another account", data: null, code: STATUS_CODES.CONFLICT };
        }
        return workerUnavailable(updatedAccount ?? scoped.account);
    }
};

export const assignAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
    accountId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };
    if (await repository.getAccount(organizationId, storeId)) {
        return {
            status: "error",
            message: "This Store already has a WhatsApp account",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    try {
        const account = await repository.assignAccountToStore(organizationId, accountId, storeId, userId);
        if (!account) {
            return { status: "error", message: "WhatsApp account not found", data: null, code: STATUS_CODES.NOT_FOUND };
        }
        return {
            status: "success",
            message: "WhatsApp account assigned to Store",
            data: accountResponse(account, null),
            code: STATUS_CODES.SUCCESS,
        };
    } catch (error) {
        if (postgresCode(error) === "23505") {
            return {
                status: "error",
                message: "This Store already has a WhatsApp account",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        throw error;
    }
};

export const unassignAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };
    const account = await repository.getAccount(organizationId, storeId);
    if (!account) return { status: "error", message: "WhatsApp account is not assigned to this Store", data: null, code: STATUS_CODES.NOT_FOUND };
    const removed = await repository.unassignAccountFromStore(organizationId, account.id, storeId, userId);
    return removed
        ? { status: "success", message: "WhatsApp account unassigned from Store", data: null, code: STATUS_CODES.SUCCESS }
        : { status: "error", message: "WhatsApp account assignment was not found", data: null, code: STATUS_CODES.NOT_FOUND };
};

export const createAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
    data: WhatsAppCreateAccountJSON,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };

    if (await repository.getAccount(organizationId, storeId)) {
        return {
            status: "error",
            message: "This store already has a WhatsApp account",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const phoneNumber = normalizePhoneNumber(data.phoneNumber);
    if (!phoneNumber) {
        return {
            status: "error",
            message: "Enter a valid phone number with country code",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    if (await repository.getAccountByPhoneNumber(phoneNumber)) {
        return {
            status: "error",
            message: "This WhatsApp number is already linked to another account",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    let account: WhatsAppAccountDTO;
    try {
        account = await repository.createAccount(organizationId, storeId, phoneNumber, userId);
    } catch (error) {
        if (postgresCode(error) === "23505") {
            return {
                status: "error",
                message:
                    postgresConstraint(error) === "whatsapp_accounts_provider_phone_number_normalized_key"
                        ? "This WhatsApp number is already linked to another account"
                        : postgresConstraint(error) === "whatsapp_account_stores_one_store_account_key"
                          ? "This Store already has a WhatsApp account"
                          : "WhatsApp account could not be created",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        console.error("[whatsapp] createAccount insert failed", error instanceof Error ? error.message : error);
        return {
            status: "error",
            message: "WhatsApp operation failed",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    try {
        const snapshot = await workerClient.connectAccount(account.id, account.phoneNumber);
        const response = await saveWorkerSnapshot(snapshot);
        return {
            status: "success",
            message: "WhatsApp account linking started",
            data: response,
            code: STATUS_CODES.CREATED,
        };
    } catch {
        await markAccountWorkerUnavailable(account.id);
        return workerUnavailable(account);
    }
};

export const connectAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };

    const account = await repository.getAccount(organizationId, storeId);
    if (!account) {
        return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    }

    try {
        const snapshot = await workerClient.connectAccount(account.id, account.phoneNumber);
        const response = await saveWorkerSnapshot(snapshot);
        return {
            status: "success",
            message: "WhatsApp account linking started",
            data: response,
            code: STATUS_CODES.SUCCESS,
        };
    } catch {
        return workerUnavailable(account);
    }
};

export const disconnectAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };

    const account = await repository.getAccount(organizationId, storeId);
    if (!account) {
        return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    }

    try {
        const snapshot = await workerClient.disconnectAccount(account.id);
        const response = await saveWorkerSnapshot(snapshot);
        return {
            status: "success",
            message: "WhatsApp account disconnected",
            data: response,
            code: STATUS_CODES.SUCCESS,
        };
    } catch {
        return workerUnavailable(account);
    }
};

export const changeAccountNumber = async (
    userId: string,
    organizationId: string,
    storeId: string,
    data: WhatsAppChangeAccountNumberJSON,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };

    const account = await repository.getAccount(organizationId, storeId);
    if (!account) {
        return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    }

    const phoneNumber = normalizePhoneNumber(data.phoneNumber);
    if (!phoneNumber) {
        return {
            status: "error",
            message: "Enter a valid phone number with country code",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }
    if (phoneNumber === account.phoneNumber) {
        return {
            status: "error",
            message: "Enter a different phone number",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }
    if (await repository.getAccountByPhoneNumber(phoneNumber)) {
        return {
            status: "error",
            message: "This WhatsApp number is already linked to another account",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    try {
        const disconnected = await workerClient.disconnectAccount(account.id);
        await saveWorkerSnapshot(disconnected);
    } catch {
        return workerUnavailable(account);
    }

    let updatedAccount: WhatsAppAccountDTO;
    try {
        const updated = await repository.updateAccountPhoneNumber(account.id, phoneNumber, userId);
        if (!updated) {
            return {
                status: "error",
                message: "WhatsApp account could not be updated",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }
        updatedAccount = updated;
    } catch (error) {
        if (postgresCode(error) === "23505") {
            return {
                status: "error",
                message: "This WhatsApp number is already linked to another account",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        console.error("[whatsapp] updateAccountPhoneNumber failed", error instanceof Error ? error.message : error);
        return {
            status: "error",
            message: "WhatsApp operation failed",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    try {
        const snapshot = await workerClient.connectAccount(updatedAccount.id, updatedAccount.phoneNumber);
        const response = await saveWorkerSnapshot(snapshot);
        return {
            status: "success",
            message: "WhatsApp number changed. Scan the new QR code to connect it.",
            data: response,
            code: STATUS_CODES.SUCCESS,
        };
    } catch {
        return workerUnavailable(updatedAccount);
    }
};

export const removeAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };

    const account = await repository.getAccount(organizationId, storeId);
    if (!account) {
        return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    }

    const removed = await repository.unassignAccountFromStore(organizationId, account.id, storeId, userId);
    return removed
        ? { status: "success", message: "WhatsApp number unassigned from Store", data: null, code: STATUS_CODES.SUCCESS }
        : { status: "error", message: "WhatsApp account assignment was not found", data: null, code: STATUS_CODES.NOT_FOUND };
};

const syncAccountForScope = async (account: WhatsAppAccountDTO): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO>> => {
    try {
        const snapshot = await workerClient.syncAccount(account.id);
        const response = await saveWorkerSnapshot(snapshot);
        return response
            ? { status: "success", message: "WhatsApp chat synchronization started", data: response, code: STATUS_CODES.SUCCESS }
            : workerUnavailable(account);
    } catch {
        return workerUnavailable(account);
    }
};

export const syncAccount = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error", message: scope.error, data: null, code: scope.code };
    const account = await repository.getAccount(organizationId, storeId);
    if (!account) {
        return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    }
    return syncAccountForScope(account);
};

export const syncAccountForDevice = async (
    session: DeviceSessionDTO,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const account = await repository.getAccount(session.organization.id, session.store.id);
    if (!account) return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };
    return syncAccountForScope(account);
};

export const getAccountForDevice = async (
    session: DeviceSessionDTO,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const account = await repository.getAccount(session.organization.id, session.store.id);
    if (!account) return { status: "error", message: "WhatsApp account is not linked", data: null, code: STATUS_CODES.NOT_FOUND };

    try {
        const snapshot = await workerClient.getAccountStatus(account.id);
        const response = await saveWorkerSnapshot(snapshot);
        return response
            ? { status: "success", message: "WhatsApp account status fetched successfully", data: response, code: STATUS_CODES.SUCCESS }
            : workerUnavailable(account);
    } catch {
        return workerUnavailable(account);
    }
};

export const connectAccountForDevice = async (
    session: DeviceSessionDTO,
): Promise<ServiceResponse<WhatsAppAccountStatusResponseDTO | null>> => {
    const account = await repository.getAccount(session.organization.id, session.store.id);
    if (!account) return { status: "error", message: "WhatsApp account is not linked. Open the POS WhatsApp page to link it first.", data: null, code: STATUS_CODES.NOT_FOUND };

    try {
        const snapshot = await workerClient.connectAccount(account.id, account.phoneNumber);
        const response = await saveWorkerSnapshot(snapshot);
        return response
            ? { status: "success", message: "WhatsApp account linking started", data: response, code: STATUS_CODES.SUCCESS }
            : workerUnavailable(account);
    } catch {
        return workerUnavailable(account);
    }
};

export const getWorkerAccounts = async (partition?: repository.WorkerPartition) =>
    partition ? repository.getAccountsForWorkerPartition(partition) : repository.getAccountsForWorker();

export const getOperationsMetrics = repository.getOperationsMetrics;
export const getHistoryAnchorsForWorker = repository.getHistoryAnchorsForWorker;
export const replayPendingMessageEvents = conversationService.replayPendingMessageEvents;

export const receiveWorkerStatus = async (accountId: string, update: WhatsAppWorkerStatusUpdateJSON) =>
    saveWorkerStatus(accountId, update);

export const queueInvoice = invoiceService.queueInvoice;
export const queueInvoiceForDevice = invoiceService.queueInvoiceForDevice;

export const listMessageTemplatesForDevice = async (
    session: DeviceSessionDTO,
    kind?: import("@repo/types").WhatsAppMessageTemplateKind,
) => ({
    status: "success" as const,
    message: "WhatsApp message templates fetched successfully",
    data: { templates: await messageTemplate.listTemplates(session.organization.id, session.store.id, kind) },
    code: STATUS_CODES.SUCCESS,
});

export const listMessageTemplates = async (
    userId: string,
    organizationId: string,
    storeId: string,
    kind?: import("@repo/types").WhatsAppMessageTemplateKind,
) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    return { status: "success" as const, message: "WhatsApp message templates fetched successfully", data: { templates: await messageTemplate.listTemplates(organizationId, storeId, kind) }, code: STATUS_CODES.SUCCESS };
};

export const createMessageTemplate = async (
    userId: string,
    organizationId: string,
    storeId: string,
    data: import("@repo/types").WhatsAppCreateMessageTemplateJSON,
) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    try {
        const template = await messageTemplate.createTemplate(organizationId, storeId, userId, data);
        return { status: "success" as const, message: "WhatsApp message template created", data: { template }, code: STATUS_CODES.CREATED };
    } catch (error) {
        if (postgresCode(error) === "23505") return { status: "error" as const, message: "A template with this name already exists", data: null, code: STATUS_CODES.CONFLICT };
        throw error;
    }
};

export const updateMessageTemplate = async (
    userId: string,
    organizationId: string,
    storeId: string,
    templateId: string,
    data: import("@repo/types").WhatsAppUpdateMessageTemplateJSON,
) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    try {
        const template = await messageTemplate.updateTemplate(organizationId, storeId, templateId, userId, data);
        return template
            ? { status: "success" as const, message: "WhatsApp message template updated", data: { template }, code: STATUS_CODES.SUCCESS }
            : { status: "error" as const, message: "Template not found", data: null, code: STATUS_CODES.NOT_FOUND };
    } catch (error) {
        if (postgresCode(error) === "23505") return { status: "error" as const, message: "A template with this name already exists", data: null, code: STATUS_CODES.CONFLICT };
        throw error;
    }
};

export const deleteMessageTemplate = async (userId: string, organizationId: string, storeId: string, templateId: string) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    const deleted = await messageTemplate.deleteTemplate(organizationId, storeId, templateId);
    return deleted
        ? { status: "success" as const, message: "WhatsApp message template deleted", data: null, code: STATUS_CODES.SUCCESS }
        : { status: "error" as const, message: "Template not found", data: null, code: STATUS_CODES.NOT_FOUND };
};

const queueDueReminderForStore = async (
    organizationId: string,
    storeId: string,
    customerId: string,
    customMessage?: string,
    saleId?: string,
): Promise<ServiceResponse<WhatsAppReminderQueueResponseDTO | null>> => {
    const store = await organizationRepository.getStoreById(organizationId, storeId);
    const customer = await billingRepository.getCustomerById(organizationId, customerId);
    if (!store || !customer) return { status: "error", message: "Store or customer not found", data: null, code: STATUS_CODES.NOT_FOUND };
    const phone = normalizePhoneNumber(customer.phone);
    if (!phone) return { status: "error", message: "Customer must have a valid phone number", data: null, code: STATUS_CODES.BAD_REQUEST };
    const sales = await billingRepository.getDueSalesByCustomerStore(organizationId, storeId, customerId);
    if (sales.length === 0) return { status: "error", message: "This customer has no due bills in this Store", data: null, code: STATUS_CODES.CONFLICT };
    const reminderSales = saleId ? sales.filter(sale => sale.id === saleId) : sales;
    if (reminderSales.length === 0) return { status: "error", message: "This bill has no remaining due amount", data: null, code: STATUS_CODES.CONFLICT };
    const account = await repository.getAccount(organizationId, storeId);
    if (!account) return { status: "error", message: "Link the Store WhatsApp account before sending reminders", data: null, code: STATUS_CODES.CONFLICT };
    if (account.status !== "connected") return { status: "error", message: "Connect the Store WhatsApp account before sending reminders", data: null, code: STATUS_CODES.CONFLICT };
    try {
        const queued = await repository.createCustomerTextOutbox({
            organizationId,
            storeId,
            accountId: account.id,
            customerId,
            saleId: saleId ?? null,
            customerPhone: phone,
            customerName: customer.name,
            body: formatDueReminderText(customer, reminderSales, store.name, customMessage ?? store.whatsappMessageTemplates.dueReminder, store.whatsappLinks),
        });
        return {
            status: "success",
            message: "Due reminder queued for WhatsApp",
            data: { customerId, saleId: saleId ?? null, ...queued },
            code: STATUS_CODES.CREATED,
        };
    } catch (error) {
        if (error instanceof repository.WhatsAppOutboxLimitError) return { status: "error", message: "WhatsApp account queue is full; retry shortly", data: null, code: STATUS_CODES.TOO_MANY_REQUESTS };
        throw error;
    }
};

export const queueDueReminder = async (userId: string, organizationId: string, storeId: string, customerId: string, customMessage?: string, saleId?: string) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    return queueDueReminderForStore(organizationId, storeId, customerId, customMessage, saleId);
};

export const queueDueReminderForDevice = (session: DeviceSessionDTO, customerId: string, customMessage?: string, saleId?: string) =>
    queueDueReminderForStore(session.organization.id, session.store.id, customerId, customMessage, saleId);

const getDueReminderStatusForStore = async (
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<ServiceResponse<WhatsAppReminderQueueResponseDTO | null>> => {
    const sale = await billingRepository.getSaleById(organizationId, storeId, saleId);
    const customerId = sale?.customerId ?? null;
    if (!customerId) return { status: "success", message: "Due reminder has not been sent for this bill", data: null, code: STATUS_CODES.SUCCESS };
    const account = await repository.getAccount(organizationId, storeId);
    const existing = account ? await repository.getCustomerReminderOutbox(organizationId, storeId, account.id, saleId) : null;
    return existing
        ? {
            status: "success",
            message: "Due reminder status fetched successfully",
            data: { customerId, saleId, ...existing },
            code: STATUS_CODES.SUCCESS,
        }
        : { status: "success", message: "Due reminder has not been sent for this bill", data: null, code: STATUS_CODES.SUCCESS };
};

export const getDueReminderStatus = async (userId: string, organizationId: string, storeId: string, saleId: string) => {
    const scope = await scopeStore(userId, organizationId, storeId);
    if ("error" in scope) return { status: "error" as const, message: scope.error, data: null, code: scope.code };
    return getDueReminderStatusForStore(organizationId, storeId, saleId);
};

export const getDueReminderStatusForDevice = (session: DeviceSessionDTO, saleId: string) =>
    getDueReminderStatusForStore(session.organization.id, session.store.id, saleId);
export const createPromotion = promotionService.createPromotion;
export const getInvoiceStatusForDevice = invoiceService.getInvoiceStatusForDevice;
export const retryInvoiceForDevice = invoiceService.retryInvoiceForDevice;
export const getInvoiceStatus = invoiceService.getInvoiceStatus;
export const retryInvoice = invoiceService.retryInvoice;
export const claimInvoiceForWorker = invoiceService.claimInvoiceForWorker;
export const receiveInvoiceResult = invoiceService.receiveInvoiceResult;
export const receiveInvoiceMessageStatus = invoiceService.receiveInvoiceMessageStatus;
export const listConversations = conversationService.listConversations;
export const listConversationsForDevice = conversationService.listConversationsForDevice;
export const getConversation = conversationService.getConversation;
export const getConversationForDevice = conversationService.getConversationForDevice;
export const sendText = conversationService.sendText;
export const sendTextForDevice = conversationService.sendTextForDevice;
export const attachCustomer = conversationService.attachCustomer;
export const attachCustomerForDevice = conversationService.attachCustomerForDevice;
export const getAttachment = conversationService.getAttachment;
export const getAttachmentForDevice = conversationService.getAttachmentForDevice;
export const ingestInboundMessage = conversationService.ingestInboundMessage;
export const ingestMessageEvent = conversationService.ingestMessageEvent;
