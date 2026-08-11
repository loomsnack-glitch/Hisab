import {
    STATUS_CODES,
    type ServiceResponse,
    type WhatsAppAccountDTO,
    type WhatsAppAccountStatusResponseDTO,
    type WhatsAppCreateAccountJSON,
    type WhatsAppWorkerStatusUpdateJSON,
} from "@repo/types";
import { redis } from "@/config/redis";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as repository from "./whatsapp.repository";
import * as workerClient from "./whatsapp.worker-client";
import * as invoiceService from "./invoice";

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

const workerUnavailable = (account: WhatsAppAccountDTO): ServiceResponse<WhatsAppAccountStatusResponseDTO> => ({
    status: "error",
    message: "WhatsApp worker is unavailable. The account was saved; retry linking when the worker is healthy.",
    data: accountResponse(account, null),
    code: 503,
});

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

    let account: WhatsAppAccountDTO;
    try {
        account = await repository.createAccount(organizationId, storeId, data.phoneNumber.trim(), userId);
    } catch (error) {
        if ((error as { code?: string }).code === "23505") {
            return {
                status: "error",
                message: "This store already has a WhatsApp account",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        throw error;
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
        await saveWorkerStatus(account.id, {
            status: "failed",
            qrImageDataUrl: null,
            lastErrorCode: "worker_unavailable",
        });
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

export const getWorkerAccounts = async () => repository.getAccountsForWorker();

export const receiveWorkerStatus = async (accountId: string, update: WhatsAppWorkerStatusUpdateJSON) =>
    saveWorkerStatus(accountId, update);

export const queueInvoice = invoiceService.queueInvoice;
export const queueInvoiceForDevice = invoiceService.queueInvoiceForDevice;
export const getInvoiceStatusForDevice = invoiceService.getInvoiceStatusForDevice;
export const retryInvoiceForDevice = invoiceService.retryInvoiceForDevice;
export const getInvoiceStatus = invoiceService.getInvoiceStatus;
export const retryInvoice = invoiceService.retryInvoice;
export const claimInvoiceForWorker = invoiceService.claimInvoiceForWorker;
export const receiveInvoiceResult = invoiceService.receiveInvoiceResult;
export const receiveInvoiceMessageStatus = invoiceService.receiveInvoiceMessageStatus;
